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
} from "react-native";
import { Canvas, useThree, useFrame } from "@react-three/fiber/native";
import { useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";
import * as Location from "expo-location";
import * as THREE from "three";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

import { FloorSwitcher } from "@/components/floorSwitcher";
import SearchBarRow from "@/components/SearchBarRow";
import NearbyChips from "@/components/NearbyChips";
import EventCard from "@/components/EventCard";
import RoomHitboxes, {
  getRoomAtScreenPoint,
  getRoomById,
  getNavNodeId,
} from "@/components/roomHitbox";

import TestPathLabel from "@/components/testpathLabel";

import DirectionsSheet, { START_NODE_ID } from "@/components/Directions";
import RoomDetailSheet from "@/components/roomDetail";
import NavOverlay from "@/components/NavOverlay";
import PinLayer, { Pin } from "@/components/PinLayer";
import UserLocationMarker from "@/components/UserLocationMarker";
import IconLayer from "@/components/IconLayer";
import TestPath from "@/components/testpath";
import { useTestRoute } from "@/hooks/use-test-route";
import { routeToWaypoints } from "@/utils/routeToWaypoints";


import { getNode, NavNode } from "@/navigation/db";
import { normalizeLocationToBuilding } from "@/utils/buildingLocation";

import { useRoute } from "@/hooks/use-route";
import type { RouteResult } from "@/navigation/pathfinding";

const FLOOR_MODELS = {
  1: require("../../assets/models/newfloorplan.glb"),
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

const HARDCODED_LAT = 30.40775;
const HARDCODED_LON = -91.17995;
const BUILDING_MIN_LAT = 30.406977;
const BUILDING_MAX_LAT = 30.408520;
const BUILDING_MIN_LON = -91.180786;
const BUILDING_MAX_LON = -91.179059;

const NODE_MIN_X = -53;
const NODE_MAX_X =  48;
const NODE_MIN_Y = -40;
const NODE_MAX_Y =  15;

function gpsToNodeCoords(lat: number, lon: number): { x: number; y: number } {
  const norm = normalizeLocationToBuilding(lat, lon);
  return {
    x: NODE_MIN_X + norm.x * (NODE_MAX_X - NODE_MIN_X),
    y: NODE_MIN_Y + norm.y * (NODE_MAX_Y - NODE_MIN_Y),
  };
}

const MODEL_MIN_X = -12;
const MODEL_MAX_X = 12;
const MODEL_MIN_Z = -18;
const MODEL_MAX_Z = 18;

function gpsToModelCoords(lat: number, lon: number): { x: number; z: number } {
  const normX = (lon - BUILDING_MIN_LON) / (BUILDING_MAX_LON - BUILDING_MIN_LON);
  const normZ = (BUILDING_MAX_LAT - lat) / (BUILDING_MAX_LAT - BUILDING_MIN_LAT);
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
        <FloorModel key={`floor-${activeFloor}`} source={FLOOR_MODELS[activeFloor]} />
      </group>
  );
}

const Axx =  0.087403;
const Axy = -0.171983;
const Bx  =  30.3512;
const Azx = -0.121526;
const Azy = -0.000599;
const Bz  =  45.3130;

function seedToXZ(sx: number, sy: number) {
  return { x: Axx * sx + Axy * sy + Bx, z: Azx * sx + Azy * sy + Bz };
}


function routeBoundsWorld(route: RouteResult) {
  const pts = route.steps.map((s) => seedToXZ(s.node.x, s.node.y));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
  }
  const scale = 0.1;
  const cx = ((minX + maxX) / 2) * scale;
  const cz = ((minZ + maxZ) / 2) * scale;
  const span = Math.max((maxX - minX), (maxZ - minZ)) * scale;
  const radius = Math.max(span * 0.8 + 1.5, 6);
  return { center: new THREE.Vector3(cx, 0, cz), radius };
}


