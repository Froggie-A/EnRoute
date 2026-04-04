import React, { useMemo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";
import { useFrame } from "@react-three/fiber/native";

export type Pin = {
  x: number;
  y: number;
  z: number;
  floor: 1 | 2 | 3;
};

type Props = {
  pins: Pin[];
  previewPin: Pin | null;
  previewPinRef: React.MutableRefObject<Pin | null>;
  activeFloor: 1 | 2 | 3;
};

const MAP_PIN_MODEL = require("../assets/models/mapPin.glb");

function PinModel({
  position,
  preview = false,
  previewPinRef,
  modelUri,
}: {
  position: [number, number, number];
  preview?: boolean;
  previewPinRef?: React.MutableRefObject<Pin | null>;
  modelUri: string;
}) {
  const { scene } = useGLTF(modelUri);
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

        if (child.material) {
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
      }
    });

    return clone;
  }, [scene, preview]);

  useEffect(() => {
    if (!groupRef.current || preview) return;
    groupRef.current.position.set(position[0], position[1], position[2]);
  }, [position, preview]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (preview && previewPinRef?.current) {
      targetRef.current.set(
        previewPinRef.current.x,
        previewPinRef.current.y,
        previewPinRef.current.z
      );

      groupRef.current.position.lerp(
        targetRef.current,
        1 - Math.pow(0.01, delta)
      );
    }
  });

  return (
    <group ref={groupRef} scale={[0.04, 0.04, 0.04]} rotation={[0, 0, 0]}>
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
  const [modelUri, setModelUri] = useState<string | null>(null);
  const EMBED_DEPTH = 0.0;

  useEffect(() => {
    let mounted = true;

    (async () => {
      const asset = Asset.fromModule(MAP_PIN_MODEL);
      await asset.downloadAsync();

      if (!mounted) return;

      const resolvedUri = asset.localUri ?? asset.uri;
      if (resolvedUri) {
        setModelUri(resolvedUri);
        useGLTF.preload(resolvedUri);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!modelUri) return null;

  const visiblePins = pins.filter((pin) => pin.floor === activeFloor);
  const showPreview = previewPin && previewPin.floor === activeFloor;

  return (
    <>
      {visiblePins.map((pin, index) => (
        <PinModel
          key={`pin-${index}`}
          position={[pin.x, pin.y - EMBED_DEPTH, pin.z]}
          modelUri={modelUri}
        />
      ))}

      {showPreview && previewPin && (
        <PinModel
          position={[previewPin.x, previewPin.y - EMBED_DEPTH, previewPin.z]}
          preview
          previewPinRef={previewPinRef}
          modelUri={modelUri}
        />
      )}
    </>
  );
}