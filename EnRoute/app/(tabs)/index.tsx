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
  ScrollView,
  Pressable,
  PanResponder,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Canvas, useThree, useFrame } from "@react-three/fiber/native";
import { useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";
import * as Location from "expo-location";
import * as THREE from "three";

import { FloorSwitcher } from "@/components/floorSwitcher";
import SearchBarRow from "@/components/SearchBarRow";
import NearbyChips from "@/components/NearbyChips";
import EventCard from "@/components/EventCard";

const FLOOR_MODELS = {
  1: require("../../assets/models/1stFloorModel.glb"),
  2: require("../../assets/models/2ndFloorModel.glb"),
  3: require("../../assets/models/3rdFloorModel.glb"),
} as const;

type FloorNumber = keyof typeof FLOOR_MODELS;
type Pin = { x: number; y: number };

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
      <FloorModel source={FLOOR_MODELS[activeFloor]} />
    </group>
  );
}

function CameraController({
  gestureRef,
  onRadiusChange,
  lerpRadiusRef,
  maxRadius,
}: {
  gestureRef: React.MutableRefObject<GestureState>;
  onRadiusChange: (radius: number) => void;
  lerpRadiusRef: React.MutableRefObject<number | null>;
  maxRadius: number;
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

export default function HomeScreen() {
  const [activeFloor, setActiveFloor] = useState<FloorNumber>(1);
  const [cameraRadius, setCameraRadius] = useState(FLOOR_CONFIG[1].snapRadius);
  const [isReady, setIsReady] = useState(false);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapSize, setMapSize] = useState({ width: 1, height: 1 });
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const [pins, setPins] = useState<Pin[]>([]);
  const [pinMode, setPinMode] = useState(false);
  const [draggingPin, setDraggingPin] = useState<Pin | null>(null);

  const bounds = {
    minLat: 30.123,
    maxLat: 30.124,
    minLon: -91.123,
    maxLon: -91.122,
  };

  const lerpRadiusRef = useRef<number | null>(null);
  const activeFloorRef = useRef<FloorNumber>(1);
  const gestureRef = useRef<GestureState>({
    deltaRotate: { x: 0, y: 0 },
    deltaZoom: 0,
    deltaPan: { x: 0, y: 0 },
  });
  const prevTouches = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    activeFloorRef.current = activeFloor;
  }, [activeFloor]);

  const normalizeLocation = (lat: number, lon: number) => {
    const x = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon);
    const y = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
    return { x, y };
  };

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
        onStartShouldSetPanResponder: () => !pinMode,
        onMoveShouldSetPanResponder: () => !pinMode,

        onPanResponderGrant: (e) => {
          prevTouches.current = e.nativeEvent.touches.map((t) => ({
            x: t.pageX,
            y: t.pageY,
          }));
        },

        onPanResponderMove: (e) => {
          if (pinMode) return;

          const touches = e.nativeEvent.touches;

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
          prevTouches.current = [];
        },
        onPanResponderTerminate: () => {
          prevTouches.current = [];
        },
      }),
    [pinMode]
  );

  const pinPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => pinMode,
        onMoveShouldSetPanResponder: () => pinMode,

        onPanResponderGrant: (evt) => {
          if (!pinMode) return;

          const { locationX, locationY } = evt.nativeEvent;
          setDraggingPin({
            x: locationX / mapSize.width,
            y: locationY / mapSize.height,
          });
        },

        onPanResponderMove: (evt) => {
          if (!pinMode) return;

          const { locationX, locationY } = evt.nativeEvent;
          setDraggingPin({
            x: locationX / mapSize.width,
            y: locationY / mapSize.height,
          });
        },

        onPanResponderRelease: () => {
          if (draggingPin) {
            setPins((prev) => [...prev, draggingPin]);
            setDraggingPin(null);
            setPinMode(false);
          }
        },

        onPanResponderTerminate: () => {
          setDraggingPin(null);
        },
      }),
    [pinMode, mapSize.width, mapSize.height, draggingPin]
  );

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
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

  if (!isReady) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setMapSize({ width, height });
      }}
      {...cameraPanResponder.panHandlers}
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

        <Suspense fallback={null}>
          <Building activeFloor={activeFloor} />
        </Suspense>

        <CameraController
          gestureRef={gestureRef}
          onRadiusChange={handleRadiusChange}
          lerpRadiusRef={lerpRadiusRef}
          maxRadius={FLOOR_CONFIG[activeFloor].switchRadius}
        />
      </Canvas>

      <FloorSwitcher
        activeFloor={activeFloor}
        onFloorChange={(floor) => {
          const nextFloor = floor as FloorNumber;
          activeFloorRef.current = nextFloor;
          setActiveFloor(nextFloor);
          lerpRadiusRef.current = FLOOR_CONFIG[nextFloor].snapRadius;
        }}
      />

      {pinMode && (
        <View style={styles.pinOverlay} {...pinPanResponder.panHandlers} />
      )}

      <Pressable
        onPress={() => {
          setPinMode((prev) => !prev);
          setDraggingPin(null);
        }}
        style={[
          styles.pinButton,
          { backgroundColor: pinMode ? "red" : "blue" },
        ]}
      >
        <Text style={styles.pinButtonText}>
          {pinMode ? "Place Pin" : "Add Pin"}
        </Text>
      </Pressable>

      {location && (
        <Text style={styles.gpsText}>
          {location.coords.latitude.toFixed(6)},{" "}
          {location.coords.longitude.toFixed(6)}
        </Text>
      )}

      {draggingPin && (
        <View
          style={[
            styles.draggingPin,
            {
              left: draggingPin.x * mapSize.width - 10,
              top: draggingPin.y * mapSize.height - 10,
            },
          ]}
        />
      )}

      {pins.map((pin, index) => (
        <View
          key={index}
          style={[
            styles.placedPin,
            {
              left: pin.x * mapSize.width - 6,
              top: pin.y * mapSize.height - 6,
            },
          ]}
        />
      ))}

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

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: isExpanded ? mapSize.height * 0.62 : 90,
            borderRadius: isExpanded ? 26 : 32,
          },
        ]}
      >
        <Pressable
          style={styles.handleWrap}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.handle} />
        </Pressable>

        <Pressable onPress={() => setIsExpanded(true)}>
          <SearchBarRow search={search} setSearch={setSearch} />
        </Pressable>

        {isExpanded && (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Nearby</Text>
            <NearbyChips />

            <Text style={styles.sectionTitle}>Events</Text>

            <EventCard
              title="Resume Help"
              date="Feb 28 • 11 AM - 7 PM"
              location="PFT 3147"
              type="book-outline"
            />

            <EventCard
              title="Flutter Workshop"
              date="Mar 1 • 6 AM - 1 PM"
              location="PFT 2246"
              type="laptop-outline"
            />

            <EventCard
              title="Relaxation Social"
              date="Mar 2 • 1 PM - 10 PM"
              location="PFT 1255"
              type="chatbubble-outline"
              color="#E67E22"
            />

            <Text style={styles.radiusText}>
              Floor: L{activeFloor} • Radius: {cameraRadius.toFixed(1)}
            </Text>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    zIndex: 15,
  },
  bottomSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "rgba(189, 189, 189, 0.75)",
    borderWidth: 1,
    borderColor: "rgb(255, 255, 255)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 30,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
    marginTop: 8,
  },
  pinButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    padding: 12,
    borderRadius: 24,
    zIndex: 20,
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
  },
});