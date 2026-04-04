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
import RoomHitboxes, { getRoomAtScreenPoint } from "@/components/roomHitbox";

import PinLayer, { Pin } from "@/components/PinLayer";

const FLOOR_MODELS = {
  1: require("../../assets/models/1stFloorModel.glb"),
  2: require("../../assets/models/2ndFloorModel.glb"),
  3: require("../../assets/models/3rdFloorModel.glb"),
} as const;

type FloorNumber = keyof typeof FLOOR_MODELS;

type GestureState = {
  deltaRotate: { x: number; y: number };
  deltaZoom: number;
  deltaPan: { x: number; y: number };
};

const FLOOR_CONFIG: Record<
  FloorNumber,
  { switchRadius: number; snapRadius: number; zoomInRadius: number }
> = {
  1: { switchRadius: 20, snapRadius: 10, zoomInRadius: 5 },
  2: { switchRadius: 120, snapRadius: 10, zoomInRadius: 5 },
  3: { switchRadius: 45, snapRadius: 10, zoomInRadius: 5 },
};

const bounds = {
  minLat: 30.123,
  maxLat: 30.124,
  minLon: -91.123,
  maxLon: -91.122,
};

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
}: {
  gestureRef: React.MutableRefObject<GestureState>;
  onRadiusChange: (radius: number) => void;
  lerpRadiusRef: React.MutableRefObject<number | null>;
  maxRadius: number;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
}) {
  const { camera } = useThree();

  const spherical = useRef(
    new THREE.Spherical(FLOOR_CONFIG[1].snapRadius, Math.PI / 4, 0)
  );
  const target = useRef(new THREE.Vector3());
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

    target.current.addScaledVector(right, -g.deltaPan.x * 0.01);
    target.current.addScaledVector(forward, g.deltaPan.y * 0.01);

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
      new THREE.Vector3().setFromSpherical(spherical.current).add(target.current)
    );
    camera.lookAt(target.current);
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

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapSize, setMapSize] = useState({ width: 1, height: 1 });
  const [search, setSearch] = useState("");
  const [pinMode, setPinMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const [pins, setPins] = useState<Pin[]>([]);
  const [previewPin, setPreviewPin] = useState<Pin | null>(null);

  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());

  const [selectedEvent, setSelectedEvent] = useState<{
    title: string;
    date: string;
    location: string;
    description: string;
  } | null>(null);

  const [sheetIndex, setSheetIndex] = useState(-1);
  const [showCollapsedPill, setShowCollapsedPill] = useState(true);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchRoomRef = useRef<string | null>(null);
  const touchMovedRef = useRef(false);

  const lerpRadiusRef = useRef<number | null>(null);
  const activeFloorRef = useRef<FloorNumber>(1);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const gestureRef = useRef<GestureState>({
    deltaRotate: { x: 0, y: 0 },
    deltaZoom: 0,
    deltaPan: { x: 0, y: 0 },
  });

  const prevTouches = useRef<{ x: number; y: number }[]>([]);
  const snapPoints = useMemo(() => ["50%", "75%", "90%"], []);
  const isSheetOpen = sheetIndex >= 0;

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

  const normalizeLocation = (lat: number, lon: number) => {
    const x = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon);
    const y = (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat);
    return { x, y };
  };

