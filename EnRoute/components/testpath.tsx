// components/testpath.tsx
// Waypoints received as a prop from index.tsx.
// Path only renders when directions are active (pathWaypoints.length >= 2).

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber/native";

export const FLOOR_Y = -0.2;

const PATH_COLOR = "#1A365D";
const PATH_WIDTH = 0.25;

// Shared ref: EndLabelProjector writes projected screen coords here every frame.
// testpathLabel.tsx reads it to position the pill overlay.
export const endLabelPosRef = { current: null as { x: number; y: number } | null };

type Props = {
    waypoints: [number, number, number][];
};

// ─── Ribbon geometry ──────────────────────────────────────────────────────────
function buildRibbon(points: [number, number, number][], width: number): THREE.BufferGeometry {
    const hw = width / 2;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < points.length; i++) {
        const [cx, cy, cz] = points[i];
        let dx = 0, dz = 0;
        if (i < points.length - 1) { dx += points[i + 1][0] - cx; dz += points[i + 1][2] - cz; }
        if (i > 0) { dx += cx - points[i - 1][0]; dz += cz - points[i - 1][2]; }
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        dx /= len; dz /= len;
        const px = -dz * hw, pz = dx * hw;
        positions.push(cx + px, cy, cz + pz);
        positions.push(cx - px, cy, cz - pz);
    }
    for (let i = 0; i < points.length - 1; i++) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2);
        indices.push(b + 1, b + 3, b + 2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

// ─── Start marker — Apple Maps location puck ──────────────────────────────────
function StartMarker({ pos }: { pos: [number, number, number] }) {
    const [x, y, z] = pos;
    const flat: [number, number, number] = [-Math.PI / 2, 0, 0];
    return (
        <group position={[x, y, z]}>
            <mesh rotation={flat} renderOrder={1000}>
                <ringGeometry args={[0.18, 0.26, 32]} />
                <meshBasicMaterial color="white" side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh rotation={flat} renderOrder={1001}>
                <circleGeometry args={[0.18, 32]} />
                <meshBasicMaterial color="#1A6BFF" side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
        </group>
    );
}

// ─── End dot ──────────────────────────────────────────────────────────────────
function EndDot({ pos }: { pos: [number, number, number] }) {
    const [x, y, z] = pos;
    const flat: [number, number, number] = [-Math.PI / 2, 0, 0];
    return (
        <group position={[x, y, z]}>
            <mesh rotation={flat} renderOrder={1000}>
                <ringGeometry args={[0.10, 0.15, 32]} />
                <meshBasicMaterial color="white" side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh rotation={flat} renderOrder={1001}>
                <circleGeometry args={[0.10, 32]} />
                <meshBasicMaterial color="#1A365D" side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
        </group>
    );
}

// ─── Projector — writes end screen coords to endLabelPosRef every frame ───────
function EndLabelProjector({ endPos }: { endPos: [number, number, number] }) {
    const { camera, size } = useThree();
    const worldPos = useMemo(() => new THREE.Vector3(...endPos), [endPos]);

    // Null out the ref when the path unmounts so the label disappears
    useEffect(() => {
        return () => { endLabelPosRef.current = null; };
    }, []);

    useFrame(() => {
        const ndc = worldPos.clone().project(camera);
        if (ndc.z > 1) {
            endLabelPosRef.current = null;
        } else {
            endLabelPosRef.current = {
                x: (ndc.x + 1) / 2 * size.width,
                y: (-ndc.y + 1) / 2 * size.height,
            };
        }
    });

    return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function TestPath({ waypoints }: Props) {
    const ribbonGeo = useMemo(() => buildRibbon(waypoints, PATH_WIDTH), [waypoints]);

    if (waypoints.length < 2) return null;

    const startPos = waypoints[0];
    const endPos = waypoints[waypoints.length - 1];

    return (
        <group>
            <mesh geometry={ribbonGeo} renderOrder={999}>
                <meshBasicMaterial
                    color={PATH_COLOR}
                    side={THREE.DoubleSide}
                    depthTest={false}
                    depthWrite={false}
                />
            </mesh>
            <StartMarker pos={startPos} />
            <EndDot pos={endPos} />
            <EndLabelProjector endPos={endPos} />
        </group>
    );
}