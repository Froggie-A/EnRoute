import "../../global.css";
import { Magnetometer } from "expo-sensors";
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
  Keyboard,
  TextInput,
  Easing,
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
import { BlurView } from "expo-blur";

import NodeDebugLayer from "@/components/nodeDebugLayer"

import { FloorSwitcher } from "@/components/floorSwitcher";
import SearchBarRow from "@/components/SearchBarRow";
import NearbyChips from "@/components/NearbyChips";
import EventCard from "@/components/EventCard";
import RoomHitboxes, {
  getRoomAtScreenPoint,
  getRoomById,
  getNavNodeId,
  findRoomBySearch as findRoomHitboxBySearch,
  findRoomsStartingWith
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
import PlacePinButton from "@/components/placePinButton";

// GLB 3D Model Imports
const FLOOR_MODELS = {
  1: require("../../assets/models/1stFloorModel.glb"),
  2: require("../../assets/models/2ndFloorModel.glb"),
  3: require("../../assets/models/3rdFloorModel.glb"),
} as const;

// Items for the Half-Sheet.
// This includes that room detail page, directions page, profile page, and the default search page.
type SheetView = "default" | "detail" | "directions" | "profile";

// Handles the gesture movements
type GestureState = {
  deltaRotate: { x: number; y: number };
  deltaZoom: number;
  deltaPan: { x: number; y: number };
  pinchMidpoint: { x: number; y: number } | null;
};

// Thresholds for the different floors for zooming in and zooming out. 
type FloorNumber = keyof typeof FLOOR_MODELS;
const FLOOR_CONFIG: Record<
    FloorNumber,
    { switchRadius: number; snapRadius: number; zoomInRadius: number }
> = {
  1: { switchRadius: 50, snapRadius: 10, zoomInRadius: 5 },
  2: { switchRadius: 120, snapRadius: 10, zoomInRadius: 5 },
  3: { switchRadius: 200, snapRadius: 10, zoomInRadius: 5 },
};

// The heights for the half sheet
const COLLAPSED_HEIGHT = 84;
const MID_HEIGHT = 420;
const EXPANDED_HEIGHT_FRACTION = 0.82;

const SNAP_FRACTIONS = [0.5, 0.75, 0.9];
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

// Calibrated affine transform: GPS → node space.
// Calibrated from 3 confirmed ground-truth GPS readings:
//   entrance0 (48,-32), entrance2 (-59,-32), room_1272 (-15,5)
// Uses centered+scaled coords for numerical stability (condition number ~45).
const _GPS_LAT_MEAN = 30.4076288440;
const _GPS_LON_MEAN = -91.1800997696;
const _GPS_LAT_SCALE = 111000.0;
const _GPS_LON_SCALE = 96000.0;

function gpsToNodeCoords(lat: number, lon: number): { x: number; y: number } {
  const dlat = (lat - _GPS_LAT_MEAN) * _GPS_LAT_SCALE;
  const dlon = (lon - _GPS_LON_MEAN) * _GPS_LON_SCALE;
  return {
    x: 0.81915305 * dlat + 0.66436662 * dlon + (-8.66666667),
    y: -0.30001749 * dlat + 0.72257358 * dlon + (-19.66666667),
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
        0.35,
        Math.min(Math.PI / 2.15, spherical.current.phi - g.deltaRotate.y * 0.0032)
    );

// drag map naturally with finger
    targetRef.current.addScaledVector(right, g.deltaPan.x * 0.009);
    targetRef.current.addScaledVector(forward, g.deltaPan.y * 0.009);

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

    g.deltaRotate.x *= 0.70;
    g.deltaRotate.y *= 0.70;
    g.deltaZoom *= 0.65;
    g.deltaPan.x *= 0.72;
    g.deltaPan.y *= 0.72;

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

// Swipe function to delete the exising pins under the profile page
function SwipeDeletePinRow({
  pin,
  index,
  onPress,
  onDelete,
  getPinHex,
}: {
  pin: Pin;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  getPinHex: (color?: Pin["color"]) => string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const startXRef = useRef(0);
  const isOpenRef = useRef(false);
  const isSwipingRef = useRef(false);

  const DELETE_WIDTH = 90;
  const OPEN_THRESHOLD = -10;

  const animateTo = (value: number) => {
    translateX.stopAnimation();

    Animated.timing(translateX, {
      toValue: value,
      duration: 110,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      startXRef.current = value;
      isOpenRef.current = value === -DELETE_WIDTH;
    });
  };

  const closeRow = () => animateTo(0);
  const openRow = () => animateTo(-DELETE_WIDTH);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 6 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.8,

      onPanResponderGrant: () => {
        isSwipingRef.current = true;

        translateX.stopAnimation((value) => {
          startXRef.current = value;
        });
      },

      onPanResponderMove: (_, gesture) => {
        let nextX = startXRef.current + gesture.dx;

        if (nextX > 0) nextX = 0;
        if (nextX < -DELETE_WIDTH) nextX = -DELETE_WIDTH;

        translateX.setValue(nextX);
      },

      onPanResponderRelease: (_, gesture) => {
      let finalX = startXRef.current + gesture.dx;
      finalX = Math.min(0, Math.max(finalX, -DELETE_WIDTH));

      const swipedLeftFarEnough = finalX <= -10;
      const swipedFastLeft = gesture.vx < -0.1;

      if (swipedLeftFarEnough || swipedFastLeft) {
        openRow();
      } else {
        closeRow();
      }

      setTimeout(() => {
        isSwipingRef.current = false;
      }, 120);
    },

      onPanResponderTerminate: () => {
        isOpenRef.current ? openRow() : closeRow();

        setTimeout(() => {
          isSwipingRef.current = false;
        }, 120);
      },
    })
  ).current;

  return (
    <View style={styles.swipeDeleteWrap}>
      <Pressable
        style={styles.deleteButton}
        onPress={() => {
          closeRow();
          onDelete();
        }}
      >
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </Pressable>

      <Animated.View
        style={[
          styles.savedPinRow,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={() => {
            if (!isSwipingRef.current) onPress();
          }}
          style={styles.savedPinPressable}
        >
          <View style={styles.savedPinLeft}>
            <Ionicons name="pin" size={20} color={getPinHex(pin.color)} />

            <Text style={styles.savedItemNoBorder}>
              {pin.title || "Untitled Pin"}
            </Text>
          </View>

          <View style={styles.swipeIndicator}>
            <View style={styles.swipeLine} />
            <View style={styles.swipeLine} />
            <View style={styles.swipeLine} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}



//── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {

  const previewPinRef = useRef<Pin | null>(null);
  const [activeFloor, setActiveFloor] = useState<FloorNumber>(1);
  const [cameraRadius, setCameraRadius] = useState(FLOOR_CONFIG[1].snapRadius);
  const [isReady, setIsReady] = useState(false);

  const sceneRef = useRef<THREE.Object3D[] | null>(null);

  const [pendingPin, setPendingPin] = useState<Pin | null>(null);
  const [editingPinIndex, setEditingPinIndex] = useState<number | null>(null);
  const [customizingPreviewPin, setCustomizingPreviewPin] = useState<Pin | null>(null);
  const [pinTitle, setPinTitle] = useState("");
  const [pinColor, setPinColor] = useState<"red" | "blue" | "green" | "yellow">("red");

  const [showPinSavedToast, setShowPinSavedToast] = useState(false);
  const pinSavedAnim = useRef(new Animated.Value(120)).current;

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

  const [compassHeading, setCompassHeading] = useState(0);

  const [mapSize, setMapSize] = useState({ width: 400, height: 800 });
  const [search, setSearch] = useState("");
  const [pinMode, setPinMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [pathWaypoints, setPathWaypoints] = useState<[number, number, number][]>([]);

  const [isNavigating, setIsNavigating] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [userNodeId, setUserNodeId] = useState<string | null>(null);
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const [pins, setPins] = useState<Pin[]>([]);
  const [previewPin, setPreviewPin] = useState<Pin | null>(null);
  const [panelView, setPanelView] = useState<"main" | "profile">("main");
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

  const [savedEvents, setSavedEvents] = useState<any[]>([]);

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
  const fullPathWaypointsRef   = useRef<[number, number, number][]>([]);


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

  const { snapToNode } = useRoute();
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

  const resetCollapsedPanel = useCallback(() => {
    setSearch("");
    setSelectedEvent(null);
    setPanelView("main");
    setSheetView("default");
}, []);
  useEffect(() => {
    Magnetometer.setUpdateInterval(100);

    const sub = Magnetometer.addListener(({ x, y }) => {
      let heading = Math.atan2(-y, x) * (180 / Math.PI);
      heading = 90 - heading;

      if (heading < 0) heading += 360;
      if (heading >= 360) heading -= 360;

      setCompassHeading(heading);
    });

    return () => sub.remove();
  }, []);

  const snapPanelTo = useCallback(
    (toValue: number) => {
      let level: "collapsed" | "mid" | "full" = "collapsed";

      if (toValue === MID_HEIGHT) level = "mid";
      if (toValue === expandedPanelHeight) level = "full";

      if (level === "collapsed") {
        Keyboard.dismiss();
        resetCollapsedPanel();
      }

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
    [panelHeightAnim, expandedPanelHeight, resetCollapsedPanel]
  );

  const toggleSaveEvent = useCallback((event: any) => {
    setSavedEvents((prev) => {
      const exists = prev.some((e) => e.title === event.title);

      if (exists) {
        return prev.filter((e) => e.title !== event.title);
      }

      return [...prev, event];
    });
  }, []);

  const isSaved = useCallback(
    (title: string) => savedEvents.some((e) => e.title === title),
    [savedEvents]
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
    outputRange: ["rgba(189, 189, 189, 0.50)", "rgba(235, 235, 218, 1)",],
    extrapolate: "clamp",
  });

  // Events for the Search Bar
  const events = [
    {
      id: "1",
      title: "Resume Help",
      date: "Feb 28 • 11 AM - 7 PM",
      club: "Student Government",
      location: "PFT 1200",
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

  // Filtering for the events and rooms in the search bar half sheet.
const filteredEvents = useMemo(() => {
  const query = search.trim().toLowerCase();
  const queryNumber = query.replace(/\D/g, "");

  const roomResults: any[] = [];

  if (queryNumber) {
    for (const floor of [1, 2, 3] as FloorNumber[]) {
      const rooms = findRoomsStartingWith(floor, queryNumber);

      rooms.forEach((room) => {
        const roomNumber = room.id.match(/\d+/)?.[0] || room.id;

        roomResults.push({
          id: `room-${floor}-${room.id}`,
          title: roomNumber,
          date: `Floor L${floor}`,
          club: "Room",
          location: "PFT " + roomNumber,
          type: "location-outline" as const,
          description: `${room.name} is located on Floor L${floor}.`,
          isRoom: true,
          roomId: room.id,
          floor,
        });
      });
    }
  }

  const normalEvents = events.filter((event) => {
    if (!query) return true;

    const eventRoomNumber = event.location.match(/\d+/)?.[0] || "";

    return (
      eventRoomNumber.startsWith(queryNumber) ||
      event.title.toLowerCase().includes(query) ||
      event.club.toLowerCase().includes(query)
    );
  });

  return [...roomResults, ...normalEvents];
}, [search]);

useEffect(() => {
  activeFloorRef.current = activeFloor;
  setUserNodeId(null);
}, [activeFloor]);

useEffect(() => {
  mapSizeRef.current = mapSize;
}, [mapSize]);

  useEffect(() => {
    if (!location || hasCenteredOnUser.current) return;
    hasCenteredOnUser.current = true;
    // const { x, z } = gpsToModelCoords(location.coords.latitude, location.coords.longitude);
    // cameraTargetRef.current.set(x, 0, z);
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
    const zoomRadius = Math.max(5, Math.max(sy, sz) * groupScale * 1.4);
    lerpRadiusRef.current = zoomRadius;
  }, []);

const findRoomBySearch = useCallback(() => {
  const query = search.trim().toLowerCase();
  if (!query) return;

  for (const floor of [1, 2, 3] as FloorNumber[]) {
    const room = findRoomHitboxBySearch(floor, query);
    const roomNumber = room?.id.match(/\d+/)?.[0] || "";

    // only zoom if the typed search exactly matches a room number
    if (!room || roomNumber !== query) continue;

    const navId = getNavNodeId(room.id, floor);
    const node = navId ? getNode(navId) : null;
    if (!node) return;

    activeFloorRef.current = floor;
    setActiveFloor(floor);

    setSelectedRoom(room.id);
    setSelectedNode(node);
    setSheetView("detail");
    setActiveRoute(null);
    setPathWaypoints([]);
    setSelectedEvent(null);

    setSearch("");
    setShowCollapsedPill(false);
    setPanelExpanded(false);
    setPanelLevel("collapsed");

    Animated.timing(panelHeightAnim, {
      toValue: COLLAPSED_HEIGHT,
      duration: 100,
      useNativeDriver: false,
    }).start();

    focusRoom(room.id, floor);
    requestAnimationFrame(() => {
      bottomSheetRef.current?.snapToIndex(0);
      setSheetIndex(0);
      sheetIndexRef.current = 0;
    });
    

    return;
  }

  console.log("No exact room found for search:", query);
}, [search, focusRoom]);

// Function that zooms in on a pin when clicked in the profile page. 
  const focusPin = useCallback((pin: Pin) => {
  if (pin.floor !== activeFloorRef.current) {
    activeFloorRef.current = pin.floor;
    setActiveFloor(pin.floor);
  }

  cameraTargetRef.current.set(
    pin.x,
    pin.y,
    pin.z
  );

  lerpRadiusRef.current = 3.5;
}, []);

// Maps the 3D Pin model color to a hex color for the saved pins icon under the profile. 
const getPinHex = (color?: Pin["color"]) => {
  switch (color) {
    case "blue":
      return "#2F80ED";
    case "green":
      return "#27AE60";
    case "yellow":
      return "#F2C94C";
    case "red":
    default:
      return "#D94040";
  }
};

const [mode, setMode] = useState<"pin" | "navigate" | null>(null);

// Function that allows user to touch the 3D Pin Model
const getPinPointFromTouch = useCallback(
    (pageX: number, pageY: number): Pin | null => {
      const cam = cameraRef.current;
      if (!cam || mapSize.width <= 0 || mapSize.height <= 0) return null;

      const pointer = pointerRef.current;
      const raycaster = raycasterRef.current;

      pointer.x = (pageX / mapSize.width) * 2 - 1;
      pointer.y = -(pageY / mapSize.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cam);

      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PIN_Y);
      const point = new THREE.Vector3();

      const didHit = raycaster.ray.intersectPlane(floorPlane, point);

      if (!didHit) return null;

      return {
        x: point.x,
        y: PIN_Y,
        z: point.z,
        floor: activeFloorRef.current,
      };
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

        if (point) {
          previewPinRef.current = point;
        }
      },

        onPanResponderRelease: () => {
          const finalPin = previewPinRef.current;

          if (finalPin) {
            setPendingPin(finalPin);
            setCustomizingPreviewPin(finalPin);
            setPinTitle("");
            setPinColor("red");
          }

          previewPinRef.current = null;
          setPreviewPin(null);
          setPinMode(false);
          setMode(null);
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

  const showPinSavedMessage = useCallback(() => {
  setShowPinSavedToast(true);

  Animated.sequence([
    Animated.spring(pinSavedAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }),
    Animated.delay(1600),
    Animated.timing(pinSavedAnim, {
      toValue: 120,
      duration: 250,
      useNativeDriver: true,
    }),
  ]).start(() => {
    setShowPinSavedToast(false);
  });
}, [pinSavedAnim]);

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
  // DEMO VALUES
  const DEMO_MODE = true;
  const DEMO_START_NODE = "vending0";
  

  const getFromNodeId = useCallback((): string => {
    if (DEMO_MODE) return DEMO_START_NODE;

    if (!location) return START_NODE_ID;

    const { x, y } = gpsToNodeCoords(
        location.coords.latitude,
        location.coords.longitude
    );

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
    fullPathWaypointsRef.current = pathWaypoints;
    zoomToNavStart(pathWaypoints, lerpRadiusRef, lerpTargetRef, lerpThetaRef, lerpPhiRef);
  }, [activeRoute, selectedNode, pathWaypoints]);

  const handleEndRoute = useCallback(() => {
    navHeadingRef.current = null;
    destNodeIdRef.current = null;
    lastRerouteNodeRef.current = null;
    fullPathWaypointsRef.current  = [];

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

  const handleProfilePress = () => {
    setPanelView("profile");
    openSheet();
  };

  const getPinFromTouch = useCallback(
  (pageX: number, pageY: number): { pin: Pin; index: number } | null => {
    const cam = cameraRef.current;
    if (!cam || mapSize.width <= 0 || mapSize.height <= 0) return null;

    const pointer = pointerRef.current;
    const raycaster = raycasterRef.current;

    pointer.x = (pageX / mapSize.width) * 2 - 1;
    pointer.y = -(pageY / mapSize.height) * 2 + 1;
    raycaster.setFromCamera(pointer, cam);

    let closest: { pin: Pin; index: number } | null = null;
    let closestDistance = Infinity;

    pins.forEach((pin, index) => {
      if (pin.floor !== activeFloorRef.current) return;

      const pinPosition = new THREE.Vector3(pin.x, pin.y, pin.z);
      const distance = raycaster.ray.distanceToPoint(pinPosition);

      if (distance < 0.35 && distance < closestDistance) {
        closestDistance = distance;
        closest = { pin, index };
      }
    });

    return closest;
  },
  [pins, mapSize.width, mapSize.height]
);

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

              // ONE FINGER = MOVE / PAN MAP
              if (touches.length === 1) {
                const prev = prevTouches.current[0];

                if (prev) {
                  const dx = touches[0].pageX - prev.x;
                  const dy = touches[0].pageY - prev.y;

                  gestureRef.current.deltaPan.x += dx * 0.45;
                  gestureRef.current.deltaPan.y += dy * 0.45;
                }

                prevTouches.current = [{ x: touches[0].pageX, y: touches[0].pageY }];
              }

              // TWO FINGERS = 3D ROTATE/TILT + PINCH ZOOM
              else if (touches.length === 2) {
                touchMovedRef.current = true;

                const [t0, t1] = [touches[0], touches[1]];
                const currDist = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
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

                  // pinch zoom
                  gestureRef.current.deltaZoom += distDelta * 0.14;
                  gestureRef.current.pinchMidpoint = currMid;

                  // two-finger drag rotates/tilts the 3D camera
                  gestureRef.current.deltaRotate.x += midDelta.x * 0.7;
                  gestureRef.current.deltaRotate.y += midDelta.y * 0.55;
                }

                prevTouches.current = [
                  { x: t0.pageX, y: t0.pageY },
                  { x: t1.pageX, y: t1.pageY },
                ];
              }
            },

            onPanResponderRelease: (e) => {
              if (!touchMovedRef.current) {
                const tappedPin = getPinFromTouch(
                  e.nativeEvent.pageX,
                  e.nativeEvent.pageY
                );

                if (tappedPin) {
                  setEditingPinIndex(tappedPin.index);
                  setPendingPin(tappedPin.pin);
                  setPinTitle(tappedPin.pin.title || "");
                  setPinColor(tappedPin.pin.color || "red");
            

                  touchStartRef.current = null;
                  touchRoomRef.current = null;
                  touchMovedRef.current = false;
                  prevTouches.current = [];
                  return;
                }
              }

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
      [pinMode, handleRoomSelect,getPinFromTouch]
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
            // UserLocationMarker handles all node positioning via
            // its own GPS + dead reckoning logic. Do not override it here.
          }
      );

    })();
    return () => { subscription?.remove(); };
  }, []);

  // Live reroute: recalculate route + remaining time whenever user moves to a new node
  // Live reroute: trim path + update steps as user moves through nodes
// Live reroute: fires when UserLocationMarker advances to a new node.
  // userNodeId is the single source of truth for where the user is.
  useEffect(() => {
    if (!isNavigating || !userNodeId || !destNodeIdRef.current) return;

    // Only recalculate when user has moved to a different node
    if (userNodeId === lastRerouteNodeRef.current) return;
    lastRerouteNodeRef.current = userNodeId;

    if (userNodeId === destNodeIdRef.current) {
      handleEndRoute();
      return;
    }

    const newRoute = getTestRoute(userNodeId, destNodeIdRef.current);
    if (!newRoute) return;

    const newWaypoints = routeToWaypoints(newRoute);
    setActiveRoute(newRoute);
    setPathWaypoints(newWaypoints.length >= 2 ? newWaypoints : []);
  }, [userNodeId, isNavigating, getTestRoute, handleEndRoute]);
  
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
        <color attach="background" args={["#c9dff0"]} />

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
            <NodeDebugLayer visible={showDebug} />
          </group>

          {location && (
              <UserLocationMarker
                  latitude={location.coords.latitude}
                  longitude={location.coords.longitude}
                  activeFloor={activeFloor}
                  isNavigating={isNavigating}
                  currentNodeId={userNodeId}
                  onNodeChange={setUserNodeId}
                  gpsAccuracy={location.coords.accuracy ?? 20}
                  routeNodeIds={
                    isNavigating && activeRoute
                        ? activeRoute.steps.map(s => s.node.id)
                        : []
                  }
                  onRerouteNeeded={(fromNodeId) => {
                    if (!destNodeIdRef.current) return;
                    const newRoute = getTestRoute(fromNodeId, destNodeIdRef.current);
                    if (newRoute) {
                      setActiveRoute(newRoute);
                      const wps = routeToWaypoints(newRoute);
                      setPathWaypoints(wps);
                    }
                  }}
              />
          )}

          {pathWaypoints.length >= 2 && (
              <TestPath
                  waypoints={pathWaypoints}
                  isNavigating={isNavigating}
                  fullWaypoints={isNavigating && fullPathWaypointsRef.current.length >= 2
                      ? fullPathWaypointsRef.current
                      : undefined}
                  completedFraction={
                    isNavigating && fullPathWaypointsRef.current.length >= 2
                        ? 1 - pathWaypoints.length / fullPathWaypointsRef.current.length
                        : 0
                  }
              />
          )}

          <PinLayer
            pins={pins}
            previewPin={
              previewPin
                ? previewPin
                : customizingPreviewPin
                  ? {
                      ...customizingPreviewPin,
                      color: pinColor,
                    }
                  : null
            }
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

      {sheetIndex === -1 && (
        <View style={styles.pinButton}>
        <Pressable
          onPress={() => setPinMode((prev) => !prev)}
          style={styles.pinPressable}
        >
          <View style={styles.pinContainer}>
            <View
              style={[
                styles.pinHead,
                { backgroundColor: pinMode ? "#FF5A5F" : "#D94040" },
              ]}
            />
            <View
              style={[
                styles.pinBase,
                { backgroundColor: pinMode ? "#FF5A5F" : "#D94040" },
              ]}
            />
          </View>
        </Pressable>

          <Pressable
              onPress={(e) => {
                e.stopPropagation();

                if (!location) return;

                const userNode = userNodeId ? getNode(userNodeId) : null;

                if (userNode) {
                  cameraTargetRef.current.set(userNode.x * 0.1, 0, userNode.y * 0.1);
                  lerpRadiusRef.current = FLOOR_CONFIG[activeFloorRef.current].zoomInRadius;
                  return;
                }

                const gps = gpsToNodeCoords(
                    location.coords.latitude,
                    location.coords.longitude
                );

                cameraTargetRef.current.set(gps.x * 0.1, 0, gps.y * 0.1);
                lerpRadiusRef.current = FLOOR_CONFIG[activeFloorRef.current].zoomInRadius;
              }}
              hitSlop={12}
          >
            <Ionicons
                name="navigate"
                size={26}
                color="#8FD3FF"
                style={[
                  styles.arrow,
                  {
                    transform: [
                      { rotate: `${compassHeading}deg` },
                    ],
                  },
                ]}
            />
          </Pressable>
      </View>
      )}

      {sheetIndex === -1 && (
          <Pressable
              onPress={() => setShowDebug(prev => !prev)}
              style={{
                position: "absolute",
                bottom: 200,
                left: 20,
                backgroundColor: showDebug ? "#007AFF" : "rgba(255,255,255,0.82)",
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 6,
              }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: showDebug ? "white" : "#333" }}>
              GRAPH
            </Text>
          </Pressable>
      )}

      {sheetIndex === -1 && (
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

      {pinMode && <View style={styles.pinOverlay} {...pinPanResponder.panHandlers} />}

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
              { borderRadius: panelRadius, backgroundColor: "transparent" },
            ]}
          >
            <BlurView
              intensity={80}
              tint= {"light"}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: panelRadius,
                  backgroundColor: panelBackgroundColor,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.55)",
                },
              ]}
            />
            <View style={styles.dragHeader} {...panelPanResponder.panHandlers}>
              <View style={styles.stretchHandleArea}>
                <View style={styles.stretchHandle} />
              </View>

              {!selectedEvent && panelView !== "profile" && (
                <View style={styles.stretchSearchShell}>
                  <SearchBarRow
                    search={search}
                    setSearch={setSearch}
                    onPressExpand={openSheet}
                    onPressProfile={handleProfilePress}
                    onSubmitSearch={findRoomBySearch}
                  />
                </View>
              )}
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
                {panelView === "profile" ? (
                  <View style={styles.profileSavedView}>
                    <View style={styles.profileCard}>
                      <View style={styles.profileInfo}>
                        <View style={styles.profileAvatar}>
                          <Ionicons name="person" size={24} color="#1A365D" />
                        </View>

                        <View>
                          <Text style={styles.profileName}>User</Text>
                          <Text style={styles.profileEmail}>mikeTheTiger@lsu.edu</Text>
                        </View>
                      </View>

                      <Pressable onPress={() => setPanelView("main")}>
                        <Ionicons name="close" size={34} color="#111" />
                      </Pressable>
                    </View>

                    {/* Saved Events */}
                    <Text style={styles.profileTitle}>Saved Events</Text>
                      <View style={styles.savedCard}>
                        {savedEvents.length === 0 ? (
                          <Text style={styles.savedItem}>No saved events yet</Text>
                        ) : (
                          savedEvents.map((event) => (
                            <Pressable
                              key={event.title}
                              onPress={() => {
                                setSelectedEvent(event);
                                setPanelView("main");
                                snapPanelTo(expandedPanelHeight);
                              }}
                            >
                              <Text style={styles.savedItem}>{event.title}</Text>
                            </Pressable>
                          ))
                        )}
                      </View>

                    {/* Saved Rooms */}
                    <Text style={styles.profileTitle}>Saved Rooms</Text>
                    <View style={styles.savedCard}>
                      <Text style={styles.savedItem}>PFT 1263</Text>
                      <Text style={styles.savedItem}>PFT 1200</Text>
                      <Text style={styles.savedItem}>PFT 1225</Text>
                    </View>

                    {/* Saved Pins */}
                    <Text style={styles.profileTitle}>Saved Pins</Text>
                    <View style={styles.savedCard}>
                      {pins.length === 0 ? (
                        <Text style={styles.savedItem}>No Saved Pins</Text>
                      ) : (
                        pins.map((pin, index) => (
                          <SwipeDeletePinRow
                            key={`saved-pin-${index}`}
                            pin={pin}
                            index={index}
                            getPinHex={getPinHex}
                            onPress={() => {
                              focusPin(pin);
                              setPanelView("main");
                              snapPanelTo(COLLAPSED_HEIGHT);
                            }}
                            onDelete={() => {
                              setPins((prev) => prev.filter((_, i) => i !== index));
                            }}
                          />
                        ))
                      )}
                    </View>
                  </View>

                ) : selectedEvent ? (
                  <View>
                    <View style={styles.detailHeaderRow}>
                      <Pressable
                        onPress={() => setSelectedEvent(null)}
                        style={styles.backButton}
                      >
                        <Ionicons name="arrow-back" size={24} color="#111" />
                      </Pressable>

                      <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
                    </View>

                    <View style={styles.eventActionRow}>
                      <Pressable
                        style={styles.eventActionButton}
                        onPress={() => toggleSaveEvent(selectedEvent)}
                      >
                        <Ionicons
                          name={isSaved(selectedEvent.title) ? "bookmark" : "bookmark-outline"}
                          size={22}
                          color="#111"
                        />
                        <Text style={styles.eventActionText}>
                          {isSaved(selectedEvent.title) ? "Saved" : "Save"}
                        </Text>
                      </Pressable>

                      <Pressable style={styles.eventActionButton}>
                        <Ionicons name="navigate-outline" size={22} color="#111" />
                        <Text style={styles.eventActionText}>Navigate</Text>
                      </Pressable>
                    </View>

                    <Text style={styles.sectionTitle}>About</Text>

                    <View style={styles.aboutCard}>
                      <View style={styles.aboutRow}>
                        <Ionicons name="calendar-outline" size={16} color="#222" />
                        <Text style={styles.aboutText}>{selectedEvent.date}</Text>
                      </View>

                      <View style={styles.aboutRowLast}>
                        <Ionicons name="location-outline" size={16} color="#222" />
                        <Text style={styles.aboutText}>{selectedEvent.location}</Text>
                      </View>
                    </View>

                    <Text style={styles.sectionTitle}>Event Details</Text>

                    <View style={styles.aboutCard}>
                      <Text style={styles.eventDetailText}>
                        {selectedEvent.description}
                      </Text>
                    </View>
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

                    {filteredEvents.map((event, index) => (
                      <EventCard
                        key={`${event.id}-${event.location}-${index}`}
                        title={event.title}
                        date={event.date}
                        club={event.club}
                        location={event.location}
                        type={event.type}
                        onPress={() => {
                          if ("isRoom" in event && event.isRoom) {
                            activeFloorRef.current = event.floor;
                            setActiveFloor(event.floor);

                            const navId = getNavNodeId(event.roomId, event.floor);
                            const node = navId ? getNode(navId) : null;

                            setSelectedRoom(event.roomId);
                            setSelectedNode(node);
                            setSheetView("detail");
                            setActiveRoute(null);
                            setPathWaypoints([]);
                            setSelectedEvent(null);

                            focusRoom(event.roomId, event.floor);
                            snapPanelTo(COLLAPSED_HEIGHT);
                            setShowCollapsedPill(false);

                            requestAnimationFrame(() => {
                              bottomSheetRef.current?.snapToIndex(0);
                              setSheetIndex(0);
                              sheetIndexRef.current = 0;
                            });

                            return;
                          }

                          setSearch("");
                          setSelectedEvent({
                            title: event.title,
                            date: event.date,
                            location: event.location,
                            description: event.description,
                          });
                        }}
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

      {pendingPin && (
         <View style={styles.pinCustomizeOverlay} pointerEvents="auto">
        <View style={styles.pinCustomizeCard}>
          <Text style={styles.pinCustomizeTitle}>Customize Pin</Text>

          <TextInput
            value={pinTitle}
            onChangeText={setPinTitle}
            placeholder="Pin Name"
            placeholderTextColor="#888"
            style={styles.pinInput}
          />

          <View style={styles.colorRow}>
            {[
              { label: "red" as const, hex: "#D94040" },
              { label: "blue" as const, hex: "#2F80ED" },
              { label: "green" as const, hex: "#27AE60" },
              { label: "yellow" as const, hex: "#F2C94C" },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => setPinColor(item.label)}
                style={[
                  styles.colorDot,
                  { backgroundColor: item.hex },
                  pinColor === item.label && styles.selectedColorDot,
                ]}
              />
            ))}
          </View>

          <View style={styles.pinActionRow}>
            <Pressable
              style={styles.cancelPinButton}
              onPress={() => {
              setPendingPin(null);
              setEditingPinIndex(null);
              setPreviewPin(null);
              setCustomizingPreviewPin(null);
            }}
            >
              <Text style={styles.cancelPinText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={styles.savePinButton}
              onPress={() => {
              const updatedPin: Pin = {
                ...pendingPin,
                title: pinTitle.trim() || "Untitled Pin",
                color: pinColor,
              };

              if (editingPinIndex !== null) {
                setPins((prev) =>
                  prev.map((pin, index) =>
                    index === editingPinIndex ? updatedPin : pin
                  )
                );
              } else {
                setPins((prev) => [...prev, updatedPin]);
              }

              setPendingPin(null);
              setEditingPinIndex(null);
              setPreviewPin(null);
              setCustomizingPreviewPin(null);
              showPinSavedMessage();
            }}
            >
              <Text style={styles.savePinText}>Save</Text>
            </Pressable>
          </View>
        </View>
        </View>
      )}

      {showPinSavedToast && (
        <Animated.View
          style={[
            styles.pinSavedToast,
            {
              transform: [{ translateY: pinSavedAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={22} color="#111" />
          <Text style={styles.pinSavedToastText}>
            Pin Saved Under Profile
          </Text>
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

                  if (selectedRoom) {
                    focusRoom(selectedRoom, activeFloor);
                  }
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
  container: { 
    flex: 1 
  },
  emptytext: { 
    paddingHorizontal: 20, 
    color: "#666", 
    marginTop: 8, 
    fontSize: 15 
  },
  canvasAbsolute: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  loaderWrap: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  pinOverlay: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 3 
  },
  stretchPanelWrap: { 
    position: "absolute",
    zIndex: 50 
  },

  stretchPanel: {
    flex: 1,
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
    paddingTop: 2,
    paddingBottom: 6,
  },

  stretchHandle: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(120, 120, 120, 0.35)",
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
    backgroundColor: "rgba(235, 235, 218, 1) ",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
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
    zIndex: 1,
  },

  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 42,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  eventTitle: {
    fontSize: 28,
    fontWeight: "500",
    color: "#222",
    flexShrink: 1,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#222",
    marginTop: 6,
    paddingHorizontal: 12,
  },

  aboutCard: {
    backgroundColor: "rgba(253, 254, 238, 1)",
    boxShadow: '0px 4px 4px 2px rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  aboutRowLast: {
    flexDirection: "row",
    alignItems: "center",
  },

  aboutText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#222",
  },

  eventDetailText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  eventActionRow: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 40,
    marginTop: 14,
    marginBottom: 18,
    paddingHorizontal: 20,
  },

  eventActionButton: {
    backgroundColor: "#BFDDF3",
    borderRadius: 14,
    width: 112,
    height: 72,
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 92,
  },

  eventActionText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  pinButton: {
    position: "absolute",
    bottom: 140,
    right: 20,
    width: 54,
    height: 110,
    borderRadius: 27,
    backgroundColor: "rgba(120, 116, 116, 0.75)",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 14,
    zIndex: 20,
    elevation: 10,
  },

  pinContainer: {
    alignItems: "center",
  },

  pinHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D94040",
    zIndex: 2,
  },

  pinBase: {
    width: 4,
    height: 16,
    backgroundColor: "#D94040",
    borderRadius: 2,
    marginTop: -4,
  },

  arrow: {
  },
  profileSavedView: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },

  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  profileTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },

  savedCard: {
    backgroundColor: "#FFFDF0",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  savedItem: {
    fontSize: 16,
    color: "#111",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.3)",
  },
    profileCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e7e6d8",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 22,
  },

  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d3d4bc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  profileEmail: {
    fontSize: 15,
    color: "#111",
  },

  pinCustomizeCard: {
 position: "absolute",
  top: "50%",
  left: "50%",
  transform: [
    { translateX: -145 }, 
    { translateY: -160 }, 
  ],
  width: 320,
  

  backgroundColor: "rgba(235, 235, 218, 1)",
  borderRadius: 22,
  padding: 18,
  zIndex: 100,
  elevation: 20,

  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
},


pinCustomizeTitle: {
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 12,
  color: "#111",
},

pinInput: {
  backgroundColor: "#FFFDF0",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.2)",
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 16,
  marginBottom: 14,
},

colorRow: {
  flexDirection: "row",
  gap: 14,
  marginBottom: 18,
},

colorDot: {
  width: 34,
  height: 34,
  borderRadius: 17,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.25)",
},

selectedColorDot: {
  borderWidth: 3,
  borderColor: "#111",
},

pinActionRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 12,
},