const PIN_Y = -0.05;
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

    return {
      x: point.x,
      y: PIN_Y,
      z: point.z,
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
          setPreviewPin(point); // only to make preview appear
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
        if (previewPinRef.current) {
          setPins((prev) => [...prev, previewPinRef.current!]);
        }

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

  const cameraPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !pinMode && !isSheetOpen,
        onMoveShouldSetPanResponder: () => !pinMode && !isSheetOpen,

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
            const hitRoom = getRoomAtScreenPoint(
              pageX,
              pageY,
              activeFloorRef.current,
              cam,
              mapSize.width,
              mapSize.height
            );
            touchRoomRef.current = hitRoom?.id ?? null;
          } else {
            touchRoomRef.current = null;
          }
        },

        onPanResponderMove: (e) => {
          if (pinMode || isSheetOpen) return;

          const touches = e.nativeEvent.touches;

          if (touchStartRef.current && touches.length > 0) {
            const dx0 = touches[0].pageX - touchStartRef.current.x;
            const dy0 = touches[0].pageY - touchStartRef.current.y;
            if (Math.hypot(dx0, dy0) > 8) {
              touchMovedRef.current = true;
            }
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
            setSelectedRoom((prev) =>
              prev === touchRoomRef.current ? null : touchRoomRef.current
            );
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
    [pinMode, isSheetOpen, mapSize.width, mapSize.height]
  );


  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission denied");
        return;
      }

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
        (loc) => {
          setLocation(loc);
        }
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

  const handleSheetChange = useCallback((index: number) => {
    setSheetIndex(index);

    if (index === -1) {
      setTimeout(() => {
        setShowCollapsedPill(true);
      }, 1);
    } else {
      setShowCollapsedPill(false);
    }
  }, []);

  const openSheet = () => {
    setShowCollapsedPill(false);
    bottomSheetRef.current?.snapToIndex(1);
    setSheetIndex(1);
  };

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
            </group>
             <PinLayer
                pins={pins}
                previewPin={previewPin}
                previewPinRef={previewPinRef}
              />
          </Suspense>

       


          <CameraController
            gestureRef={gestureRef}
            onRadiusChange={handleRadiusChange}
            lerpRadiusRef={lerpRadiusRef}
            maxRadius={FLOOR_CONFIG[activeFloor].switchRadius}
            cameraRef={cameraRef}
          />
        </Canvas>

        {!isSheetOpen && !pinMode && (
          <View
            style={styles.mapGestureLayer}
            pointerEvents="auto"
            {...cameraPanResponder.panHandlers}
          />
        )}
    {sheetIndex === -1 && (
        <Pressable
        onPress={() => setPinMode((prev) => !prev)}
        style={{
          position: "absolute",
          bottom: 140,
          right: 20,
          backgroundColor: pinMode ? "red" : "blue",
          padding: 12,
          borderRadius: 24,
          zIndex: 100,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          {pinMode ? "Placing..." : "Add Pin"}
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

        

       

        {location && (
          <Text style={styles.gpsText}>
            {location.coords.latitude.toFixed(15)},{" "}
            {location.coords.longitude.toFixed(15)},{" "}
            {location.coords.altitude?.toFixed(15) ?? "N/A"}
          </Text>
        )}


        {selectedRoom && (
          <Text style={styles.selectedRoomText}>
            Selected Room: {selectedRoom}
          </Text>
        )}

        {location &&
          (() => {
            const pos = normalizeLocation(
              location.coords.latitude,
              location.coords.longitude
            );

            return (
              <View
                style={[
                  styles.userDot,
                  {
                    left: pos.x * mapSize.width - 6,
                    top: pos.y * mapSize.height - 6,
                  },
                ]}
              />
            );
          })()}

          {pinMode && (
            <View style={styles.pinOverlay} {...pinPanResponder.panHandlers} />
          )}

        {showCollapsedPill && (
          <Pressable style={styles.collapsedSearchWrap} onPress={openSheet}>
            <View style={styles.collapsedHandle} />
            <SearchBarRow
              search={search}
              setSearch={setSearch}
              onPressExpand={openSheet}
            />
          </Pressable>
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
            <SearchBarRow
              search={search}
              setSearch={setSearch}
              onPressExpand={() => bottomSheetRef.current?.snapToIndex(1)}
            />

            {selectedEvent ? (
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
                <Text style={styles.eventDescription}>
                  {selectedEvent.description}
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Nearby</Text>
                <NearbyChips />

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
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  collapsedSearchWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 34,
    backgroundColor: "rgba(189, 189, 189, 0.75)",
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingTop: 8,
    paddingBottom: 6,
    zIndex: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  collapsedHandle: {
    alignSelf: "center",
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(120,120,120,0.7)",
    marginBottom: 8,
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
  pinButton: {
    position: "absolute",
    bottom: 145,
    right: 20,
    padding: 12,
    borderRadius: 24,
    zIndex: 5,
  },
  pinButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  gpsText: {
    position: "absolute",
    top: 50,
    left: 20,
    color: "white",
    fontSize: 14,
    zIndex: 20,
  },
  draggingPin: {
    position: "absolute",
    width: 20,
    height: 20,
    backgroundColor: "red",
    borderRadius: 10,
    zIndex: 20,
  },
  placedPin: {
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "red",
    borderRadius: 6,
    zIndex: 20,
  },
  userDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    zIndex: 20,
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
    bottom: 0,
    zIndex: 1,
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
  selectedRoomText: {
    position: "absolute",
    top: 80,
    left: 20,
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    zIndex: 20,
  },
});