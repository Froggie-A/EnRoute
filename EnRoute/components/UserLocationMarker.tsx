import React, { useMemo } from "react";
import * as THREE from "three";
import { normalizeLocationToBuilding } from "@/utils/buildingLocation";

type Props = {
    latitude: number;
    longitude: number;
    activeFloor: 1 | 2 | 3;
    isNavigating?: boolean;
};

/*
  Bounds match the actual node coordinate range in seed-nodes.ts.
  x: entrance0=48 .. room_1200=-53  →  minX=-53, maxX=48
  y(→z): bathroom_0=15 .. bathroom_5=-40  →  minZ=-40, maxZ=15

  y: 0.05 — marker sits just above the floor surface after group scale 0.1.
*/
const MODEL_FLOOR_BOUNDS: Record<
    1 | 2 | 3,
    { minX: number; maxX: number; minZ: number; maxZ: number; y: number }
> = {
    1: { minX: -53, maxX: 48, minZ: -40, maxZ: 15, y: 0.05 },
    2: { minX: -53, maxX: 48, minZ: -40, maxZ: 15, y: 0.05 },
    3: { minX: -53, maxX: 48, minZ: -40, maxZ: 15, y: 0.05 },
};

// Chevron shape for navigation mode
function makeChevronShape(s = 0.5): THREE.Shape {
    const shape = new THREE.Shape();
    shape.moveTo(0, -s * 1.2);
    shape.lineTo( s * 0.55,  s * 0.7);
    shape.lineTo( s * 0.18,  s * 0.3);
    shape.lineTo(-s * 0.18,  s * 0.3);
    shape.lineTo(-s * 0.55,  s * 0.7);
    shape.closePath();
    return shape;
}

export default function UserLocationMarker({
                                               latitude, longitude, activeFloor, isNavigating = false,
                                           }: Props) {
    const pos = useMemo(() => {
        const normalized = normalizeLocationToBuilding(latitude, longitude);
        const bounds = MODEL_FLOOR_BOUNDS[activeFloor];
        const x = THREE.MathUtils.lerp(bounds.minX, bounds.maxX, normalized.x);
        const z = THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, normalized.y);
        return { x, y: bounds.y, z };
    }, [latitude, longitude, activeFloor]);

    const chevronGeo = React.useMemo(() => {
        const shape = makeChevronShape(0.5);
        return new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false });
    }, []);

    if (isNavigating) {
        return (
            <group position={[pos.x, pos.y, pos.z]}>
                <mesh geometry={chevronGeo} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1002}>
                    <meshBasicMaterial
                        color="#E74C3C"
                        side={THREE.DoubleSide}
                        depthTest={false}
                        depthWrite={false}
                    />
                </mesh>
            </group>
        );
    }

    return (
        <group>
            <mesh position={[pos.x, pos.y, pos.z]}>
                <sphereGeometry args={[0.6, 20, 20]} />
                <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[pos.x, pos.y - 0.45, pos.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.75, 1.15, 32]} />
                <meshStandardMaterial color="#93C5FD" transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}