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
  Image,
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
import { FILTER_MAP, SEARCH_ALIAS_MAP } from "@/utils/iconFilters";

import NodeDebugLayer from "@/components/nodeDebugLayer";

import { FloorSwitcher } from "@/components/floorSwitcher";
import SearchBarRow from "@/components/SearchBarRow";
import NearbyChips from "@/components/NearbyChips";
import EventCard from "@/components/EventCard";
import RoomHitboxes, {
  getRoomAtScreenPoint,
  getRoomById,
  getNavNodeId,
  findRoomBySearch as findRoomHitboxBySearch,
  findRoomsStartingWith,
  getRoomsForFloor

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
import { routeToWaypoints, routeToWaypointsWithFloor, type FlooredWaypoint } from "@/utils/routeToWaypoints";
import { normalizeLocationToBuilding } from "@/utils/buildingLocation";
import type { NavNode } from "@/navigation/db";
import type { RouteResult } from "@/navigation/pathfinding";
import PlacePinButton from "@/components/placePinButton";
import { FloorNumber,FLOOR_MODELS,SheetView,GestureState, FLOOR_CONFIG, BUILDING_MAX_LAT, BUILDING_MAX_LON, BUILDING_MIN_LAT, BUILDING_MIN_LON, MODEL_MAX_X, MODEL_MAX_Z, MODEL_MIN_X, MODEL_MIN_Z } from "@/components/mapConfig";
import { gpsToNodeCoords } from "@/utils/locationUtils";
import { zoomToNavStart, zoomToWaypoints } from "@/utils/cameraUtils";
import { CameraController } from "@/components/CameraController";
import { events, FILTER_ICONS} from "@/components/data";
import { getPinHex } from "@/components/data";
import { styles } from "@/styles/homeScreenStyles";
import { SwipeDeletePinRow } from "@/components/swipeDeletePin";
import { FloorModel, Building } from "@/components/building";
import { SceneCapture } from "@/components/sceneCapture";
import ProfileSavedView from "@/components/profileSavedView";
import EventDetailPanel from "@/components/eventDetailPanel";
import PinCustomizeModal from "@/components/pinCustomizeModal";
import PinSavedToast from "@/components/pinSavedToast";
import FloatingRoomPill from "@/components/floatingRoomPill";

// The heights for the half sheet
const COLLAPSED_HEIGHT = 84;
const MID_HEIGHT = 420;
const EXPANDED_HEIGHT_FRACTION = 0.82;

const SNAP_FRACTIONS = [0.5, 0.75, 0.9];
const HARDCODED_LAT = 30.40775;
const HARDCODED_LON = -91.17995;



function findRoomIdByNavNodeId(nodeId: string | null): string | null {
  if (!nodeId) return null;

  for (const floor of [1, 2, 3] as FloorNumber[]) {
    const rooms = getRoomsForFloor(floor);
    const room = rooms.find((r) => r.navNodeId === nodeId);
    if (room) return room.id;
  }

  return null;
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
  const [directionsBackTarget, setDirectionsBackTarget] = useState<"detail" | "event">("detail");

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
  const [flooredWaypoints, setFlooredWaypoints] = useState<FlooredWaypoint[]>([]);

  const [isNavigating, setIsNavigating] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [userNodeId, setUserNodeId] = useState<string | null>(null);
  const [userNodeFloor, setUserNodeFloor] = useState<number>(1);
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

  // Filter/search icon state for map icons
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [mapFilterResults, setMapFilterResults] = useState<string[]>([]);

  /**
   * Maps selected chip filters and search-driven filter results into a unified
   * list of icon type strings consumed by IconLayer. Deduped with Set to avoid
   * rendering duplicate icons when a type appears in both sources.
   */
  const activeTypes = useMemo(() => {
    const fromNearbyChips = selectedFilters.flatMap((filter) =>
        FILTER_MAP?.[filter] ?? []
    );

    const fromSearchCard = mapFilterResults.flatMap((filter) =>
        FILTER_MAP?.[filter] ?? []
    );

    return [...new Set([...fromNearbyChips, ...fromSearchCard])];
  }, [selectedFilters, mapFilterResults]);

  const [sheetIndex, setSheetIndex] = useState(-1);
  const [showCollapsedPill, setShowCollapsedPill] = useState(true);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);

  const [panelExpanded, setPanelExpanded] = useState(false);
  const [panelLevel, setPanelLevel] = useState<"collapsed" | "mid" | "full">("collapsed");
  const panelHeightAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const dragStartHeightRef = useRef(COLLAPSED_HEIGHT);

  const touchStartRef    = useRef<{ x: number; y: number } | null>(null);
  const touchRoomRef     = useRef<string | null>(null);
  const touchMovedRef    = useRef(false);
  const hasCollapsedRef  = useRef(false);

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

  const sheetIndexRef    = useRef(-1);
  const sheetViewRef     = useRef<SheetView>("default");
  const selectedNodeRef  = useRef<NavNode | null>(null);
  const panelLevelRef    = useRef<"collapsed" | "mid" | "full">("collapsed");
  const mapSizeRef       = useRef({ width: 1, height: 1 });
  const sheetTopYRef     = useRef(9999);

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

  useEffect(() => { sheetViewRef.current    = sheetView;    }, [sheetView]);
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);
  useEffect(() => { panelLevelRef.current   = panelLevel;   }, [panelLevel]);

  useEffect(() => {
    if (sheetView === "directions" && selectedNode) {
      const roomId = findRoomIdByNavNodeId(selectedNode.id);
      if (roomId) {
        setSelectedRoom(roomId);
      }
    }
  }, [sheetView, selectedNode]);
  
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
        panelLevelRef.current = level;
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




  const searchedFilters = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    return Object.keys(FILTER_MAP).filter((filter) => {
      const aliases = SEARCH_ALIAS_MAP?.[filter];

      // normalize to array
      const aliasList = Array.isArray(aliases)
          ? aliases
          : aliases
              ? [aliases]
              : [];

      return (
          filter.toLowerCase().includes(query) ||
          aliasList.some((alias) =>
              alias.toLowerCase().includes(query)
          )
      );
    });
  }, [search]);

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
    const offsetX = -0.7; // tweak this value

    cameraTargetRef.current.set(
        x * groupScale + offsetX,
        y * groupScale,
        z * groupScale
    );
    const zoomRadius = Math.max(4, Math.max(sy, sz) * groupScale * 1.6);
    lerpRadiusRef.current = zoomRadius;
    // Labels use rotation -Math.PI/2 on Y → they read from west (-X direction)
    // theta = -PI/2 positions camera to the west so text faces it directly
    lerpThetaRef.current = -Math.PI / 2;
    // phi = PI/2 is perfectly flat/top-down — no tilt
    lerpPhiRef.current = 0.35;
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
        setShowCollapsedPill(false);
        focusRoom(hitboxId, activeFloorRef.current);

        // Pre-calculate route so detail sheet shows accurate time
        if (node) {
          const fromId = getFromNodeId();
          const previewRoute = getTestRoute(fromId, node.id);
          const previewWaypoints = routeToWaypoints(previewRoute);
          setActiveRoute(previewRoute);
          setPathWaypoints(previewWaypoints);
          setFlooredWaypoints(routeToWaypointsWithFloor(previewRoute));
        } else {
          setActiveRoute(null);
          setPathWaypoints([]);
          setFlooredWaypoints([]);
        }

        setTimeout(() => {
          bottomSheetRef.current?.snapToIndex(0);
          setSheetIndex(0);
          sheetIndexRef.current = 0;
        }, 50);
      },
      [focusRoom, getFromNodeId, getTestRoute]
  );
  // DEMO VALUES
  const DEMO_MODE = true;
  // ── Demo start: flip between "vending0" (floor 1) and "room_1263_a" (floor 1)
  const DEMO_START_NODE = "room_1263_cen";  // ← change to "room_1263_a" for second demo


  

  const handleNavigate = useCallback(
      (accessible = false) => {
        if (!selectedNode) return;
        const fromId = getFromNodeId();
        const result = getTestRoute(fromId, selectedNode.id);
        const waypoints = routeToWaypoints(result);
        const fwaypoints = routeToWaypointsWithFloor(result);
        setActiveRoute(result);
        setPathWaypoints(waypoints);
        setFlooredWaypoints(fwaypoints);
        setDirectionsBackTarget("detail");
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
    setFlooredWaypoints([]);
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
              hasCollapsedRef.current = false;
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
                if (Math.hypot(dx, dy) > 8) {
                  touchMovedRef.current = true;
                  // Collapse the sheet into a pill the first time the map moves
                  if (!hasCollapsedRef.current) {
                    // Collapse room detail / directions sheet
                    if (
                        sheetIndexRef.current >= 0 &&
                        (sheetViewRef.current === "detail" || sheetViewRef.current === "directions")
                    ) {
                      hasCollapsedRef.current = true;
                      setSheetCollapsed(true);
                      setSheetIndex(-1);
                      sheetIndexRef.current = -1;
                      bottomSheetRef.current?.close();
                    }
                    // Collapse the home stretch panel (search / events / profile)
                    else if (panelLevelRef.current !== "collapsed") {
                      hasCollapsedRef.current = true;
                      Keyboard.dismiss();
                      panelLevelRef.current = "collapsed";
                      setPanelLevel("collapsed");
                      setPanelExpanded(false);
                      Animated.spring(panelHeightAnim, {
                        toValue: COLLAPSED_HEIGHT,
                        useNativeDriver: false,
                        damping: 28,
                        stiffness: 220,
                        mass: 0.75,
                      }).start();
                    }
                  }
                }
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

                if (
                    sheetView === "detail" &&
                    selectedNode &&
                    sheetIndexRef.current !== -1
                ) {
                  bottomSheetRef.current?.close();
                  setSheetIndex(-1);
                  sheetIndexRef.current = -1;

                  setShowCollapsedPill(true);
                  setPanelExpanded(false);
                  setPanelLevel("collapsed");

                  Animated.timing(panelHeightAnim, {
                    toValue: COLLAPSED_HEIGHT,
                    duration: 120,
                    useNativeDriver: false,
                  }).start();
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
    const newFWaypoints = routeToWaypointsWithFloor(newRoute);
    setActiveRoute(newRoute);
    setPathWaypoints(newWaypoints.length >= 2 ? newWaypoints : []);
    setFlooredWaypoints(newWaypoints.length >= 2 ? newFWaypoints : []);
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

  const navigateToEventRoom = useCallback((eventLocation: string) => {
    const roomNumber = eventLocation.match(/\d+/)?.[0];
    if (!roomNumber) return;

    for (const floor of [1, 2, 3] as FloorNumber[]) {
      const room = findRoomHitboxBySearch(floor, roomNumber);
      if (!room) continue;

      const navId = getNavNodeId(room.id, floor);
      const node = navId ? getNode(navId) : null;
      if (!node) return;

      // switch UI immediately
      setDirectionsBackTarget("event");
      setSelectedRoom(room.id);
      setSelectedNode(node);
      setSheetView("directions");
      bottomSheetRef.current?.snapToIndex(0);
      setSheetIndex(0);
      sheetIndexRef.current = 0;

      requestAnimationFrame(() => {
        const fromId = getFromNodeId();
        const route = getTestRoute(fromId, node.id);
        if (!route) return;

        const waypoints = routeToWaypoints(route);

        activeFloorRef.current = floor;
        setActiveFloor(floor);
        setActiveRoute(route);
        setPathWaypoints(waypoints);
        setFlooredWaypoints(routeToWaypointsWithFloor(route));

        if (waypoints.length >= 2 ) {
          zoomToWaypoints(waypoints, lerpRadiusRef, lerpTargetRef, 0.5);
        }
      });

      return;
    }
  }, [getFromNodeId, getTestRoute]);

  const handleSheetChange = useCallback((index: number) => {
    setSheetIndex(index);
    sheetIndexRef.current = index;

    if (index === -1 && !isNavigating) {
      setSheetCollapsed((wasCollapsed) => {
        if (!wasCollapsed) {
          // User swiped the sheet down normally — clear everything
          setSelectedRoom(null);
          setSelectedNode(null);
          setActiveRoute(null);
          setPathWaypoints([]);
          setSheetView("default");
          setTimeout(() => setShowCollapsedPill(true), 1);
        }
        // If wasCollapsed=true, the map drag already handled it — keep node alive
        return wasCollapsed;
      });
    } else if (index >= 0) {
      setSheetCollapsed(false);
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
              </group>

              {location && userNodeFloor === activeFloor && (
                  <UserLocationMarker
                      latitude={location.coords.latitude}
                      longitude={location.coords.longitude}
                      activeFloor={activeFloor}
                      isNavigating={isNavigating}
                      currentNodeId={userNodeId}
                      onNodeChange={(id) => {
                        setUserNodeId(id);
                        // Keep track of which floor the user is on (getNode reads from TEST_NODES)
                        const n = getNode(id);
                        if (n) setUserNodeFloor(n.floor);
                      }}
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
                          setFlooredWaypoints(routeToWaypointsWithFloor(newRoute));
                        }
                      }}
                  />
              )}

              {(() => {
                // Only show path segments that belong to the active floor
                const floorWps = flooredWaypoints
                    .filter(w => w.floor === activeFloor)
                    .map(w => w.pos) as [number, number, number][];
                const floorFullWps = isNavigating && fullPathWaypointsRef.current.length >= 2
                    ? fullPathWaypointsRef.current
                    : undefined;
                return floorWps.length >= 2 ? (
                    <TestPath
                        waypoints={floorWps}
                        isNavigating={isNavigating}
                        fullWaypoints={floorFullWps}
                        completedFraction={
                          isNavigating && fullPathWaypointsRef.current.length >= 2
                              ? 1 - pathWaypoints.length / fullPathWaypointsRef.current.length
                              : 0
                        }
                    />
                ) : null;
              })()}

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

              <IconLayer
                  activeFloor={activeFloor}
                  cameraRadius={cameraRadius}
                  allowedTypes={activeTypes}
              />
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
                     <ProfileSavedView
                          savedEvents={savedEvents}
                          pins={pins}
                          getPinHex={getPinHex}
                          onCloseProfile={() => setPanelView("main")}
                          onSavedEventPress={(event) => {
                            setSelectedEvent(event);
                            setPanelView("main");
                            snapPanelTo(MID_HEIGHT);
                          }}
                          onSavedPinPress={(pin) => {
                            focusPin(pin);
                            setPanelView("main");
                            snapPanelTo(COLLAPSED_HEIGHT);
                          }}
                          onDeletePin={(index) => {
                            setPins((prev) => prev.filter((_, i) => i !== index));
                          }}
                        />

                      ) : selectedEvent ? (
                           <EventDetailPanel
                            selectedEvent={selectedEvent}
                            isSaved={isSaved}
                            onBack={() => setSelectedEvent(null)}
                            onToggleSave={() => toggleSaveEvent(selectedEvent)}
                            onNavigate={() => {
                              if (selectedEvent?.location) {
                                navigateToEventRoom(selectedEvent.location);
                              }
                            }}
                          />
                      ) : (
                          <View>
                            {search.trim() === "" && (
                                <>
                                  <Text style={styles.sectionTitle}>Nearby</Text>
                                  <NearbyChips
                                      selected={selectedFilters}
                                      setSelected={setSelectedFilters}
                                  />
                                </>
                            )}

                            {search.trim() === "" && (
                                <Text style={styles.sectionTitle}>Events</Text>
                            )}

                            {searchedFilters.map((filter) => (
                                <Pressable
                                    key={filter}
                                    style={styles.filterResultCard}
                                    onPress={() => {
                                      setMapFilterResults([filter]);
                                      setSearch("");
                                      setSelectedEvent(null);
                                      setPanelView("main");
                                      snapPanelTo(COLLAPSED_HEIGHT);
                                    }}
                                >
                                  <View style={styles.filterIconCircle}>
                                    <Image
                                        source={FILTER_ICONS[filter]}
                                        style={styles.filterIconImage}
                                        resizeMode="contain"
                                    />
                                  </View>

                                  <View>
                                    <Text style={styles.filterResultTitle}>{filter}</Text>
                                    <Text style={styles.filterResultSubtitle}>Search nearby {filter}</Text>
                                  </View>
                                </Pressable>
                            ))}

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

                                        if (!node) {
                                          console.warn("No nav node found for room:", event.roomId, navId);
                                          return;
                                        }

                                        setSelectedRoom(event.roomId);
                                        setSelectedNode(node);
                                        setSheetView("detail");
                                        setActiveRoute(null);
                                        setPathWaypoints([]);
                                        setSelectedEvent(null);

                                        focusRoom(event.roomId, event.floor);

                                        setShowCollapsedPill(false);
                                        setPanelExpanded(false);
                                        setPanelLevel("collapsed");

                                        Animated.timing(panelHeightAnim, {
                                          toValue: COLLAPSED_HEIGHT,
                                          duration: 100,
                                          useNativeDriver: false,
                                        }).start();

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

                            {filteredEvents.length === 0 && searchedFilters.length === 0 && (
                                <Text style={styles.emptytext}>No matching item found.</Text>
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
              <PinCustomizeModal
              pendingPin={pendingPin}
              pinTitle={pinTitle}
              setPinTitle={setPinTitle}
              pinColor={pinColor}
              setPinColor={setPinColor}
              onCancel={() => {
                setPendingPin(null);
                setEditingPinIndex(null);
                setPreviewPin(null);
                setCustomizingPreviewPin(null);
              }}
              onSave={() => {
                const updatedPin: Pin = {
                  ...pendingPin!,
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
            />
          )}

          <PinSavedToast
            visible={showPinSavedToast}
            translateY={pinSavedAnim}
          />

          <FloatingRoomPill
            visible={!isNavigating && sheetCollapsed}
            selectedNode={selectedNode}
            onOpen={() => {
              setSheetCollapsed(false);
              setShowCollapsedPill(false);
              setTimeout(() => {
                bottomSheetRef.current?.snapToIndex(0);
                setSheetIndex(0);
                sheetIndexRef.current = 0;
              }, 50);
            }}
            onClose={() => {
              setSheetCollapsed(false);
              setSelectedRoom(null);
              setSelectedNode(null);
              setActiveRoute(null);
              setPathWaypoints([]);
              setSheetView("default");
              setTimeout(() => setShowCollapsedPill(true), 50);
            }}
          />

          {!isNavigating && !sheetCollapsed && (
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
                          estimatedMinutes={activeRoute ? Math.ceil(activeRoute.totalWalkSeconds / 60) : undefined}

                          onNavigate={() => handleNavigate(false)}
                          onDismiss={() => {
                            setSelectedRoom(null);
                            setSelectedNode(null);
                            setPathWaypoints([]);
                            setFlooredWaypoints([]);
                            setActiveRoute(null);
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
                            setActiveRoute(null);
                            setPathWaypoints([]);
                            setFlooredWaypoints([]);


                            if (directionsBackTarget === "event") {
                              bottomSheetRef.current?.close();
                              setSheetIndex(-1);
                              sheetIndexRef.current = -1;

                              setSheetView("default");
                              setDirectionsBackTarget("detail");

                              setShowCollapsedPill(true);
                              setPanelView("main");
                              snapPanelTo(MID_HEIGHT);

                              return;
                            }

                            setSheetView("detail");
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
;