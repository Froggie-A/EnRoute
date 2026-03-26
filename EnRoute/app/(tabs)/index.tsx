import { useGLTF } from "@react-three/drei/native";
import { Canvas, useThree, useFrame } from "@react-three/fiber/native";
import { Asset } from "expo-asset";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, View } from "react-native";
import { FloorSwitcher } from "@/components/floorSwitcher";
import * as THREE from "three";

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

function GLTFModel({ uri }: { uri: string }) {
  const { scene } = useGLTF(uri);
  return (
    <primitive
      object={scene}
      scale={0.1}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

function Model({ floor }: { floor: FloorNumber }) {
  const assetModule = useMemo(() => FLOOR_MODELS[floor], [floor]);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync();
        if (!cancelled) setUri(asset.localUri ?? asset.uri ?? null);
      } catch {
        if (!cancelled) setUri(null);
      }
    }

    setUri(null);
    prepare();

    return () => {
      cancelled = true;
    };
  }, [assetModule, floor]);

  if (!uri) return null;
  return <GLTFModel key={uri} uri={uri} />;
}

function CameraController({
  gestureRef,
}: {
  gestureRef: React.MutableRefObject<GestureState>;
}) {
  const { camera } = useThree();

  const spherical = useRef(
    new THREE.Spherical().setFromVector3(new THREE.Vector3(0, 10, 4.5))
  );
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    const g = gestureRef.current;

    const panSpeed = 0.01;

const offset = new THREE.Vector3().setFromSpherical(spherical.current);
const right = new THREE.Vector3()
  .crossVectors(offset, new THREE.Vector3(0, 1, 0))
  .normalize();

const forward = new THREE.Vector3()
  .crossVectors(right, new THREE.Vector3(0, 1, 0))
  .normalize();

target.current.addScaledVector(right, -g.deltaPan.x * panSpeed);
target.current.addScaledVector(forward, g.deltaPan.y * panSpeed);

    spherical.current.theta -= g.deltaRotate.x * 0.0035;
    spherical.current.phi -= g.deltaRotate.y * 0.0035;

    spherical.current.phi = Math.max(
      0.15,
      Math.min(Math.PI - 0.15, spherical.current.phi)
    );

    
    if (g.deltaZoom !== 0) {
      spherical.current.radius *= 1 - g.deltaZoom * 0.006;
      spherical.current.radius = Math.max(2.5, Math.min(25, spherical.current.radius));
    }

    const position = new THREE.Vector3()
      .setFromSpherical(spherical.current)
      .add(target.current);

    camera.position.copy(position);
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
  const [isReady, setIsReady] = useState(false);

  const gestureRef = useRef<GestureState>({
  deltaRotate: { x: 0, y: 0 },
  deltaZoom: 0,
  deltaPan: { x: 0, y: 0 },
});

  const prevTouches = useRef<{ x: number; y: number }[]>([]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (e) => {
          prevTouches.current = e.nativeEvent.touches.map((t) => ({
            x: t.pageX,
            y: t.pageY,
          }));
        },

        onPanResponderMove: (e) => {
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
  const t0 = touches[0];
  const t1 = touches[1];

  const currDist = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
  const currMidX = (t0.pageX + t1.pageX) / 2;
  const currMidY = (t0.pageY + t1.pageY) / 2;

  if (prevTouches.current.length === 2) {
    const p0 = prevTouches.current[0];
    const p1 = prevTouches.current[1];

    const prevDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const prevMidX = (p0.x + p1.x) / 2;
    const prevMidY = (p0.y + p1.y) / 2;

    const distDelta = currDist - prevDist;
    const midDeltaX = currMidX - prevMidX;
    const midDeltaY = currMidY - prevMidY;

    
    gestureRef.current.deltaZoom += distDelta * 0.15;

    
    if (Math.abs(midDeltaX) > 0.5 || Math.abs(midDeltaY) > 0.5) {
      
      const pinchAmount = Math.abs(distDelta);
      const panFactor = pinchAmount > 8 ? 0.08 : 0.25;

      gestureRef.current.deltaPan.x += midDeltaX * panFactor;
      gestureRef.current.deltaPan.y += midDeltaY * panFactor;
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
    []
  );

  useEffect(() => {
    async function preloadAll() {
      try {
        await Promise.all(
          Object.values(FLOOR_MODELS).map(async (moduleRef) => {
            const asset = Asset.fromModule(moduleRef);
            await asset.downloadAsync();
          })
        );
      } catch (error) {
        console.log("Error preloading floor models:", error);
      } finally {
        setIsReady(true);
      }
    }

    preloadAll();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Canvas
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        camera={{ position: [0, 10, 4.5], fov: 45 }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 5, 2]} intensity={1} />
        <directionalLight position={[-3, 5, -2]} intensity={0.9} />
        <directionalLight position={[0, 4, 4]} intensity={0.7} />

        <Suspense fallback={null}>
          <Model key={activeFloor} floor={activeFloor} />
        </Suspense>

        <CameraController gestureRef={gestureRef} />
      </Canvas>

      <FloorSwitcher
        activeFloor={activeFloor}
        onFloorChange={(floor) => setActiveFloor(floor as FloorNumber)}
      />
    </View>
  );
}