// components/testpath.tsx

// Renders the active navigation path as a 3D tube using CatmullRom spline geometry.
// Shows a start marker, end dot, faded completed section, and projects the endpoint to screen space via endLabelPosRef.

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber/native";

export const FLOOR_Y = -0.2;

const PATH_COLOR  = "#1A365D";
const TUBE_RADIUS = 0.045;
const TUBE_SEGS   = 8;
const LIFT_Y      = 0.06;
const CURVE_TENSION = 0.4;

export const endLabelPosRef = { current: null as { x: number; y: number } | null };

type Props = {
    waypoints: [number, number, number][];
    completedFraction?: number;
    fullWaypoints?: [number, number, number][];
    isNavigating?: boolean;
};

/** Builds a TubeGeometry along densified CatmullRom spline through the given waypoints. */
function buildTube(points: [number, number, number][]): THREE.TubeGeometry {
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
    const tubularSegs = Math.max(60, densified.length * 12);
    return new THREE.TubeGeometry(curve, tubularSegs, TUBE_RADIUS, TUBE_SEGS, false);
}

/** Renders a circular start marker at the beginning of the path. */
function StartMarker({ pos }: { pos: [number, number, number] }) {
    const [x, y, z] = pos;
    const flat: [number, number, number] = [-Math.PI / 2, 0, 0];
    return (
        <group position={[x, y + LIFT_Y, z]}>
            <mesh rotation={flat} renderOrder={1000}>
                <ringGeometry args={[0.10, 0.20, 30]} />
                <meshBasicMaterial color="white" side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh rotation={flat} renderOrder={1001}>
                <circleGeometry args={[0.10, 30]} />
                <meshBasicMaterial color="#1A6BFF" side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
        </group>
    );
}

/** Renders a circular end marker at the path destination. */
function EndDot({ pos }: { pos: [number, number, number] }) {
    const [x, y, z] = pos;
    const flat: [number, number, number] = [-Math.PI / 2, 0, 0];
    return (
        <group position={[x, y + LIFT_Y, z]}>
            <mesh rotation={flat} renderOrder={1000}>
                <ringGeometry args={[0.14, 0.24, 34]} />
                <meshBasicMaterial color="white" side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh rotation={flat} renderOrder={1001}>
                <circleGeometry args={[0.10, 30]} />
                <meshBasicMaterial color="#27AE60" side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
        </group>
    );
}

/** Projects the 3D endpoint to screen space each frame and writes the result to endLabelPosRef. */
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

/** Renders the navigation path as a 3D tube with start/end markers and a faded completed section. */
export default function TestPath({ waypoints, fullWaypoints, completedFraction = 0, isNavigating = false }: Props) {
    const tubeGeo = useMemo(() => buildTube(waypoints), [waypoints]);

    const completedWaypoints = useMemo(() => {
        if (!fullWaypoints || fullWaypoints.length < 2 || completedFraction <= 0) return null;
        if (waypoints.length < 2) return null;
        const userStart = waypoints[0];
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