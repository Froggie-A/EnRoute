import "../../global.css";
import React, {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  PanResponder,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Canvas, useThree, useFrame } from "@react-three/fiber/native";
import { useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";
import * as Location from "expo-location";
import * as THREE from "three";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView } from "react-native";

import { FloorSwitcher } from "@/components/floorSwitcher";
import SearchBarRow from "@/components/SearchBarRow";
import NearbyChips from "@/components/NearbyChips";
import EventCard from "@/components/EventCard";
import RoomHitboxes, {
  getRoomAtScreenPoint,
  getRoomById,
  getNavNodeId,
} from "@/components/roomHitbox";
import RoomDetailSheet from "@/components/roomDetail";
import DirectionsSheet, { START_NODE_ID } from "@/components/Directions";
import PinLayer, { Pin } from "@/components/PinLayer";
import UserLocationMarker from "@/components/UserLocationMarker";
import IconLayer from "@/components/IconLayer";

import { getNode } from "@/navigation/db";
import { useRoute } from "@/hooks/use-route";
import type { NavNode } from "@/navigation/db";
import type { RouteResult } from "@/navigation/pathfinding";

import { PinSwitcher } from "@/components/pinbutton";

const FLOOR_MODELS = {
  1: require("../../assets/models/1stFloorModel.glb"),
  2: require("../../assets/models/2ndFloorModel.glb"),
  3: require("../../assets/models/3rdFloorModel.glb"),
} as const;

type FloorNumber = keyof typeof FLOOR_MODELS;
type SheetView = "default" | "detail" | "directions" | "profile";

type GestureState = {
  deltaRotate: { x: number; y: number };
  deltaZoom: number;
  deltaPan: { x: number; y: number };
};

const FLOOR_CONFIG: Record<
  FloorNumber,
  { switchRadius: number; snapRadius: number; zoomInRadius: number }
> = {
  1: { switchRadius: 50, snapRadius: 10, zoomInRadius: 5 },
  2: { switchRadius: 120, snapRadius: 10, zoomInRadius: 5 },
  3: { switchRadius: 45, snapRadius: 10, zoomInRadius: 5 },
};

const SNAP_FRACTIONS = [0.5, 0.75, 0.9];

const COLLAPSED_HEIGHT = 84;
const MID_HEIGHT = 420;
const EXPANDED_HEIGHT_FRACTION = 0.82;
const REVEAL_THRESHOLD = 210;

const HARDCODED_LAT = 30.40775;
const HARDCODED_LON = -91.17995;
const BUILDING_MIN_LAT = 30.406977;
const BUILDING_MAX_LAT = 30.40852;
const BUILDING_MIN_LON = -91.180786;
const BUILDING_MAX_LON = -91.179059;

const NAV_WIDTH = 750;
const NAV_HEIGHT = 780;

function gpsToNavCoords(lat: number, lon: number): { x: number; y: number } {
  const x =
    ((lon - BUILDING_MIN_LON) / (BUILDING_MAX_LON - BUILDING_MIN_LON)) *
    NAV_WIDTH;
  const y =
    ((BUILDING_MAX_LAT - lat) / (BUILDING_MAX_LAT - BUILDING_MIN_LAT)) *
    NAV_HEIGHT;
  return { x, y };
}

const MODEL_MIN_X = -12;
const MODEL_MAX_X = 12;
const MODEL_MIN_Z = -18;
const MODEL_MAX_Z = 18;

function gpsToModelCoords(lat: number, lon: number): { x: number; z: number } {
  const normX =
    (lon - BUILDING_MIN_LON) / (BUILDING_MAX_LON - BUILDING_MIN_LON);
  const normZ =
    (BUILDING_MAX_LAT - lat) / (BUILDING_MAX_LAT - BUILDING_MIN_LAT);
  const x = MODEL_MIN_X + normX * (MODEL_MAX_X - MODEL_MIN_X);
  const z = MODEL_MIN_Z + normZ * (MODEL_MAX_Z - MODEL_MIN_Z);
  return { x, z };
}

function FloorModel({ source }: { source: number }) {
  const asset = Asset.fromModule(source);
  const { scene } = useGLTF(asset.uri);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.position.sub(center);
    return clone;
  }, [scene]);

  useEffect(() => {
    clonedScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((mat: any) => {
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
          mat.needsUpdate = true;
        });
      }
    });
  }, [clonedScene]);

  return <primitive object={clonedScene} />;
}

function Building({ activeFloor }: { activeFloor: FloorNumber }) {
  return (
    <group scale={[0.1, 0.1, 0.1]}>
      <FloorModel
        key={`floor-${activeFloor}`}
        source={FLOOR_MODELS[activeFloor]}
      />
    </group>
  );
}

