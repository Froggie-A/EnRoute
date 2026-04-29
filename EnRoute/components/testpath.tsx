// components/testpath.tsx
// Renders the navigation path as a 3D tube using CatmullRomCurve3 + TubeGeometry.

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber/native";

export const FLOOR_Y = -0.2;

const PATH_COLOR  = "#1A365D";
const TUBE_RADIUS = 0.045;   // world-space radius of the cylinder
const TUBE_SEGS   = 8;       // radial segments — smooth enough, cheap to render
const LIFT_Y      = 0.06;    // lift above floor to avoid z-fighting
const CURVE_TENSION = 0.4;

export const endLabelPosRef = { current: null as { x: number; y: number } | null };

type Props = {
    waypoints: [number, number, number][];
    completedFraction?: number;
    fullWaypoints?: [number, number, number][];
    isNavigating?: boolean;
};

// ─── Tube geometry ────────────────────────────────────────────────────────────
function buildTube(points: [number, number, number][]): THREE.TubeGeometry {
    // Insert midpoints between every pair of waypoints so the spline
    // has more control points to curve through — this is what eliminates
    // sharp 90-degree corners between hallway segments.
    const densified: THREE.Vector3[] = [];
    for (let i = 0; i < points.length; i++) {
        const [x, y, z] = points[i];
        densified.push(new THREE.Vector3(x, y + LIFT_Y, z));
        if (i < points.length - 1) {
            const [nx, ny, nz] = points[i + 1];
            densified.push(new THREE.Vector3(
                (x + nx) / 2,
                (y + ny) / 2 + LIFT_Y,
                (z + nz) / 2
            ));
        }
    }

    const curve = new THREE.CatmullRomCurve3(densified, false, "catmullrom", CURVE_TENSION);
    // More tubular segments = smoother curve along the path length
    const tubularSegs = Math.max(60, densified.length * 12);
    return new THREE.TubeGeometry(curve, tubularSegs, TUBE_RADIUS, TUBE_SEGS, false);
}

// ─── Start marker ─────────────────────────────────────────────────────────────
function StartMarker({ pos }: { pos: [number, number, number] }) {
    const [x, y, z] = pos;
    const flat: [number, number, number] = [-Math.PI / 2, 0, 0];
    return (
        <group position={[x, y + LIFT_Y, z]}>
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
        <group position={[x, y + LIFT_Y, z]}>
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

// ─── Projector ────────────────────────────────────────────────────────────────
function EndLabelProjector({ endPos }: { endPos: [number, number, number] }) {
    const { camera, size } = useThree();
    const worldPos = useMemo(
        () => new THREE.Vector3(endPos[0], endPos[1] + LIFT_Y, endPos[2]),
        [endPos]
    );

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
export default function TestPath({ waypoints, fullWaypoints, completedFraction = 0, isNavigating = false }: Props) {
    const tubeGeo = useMemo(() => buildTube(waypoints), [waypoints]);

    // Faded completed section — only render if we have a full path and some progress
    const completedWaypoints = useMemo(() => {
        if (!fullWaypoints || fullWaypoints.length < 2 || completedFraction <= 0) return null;
        // The completed section is fullWaypoints minus the remaining waypoints.
        // We compute it by taking fullWaypoints up to the point where remaining starts.
        if (waypoints.length < 2) return null;
        const userStart = waypoints[0];
        // Find where the remaining path starts in the full path
        let splitIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < fullWaypoints.length; i++) {
            const d = Math.hypot(
                fullWaypoints[i][0] - userStart[0],
                fullWaypoints[i][2] - userStart[2]
            );
            if (d < minDist) { minDist = d; splitIdx = i; }
        }
        if (splitIdx < 1) return null;
        return fullWaypoints.slice(0, splitIdx + 1) as [number, number, number][];
    }, [fullWaypoints, waypoints, completedFraction]);

    const completedGeo = useMemo(
        () => completedWaypoints && completedWaypoints.length >= 2
            ? buildTube(completedWaypoints)
            : null,
        [completedWaypoints]
    );

    if (waypoints.length < 2) return null;

    const startPos = waypoints[0];
    const endPos   = waypoints[waypoints.length - 1];

    return (
        <group>
            {/* Faded completed section behind user */}
            {completedGeo && (
                <mesh geometry={completedGeo} renderOrder={998}>
                    <meshStandardMaterial
                        color={PATH_COLOR}
                        roughness={0.4}
                        metalness={0.1}
                        transparent
                        opacity={0.18}
                        depthTest={false}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* Active remaining path ahead of user */}
            <mesh geometry={tubeGeo} renderOrder={999}>
                <meshStandardMaterial
                    color={PATH_COLOR}
                    roughness={0.4}
                    metalness={0.1}
                    depthTest={false}
                    depthWrite={false}
                />
            </mesh>

            {!isNavigating && <StartMarker pos={startPos} />}
            <EndDot pos={endPos} />
            <EndLabelProjector endPos={endPos} />
        </group>
    );
}