function CameraController({
                            gestureRef, onRadiusChange, lerpRadiusRef, lerpTargetRef,
                            maxRadius, cameraRef, targetRef, mapSizeRef,
                            lerpThetaRef, lerpPhiRef,
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
  const spherical = useRef(new THREE.Spherical(FLOOR_CONFIG[1].snapRadius, Math.PI / 4, 0));
  const maxRadiusRef = useRef(maxRadius);
  useEffect(() => { maxRadiusRef.current = maxRadius; }, [maxRadius]);
  useFrame((_, delta) => {
    if (lerpTargetRef.current !== null) {
      targetRef.current.lerp(lerpTargetRef.current, 1 - Math.pow(0.008, delta));
      if (targetRef.current.distanceTo(lerpTargetRef.current) < 0.015) {
        targetRef.current.copy(lerpTargetRef.current); lerpTargetRef.current = null;
      }
    }
    if (lerpRadiusRef.current !== null) {
      spherical.current.radius = THREE.MathUtils.lerp(
          spherical.current.radius, lerpRadiusRef.current, 1 - Math.pow(0.01, delta));
      gestureRef.current.deltaZoom = 0;
      if (Math.abs(spherical.current.radius - lerpRadiusRef.current) < 0.05) lerpRadiusRef.current = null;
    }
    if (lerpThetaRef.current !== null) {
      spherical.current.theta = THREE.MathUtils.lerp(
          spherical.current.theta, lerpThetaRef.current, 1 - Math.pow(0.001, delta)
      );
      if (Math.abs(spherical.current.theta - lerpThetaRef.current) < 0.005)
        lerpThetaRef.current = null;
    }
    // Lerp phi (tilt) into nav perspective angle
    if (lerpPhiRef.current !== null) {
      spherical.current.phi = THREE.MathUtils.lerp(
          spherical.current.phi, lerpPhiRef.current, 1 - Math.pow(0.001, delta)
      );
      if (Math.abs(spherical.current.phi - lerpPhiRef.current) < 0.005)
        lerpPhiRef.current = null;
    }
    const g = gestureRef.current;
    const offset  = new THREE.Vector3().setFromSpherical(spherical.current);
    const right   = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize();
    const forward = new THREE.Vector3().crossVectors(right,  new THREE.Vector3(0, 1, 0)).normalize();
    spherical.current.theta -= g.deltaRotate.x * 0.0035;
    spherical.current.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.current.phi - g.deltaRotate.y * 0.0035));

    targetRef.current.addScaledVector(right,  -g.deltaPan.x * 0.016);
    targetRef.current.addScaledVector(forward, g.deltaPan.y * 0.016);
    if (g.deltaZoom !== 0 && lerpRadiusRef.current === null) {
      const prev = spherical.current.radius;
      const next = Math.max(0.1, Math.min(maxRadiusRef.current * 1.2, prev * (1 - g.deltaZoom * 0.0045)));
      const dr = next - prev;
      if (g.pinchMidpoint && dr !== 0) {
        const { width, height } = mapSizeRef.current;
        const ndcX =  (g.pinchMidpoint.x / width)  * 2 - 1;
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
    camera.position.copy(new THREE.Vector3().setFromSpherical(spherical.current).add(targetRef.current));
    camera.lookAt(targetRef.current);
    cameraRef.current = camera;
    g.deltaRotate.x *= 0.82; g.deltaRotate.y *= 0.82; g.deltaZoom *= 0.75;
    g.deltaPan.x *= 0.82; g.deltaPan.y *= 0.82;
    if (Math.abs(g.deltaRotate.x) < 0.001) g.deltaRotate.x = 0;
    if (Math.abs(g.deltaRotate.y) < 0.001) g.deltaRotate.y = 0;
    if (Math.abs(g.deltaZoom) < 0.001) { g.deltaZoom = 0; g.pinchMidpoint = null; }
    if (Math.abs(g.deltaPan.x) < 0.001) g.deltaPan.x = 0;
    if (Math.abs(g.deltaPan.y) < 0.001) g.deltaPan.y = 0;
  });
  return null;
}

function SceneCapture({ sceneRef }: { sceneRef: React.MutableRefObject<THREE.Object3D[] | null> }) {
  const { scene } = useThree();
  useEffect(() => { sceneRef.current = scene.children; }, [scene, sceneRef]);
  return null;
}


function zoomToRoute(
    route: RouteResult,
    lerpRadiusRef: React.MutableRefObject<number | null>,
    lerpTargetRef: React.MutableRefObject<THREE.Vector3 | null>
) {
  const { center, radius } = routeBoundsWorld(route);
  lerpTargetRef.current = center;
  lerpRadiusRef.current = radius;
}

function zoomToWaypoints(
    waypoints: [number, number, number][],
    lerpRadiusRef: React.MutableRefObject<number | null>,
    lerpTargetRef: React.MutableRefObject<THREE.Vector3 | null>,
    sheetFraction = 0.50
) {
  if (waypoints.length < 2) return;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, , z] of waypoints) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ);
  const radius = Math.max(span * 1.1 + 3.0, 10) / (1 - sheetFraction);
  const offset = radius * sheetFraction * 0.35;
  lerpTargetRef.current = new THREE.Vector3(cx, 0, cz + offset);
  lerpRadiusRef.current = radius;
}