function CameraController({
  gestureRef,
  onRadiusChange,
  lerpRadiusRef,
  maxRadius,
  cameraRef,
  targetRef,
}: {
  gestureRef: React.MutableRefObject<GestureState>;
  onRadiusChange: (radius: number) => void;
  lerpRadiusRef: React.MutableRefObject<number | null>;
  maxRadius: number;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  targetRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const { camera } = useThree();
  const spherical = useRef(
    new THREE.Spherical(FLOOR_CONFIG[1].snapRadius, Math.PI / 4, 0)
  );
  const maxRadiusRef = useRef(maxRadius);

  useEffect(() => {
    maxRadiusRef.current = maxRadius;
  }, [maxRadius]);

  useFrame((_, delta) => {
    if (lerpRadiusRef.current !== null) {
      spherical.current.radius = THREE.MathUtils.lerp(
        spherical.current.radius,
        lerpRadiusRef.current,
        1 - Math.pow(0.01, delta)
      );
      gestureRef.current.deltaZoom = 0;
      if (Math.abs(spherical.current.radius - lerpRadiusRef.current) < 0.05) {
        lerpRadiusRef.current = null;
      }
    }

    const g = gestureRef.current;
    const offset = new THREE.Vector3().setFromSpherical(spherical.current);
    const right = new THREE.Vector3()
      .crossVectors(offset, new THREE.Vector3(0, 1, 0))
      .normalize();
    const forward = new THREE.Vector3()
      .crossVectors(right, new THREE.Vector3(0, 1, 0))
      .normalize();

    targetRef.current.addScaledVector(right, -g.deltaPan.x * 0.01);
    targetRef.current.addScaledVector(forward, g.deltaPan.y * 0.01);

    spherical.current.theta -= g.deltaRotate.x * 0.0035;
    spherical.current.phi = Math.max(
      0.2,
      Math.min(Math.PI - 0.2, spherical.current.phi - g.deltaRotate.y * 0.0035)
    );

    if (g.deltaZoom !== 0 && lerpRadiusRef.current === null) {
      spherical.current.radius = Math.max(
        0.1,
        Math.min(
          maxRadiusRef.current * 1.2,
          spherical.current.radius * (1 - g.deltaZoom * 0.0045)
        )
      );
    }

    onRadiusChange(spherical.current.radius);
    camera.position.copy(
      new THREE.Vector3()
        .setFromSpherical(spherical.current)
        .add(targetRef.current)
    );
    camera.lookAt(targetRef.current);
    cameraRef.current = camera;

    g.deltaRotate.x *= 0.85;
    g.deltaRotate.y *= 0.85;
    g.deltaZoom *= 0.8;
    g.deltaPan.x *= 0.85;
    g.deltaPan.y *= 0.85;

    if (Math.abs(g.deltaRotate.x) < 0.001) g.deltaRotate.x = 0;
    if (Math.abs(g.deltaRotate.y) < 0.001) g.deltaRotate.y = 0;
    if (Math.abs(g.deltaZoom) < 0.001) g.deltaZoom = 0;
    if (Math.abs(g.deltaPan.x) < 0.001) g.deltaPan.x = 0;
    if (Math.abs(g.deltaPan.y) < 0.001) g.deltaPan.y = 0;
  });

  return null;
}

function SceneCapture({
  sceneRef,
}: {
  sceneRef: React.MutableRefObject<THREE.Object3D[] | null>;
}) {
  const { scene } = useThree();
  useEffect(() => {
    sceneRef.current = scene.children;
  }, [scene, sceneRef]);
  return null;
}

export default function HomeScreen() {
  const previewPinRef = useRef<Pin | null>(null);
  const [activeFloor, setActiveFloor] = useState<FloorNumber>(1);
  const [cameraRadius, setCameraRadius] = useState(FLOOR_CONFIG[1].snapRadius);
  const [isReady, setIsReady] = useState(false);

  const sceneRef = useRef<THREE.Object3D[] | null>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>({
    coords: {
      latitude: HARDCODED_LAT,
      longitude: HARDCODED_LON,
      altitude: 0,
      accuracy: 1,
      altitudeAccuracy: 1,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  });

  const hasCenteredOnUser = useRef(false);

  const [mapSize, setMapSize] = useState({ width: 400, height: 800 });
  const [search, setSearch] = useState("");
  const [pinMode, setPinMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const [pins, setPins] = useState<Pin[]>([]);
  const [previewPin, setPreviewPin] = useState<Pin | null>(null);

  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());

  const [selectedNode, setSelectedNode] = useState<NavNode | null>(null);
  const [sheetView, setSheetView] = useState<SheetView>("default");
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<{
    title: string;
    date: string;
    location: string;
    description: string;
  } | null>(null);

  const [sheetIndex, setSheetIndex] = useState(-1);
  const [showCollapsedPill, setShowCollapsedPill] = useState(true);

  const [panelExpanded, setPanelExpanded] = useState(false);
  const [panelLevel, setPanelLevel] = useState<"collapsed" | "mid" | "full">(
    "collapsed"
  );
  const panelHeightAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const dragStartHeightRef = useRef(COLLAPSED_HEIGHT);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchRoomRef = useRef<string | null>(null);
  const touchMovedRef = useRef(false);

  const lerpRadiusRef = useRef<number | null>(null);
  const activeFloorRef = useRef<FloorNumber>(1);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const sheetIndexRef = useRef(-1);
  const mapSizeRef = useRef({ width: 1, height: 1 });

  const gestureRef = useRef<GestureState>({
    deltaRotate: { x: 0, y: 0 },
    deltaZoom: 0,
    deltaPan: { x: 0, y: 0 },
  });

  const prevTouches = useRef<{ x: number; y: number }[]>([]);
  const snapPoints = useMemo(() => ["50%", "75%", "90%"], []);

  const { getRoute, dbReady, snapToNode } = useRoute();

  const sheetTopY = useMemo(() => {
    if (sheetIndex < 0) return mapSize.height;
    const frac = SNAP_FRACTIONS[sheetIndex] ?? 0.5;
    return mapSize.height * (1 - frac);
  }, [sheetIndex, mapSize.height]);

  const expandedPanelHeight = useMemo(() => {
    const rawHeight = mapSize.height * EXPANDED_HEIGHT_FRACTION;
    return Math.max(MID_HEIGHT + 1, rawHeight);
  }, [mapSize.height]);

  const snapPanelTo = useCallback(
    (toValue: number) => {
      let level: "collapsed" | "mid" | "full" = "collapsed";

      if (toValue === MID_HEIGHT) level = "mid";
      if (toValue === expandedPanelHeight) level = "full";

      setPanelLevel(level);
      setPanelExpanded(level !== "collapsed");

      Animated.spring(panelHeightAnim, {
        toValue,
        useNativeDriver: false,
        damping: 24,
        stiffness: 180,
        mass: 0.9,
      }).start();
    },
    [panelHeightAnim, expandedPanelHeight]
  );

  const contentOpacity = panelHeightAnim.interpolate({
    inputRange: [COLLAPSED_HEIGHT, MID_HEIGHT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const contentTranslateY = panelHeightAnim.interpolate({
    inputRange: [COLLAPSED_HEIGHT, MID_HEIGHT],
    outputRange: [20, 0],
    extrapolate: "clamp",
  });

  const panelLeft = panelHeightAnim.interpolate({
    inputRange: [COLLAPSED_HEIGHT, MID_HEIGHT],
    outputRange: [14, 0],
    extrapolate: "clamp",
  });

  const panelRight = panelHeightAnim.interpolate({
    inputRange: [COLLAPSED_HEIGHT, MID_HEIGHT],
    outputRange: [14, 0],
    extrapolate: "clamp",
  });

  const panelBottom = panelHeightAnim.interpolate({
    inputRange: [COLLAPSED_HEIGHT, MID_HEIGHT],
    outputRange: [35, 0],
    extrapolate: "clamp",
  });

  const panelRadius = panelHeightAnim.interpolate({
    inputRange: [COLLAPSED_HEIGHT, MID_HEIGHT],
    outputRange: [100, 26],
    extrapolate: "clamp",
  });

  const panelBackgroundColor = panelHeightAnim.interpolate({
    inputRange: [COLLAPSED_HEIGHT, MID_HEIGHT],
    outputRange: ["rgba(189,189,189,0.75)", "rgba(235, 235, 218, 1)"],
    extrapolate: "clamp",
  });

  const events = [
    {
      id: "1",
      title: "Resume Help",
      date: "Feb 28 • 11 AM - 7 PM",
      club: "Student Government",
      location: "PFT 3147",
      type: "book-outline" as const,
      description: "Resume review event details here.",
    },
    {
      id: "2",
      title: "Flutter Workshop",
      date: "Mar 1 • 6 AM - 1 PM",
      club: "Women in Cybersecurity",
      location: "PFT 2246",
      type: "laptop-outline" as const,
      description: "Flutter workshop details here.",
    },
    {
      id: "3",
      title: "Relaxation Social",
      date: "Mar 2 • 1 PM - 10 PM",
      club: "Robotics",
      location: "PFT 1255",
      type: "chatbubble-outline" as const,
      description: "Relaxation social details here.",
    },
    {
      id: "4",
      title: "Physics Tutoring",
      date: "Mar 4 • 4 PM - 8 PM",
      club: "Society of Physics Students",
      location: "PFT 2612",
      type: "book-outline" as const,
      description: "Physics tutoring details here.",
    },
    {
      id: "5",
      title: "Free Lunch Event",
      date: "Mar 6 • 11 AM - 2 PM",
      club: "Google Developer Student Club",
      location: "PFT 1145",
      type: "chatbubble-outline" as const,
      description: "Free lunch event details here.",
    },
  ];

  const filteredEvents = events.filter((event) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      event.title.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      event.date.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    activeFloorRef.current = activeFloor;
  }, [activeFloor]);

  useEffect(() => {
    mapSizeRef.current = mapSize;
  }, [mapSize]);

  useEffect(() => {
    if (!location || hasCenteredOnUser.current) return;
    hasCenteredOnUser.current = true;

    const { x, z } = gpsToModelCoords(
      location.coords.latitude,
      location.coords.longitude
    );

    cameraTargetRef.current.set(x, 0, z);
    lerpRadiusRef.current = FLOOR_CONFIG[1].snapRadius;
  }, [location]);

  const PIN_Y = -0.05;

  const focusRoom = useCallback((roomId: string | null, floor: FloorNumber) => {
    if (!roomId) return;
    const room = getRoomById(floor, roomId);
    if (!room) return;
    const groupScale = 0.1;
    const [x, y, z] = room.position;
    const [, sy, sz] = room.size;
    cameraTargetRef.current.set(x * groupScale, y * groupScale, z * groupScale);
    const zoomRadius = Math.max(2.5, Math.max(sy, sz) * groupScale * 2.2);
    lerpRadiusRef.current = zoomRadius;
  }, []);

  const getPinPointFromTouch = useCallback(
    (pageX: number, pageY: number): Pin | null => {
      const cam = cameraRef.current;
      if (!cam || mapSize.width <= 0 || mapSize.height <= 0) return null;

      const pointer = pointerRef.current;
      const raycaster = raycasterRef.current;

      pointer.x = (pageX / mapSize.width) * 2 - 1;
      pointer.y = -(pageY / mapSize.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cam);

      const intersects = raycaster.intersectObjects(
        (sceneRef.current ?? []).length ? sceneRef.current! : [],
        true
      );

      if (intersects.length === 0) return null;

      const point = intersects[0].point;
      return { x: point.x, y: PIN_Y, z: point.z, floor: activeFloorRef.current };
    },
    [mapSize.width, mapSize.height]
  );

  useEffect(() => {
    if (selectedRoom) focusRoom(selectedRoom, activeFloor);
  }, [selectedRoom, activeFloor, focusRoom]);

  const pinPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => pinMode,
        onMoveShouldSetPanResponder: () => pinMode,

        onPanResponderGrant: (evt) => {
          if (!pinMode) return;
          const point = getPinPointFromTouch(
            evt.nativeEvent.pageX,
            evt.nativeEvent.pageY
          );
          if (point) {
            previewPinRef.current = point;
            setPreviewPin(point);
          }
        },

        onPanResponderMove: (evt) => {
          if (!pinMode) return;
          const point = getPinPointFromTouch(
            evt.nativeEvent.pageX,
            evt.nativeEvent.pageY
          );
          if (point) previewPinRef.current = point;
        },

        onPanResponderRelease: () => {
          if (previewPinRef.current) {
            setPins((prev) => [...prev, previewPinRef.current!]);
          }
          previewPinRef.current = null;
          setPreviewPin(null);
        },

        onPanResponderTerminate: () => {
          previewPinRef.current = null;
          setPreviewPin(null);
        },
      }),
    [pinMode, getPinPointFromTouch]
  );

  const expandStretchPanel = useCallback(() => {
    setShowCollapsedPill(true);
    snapPanelTo(MID_HEIGHT);
  }, [snapPanelTo]);

  const expandFullyPanel = useCallback(() => {
    setShowCollapsedPill(true);
    snapPanelTo(expandedPanelHeight);
  }, [expandedPanelHeight, snapPanelTo]);

  const collapseStretchPanel = useCallback(() => {
    snapPanelTo(COLLAPSED_HEIGHT);
  }, [snapPanelTo]);

  const panelPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,

        onPanResponderGrant: () => {
          panelHeightAnim.stopAnimation((value: number) => {
            dragStartHeightRef.current = value;
          });
        },

        onPanResponderMove: (_, gesture) => {
          const nextHeight = dragStartHeightRef.current - gesture.dy;
          const clampedHeight = Math.max(
            COLLAPSED_HEIGHT,
            Math.min(expandedPanelHeight, nextHeight)
          );
          panelHeightAnim.setValue(clampedHeight);
        },

        onPanResponderRelease: (_, gesture) => {
          const projectedHeight = dragStartHeightRef.current - gesture.dy;

          const stops = [COLLAPSED_HEIGHT, MID_HEIGHT, expandedPanelHeight];

          let destination = stops[0];
          let minDistance = Math.abs(projectedHeight - stops[0]);

          for (let i = 1; i < stops.length; i++) {
            const distance = Math.abs(projectedHeight - stops[i]);
            if (distance < minDistance) {
              minDistance = distance;
              destination = stops[i];
            }
          }

          if (gesture.vy < -0.9) {
            if (projectedHeight < MID_HEIGHT) {
              destination = MID_HEIGHT;
            } else {
              destination = expandedPanelHeight;
            }
          } else if (gesture.vy > 0.9) {
            if (projectedHeight > MID_HEIGHT) {
              destination = MID_HEIGHT;
            } else {
              destination = COLLAPSED_HEIGHT;
            }
          }

          snapPanelTo(destination);
        },

        onPanResponderTerminate: () => {
          snapPanelTo(COLLAPSED_HEIGHT);
        },
      }),
    [
      collapseStretchPanel,
      expandStretchPanel,
      expandedPanelHeight,
      panelExpanded,
      panelHeightAnim,
    ]
  );

  const handleRadiusChange = useCallback((radius: number) => {
    setCameraRadius(radius);
    if (lerpRadiusRef.current !== null) return;

    const current = activeFloorRef.current;
    const { switchRadius, snapRadius, zoomInRadius } = FLOOR_CONFIG[current];
    const nextFloor = (current < 3 ? current + 1 : current) as FloorNumber;
    const prevFloor = (current > 1 ? current - 1 : current) as FloorNumber;

    if (radius >= switchRadius && nextFloor !== current) {
      activeFloorRef.current = nextFloor;
      setActiveFloor(nextFloor);
      lerpRadiusRef.current = FLOOR_CONFIG[nextFloor].snapRadius;
      return;
    }

    if (radius < snapRadius * 0.2 && prevFloor !== current) {
      activeFloorRef.current = prevFloor;
      setActiveFloor(prevFloor);
      lerpRadiusRef.current = zoomInRadius;
    }
  }, []);

  const handleRoomSelect = useCallback(
    (hitboxId: string | null) => {
      if (!hitboxId) {
        setSelectedRoom(null);
        setSelectedNode(null);
        return;
      }

      const navId = getNavNodeId(hitboxId, activeFloorRef.current);
      const node = navId ? getNode(navId) : null;

      

      setSelectedRoom(hitboxId);
      setSelectedNode(node);
      setSheetView("detail");
      setActiveRoute(null);
      focusRoom(hitboxId, activeFloorRef.current);
      setShowCollapsedPill(false);

      bottomSheetRef.current?.snapToIndex(0);
      setSheetIndex(0);
      sheetIndexRef.current = 0;
    },
    [focusRoom]
  );

  const getFromNodeId = useCallback((): string => {
    if (!location) return START_NODE_ID;

    const { x, y } = gpsToNavCoords(
      location.coords.latitude,
      location.coords.longitude
    );
    const nearest = snapToNode(x, y, activeFloorRef.current);

    if (nearest) return nearest.id;
    return START_NODE_ID;
  }, [location, snapToNode]);

  const handleNavigate = useCallback(
    (accessible = false) => {
      if (!selectedNode || !dbReady) return;

      const fromId = getFromNodeId();
      const result = getRoute(fromId, selectedNode.id, { accessible });

      setActiveRoute(result);
      setSheetView("directions");
      bottomSheetRef.current?.snapToIndex(1);
      setSheetIndex(1);
      sheetIndexRef.current = 1;
    },
    [selectedNode, dbReady, getRoute, getFromNodeId]
  );

  const handleAvoidStairsChange = useCallback(
    (val: boolean) => {
      if (!selectedNode || !dbReady) return;
      const fromId = getFromNodeId();
      const result = getRoute(fromId, selectedNode.id, { accessible: val });
      setActiveRoute(result);
    },
    [selectedNode, dbReady, getRoute, getFromNodeId]
  );

  const openSheet = useCallback(() => {
    setSheetView("default");
    expandFullyPanel();
  }, [expandFullyPanel]);

  const handleProfilePress = useCallback(() => {
    setSheetView("profile");
    expandStretchPanel();
  }, [expandStretchPanel]);

  const cameraPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !pinMode,
        onMoveShouldSetPanResponder: () => !pinMode,

        onPanResponderGrant: (e) => {
          const { pageX, pageY, touches } = e.nativeEvent;
          touchStartRef.current = { x: pageX, y: pageY };
          touchMovedRef.current = false;
          prevTouches.current = touches.map((t) => ({
            x: t.pageX,
            y: t.pageY,
          }));

          const cam = cameraRef.current;
          if (cam) {
            const { width, height } = mapSizeRef.current;
            const hit = getRoomAtScreenPoint(
              pageX,
              pageY,
              activeFloorRef.current,
              cam,
              width,
              height
            );
            touchRoomRef.current = hit?.id ?? null;
          } else {
            touchRoomRef.current = null;
          }
        },

        onPanResponderMove: (e) => {
          const touches = e.nativeEvent.touches;

          if (touchStartRef.current && touches.length > 0) {
            const dx = touches[0].pageX - touchStartRef.current.x;
            const dy = touches[0].pageY - touchStartRef.current.y;
            if (Math.hypot(dx, dy) > 8) touchMovedRef.current = true;
          }

          if (touches.length === 1) {
            const prev = prevTouches.current[0];
            if (prev) {
              gestureRef.current.deltaRotate.x += touches[0].pageX - prev.x;
              gestureRef.current.deltaRotate.y += touches[0].pageY - prev.y;
            }
            prevTouches.current = [
              { x: touches[0].pageX, y: touches[0].pageY },
            ];
          } else if (touches.length === 2) {
            touchMovedRef.current = true;

            const [t0, t1] = [touches[0], touches[1]];
            const currDist = Math.hypot(
              t1.pageX - t0.pageX,
              t1.pageY - t0.pageY
            );
            const currMid = {
              x: (t0.pageX + t1.pageX) / 2,
              y: (t0.pageY + t1.pageY) / 2,
            };

            if (prevTouches.current.length === 2) {
              const [p0, p1] = prevTouches.current;
              const prevDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
              const prevMid = {
                x: (p0.x + p1.x) / 2,
                y: (p0.y + p1.y) / 2,
              };

              const distDelta = currDist - prevDist;
              const midDelta = {
                x: currMid.x - prevMid.x,
                y: currMid.y - prevMid.y,
              };

              gestureRef.current.deltaZoom += distDelta * 0.15;

              if (Math.abs(midDelta.x) > 0.5 || Math.abs(midDelta.y) > 0.5) {
                const panFactor = Math.abs(distDelta) > 8 ? 0.08 : 0.25;
                gestureRef.current.deltaPan.x += midDelta.x * panFactor;
                gestureRef.current.deltaPan.y += midDelta.y * panFactor;
              }
            }

            prevTouches.current = [
              { x: t0.pageX, y: t0.pageY },
              { x: t1.pageX, y: t1.pageY },
            ];
          }
        },

        onPanResponderRelease: () => {
          if (!touchMovedRef.current && touchRoomRef.current) {
            handleRoomSelect(touchRoomRef.current);
          }
          touchStartRef.current = null;
          touchRoomRef.current = null;
          touchMovedRef.current = false;
          prevTouches.current = [];
        },

        onPanResponderTerminate: () => {
          touchStartRef.current = null;
          touchRoomRef.current = null;
          touchMovedRef.current = false;
          prevTouches.current = [];
        },
      }),
    [pinMode, handleRoomSelect]
  );

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setLocation(current);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 250,
          distanceInterval: 0,
        },
        (loc) => setLocation(loc)
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    async function preloadAll() {
      try {
        await Promise.all(
          Object.values(FLOOR_MODELS).map(async (mod) => {
            const asset = Asset.fromModule(mod);
            await asset.downloadAsync();
          })
        );
      } catch (e) {
        console.log("Error preloading floor models:", e);
      } finally {
        setIsReady(true);
      }
    }

    preloadAll();
  }, []);

  const handleSheetChange = useCallback(
    (index: number) => {
      setSheetIndex(index);
      sheetIndexRef.current = index;

      if (index === -1) {
        setSelectedRoom(null);
        setSelectedNode(null);
        setActiveRoute(null);

        if (!panelExpanded) {
          setSheetView("default");
          setTimeout(() => setShowCollapsedPill(true), 1);
        }
      } else {
        setShowCollapsedPill(false);
      }
    },
    [panelExpanded]
  );

  if (!isReady) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View
        style={styles.container}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setMapSize({ width, height });
        }}
      >
        <Canvas
          style={styles.canvasAbsolute}
          camera={{ position: [0, 0, 0], fov: 45 }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 5, 2]} intensity={1} />
          <directionalLight position={[-3, 5, -2]} intensity={0.9} />
          <directionalLight position={[0, 4, 4]} intensity={0.7} />
          <directionalLight position={[0, -5, 0]} intensity={0.7} />
          <SceneCapture sceneRef={sceneRef} />

          <Suspense fallback={null}>
            <Building activeFloor={activeFloor} />

            <group scale={[0.1, 0.1, 0.1]}>
              <RoomHitboxes
                activeFloor={activeFloor}
                selectedRoom={selectedRoom}
                setSelectedRoom={setSelectedRoom}
              />
              {location && (
                <UserLocationMarker
                  latitude={location.coords.latitude}
                  longitude={location.coords.longitude}
                  activeFloor={activeFloor}
                />
              )}
            </group>

            <PinLayer
              pins={pins}
              previewPin={previewPin}
              previewPinRef={previewPinRef}
              activeFloor={activeFloor}
            />

            <IconLayer activeFloor={activeFloor} />
          </Suspense>

          <CameraController
            gestureRef={gestureRef}
            onRadiusChange={handleRadiusChange}
            lerpRadiusRef={lerpRadiusRef}
            maxRadius={FLOOR_CONFIG[activeFloor].switchRadius}
            cameraRef={cameraRef}
            targetRef={cameraTargetRef}
          />
        </Canvas>

        {!pinMode && (
          <View
            style={[styles.mapGestureLayer, { height: sheetTopY }]}
            pointerEvents="auto"
            {...cameraPanResponder.panHandlers}
          />
        )}


