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
import { useTexture } from "@react-three/drei/native";

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
import NavOverlay from "@/components/NavOverlay";
import TestPath from "@/components/testpath";
import TestPathLabel from "@/components/testpathLabel";
import PinLayer, { Pin } from "@/components/PinLayer";
import UserLocationMarker from "@/components/UserLocationMarker";
import IconLayer from "@/components/IconLayer";

import { getNode } from "@/navigation/db";
import { useRoute } from "@/hooks/use-route";
import { useTestRoute } from "@/hooks/use-test-route";
import { routeToWaypoints } from "@/utils/routeToWaypoints";
import { normalizeLocationToBuilding } from "@/utils/buildingLocation";
import type { NavNode } from "@/navigation/db";
import type { RouteResult } from "@/navigation/pathfinding";

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
  pinchMidpoint: { x: number; y: number } | null;
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

const HARDCODED_LAT = 30.40775;
const HARDCODED_LON = -91.17995;

// Old bounding box kept for gpsToModelCoords (initial camera center only)
const BUILDING_MIN_LAT = 30.406977;
const BUILDING_MAX_LAT = 30.40852;
const BUILDING_MIN_LON = -91.180786;
const BUILDING_MAX_LON = -91.179059;

const MODEL_MIN_X = -12;
const MODEL_MAX_X = 12;
const MODEL_MIN_Z = -18;
const MODEL_MAX_Z = 18;

// Node coordinate bounds — match actual range in seed-nodes.ts
const NODE_MIN_X = -53;
const NODE_MAX_X = 48;
const NODE_MIN_Y = -40;
const NODE_MAX_Y = 15;

// Used only for initial camera centering on first GPS fix
function gpsToModelCoords(lat: number, lon: number): { x: number; z: number } {
  const normX = (lon - BUILDING_MIN_LON) / (BUILDING_MAX_LON - BUILDING_MIN_LON);
  const normZ = (BUILDING_MAX_LAT - lat) / (BUILDING_MAX_LAT - BUILDING_MIN_LAT);
  return {
    x: MODEL_MIN_X + normX * (MODEL_MAX_X - MODEL_MIN_X),
    z: MODEL_MIN_Z + normZ * (MODEL_MAX_Z - MODEL_MIN_Z),
  };
}

// Converts real GPS → model-space x,y used by TEST_NODES / snapToNode
function gpsToNodeCoords(lat: number, lon: number): { x: number; y: number } {
  const norm = normalizeLocationToBuilding(lat, lon);
  return {
    x: NODE_MIN_X + norm.x * (NODE_MAX_X - NODE_MIN_X),
    y: NODE_MIN_Y + norm.y * (NODE_MAX_Y - NODE_MIN_Y),
  };
}

// ─── Zoom helpers ─────────────────────────────────────────────────────────────

function zoomToWaypoints(
    waypoints: [number, number, number][],
    lerpRadiusRef: React.MutableRefObject<number | null>,
    lerpTargetRef: React.MutableRefObject<THREE.Vector3 | null>,
    sheetFraction: number
) {
  if (waypoints.length === 0) return;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, , z] of waypoints) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ, 0.5);
  const baseRadius = span * 1.6;
  const radius = baseRadius / Math.max(0.1, 1 - sheetFraction);
  lerpTargetRef.current = new THREE.Vector3(cx, 0, cz + radius * sheetFraction * 0.35);
  lerpRadiusRef.current = radius;
}

function zoomToNavStart(
    waypoints: [number, number, number][],
    lerpRadiusRef: React.MutableRefObject<number | null>,
    lerpTargetRef: React.MutableRefObject<THREE.Vector3 | null>,
    lerpThetaRef: React.MutableRefObject<number | null>,
    lerpPhiRef: React.MutableRefObject<number | null>
) {
  if (waypoints.length < 2) return;
  const [x0, , z0] = waypoints[0];
  const [x1, , z1] = waypoints[1];

  // Bearing of first route segment in THREE space.
  // Camera sits BEHIND the user, looking toward wp[1].
  const dx = x1 - x0;
  const dz = z1 - z0;
  const routeTheta = Math.atan2(dx, dz);
  const camTheta = routeTheta + Math.PI;

  // Shift target forward so user dot sits in the lower visible portion
  const dist = Math.sqrt(dx * dx + dz * dz) || 1;
  const nx = dx / dist;
  const nz = dz / dist;
  lerpTargetRef.current = new THREE.Vector3(x0 + nx * 1.8, 0, z0 + nz * 1.8);
  lerpRadiusRef.current = 4.5;
  lerpThetaRef.current = camTheta;
  lerpPhiRef.current = Math.PI / 2.6;
}

