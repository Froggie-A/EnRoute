import { useGLTF } from "@react-three/drei/native";
import { Canvas, useThree, useFrame } from "@react-three/fiber/native";
import { Asset } from "expo-asset";
import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
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

const FLOOR_CONFIG: Record<FloorNumber, { switchRadius: number; snapRadius: number; zoomInRadius: number }> = {
  1: { switchRadius: 20,  snapRadius: 10, zoomInRadius: 5 },
  2: { switchRadius: 120, snapRadius: 10, zoomInRadius: 5 },
  3: { switchRadius: 45,  snapRadius: 10, zoomInRadius: 5 },
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
        const materials = Array.isArray(child.material) ? child.material : [child.material];
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

  const spherical = useRef(new THREE.Spherical(FLOOR_CONFIG[1].snapRadius, Math.PI / 4, 0));
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
    const right = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize();
    const forward = new THREE.Vector3().crossVectors(right, new THREE.Vector3(0, 1, 0)).normalize();

    target.current.addScaledVector(right, -g.deltaPan.x * 0.01);
    target.current.addScaledVector(forward, g.deltaPan.y * 0.01);

    spherical.current.theta -= g.deltaRotate.x * 0.0035;
    spherical.current.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.current.phi - g.deltaRotate.y * 0.0035));

    if (g.deltaZoom !== 0 && lerpRadiusRef.current === null) {
      spherical.current.radius = Math.max(
        0.1,
        Math.min(maxRadiusRef.current * 1.2, spherical.current.radius * (1 - g.deltaZoom * 0.0045))
      );
    }

    onRadiusChange(spherical.current.radius);

    camera.position.copy(new THREE.Vector3().setFromSpherical(spherical.current).add(target.current));
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

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (e) => {
        prevTouches.current = e.nativeEvent.touches.map((t) => ({ x: t.pageX, y: t.pageY }));
      },

      onPanResponderMove: (e) => {
        const touches = e.nativeEvent.touches;

        if (touches.length === 1) {
          const prev = prevTouches.current[0];
          if (prev) {
            gestureRef.current.deltaRotate.x += touches[0].pageX - prev.x;
            gestureRef.current.deltaRotate.y += touches[0].pageY - prev.y;
          }
          prevTouches.current = [{ x: touches[0].pageX, y: touches[0].pageY }];
        } else if (touches.length === 2) {
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

      onPanResponderRelease: () => { prevTouches.current = []; },
      onPanResponderTerminate: () => { prevTouches.current = []; },
    }), []);

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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Canvas
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        camera={{ position: [0, 0, 0], fov: 45 }}
      >
        <ambientLight intensity={1.1} />
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
        onFloorChange={(floor) => setActiveFloor(floor as FloorNumber)}
      />
    </View>
  );
}