cancelPinButton: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 14,
  backgroundColor: "#DDD",
  alignItems: "center",
},

savePinButton: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 14,
  backgroundColor: "#BFDDF3",
  alignItems: "center",
},

cancelPinText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#111",
},

savePinText: {
  fontSize: 16,
  fontWeight: "700",
  color: "#111",
},
pinPressable: {
  alignItems: "center",
  justifyContent: "center",
},

arrowPressable: {
  alignItems: "center",
  justifyContent: "center",
  marginTop: 6,
},

pinSavedToast: {
  position: "absolute",
  bottom: 120,
  height: 46,
  alignSelf: "center", 
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 14,
  backgroundColor: "rgba(235, 235, 218, 1)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.8)",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  zIndex: 200,
  elevation: 30,
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
},

pinSavedToastText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#111",
},

swipeDeleteWrap: {
  position: "relative",
  overflow: "hidden",
  borderBottomWidth: 1,
  borderBottomColor: "rgba(0,0,0,0.3)",
},

deleteButton: {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: 90,
  backgroundColor: "#D94040",
  alignItems: "center",
  justifyContent: "center",
},

savedPinRow: {
  backgroundColor: "#FFFDF0",
},

savedPinPressable: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 12,
  paddingRight: 28,
},

savedPinLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  flex: 1,
},

savedItemNoBorder: {
  fontSize: 16,
  color: "#111",
},

swipeIndicator: {
  justifyContent: "center",
  alignItems: "flex-end",
  gap: 3,
},

swipeLine: {
  width: 14,
  height: 2,
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: 2,
},
pinCustomizeOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.45)",
  zIndex: 200,
  justifyContent: "flex-end",
  paddingHorizontal: 16,
  paddingBottom: 40,
},


});