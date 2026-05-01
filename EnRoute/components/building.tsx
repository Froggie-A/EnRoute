import React, { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei/native";
import { Asset } from "expo-asset";
import * as THREE from "three";

import { FLOOR_MODELS, FloorNumber } from "@/components/mapConfig";

// ─── Floor model ──────────────────────────────────────────────────────────────

export function FloorModel({ source }: { source: number }) {
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

export function Building({ activeFloor }: { activeFloor: FloorNumber }) {
  return (
      <group scale={[0.1, 0.1, 0.1]}>
        <FloorModel key={`floor-${activeFloor}`} source={FLOOR_MODELS[activeFloor]} />
      </group>
  );
}