function zoomToNavStart(
    waypoints: [number, number, number][],
    lerpRadiusRef:  React.MutableRefObject<number | null>,
    lerpTargetRef:  React.MutableRefObject<THREE.Vector3 | null>,
    lerpThetaRef:   React.MutableRefObject<number | null>,
    lerpPhiRef:     React.MutableRefObject<number | null>,
) {
  if (waypoints.length < 2) return;
  const [x0, , z0] = waypoints[0];
  const [x1, , z1] = waypoints[1];


  const dx = x1 - x0;
  const dz = z1 - z0;
  const routeTheta = Math.atan2(dx, dz);
  const camTheta   = routeTheta + Math.PI;

  const dist = Math.sqrt(dx * dx + dz * dz) || 1;
  const nx = dx / dist;
  const nz = dz / dist;
  lerpTargetRef.current = new THREE.Vector3(x0 + nx * 1.8, 0, z0 + nz * 1.8);
  lerpRadiusRef.current = 4.5;

  lerpThetaRef.current = camTheta;
  lerpPhiRef.current   = Math.PI / 2.6;
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
  const [mapSize, setMapSize] = useState({ width: 1, height: 1 });
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
  const [pathWaypoints, setPathWaypoints] = useState<[number, number, number][]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<{
    title: string; date: string; location: string; description: string;
  } | null>(null);

  const [sheetIndex, setSheetIndex] = useState(-1);
  const [showCollapsedPill, setShowCollapsedPill] = useState(true);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchRoomRef = useRef<string | null>(null);
  const touchMovedRef = useRef(false);

  const lerpRadiusRef = useRef<number | null>(null);
  const lerpTargetRef = useRef<THREE.Vector3 | null>(null);
  const navHeadingRef = useRef<number | null>(null);
  const lerpThetaRef  = useRef<number | null>(null);
  const lerpPhiRef    = useRef<number | null>(null);

  const activeFloorRef = useRef<FloorNumber>(1);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const sheetIndexRef = useRef(-1);
  const mapSizeRef = useRef({ width: 1, height: 1 });
  const sheetTopYRef = useRef(9999);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapRoomRef = useRef<string | null>(null);

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
    return event.title.toLowerCase().includes(query) || event.location.toLowerCase().includes(query) || event.date.toLowerCase().includes(query);
  });

  useEffect(() => { activeFloorRef.current = activeFloor; }, [activeFloor]);
  useEffect(() => { mapSizeRef.current = mapSize; }, [mapSize]);
  useEffect(() => { sheetTopYRef.current = sheetTopY; }, [sheetTopY]);

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
    const gs = 0.1;
    const [x, y, z] = room.position;
    const [, sy, sz] = room.size;
    cameraTargetRef.current.set(x * gs, y * gs, z * gs);
    lerpRadiusRef.current = Math.max(2.5, Math.max(sy, sz) * gs * 2.2);
  }, []);

  const getPinPointFromTouch = useCallback((pageX: number, pageY: number): Pin | null => {
    const cam = cameraRef.current;
    if (!cam || mapSize.width <= 0 || mapSize.height <= 0) return null;
    pointerRef.current.x = (pageX / mapSize.width) * 2 - 1;
    pointerRef.current.y = -(pageY / mapSize.height) * 2 + 1;
    raycasterRef.current.setFromCamera(pointerRef.current, cam);
    const hits = raycasterRef.current.intersectObjects(sceneRef.current ?? [], true);
    if (!hits.length) return null;
    const pt = hits[0].point;
    return { x: pt.x, y: PIN_Y, z: pt.z, floor: activeFloorRef.current };
  }, [mapSize.width, mapSize.height]);

  const pinPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => pinMode,
    onMoveShouldSetPanResponder: () => pinMode,
    onPanResponderGrant: (evt) => {
      if (!pinMode) return;
      const p = getPinPointFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      if (p) { previewPinRef.current = p; setPreviewPin(p); }
    },
    onPanResponderMove: (evt) => {
      if (!pinMode) return;
      const p = getPinPointFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      if (p) previewPinRef.current = p;
    },
    onPanResponderRelease: () => {
      if (previewPinRef.current) setPins((prev) => [...prev, previewPinRef.current!]);
      previewPinRef.current = null; setPreviewPin(null); setPinMode(false);
    },
    onPanResponderTerminate: () => { previewPinRef.current = null; setPreviewPin(null); },
  }), [pinMode, getPinPointFromTouch]);

  const handleRadiusChange = useCallback((radius: number) => {
    setCameraRadius(radius);
    if (lerpRadiusRef.current !== null) return;
    const cur = activeFloorRef.current;
    const { switchRadius, snapRadius, zoomInRadius } = FLOOR_CONFIG[cur];
    const next = (cur < 3 ? cur + 1 : cur) as FloorNumber;
    const prev = (cur > 1 ? cur - 1 : cur) as FloorNumber;
    if (radius >= switchRadius && next !== cur) {
      activeFloorRef.current = next; setActiveFloor(next);
      lerpRadiusRef.current = FLOOR_CONFIG[next].snapRadius; return;
    }
    if (radius < snapRadius * 0.2 && prev !== cur) {
      activeFloorRef.current = prev; setActiveFloor(prev);
      lerpRadiusRef.current = zoomInRadius;
    }
  }, []);

  const handleRoomSelect = useCallback((hitboxId: string | null) => {
    if (!hitboxId) {
      setSelectedRoom(null);
      setSelectedNode(null);
      setPathWaypoints([]);
      return;
    }
    const navId = getNavNodeId(hitboxId, activeFloorRef.current);
    const node = navId ? getNode(navId) : null;
    console.log("[room select]", hitboxId, "->", navId, "->", node?.label);
    setSelectedRoom(hitboxId);
    setSelectedNode(node);
    setSheetView("detail");
    setActiveRoute(null);
    setIsNavigating(false);
    //focusRoom(hitboxId, activeFloorRef.current);
    setShowCollapsedPill(false);
    setSheetIndex(0);
    sheetIndexRef.current = 0;
    setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 50);

    focusRoom(hitboxId, activeFloorRef.current);
    setPathWaypoints([]);

  }, [getTestRoute]);

  const getFromNodeId = useCallback((): string => {
    if (!location) return START_NODE_ID;
    const { x, y } = gpsToNodeCoords(location.coords.latitude, location.coords.longitude);
    const nearest = snapToNode(x, y, activeFloorRef.current);
    if (nearest) { console.log("[from node]", nearest.id, nearest.label); return nearest.id; }
    return START_NODE_ID;
  }, [location, snapToNode]);

  const handleNavigate = useCallback((accessible = false) => {
    if (!selectedNode) return;
    const fromId = getFromNodeId();
    const result = getTestRoute(fromId, selectedNode.id);

    // hardcoded start node
    //const result = getTestRoute("entrance0", selectedNode.id);
    const waypoints = routeToWaypoints(result);
    setActiveRoute(result);
    setPathWaypoints(waypoints);
    setSheetView("directions");
    bottomSheetRef.current?.snapToIndex(0);
    setSheetIndex(0);
    sheetIndexRef.current = 0;
    if (waypoints.length >= 2)
      zoomToWaypoints(waypoints, lerpRadiusRef, lerpTargetRef, 0.50);
  }, [selectedNode, getTestRoute]);

  const handleAvoidStairsChange = useCallback((val: boolean) => {
    if (!selectedNode || !dbReady) return;
    const result = getRoute(getFromNodeId(), selectedNode.id, { accessible: val });
    setActiveRoute(result);
    if (result) zoomToRoute(result, lerpRadiusRef, lerpTargetRef);
  }, [selectedNode, dbReady, getRoute, getFromNodeId]);

  const handleConfirmRoute = useCallback(() => {
    if (!activeRoute) return;
    bottomSheetRef.current?.close();
    setSheetIndex(-1); sheetIndexRef.current = -1;
    setShowCollapsedPill(false);
    setIsNavigating(true);
    zoomToNavStart(pathWaypoints, lerpRadiusRef, lerpTargetRef, lerpThetaRef, lerpPhiRef);

  }, [activeRoute, pathWaypoints]);

  const handleEndRoute = useCallback(() => {
    navHeadingRef.current = null;
    setIsNavigating(false);
    setActiveRoute(null);
    setSelectedRoom(null);
    setSelectedNode(null);
    setPathWaypoints([]);
    setSheetView("default");
    setSheetIndex(-1); sheetIndexRef.current = -1;
    setTimeout(() => setShowCollapsedPill(true), 300);
  }, []);

  const handleProfilePress = useCallback(() => {
    setSheetView("profile");
    bottomSheetRef.current?.snapToIndex(1);
    setSheetIndex(1);
  }, []);

  const cameraPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (e) => !pinMode && e.nativeEvent.pageY < sheetTopYRef.current,
    onMoveShouldSetPanResponder:  (e) => !pinMode && e.nativeEvent.pageY < sheetTopYRef.current,
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
      } else touchRoomRef.current = null;
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
        const currMid  = { x: (t0.pageX + t1.pageX) / 2, y: (t0.pageY + t1.pageY) / 2 };
        if (prevTouches.current.length === 2) {
          const [p0, p1] = prevTouches.current;
          const prevDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          const prevMid  = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
          const dd = currDist - prevDist;
          const md = { x: currMid.x - prevMid.x, y: currMid.y - prevMid.y };
          gestureRef.current.deltaPan.x += md.x * 0.25;
          gestureRef.current.deltaPan.y += md.y * 0.25;
          if (Math.abs(dd) > 0.5) {
            gestureRef.current.deltaZoom += dd * 0.12;
            gestureRef.current.pinchMidpoint = currMid;
          }
        }
        prevTouches.current = [{ x: t0.pageX, y: t0.pageY }, { x: t1.pageX, y: t1.pageY }];
      }
    },
    onPanResponderRelease: () => {
      if (!touchMovedRef.current && touchRoomRef.current && !isNavigating) {
        const now = Date.now();
        const sameRoom = lastTapRoomRef.current === touchRoomRef.current;
        const isDoubleTap = sameRoom && (now - lastTapTimeRef.current) < 400;
        if (isDoubleTap) {
          handleRoomSelect(touchRoomRef.current);
          lastTapTimeRef.current = 0; lastTapRoomRef.current = null;
        } else {
          setSelectedRoom(touchRoomRef.current);
          lastTapTimeRef.current = now; lastTapRoomRef.current = touchRoomRef.current;
        }
      } else if (!touchMovedRef.current && !touchRoomRef.current) {
        setSelectedRoom(null);
        lastTapTimeRef.current = 0; lastTapRoomRef.current = null;
      }
      touchStartRef.current = null; touchRoomRef.current = null;
      touchMovedRef.current = false; prevTouches.current = [];
    },
    onPanResponderTerminate: () => {
      touchStartRef.current = null; touchRoomRef.current = null;
      touchMovedRef.current = false; prevTouches.current = [];
    },
  }), [isNavigating, handleRoomSelect]);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      setLocation(cur);
      sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 250, distanceInterval: 0 },
          (loc) => {
            setLocation(loc);
            if (loc.coords.heading != null && loc.coords.heading >= 0) {
              navHeadingRef.current = loc.coords.heading;
            }
          }
      );
    })();
    return () => { sub?.remove(); };
  }, []);

  useEffect(() => {
    async function preloadAll() {
      try {
        await Promise.all(Object.values(FLOOR_MODELS).map(async (mod) => {
          const asset = Asset.fromModule(mod); await asset.downloadAsync();
        }));
      } catch (e) { console.log("Error preloading:", e); }
      finally { setIsReady(true); }
    }
    preloadAll();
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    setSheetIndex(index); sheetIndexRef.current = index;
    if (index >= 0) setShowCollapsedPill(false);
    if (index === -1 && !isNavigating) {
      setSelectedRoom(null); setSelectedNode(null);
      setActiveRoute(null); setPathWaypoints([]);
      setSheetView("default");
      setTimeout(() => setShowCollapsedPill(true), 1);
    }
  }, [isNavigating, sheetView]);

  const openSheet = useCallback(() => {
    setSheetView("default");
    setShowCollapsedPill(false);
    bottomSheetRef.current?.snapToIndex(1);
    setSheetIndex(1);
    sheetIndexRef.current = 1;
  }, []);

  if (!isReady) {
    return <View style={styles.loaderWrap}><ActivityIndicator size="large" /></View>;
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
            <ambientLight intensity={1.2} />
            <directionalLight position={[3, 5, 2]} intensity={1} />
            <directionalLight position={[-3, 5, -2]} intensity={0.9} />
            <directionalLight position={[0, 4, 4]} intensity={0.7} />
            <directionalLight position={[0, -5, 0]} intensity={0.7} />
            <SceneCapture sceneRef={sceneRef} />

            <Suspense fallback={null}>
              <Building activeFloor={activeFloor} />
              <TestPath waypoints={pathWaypoints} />
              {/*
              RoutePathLayer is INSIDE the 0.1 scale group — same coordinate
              space as the hitboxes and the affine transform coefficients.
            */}
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

              <PinLayer
                  pins={pins}
                  previewPin={previewPin}
                  previewPinRef={previewPinRef}
                  activeFloor={activeFloor}
              />
              <IconLayer />
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

          {/* Gesture capture layer */}
          {!pinMode && (
              <View
                  style={[
                    styles.mapGestureLayer,
                    { height: isNavigating ? mapSize.height * 0.65 : sheetTopY },
                  ]}
                  pointerEvents="auto"
                  {...cameraPanResponder.panHandlers}
              />
          )}

          {sheetIndex === -1 && !isNavigating && (
              <Pressable
                  onPress={() => setPinMode((p) => !p)}
                  style={{
                    position: "absolute", bottom: 140, right: 20,
                    backgroundColor: pinMode ? "red" : "blue",
                    padding: 12, borderRadius: 24, zIndex: 100,
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
                    const f = floor as FloorNumber;
                    activeFloorRef.current = f;
                    setActiveFloor(f);
                    lerpRadiusRef.current = FLOOR_CONFIG[f].snapRadius;
                  }}
              />
          )}

          {pinMode && <View style={styles.pinOverlay} {...pinPanResponder.panHandlers} />}

          {showCollapsedPill && !isNavigating && (
              <Pressable style={styles.collapsedSearchWrap} onPress={openSheet}>
                <View style={styles.collapsedHandle} />
                <SearchBarRow search={search} setSearch={setSearch} onPressExpand={openSheet} onPressProfile={handleProfilePress} />
              </Pressable>
          )}

          {isNavigating && activeRoute && (
              <NavOverlay
                  route={activeRoute}
                  destinationLabel={selectedNode?.label}
                  onEndRoute={handleEndRoute}
              />
          )}

          <TestPathLabel label={selectedNode?.label} isNavigating={isNavigating} />

          {!isNavigating && (
              <BottomSheet
                  ref={bottomSheetRef}
                  index={-1}
                  snapPoints={snapPoints}
                  onChange={handleSheetChange}
                  backgroundStyle={styles.bottomSheetBackground}
                  handleIndicatorStyle={styles.handleIndicator}
              >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContentContainer}>
                  {sheetView === "detail" && selectedNode && (
                      <RoomDetailSheet
                          node={selectedNode}
                          estimatedMinutes={activeRoute ? Math.ceil(activeRoute.totalWalkSeconds / 60) : undefined}
                          onNavigate={handleNavigate}
                          onDismiss={() => {
                            bottomSheetRef.current?.close();
                            setSelectedRoom(null); setSelectedNode(null);
                            setPathWaypoints([]); setSheetView("default");
                            setTimeout(() => setShowCollapsedPill(true), 300);
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
                            if (selectedNode) focusRoom(selectedRoom, activeFloor);
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
  collapsedSearchWrap: {
    position: "absolute", left: 16, right: 16, bottom: 34,
    backgroundColor: "rgba(189, 189, 189, 0.75)", borderRadius: 36,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
    paddingTop: 8, paddingBottom: 6, zIndex: 40,
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 6,
  },
  collapsedHandle: { alignSelf: "center", width: 54, height: 5, borderRadius: 999, backgroundColor: "rgba(120,120,120,0.7)", marginBottom: 8 },
  bottomSheetBackground: { backgroundColor: "rgba(235, 235, 218, 1)", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "rgb(255, 255, 255)", overflow: "hidden" },
  handleIndicator: { width: 42, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.25)" },
  sheetContentContainer: { paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#333", marginTop: 8, paddingHorizontal: 20 },
  pinButton: { position: "absolute", bottom: 145, right: 20, padding: 12, borderRadius: 24, zIndex: 5 },
  pinButtonText: { color: "white", fontWeight: "bold" },
  gpsText: { position: "absolute", top: 50, left: 20, color: "white", fontSize: 14, zIndex: 20 },
  draggingPin: { position: "absolute", width: 20, height: 20, backgroundColor: "red", borderRadius: 10, zIndex: 20 },
  placedPin: { position: "absolute", width: 12, height: 12, backgroundColor: "red", borderRadius: 6, zIndex: 20 },
  userDot: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: "#3B82F6", zIndex: 20 },
  radiusText: { marginTop: 16, marginBottom: 30, color: "#333", fontWeight: "600", paddingHorizontal: 20 },
  mapGestureLayer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 },
  eventTitle: { fontSize: 22, fontWeight: "700", color: "#222", marginBottom: 8, paddingHorizontal: 20 },
  eventMeta: { fontSize: 14, color: "#666", marginBottom: 4, paddingHorizontal: 20 },
  eventSectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 18, fontWeight: "700", color: "#222", paddingHorizontal: 20 },
  eventDescription: { fontSize: 15, color: "#333", lineHeight: 22, paddingHorizontal: 20 },
  backButton: { marginBottom: 16, alignSelf: "flex-start", paddingHorizontal: 20 },
  backButtonText: { fontSize: 16, fontWeight: "600", color: "#3498DB" },
  eventActionRow: { flexDirection: "row", gap: 14, marginTop: 14, marginBottom: 18, paddingHorizontal: 20 },
  eventActionButton: { backgroundColor: "#BFDDF3", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", minWidth: 92 },
  eventActionText: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "#222" },
  selectedRoomText: { position: "absolute", top: 80, left: 20, color: "white", fontSize: 16, fontWeight: "700", zIndex: 20 },
});