{sheetIndex === -1 && (
  <View
    style={{
      position: "absolute",
      right: 10,
      bottom: 20,
      zIndex: 100,
      alignItems: "center",
      gap: 8,
    }}
  >
    <PinSwitcher
      placing={pinMode}
      onToggle={() => setPinMode((prev) => !prev)}
    />

    <FloorSwitcher
      activeFloor={activeFloor}
      onFloorChange={(floor) => {
        const nextFloor = floor as FloorNumber;
        activeFloorRef.current = nextFloor;
        setActiveFloor(nextFloor);
        lerpRadiusRef.current = FLOOR_CONFIG[nextFloor].snapRadius;
      }}
    />
  </View>
)}

        {pinMode && (
          <View style={styles.pinOverlay} {...pinPanResponder.panHandlers} />
        )}

        {showCollapsedPill && (
          <Animated.View
            style={[
              styles.stretchPanelWrap,
              {
                height: panelHeightAnim,
                left: panelLeft,
                right: panelRight,
                bottom: panelBottom,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.stretchPanel,
                {
                  borderRadius: panelRadius,
                  backgroundColor: panelBackgroundColor,
                },
              ]}
            >
              <View style={styles.dragHeader} {...panelPanResponder.panHandlers}>
                <View style={styles.stretchHandleArea}>
                  <View style={styles.stretchHandle} />
                </View>

                <View style={styles.stretchSearchShell}>
                  <SearchBarRow
                    search={search}
                    setSearch={setSearch}
                    onPressExpand={openSheet}
                    onPressProfile={handleProfilePress}
                  />
                </View>
              </View>

              <Animated.View
                style={[
                  styles.stretchContentWrap,
                  {
                    opacity: contentOpacity,
                    transform: [{ translateY: contentTranslateY }],
                  },
                ]}
                pointerEvents={panelExpanded ? "auto" : "none"}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  {sheetView === "profile" ? (
                    <View style={{ paddingHorizontal: 20 }}>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "700",
                          marginBottom: 12,
                        }}
                      >
                        Profile
                      </Text>

                      <Pressable
                        onPress={() => setSheetView("default")}
                        style={{ marginBottom: 16 }}
                      >
                        <Text style={{ color: "#3498DB", fontWeight: "600" }}>
                          ← Back
                        </Text>
                      </Pressable>

                      <Text style={{ fontSize: 16, marginBottom: 10 }}>
                        Saved Pins
                      </Text>
                      <Text style={{ fontSize: 16, marginBottom: 10 }}>
                        Saved Events
                      </Text>

                      {events.map((event) => (
                        <EventCard
                          key={event.id}
                          title={event.title}
                          date={event.date}
                          club={event.club}
                          location={event.location}
                          type={event.type}
                          onPress={() => {}}
                        />
                      ))}
                    </View>
                  ) : selectedEvent ? (
                    <View>
                      <Pressable
                        onPress={() => setSelectedEvent(null)}
                        style={styles.backButton}
                      >
                        <Text style={styles.backButtonText}>← Back</Text>
                      </Pressable>

                      <Text style={styles.eventTitle}>{selectedEvent.title}</Text>

                      <View style={styles.eventActionRow}>
                        <Pressable style={styles.eventActionButton}>
                          <Ionicons
                            name="bookmark-outline"
                            size={22}
                            color="#222"
                          />
                          <Text style={styles.eventActionText}>Saved</Text>
                        </Pressable>

                        <Pressable style={styles.eventActionButton}>
                          <Ionicons
                            name="arrow-redo-outline"
                            size={22}
                            color="#222"
                          />
                          <Text style={styles.eventActionText}>Navigate</Text>
                        </Pressable>
                      </View>

                      <Text style={styles.eventMeta}>{selectedEvent.date}</Text>
                      <Text style={styles.eventMeta}>{selectedEvent.location}</Text>
                      <Text style={styles.eventSectionTitle}>Description</Text>
                      <Text style={styles.eventDescription}>
                        {selectedEvent.description}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      {search.trim() === "" && (
                        <>
                          <Text style={styles.sectionTitle}>Nearby</Text>
                          <NearbyChips />
                        </>
                      )}
                      <Text style={styles.sectionTitle}>Events</Text>

                      {filteredEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          title={event.title}
                          date={event.date}
                          club={event.club}
                          location={event.location}
                          type={event.type}
                          onPress={() =>
                            setSelectedEvent({
                              title: event.title,
                              date: event.date,
                              location: event.location,
                              description: event.description,
                            })
                          }
                        />
                      ))}

                      {filteredEvents.length === 0 && (
                        <Text style={styles.emptytext}>
                          No matching events found.
                        </Text>
                      )}

                      <Text style={styles.radiusText}>
                        Floor: L{activeFloor} • Radius:{" "}
                        {cameraRadius.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        )}

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          onChange={handleSheetChange}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
        >
          <BottomSheetScrollView
            contentContainerStyle={styles.sheetContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {sheetView === "detail" && selectedNode && (
              <RoomDetailSheet
                node={selectedNode}
                onNavigate={() => handleNavigate(false)}
                onDismiss={() => {
                  setSelectedRoom(null);
                  setSelectedNode(null);
                  setSheetView("default");
                  bottomSheetRef.current?.close();
                }}
              />
            )}

            {sheetView === "directions" && selectedNode && (
              <DirectionsSheet
                destination={selectedNode}
                route={activeRoute}
                onAvoidStairsChange={handleAvoidStairsChange}
                onConfirm={() => {
                  console.log(
                    "Route confirmed, steps:",
                    activeRoute?.steps.length
                  );
                }}
                onBack={() => setSheetView("detail")}
              />
            )}
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  emptytext: {
    paddingHorizontal: 20,
    color: "#666",
    marginTop: 8,
    fontSize: 15,
  },

  canvasAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  pinOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },

  stretchPanelWrap: {
    position: "absolute",
    zIndex: 50,
  },

  stretchPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.75)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 8,
  },

  dragHeader: {
    paddingTop: 6,
  },

  stretchHandleArea: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
  },

  stretchHandle: {
    width: 70,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(56, 54, 54, 0.80)",
  },


  stretchSearchShell: {
    marginHorizontal: 0,
    marginBottom: 4,
    borderRadius: 30,
    backgroundColor: "transparent",
    paddingVertical: 0,
  },

  stretchContentWrap: {
    flex: 1,
    paddingBottom: 18,
  },

  bottomSheetBackground: {
    backgroundColor: "rgba(235, 235, 218, 1)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: "rgb(255, 255, 255)",
    overflow: "hidden",
  },

  handleIndicator: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  sheetContentContainer: {
    paddingBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
    marginTop: 8,
    paddingHorizontal: 20,
  },

  radiusText: {
    marginTop: 16,
    marginBottom: 30,
    color: "#333",
    fontWeight: "600",
    paddingHorizontal: 20,
  },

  mapGestureLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },

  eventTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
    paddingHorizontal: 20,
  },

  eventMeta: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    paddingHorizontal: 20,
  },

  eventSectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    paddingHorizontal: 20,
  },

  eventDescription: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 20,
  },

  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3498DB",
  },

  eventActionRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
    marginBottom: 18,
    paddingHorizontal: 20,
  },

  eventActionButton: {
    backgroundColor: "#BFDDF3",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 92,
  },

  eventActionText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },
});