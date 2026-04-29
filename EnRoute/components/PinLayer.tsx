import React, { useMemo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";
import { useFrame } from "@react-three/fiber/native";

export type PinColor = "red" | "blue" | "green" | "yellow";

export type Pin = {
  x: number;
  y: number;
  z: number;
  floor: 1 | 2 | 3;
  title?: string;
  color?: PinColor;
};

type Props = {
  pins: Pin[];
  previewPin: Pin | null;
  previewPinRef: React.MutableRefObject<Pin | null>;
  activeFloor: 1 | 2 | 3;
};

const PIN_MODELS: Record<PinColor, number> = {
  red: require("../assets/models/mapPin.glb"),
  blue: require("../assets/models/mapPinBlue.glb"),
  green: require("../assets/models/mapPinGreen.glb"),
  yellow: require("../assets/models/mapPinYellow.glb"),
};

function PinModel({
  position,
  preview = false,
  previewPinRef,
  modelSource,
}: {
  position: [number, number, number];
  preview?: boolean;
  previewPinRef?: React.MutableRefObject<Pin | null>;
  modelSource: number;
}) {
  const asset = Asset.fromModule(modelSource);
  const uri = asset.localUri ?? asset.uri;
  const { scene } = useGLTF(uri);

  const groupRef = useRef<THREE.Group>(null);
  const targetRef = useRef(new THREE.Vector3());

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);

    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= box.min.y;

    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.frustumCulled = false;

        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((mat: any) => {
          mat.transparent = preview;
          mat.opacity = preview ? 0.6 : 1;
          mat.depthWrite = true;
          mat.needsUpdate = true;
        });
      }
    });

    return clone;
  }, [scene, preview]);

  useFrame((_, delta) => {
  if (!groupRef.current) return;
  if (!preview) return;
  if (!previewPinRef?.current) return;

  targetRef.current.set(
    previewPinRef.current.x,
    previewPinRef.current.y,
    previewPinRef.current.z
  );

  groupRef.current.position.lerp(
    targetRef.current,
    1 - Math.pow(0.00001, delta)
  );
});

  return (
    <group ref={groupRef} position={position} scale={[0.1, 0.1, 0.1]}>
      <primitive object={clonedScene} />
    </group>
  );
}

export default function PinLayer({
  pins,
  previewPin,
  previewPinRef,
  activeFloor,
}: Props) {
  const [ready, setReady] = useState(false);
  const EMBED_DEPTH = 0.0;

  useEffect(() => {
    let mounted = true;

    async function preloadPins() {
      const sources = Object.values(PIN_MODELS);

      await Promise.all(
        sources.map(async (source) => {
          const asset = Asset.fromModule(source);
          await asset.downloadAsync();
          const uri = asset.localUri ?? asset.uri;
          if (uri) useGLTF.preload(uri);
        })
      );

      if (mounted) setReady(true);
    }

    preloadPins();

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;

  const visiblePins = pins.filter(
    (pin): pin is Pin => pin !== null && pin.floor === activeFloor
  );

  const showPreview =
    previewPin !== null &&
    previewPin !== undefined &&
    previewPin.floor === activeFloor;

  return (
    <>
      {visiblePins.map((pin, index) => {
        const color = pin.color ?? "red";

        return (
          <PinModel
            key={`pin-${index}`}
            position={[pin.x, pin.y - EMBED_DEPTH, pin.z]}
            modelSource={PIN_MODELS[color]}
          />
        );
      })}

      {showPreview && previewPin !== null && (
      <PinModel
        key={`preview-${previewPin.color ?? "red"}`}
        position={[previewPin.x, previewPin.y - EMBED_DEPTH, previewPin.z]}
        preview
        modelSource={PIN_MODELS[previewPin.color ?? "red"]}
      />
    )}
    </>
  );
}