// ─── Floor model ──────────────────────────────────────────────────────────────

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
        <FloorModel key={`floor-${activeFloor}`} source={FLOOR_MODELS[activeFloor]} />
      </group>
  );
}

// ─── Camera controller ────────────────────────────────────────────────────────

function CameraController({
                            gestureRef,
                            onRadiusChange,
                            lerpRadiusRef,
                            lerpTargetRef,
                            maxRadius,
                            cameraRef,
                            targetRef,
                            mapSizeRef,
                            lerpThetaRef,
                            lerpPhiRef,
                          }: {
  gestureRef: React.MutableRefObject<GestureState>;
  onRadiusChange: (radius: number) => void;
  lerpRadiusRef: React.MutableRefObject<number | null>;
  lerpTargetRef: React.MutableRefObject<THREE.Vector3 | null>;
  maxRadius: number;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  targetRef: React.MutableRefObject<THREE.Vector3>;
  mapSizeRef: React.MutableRefObject<{ width: number; height: number }>;
  lerpThetaRef: React.MutableRefObject<number | null>;
  lerpPhiRef: React.MutableRefObject<number | null>;
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
    // Lerp target position
    if (lerpTargetRef.current !== null) {
      targetRef.current.lerp(lerpTargetRef.current, 1 - Math.pow(0.008, delta));
      if (targetRef.current.distanceTo(lerpTargetRef.current) < 0.015) {
        targetRef.current.copy(lerpTargetRef.current);
        lerpTargetRef.current = null;
      }
    }

    // Lerp radius
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

    // Lerp theta (nav start heading)
    if (lerpThetaRef.current !== null) {
      spherical.current.theta = THREE.MathUtils.lerp(
          spherical.current.theta,
          lerpThetaRef.current,
          1 - Math.pow(0.001, delta)
      );
      if (Math.abs(spherical.current.theta - lerpThetaRef.current) < 0.005) {
        lerpThetaRef.current = null;
      }
    }

    // Lerp phi (nav tilt angle)
    if (lerpPhiRef.current !== null) {
      spherical.current.phi = THREE.MathUtils.lerp(
          spherical.current.phi,
          lerpPhiRef.current,
          1 - Math.pow(0.001, delta)
      );
      if (Math.abs(spherical.current.phi - lerpPhiRef.current) < 0.005) {
        lerpPhiRef.current = null;
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

    spherical.current.theta -= g.deltaRotate.x * 0.0035;
    spherical.current.phi = Math.max(
        0.2,
        Math.min(Math.PI / 2.1, spherical.current.phi - g.deltaRotate.y * 0.0035)
    );

    targetRef.current.addScaledVector(right, -g.deltaPan.x * 0.016);
    targetRef.current.addScaledVector(forward, g.deltaPan.y * 0.016);

    if (g.deltaZoom !== 0 && lerpRadiusRef.current === null) {
      const prev = spherical.current.radius;
      const next = Math.max(
          0.1,
          Math.min(maxRadiusRef.current * 1.2, prev * (1 - g.deltaZoom * 0.0045))
      );
      const dr = next - prev;
      if (g.pinchMidpoint && dr !== 0) {
        const { width, height } = mapSizeRef.current;
        const ndcX = (g.pinchMidpoint.x / width) * 2 - 1;
        const ndcY = -(g.pinchMidpoint.y / height) * 2 + 1;
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        const wp = new THREE.Vector3();
        ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), wp);
        if (wp) targetRef.current.lerp(wp, (-dr / prev) * 0.6);
      }
      spherical.current.radius = next;
    }

    onRadiusChange(spherical.current.radius);
    camera.position.copy(
        new THREE.Vector3().setFromSpherical(spherical.current).add(targetRef.current)
    );
    camera.lookAt(targetRef.current);
    cameraRef.current = camera;

    g.deltaRotate.x *= 0.82; g.deltaRotate.y *= 0.82;
    g.deltaZoom *= 0.75;
    g.deltaPan.x *= 0.82; g.deltaPan.y *= 0.82;

    if (Math.abs(g.deltaRotate.x) < 0.001) g.deltaRotate.x = 0;
    if (Math.abs(g.deltaRotate.y) < 0.001) g.deltaRotate.y = 0;
    if (Math.abs(g.deltaZoom) < 0.001) { g.deltaZoom = 0; g.pinchMidpoint = null; }
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



//── Main screen ──────────────────────────────────────────────────────────────

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
  const [pathWaypoints, setPathWaypoints] = useState<[number, number, number][]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
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
  const [panelLevel, setPanelLevel] = useState<"collapsed" | "mid" | "full">("collapsed");
  const panelHeightAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const dragStartHeightRef = useRef(COLLAPSED_HEIGHT);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchRoomRef = useRef<string | null>(null);
  const touchMovedRef = useRef(false);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapRoomRef = useRef<string | null>(null);

  const lerpRadiusRef = useRef<number | null>(null);
  const lerpTargetRef = useRef<THREE.Vector3 | null>(null);
  const lerpThetaRef = useRef<number | null>(null);
  const lerpPhiRef = useRef<number | null>(null);
  const navHeadingRef = useRef<number | null>(null);
  const destNodeIdRef = useRef<string | null>(null);
  const lastRerouteNodeRef = useRef<string | null>(null);

  const activeFloorRef = useRef<FloorNumber>(1);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const sheetIndexRef = useRef(-1);
  const mapSizeRef = useRef({ width: 1, height: 1 });
  const sheetTopYRef = useRef(9999);

  const gestureRef = useRef<GestureState>({
    deltaRotate: { x: 0, y: 0 },
    deltaZoom: 0,
    deltaPan: { x: 0, y: 0 },
    pinchMidpoint: null,
  });

  const prevTouches = useRef<{ x: number; y: number }[]>([]);
  const snapPoints = useMemo(() => ["50%", "75%", "90%"], []);

  const { getRoute, dbReady, snapToNode } = useRoute();
  const getTestRoute = useTestRoute();

  const sheetTopY = useMemo(() => {
    if (sheetIndex < 0) return mapSize.height;
    const frac = SNAP_FRACTIONS[sheetIndex] ?? 0.5;
    return mapSize.height * (1 - frac);
  }, [sheetIndex, mapSize.height]);

  useEffect(() => {
    sheetTopYRef.current = sheetTopY;
  }, [sheetTopY]);

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
    { id: "1", title: "Resume Help", date: "Feb 28 • 11 AM - 7 PM", club: "Student Government", location: "PFT 3147", type: "book-outline" as const, description: "Resume review event details here." },
    { id: "2", title: "Flutter Workshop", date: "Mar 1 • 6 AM - 1 PM", club: "Women in Cybersecurity", location: "PFT 2246", type: "laptop-outline" as const, description: "Flutter workshop details here." },
    { id: "3", title: "Relaxation Social", date: "Mar 2 • 1 PM - 10 PM", club: "Robotics", location: "PFT 1255", type: "chatbubble-outline" as const, description: "Relaxation social details here." },
    { id: "4", title: "Physics Tutoring", date: "Mar 4 • 4 PM - 8 PM", club: "Society of Physics Students", location: "PFT 2612", type: "book-outline" as const, description: "Physics tutoring details here." },
    { id: "5", title: "Free Lunch Event", date: "Mar 6 • 11 AM - 2 PM", club: "Google Developer Student Club", location: "PFT 1145", type: "chatbubble-outline" as const, description: "Free lunch event details here." },
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

  useEffect(() => { activeFloorRef.current = activeFloor; }, [activeFloor]);
  useEffect(() => { mapSizeRef.current = mapSize; }, [mapSize]);

  useEffect(() => {
    if (!location || hasCenteredOnUser.current) return;
    hasCenteredOnUser.current = true;
    const { x, z } = gpsToModelCoords(location.coords.latitude, location.coords.longitude);
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

  const pinPanResponder = useMemo(
      () =>
          PanResponder.create({
            onStartShouldSetPanResponder: () => pinMode,
            onMoveShouldSetPanResponder: () => pinMode,
            onPanResponderGrant: (evt) => {
              if (!pinMode) return;
              const point = getPinPointFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
              if (point) { previewPinRef.current = point; setPreviewPin(point); }
            },
            onPanResponderMove: (evt) => {
              if (!pinMode) return;
              const point = getPinPointFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
              if (point) previewPinRef.current = point;
            },
            onPanResponderRelease: () => {
              if (previewPinRef.current) setPins((prev) => [...prev, previewPinRef.current!]);
              previewPinRef.current = null;
              setPreviewPin(null);
              setPinMode(false);
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
              panelHeightAnim.setValue(
                  Math.max(COLLAPSED_HEIGHT, Math.min(expandedPanelHeight, nextHeight))
              );
            },
            onPanResponderRelease: (_, gesture) => {
              const projectedHeight = dragStartHeightRef.current - gesture.dy;
              const stops = [COLLAPSED_HEIGHT, MID_HEIGHT, expandedPanelHeight];
              let destination = stops[0];
              let minDistance = Math.abs(projectedHeight - stops[0]);
              for (let i = 1; i < stops.length; i++) {
                const distance = Math.abs(projectedHeight - stops[i]);
                if (distance < minDistance) { minDistance = distance; destination = stops[i]; }
              }
              if (gesture.vy < -0.9) {
                destination = projectedHeight < MID_HEIGHT ? MID_HEIGHT : expandedPanelHeight;
              } else if (gesture.vy > 0.9) {
                destination = projectedHeight > MID_HEIGHT ? MID_HEIGHT : COLLAPSED_HEIGHT;
              }
              snapPanelTo(destination);
            },
            onPanResponderTerminate: () => { snapPanelTo(COLLAPSED_HEIGHT); },
          }),
      [collapseStretchPanel, expandStretchPanel, expandedPanelHeight, panelExpanded, panelHeightAnim]
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

  // Double-tap to select room → zoom into it + open detail sheet
  const handleRoomSelect = useCallback(
      (hitboxId: string | null) => {
        if (!hitboxId) {
          setSelectedRoom(null);
          setSelectedNode(null);
          return;
        }

        const now = Date.now();
        const isDoubleTap =
            hitboxId === lastTapRoomRef.current && now - lastTapTimeRef.current < 400;
        lastTapTimeRef.current = now;
        lastTapRoomRef.current = hitboxId;

        if (!isDoubleTap) {
          // Single tap — highlight only
          setSelectedRoom(hitboxId);
          return;
        }

        // Double tap — zoom in, open detail sheet, no path yet
        const navId = getNavNodeId(hitboxId, activeFloorRef.current);
        const node = navId ? getNode(navId) : null;

        setSelectedRoom(hitboxId);
        setSelectedNode(node);
        setSheetView("detail");
        setActiveRoute(null);
        setPathWaypoints([]);
        focusRoom(hitboxId, activeFloorRef.current);
        setShowCollapsedPill(false);

        setTimeout(() => {
          bottomSheetRef.current?.snapToIndex(0);
          setSheetIndex(0);
          sheetIndexRef.current = 0;
        }, 50);
      },
      [focusRoom]
  );

  const getFromNodeId = useCallback((): string => {
    if (!location) return START_NODE_ID;
    const { x, y } = gpsToNodeCoords(location.coords.latitude, location.coords.longitude);
    const nearest = snapToNode(x, y, activeFloorRef.current);
    if (nearest) {
      console.log("[from node]", nearest.id, nearest.label);
      return nearest.id;
    }
    return START_NODE_ID;
  }, [location, snapToNode]);

  const handleNavigate = useCallback(
      (accessible = false) => {
        if (!selectedNode) return;
        const fromId = getFromNodeId();
        const result = getTestRoute(fromId, selectedNode.id);
        const waypoints = routeToWaypoints(result);
        setActiveRoute(result);
        setPathWaypoints(waypoints);
        setSheetView("directions");
        bottomSheetRef.current?.snapToIndex(0);
        setSheetIndex(0);
        sheetIndexRef.current = 0;
        if (waypoints.length >= 2)
          zoomToWaypoints(waypoints, lerpRadiusRef, lerpTargetRef, 0.50);
      },
      [selectedNode, getTestRoute, getFromNodeId]
  );

  const handleAvoidStairsChange = useCallback(
      (val: boolean) => {
        if (!selectedNode) return;
        const fromId = getFromNodeId();
        const result = getTestRoute(fromId, selectedNode.id);
        setActiveRoute(result);
      },
      [selectedNode, getTestRoute, getFromNodeId]
  );

  const handleConfirmRoute = useCallback(() => {
    if (!activeRoute || !selectedNode) return;
    destNodeIdRef.current = selectedNode.id;
    lastRerouteNodeRef.current = null;
    bottomSheetRef.current?.close();
    setSheetIndex(-1); sheetIndexRef.current = -1;
    setShowCollapsedPill(false);
    setIsNavigating(true);
    zoomToNavStart(pathWaypoints, lerpRadiusRef, lerpTargetRef, lerpThetaRef, lerpPhiRef);
  }, [activeRoute, selectedNode, pathWaypoints]);

  const handleEndRoute = useCallback(() => {
    navHeadingRef.current = null;
    destNodeIdRef.current = null;
    lastRerouteNodeRef.current = null;
    setIsNavigating(false);
    setActiveRoute(null);
    setSelectedRoom(null);
    setSelectedNode(null);
    setPathWaypoints([]);
    setSheetView("default");
    setSheetIndex(-1); sheetIndexRef.current = -1;
    setTimeout(() => setShowCollapsedPill(true), 300);
  }, []);

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
            onStartShouldSetPanResponder: (e) => {
              if (pinMode) return false;
              return e.nativeEvent.pageY < sheetTopYRef.current;
            },
            onMoveShouldSetPanResponder: (e) => {
              if (pinMode) return false;
              return e.nativeEvent.pageY < sheetTopYRef.current;
            },

            onPanResponderGrant: (e) => {
              const { pageX, pageY, touches } = e.nativeEvent;
              touchStartRef.current = { x: pageX, y: pageY };
              touchMovedRef.current = false;
              prevTouches.current = touches.map((t) => ({ x: t.pageX, y: t.pageY }));

              const cam = cameraRef.current;
              if (cam) {
                const { width, height } = mapSizeRef.current;
                const hit = getRoomAtScreenPoint(pageX, pageY, activeFloorRef.current, cam, width, height);
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
                prevTouches.current = [{ x: touches[0].pageX, y: touches[0].pageY }];
              } else if (touches.length === 2) {
                touchMovedRef.current = true;
                const [t0, t1] = [touches[0], touches[1]];
                const currDist = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
                const currMid = { x: (t0.pageX + t1.pageX) / 2, y: (t0.pageY + t1.pageY) / 2 };

                if (prevTouches.current.length === 2) {
                  const [p0, p1] = prevTouches.current;
                  const prevDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                  const prevMid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
                  const distDelta = currDist - prevDist;
                  const midDelta = { x: currMid.x - prevMid.x, y: currMid.y - prevMid.y };

                  gestureRef.current.deltaZoom += distDelta * 0.15;
                  gestureRef.current.pinchMidpoint = currMid;

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

  // Location watcher
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
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 100, distanceInterval: 0.5 },
          (loc) => {
            setLocation(loc);
            if (loc.coords.heading != null && loc.coords.heading >= 0) {
              navHeadingRef.current = loc.coords.heading;
            }
          }
      );

    })();
    return () => { subscription?.remove(); };
  }, []);

  // Live reroute: recalculate route + remaining time whenever user moves to a new node
  // Live reroute: trim path + update steps as user moves through nodes
  useEffect(() => {
    if (!isNavigating || !location || !destNodeIdRef.current) return;
    const { x, y } = gpsToNodeCoords(location.coords.latitude, location.coords.longitude);
    const nearest = snapToNode(x, y, activeFloorRef.current);
    if (!nearest) return;

    // Recalculate whenever nearest node changes
    if (nearest.id === lastRerouteNodeRef.current) return;
    lastRerouteNodeRef.current = nearest.id;

    if (nearest.id === destNodeIdRef.current) {
      handleEndRoute();
      return;
    }

    const newRoute = getTestRoute(nearest.id, destNodeIdRef.current);
    if (!newRoute) return;

    // Trim the path: remove waypoints behind the user by finding which
    // waypoint is closest to the current nearest node world position,
    // then slicing from there forward.
    const nodeWorldX = nearest.x * 0.1;
    const nodeWorldZ = nearest.y * 0.1;
    const newWaypoints = routeToWaypoints(newRoute);

    // Find the waypoint index closest to the current node
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < newWaypoints.length; i++) {
      const [wx, , wz] = newWaypoints[i];
      const d = Math.hypot(wx - nodeWorldX, wz - nodeWorldZ);
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    }

    // Keep from the closest point forward so the ribbon shrinks behind the user
    const trimmedWaypoints = newWaypoints.slice(closestIdx) as [number, number, number][];

    setActiveRoute(newRoute);
    setPathWaypoints(trimmedWaypoints.length >= 2 ? trimmedWaypoints : newWaypoints);
  }, [location, isNavigating, snapToNode, getTestRoute, handleEndRoute]);

  // Floor model preload
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

  const handleSheetChange = useCallback((index: number) => {
    setSheetIndex(index);
    sheetIndexRef.current = index;

    if (index === -1 && !isNavigating) {
      setSelectedRoom(null);
      setSelectedNode(null);
      setActiveRoute(null);
      setPathWaypoints([]);
      setSheetView("default");
      setTimeout(() => setShowCollapsedPill(true), 1);
    } else if (index !== -1) {
      setShowCollapsedPill(false);
    }
  }, [isNavigating]);

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
          <Canvas style={styles.canvasAbsolute} camera={{ position: [0, 0, 0], fov: 45 }}>

            <color attach="background" args={["#c9dff0"]} />  {/* sky blue */}

            {activeFloor === 1 && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} renderOrder={-1}>
                  <planeGeometry args={[200, 200]} />
                  <meshStandardMaterial color="#7a9e6e" />
                </mesh>
            )}

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
                        isNavigating={isNavigating}
                    />
                )}
              </group>

              {pathWaypoints.length >= 2 && (
                  <TestPath waypoints={pathWaypoints} />
              )}

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
                lerpTargetRef={lerpTargetRef}
                maxRadius={FLOOR_CONFIG[activeFloor].switchRadius}
                cameraRef={cameraRef}
                targetRef={cameraTargetRef}
                mapSizeRef={mapSizeRef}
                lerpThetaRef={lerpThetaRef}
                lerpPhiRef={lerpPhiRef}
            />
          </Canvas>

          {!pinMode && (
              <View
                  style={[styles.mapGestureLayer, { height: sheetTopY }]}
                  pointerEvents="auto"
                  {...cameraPanResponder.panHandlers}
              />
          )}

          {sheetIndex === -1 && !isNavigating && (
              <Pressable
                  onPress={() => setPinMode((prev) => !prev)}
                  style={{
                    position: "absolute", bottom: 140, right: 20,
                    backgroundColor: pinMode ? "red" : "blue",
                    padding: 12, borderRadius: 24, zIndex: 20,
                  }}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  {pinMode ? "Placing..." : "Add Pin"}
                </Text>
              </Pressable>
          )}

          {sheetIndex === -1 && !isNavigating && (
              <FloorSwitcher
                  activeFloor={activeFloor}
                  onFloorChange={(floor) => {
                    const nextFloor = floor as FloorNumber;
                    activeFloorRef.current = nextFloor;
                    setActiveFloor(nextFloor);
                    lerpRadiusRef.current = FLOOR_CONFIG[nextFloor].snapRadius;
                  }}
              />
          )}

          {pinMode && (
              <View style={styles.pinOverlay} {...pinPanResponder.panHandlers} />
          )}

          {/* TestPathLabel must be BEFORE BottomSheet and NavOverlay in tree */}
          <TestPathLabel label={selectedNode?.label} isNavigating={isNavigating} />

          {isNavigating && activeRoute && (
              <NavOverlay
                  route={activeRoute}
                  destinationLabel={selectedNode?.label}
                  onEndRoute={handleEndRoute}
              />
          )}

          {!isNavigating && showCollapsedPill && (
              <Animated.View
                  style={[
                    styles.stretchPanelWrap,
                    { height: panelHeightAnim, left: panelLeft, right: panelRight, bottom: panelBottom },
                  ]}
              >
                <Animated.View
                    style={[
                      styles.stretchPanel,
                      { borderRadius: panelRadius, backgroundColor: panelBackgroundColor },
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
                        { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
                      ]}
                      pointerEvents={panelExpanded ? "auto" : "none"}
                  >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                      {sheetView === "profile" ? (
                          <View style={{ paddingHorizontal: 20 }}>
                            <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
                              Profile
                            </Text>
                            <Pressable onPress={() => setSheetView("default")} style={{ marginBottom: 16 }}>
                              <Text style={{ color: "#3498DB", fontWeight: "600" }}>← Back</Text>
                            </Pressable>
                            <Text style={{ fontSize: 16, marginBottom: 10 }}>Saved Pins</Text>
                            <Text style={{ fontSize: 16, marginBottom: 10 }}>Saved Events</Text>
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
                            <Pressable onPress={() => setSelectedEvent(null)} style={styles.backButton}>
                              <Text style={styles.backButtonText}>← Back</Text>
                            </Pressable>
                            <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
                            <View style={styles.eventActionRow}>
                              <Pressable style={styles.eventActionButton}>
                                <Ionicons name="bookmark-outline" size={22} color="#222" />
                                <Text style={styles.eventActionText}>Saved</Text>
                              </Pressable>
                              <Pressable style={styles.eventActionButton}>
                                <Ionicons name="arrow-redo-outline" size={22} color="#222" />
                                <Text style={styles.eventActionText}>Navigate</Text>
                              </Pressable>
                            </View>
                            <Text style={styles.eventMeta}>{selectedEvent.date}</Text>
                            <Text style={styles.eventMeta}>{selectedEvent.location}</Text>
                            <Text style={styles.eventSectionTitle}>Description</Text>
                            <Text style={styles.eventDescription}>{selectedEvent.description}</Text>
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
                                <Text style={styles.emptytext}>No matching events found.</Text>
                            )}
                            <Text style={styles.radiusText}>
                              Floor: L{activeFloor} • Radius: {cameraRadius.toFixed(1)}
                            </Text>
                          </View>
                      )}
                    </ScrollView>
                  </Animated.View>
                </Animated.View>
              </Animated.View>
          )}

          {!isNavigating && (
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
                            setPathWaypoints([]);
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
                          onConfirm={handleConfirmRoute}
                          onBack={() => {
                            setSheetView("detail");
                            setPathWaypoints([]);
                            bottomSheetRef.current?.snapToIndex(0);
                            if (selectedRoom) focusRoom(selectedRoom, activeFloor);
                          }}
                      />
                  )}
                </BottomSheetScrollView>
              </BottomSheet>
          )}
        </View>
      </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptytext: { paddingHorizontal: 20, color: "#666", marginTop: 8, fontSize: 15 },
  canvasAbsolute: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  pinOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 3 },
  stretchPanelWrap: { position: "absolute", zIndex: 50 },
  stretchPanel: {
    flex: 1, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.75)",
    overflow: "hidden", shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08,
    shadowRadius: 14, elevation: 8,
  },
  dragHeader: { paddingTop: 6 },
  stretchHandleArea: { alignItems: "center", paddingTop: 4, paddingBottom: 2 },
  stretchHandle: { width: 70, height: 4, borderRadius: 999, backgroundColor: "rgba(56, 54, 54, 0.80)" },
  stretchSearchShell: { marginHorizontal: 0, marginBottom: 4, borderRadius: 30, backgroundColor: "transparent", paddingVertical: 0 },
  stretchContentWrap: { flex: 1, paddingBottom: 18 },
  bottomSheetBackground: {
    backgroundColor: "rgba(235, 235, 218, 1)",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 1, borderColor: "rgb(255, 255, 255)", overflow: "hidden",
  },
  handleIndicator: { width: 42, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.25)" },
  sheetContentContainer: { paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#333", marginTop: 8, paddingHorizontal: 20 },
  radiusText: { marginTop: 16, marginBottom: 30, color: "#333", fontWeight: "600", paddingHorizontal: 20 },
  mapGestureLayer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 },
  eventTitle: { fontSize: 22, fontWeight: "700", color: "#222", marginBottom: 8, paddingHorizontal: 20 },
  eventMeta: { fontSize: 14, color: "#666", marginBottom: 4, paddingHorizontal: 20 },
  eventSectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 18, fontWeight: "700", color: "#222", paddingHorizontal: 20 },
  eventDescription: { fontSize: 15, color: "#333", lineHeight: 22, paddingHorizontal: 20 },
  backButton: { marginBottom: 16, alignSelf: "flex-start", paddingHorizontal: 20 },
  backButtonText: { fontSize: 16, fontWeight: "600", color: "#3498DB" },
  eventActionRow: { flexDirection: "row", gap: 14, marginTop: 14, marginBottom: 18, paddingHorizontal: 20 },
  eventActionButton: {
    backgroundColor: "#BFDDF3", borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 18,
    alignItems: "center", justifyContent: "center", minWidth: 92,
  },
  eventActionText: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "#222" },
});