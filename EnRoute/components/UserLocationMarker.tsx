import React, { useMemo } from "react";
import * as THREE from "three";
import { normalizeLocationToBuilding } from "@/utils/buildingLocation";

type Props = {
  latitude: number;
  longitude: number;
  activeFloor: 1 | 2 | 3;
};

/*
  These bounds define the usable floor area on your centered model,
  in the MODEL'S ORIGINAL coordinates before the parent group scale [0.1, 0.1, 0.1].

  You will probably need to tweak these numbers a little so the dot lines up perfectly.
*/
const MODEL_FLOOR_BOUNDS: Record<
  1 | 2 | 3,
  {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    y: number;
  }
> = {
  1: { minX: -30, maxX: 12, minZ: -18, maxZ: 18, y: 0.6 },
  2: { minX: -12, maxX: 12, minZ: -18, maxZ: 18, y: 0.6 },
  3: { minX: -12, maxX: 12, minZ: -18, maxZ: 18, y: 0.6 },
};

export default function UserLocationMarker({
  latitude,
  longitude,
  activeFloor,
}: Props) {
  const pos = useMemo(() => {
    const normalized = normalizeLocationToBuilding(latitude, longitude);
    const bounds = MODEL_FLOOR_BOUNDS[activeFloor];

    const x = THREE.MathUtils.lerp(bounds.minX, bounds.maxX, normalized.x);
    const z = THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, normalized.y);

    return {
      x,
      y: bounds.y,
      z,
    };
  }, [latitude, longitude, activeFloor]);

  return (
    <group>
      <mesh position={[pos.x, pos.y, pos.z]}>
        <sphereGeometry args={[0.6, 20, 20]} />
        <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={0.6} />
      </mesh>

      <mesh
        position={[pos.x, pos.y - 0.45, pos.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.75, 1.15, 32]} />
        <meshStandardMaterial color="#93C5FD" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}