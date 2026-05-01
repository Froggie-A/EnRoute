/**
 * UserLocationMarker.tsx
 *
 * This component is responsible for tracking and visualizing the user’s position
 * within the indoor navigation system. Instead of relying purely on GPS, it uses
 * a hybrid “confidence-based” approach that combines multiple device sensors:
 *
 * - accelerometer → detects steps to estimate movement between nodes
 * - magnetometer / deviceMotion → determines heading and direction of travel
 * - GPS (bootstrapping only) → provides an initial approximate position
 *
 * The user’s position is mapped onto a predefined navigation graph
 * Movement between nodes is not continuous, but inferred through
 * - step counts required per edge
 * - heading alignment with neighboring nodes
 * - confidence thresholds to prevent incorrect transitions
 *
**/

 const DEMO_MODE       = true;
const DEMO_START_NODE = "vending0";
const STEP_BUFFER     = 0;

import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber/native";
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion } from "expo-sensors";
import { TEST_NODES, TEST_EDGES } from "@/navigation/seed-nodes";

const DEMO_EDGE_STEPS: Record<string, number> = {
    "vending0|hallway82":     5,
    "hallway82|hallway30":    6,
    "hallway30|hallway29":    8,
    "hallway29|hallway28":   13,
    "hallway28|hallway27":   12,
    "hallway27|hallway78":   38,
    "hallway78|hallway79":    5,
    "hallway79|hallway80":   28,
    "hallway80|hallway81":    7,
    "hallway81|hallway39":   11,
    "hallway39|hallway40":    6,
    "hallway40|hallway41":    8,
    "hallway41|hallway42":    5,
    "hallway42|hallway43":   21,
    "hallway43|hallway63":   18,
    "hallway63|hallway62":   16,
    "hallway62|hallway61":    5,
    "hallway61|hallway53":   21,
    "hallway53|hallway52":   17,
    "hallway52|hallway51":   24,
    "hallway51|room_1263_a":  6,
    "hallway53|hallway54":   27,
    "hallway54|hallway55":   20,
    "hallway55|hallway56":    7,
    "hallway56|hallway41":   27,
};

const STEP_M = 0.58, METERS_PER_NODE = 1.063;

const NB = new Map<string, Set<string>>();
const NM = new Map<string, { id: string; x: number; y: number; floor: number }>();
for (const n of TEST_NODES) { NB.set(n.id, new Set()); NM.set(n.id, n); }
for (const e of TEST_EDGES) {
    NB.get(e.fromNodeId)?.add(e.toNodeId);
    if (e.bidirectional) NB.get(e.toNodeId)?.add(e.fromNodeId);
}

/** Returns the step count required to traverse the edge between two nodes, using measured ground-truth data when available. */
function requiredSteps(fromId: string, toId: string): number {
    const key = `${fromId}|${toId}`, rev = `${toId}|${fromId}`;
    const m = DEMO_EDGE_STEPS[key] ?? DEMO_EDGE_STEPS[rev];
    if (m !== undefined) return Math.max(1, m - STEP_BUFFER);
    const a = NM.get(fromId), b = NM.get(toId);
    if (!a || !b) return 3;
    return Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) * METERS_PER_NODE / STEP_M) - STEP_BUFFER);
}

const LAT_MEAN = 30.4076288440, LON_MEAN = -91.1800997696;
const LAT_SCALE = 111000.0, LON_SCALE = 96000.0;

/** Converts GPS coordinates to local model-space (x, y) using a fixed origin and scale. */
function gpsToNode(lat: number, lon: number) {
    const dlat = (lat - LAT_MEAN) * LAT_SCALE, dlon = (lon - LON_MEAN) * LON_SCALE;
    return { x: 0.81915305*dlat + 0.66436662*dlon - 8.66666667,
        y: -0.30001749*dlat + 0.72257358*dlon - 19.66666667 };
}

const EAST_NX=0.676834, EAST_NY=0.736135, NORTH_NX=0.939000, NORTH_NY=-0.343916;
const HEADING_OFFSET = 180;
/** Converts a compass heading in degrees to a normalized (dx, dy) direction vector in model space. */
function headingToDir(deg: number) {
    const h = ((deg + HEADING_OFFSET + 360) % 360) * Math.PI / 180;
    return { dx: Math.sin(h)*EAST_NX + Math.cos(h)*NORTH_NX,
        dy: Math.sin(h)*EAST_NY + Math.cos(h)*NORTH_NY };
}
/** Computes the circular mean of an array of degree values. */
function circMean(a: number[]) {
    let sx=0,cx=0;
    for (const v of a) { sx+=Math.sin(v*Math.PI/180); cx+=Math.cos(v*Math.PI/180); }
    const m = Math.atan2(sx/a.length, cx/a.length) * 180/Math.PI;
    return m < 0 ? m+360 : m;
}
/** Returns the circular confidence (resultant length) of an array of degree values, ranging 0–1. */
function circConf(a: number[]) {
    if (a.length < 2) return 0.4;
    let sx=0,cx=0;
    for (const v of a) { sx+=Math.sin(v*Math.PI/180); cx+=Math.cos(v*Math.PI/180); }
    return Math.sqrt((sx/a.length)**2 + (cx/a.length)**2);
}
/** Returns the normalized direction vector from node A to node B, or null if either is missing or coincident. */
function nodeDir(a: string, b: string) {
    const na=NM.get(a), nb=NM.get(b);
    if (!na||!nb) return null;
    const dx=nb.x-na.x, dy=nb.y-na.y, d=Math.hypot(dx,dy);
    return d < 0.001 ? null : { dx:dx/d, dy:dy/d };
}
/** Returns the dot product of the heading direction and the target direction — positive means aligned. */
function headingAlign(deg: number, dir: {dx:number,dy:number}) {
    const h = headingToDir(deg);
    return h.dx*dir.dx + h.dy*dir.dy;
}

const ACCEL_MS = 40, MAG_MS = 100, DM_MS = 100;

const STEP_THRESH = 2.2;  // slightly lower for sensitivity
const STEP_MIN_MS = 300;  // 300ms = max ~3.3 steps/sec
const ACCEL_BUF   = 4;    // smaller buffer = faster response

const DEMO_REROUTE_STEPS   = 14;
const NORMAL_REROUTE_STEPS = 5;
const MISALIGN_DOT         = -0.30;
const REROUTE_MAG_MIN      = 0.55;

const FREE_MAG_MIN   = 0.45;
const FREE_ALIGN_MIN = 0.50;
const FREE_GAP_MIN   = 0.15;

const GPS_SAMPLES = 3, GPS_INSTANT_GAP = 10;
const LERP_SPEED  = 0.14;

export interface BleBeacon { nodeId: string; rssi: number; txPower?: number; }

type Props = {
    latitude: number; longitude: number; gpsAccuracy?: number;
    activeFloor: 1|2|3; isNavigating?: boolean;
    currentNodeId?: string|null; onNodeChange?: (id: string) => void;
    routeNodeIds?: string[]; onRerouteNeeded?: (fromId: string) => void;
    bleBeacons?: BleBeacon[];
};

const FY: Record<1|2|3, number> = {
    1: -0.15,
    2: -0.15,
    3: -0.15,
};

/** Builds a chevron Shape geometry for the direction indicator. */
function makeChevron(s=0.05): THREE.Shape {
    const sh = new THREE.Shape();
    sh.moveTo(0,-s*1.2); sh.lineTo(s*.55,s*.7); sh.lineTo(s*.18,s*.3);
    sh.lineTo(-s*.18,s*.3); sh.lineTo(-s*.55,s*.7); sh.closePath();
    return sh;
}

/** Tracks user position on the nav graph using step detection and heading, rendering a 3D marker at the current node. */
export default function UserLocationMarker({
                                               latitude, longitude, gpsAccuracy=20,
                                               activeFloor, isNavigating=false,
                                               currentNodeId, onNodeChange,
                                               routeNodeIds=[], onRerouteNeeded,
                                           }: Props) {

    const nodeRef   = useRef<string|null>(null);
    const visualPos = useRef<THREE.Vector3|null>(null);
    const groupRef  = useRef<THREE.Group>(null);
    const [, tick]  = useState(0);
    const rerender  = () => tick(t => t+1);

    const booted    = useRef(false);
    const gpsBuf    = useRef<{x:number,y:number}[]>([]);
    const accelBuf  = useRef<number[]>([]);
    const magBuf    = useRef<number[]>([]);
    const dmHeading = useRef<number|null>(null);
    const lastStep  = useRef(0);

    const edgeTarget    = useRef<string|null>(null);
    const edgeSteps     = useRef(0);
    const misalignCount = useRef(0);

    const routeRef  = useRef(routeNodeIds);
    const isNavRef  = useRef(isNavigating);
    const rerouteRef = useRef(onRerouteNeeded);
    useEffect(() => { routeRef.current  = routeNodeIds;    }, [routeNodeIds]);
    useEffect(() => { isNavRef.current  = isNavigating;    }, [isNavigating]);
    useEffect(() => { rerouteRef.current = onRerouteNeeded; }, [onRerouteNeeded]);

    const commit = (to: string, reason: string) => {
        const from = nodeRef.current;
        if (to === from) return;
        if (from && !(NB.get(from)?.has(to) ?? false)) {
            console.warn(`[ULM] BLOCKED ${from}→${to}`); return;
        }
        edgeTarget.current = null;
        edgeSteps.current  = 0;
        nodeRef.current    = to;
        onNodeChange?.(to);
        rerender();
        console.log(`[ULM] ✓ ${from ?? "boot"}→${to}  (${reason})`);
    };

    useEffect(() => {
        if (booted.current) return;
        if (DEMO_MODE) {
            booted.current  = true;
            nodeRef.current = DEMO_START_NODE;
            onNodeChange?.(DEMO_START_NODE);
            rerender();
            console.log(`[ULM] DEMO boot → ${DEMO_START_NODE}`);
            return;
        }
        const gps = gpsToNode(latitude, longitude);
        const buf = gpsBuf.current;
        buf.push(gps);
        const ax = buf.reduce((s,p) => s+p.x, 0) / buf.length;
        const ay = buf.reduce((s,p) => s+p.y, 0) / buf.length;
        let bestId: string|null = null, bestD = Infinity, secD = Infinity;
        for (const n of TEST_NODES) {
            if (n.floor !== activeFloor) continue;
            const d = Math.hypot(n.x-ax, n.y-ay);
            if (d < bestD) { secD=bestD; bestD=d; bestId=n.id; }
            else if (d < secD) secD = d;
        }
        if (!bestId) return;
        const gap = secD - bestD;
        const confident = gap >= GPS_INSTANT_GAP, enough = buf.length >= GPS_SAMPLES;
        console.log(`[ULM] GPS ${buf.length}/${GPS_SAMPLES} → ${bestId} gap=${gap.toFixed(1)}`);
        if (confident || enough) {
            booted.current  = true;
            nodeRef.current = bestId;
            onNodeChange?.(bestId);
            rerender();
            console.log(`[ULM] GPS boot → ${bestId} (${confident ? "instant" : "avg"})`);
        }
    }, [latitude, longitude, activeFloor]);

    useEffect(() => {
        Magnetometer.setUpdateInterval(MAG_MS);
        const sub = Magnetometer.addListener(({ x, y }) => {
            let r = Math.atan2(-y, x) * 180/Math.PI;
            r = 90 - r; if (r < 0) r += 360; if (r >= 360) r -= 360;
            const buf = magBuf.current;
            buf.push(r); if (buf.length > 8) buf.shift();
        });
        return () => sub.remove();
    }, []);

    useEffect(() => {
        let live = true;
        DeviceMotion.isAvailableAsync().then(ok => {
            if (!ok || !live) return;
            DeviceMotion.setUpdateInterval(DM_MS);
            DeviceMotion.addListener((d: any) => {
                if (typeof d.heading === "number") dmHeading.current = d.heading;
            });
        });
        return () => { live = false; DeviceMotion.removeAllListeners(); };
    }, []);

    useEffect(() => {
        Accelerometer.setUpdateInterval(ACCEL_MS);
        const sub = Accelerometer.addListener(({ x, y, z }) => {
            const raw = Math.sqrt(x*x + y*y + z*z);
            const ms2 = raw < 3 ? raw * 9.81 : raw;
            const buf = accelBuf.current;
            buf.push(ms2); if (buf.length > ACCEL_BUF) buf.shift();
            const smooth = buf.reduce((a,b) => a+b, 0) / buf.length;
            const dev    = Math.abs(smooth - 9.81);

            const now = Date.now();
            if (dev <= STEP_THRESH || now - lastStep.current <= STEP_MIN_MS) return;
            lastStep.current = now;

            const cur = nodeRef.current;
            if (!cur) return;

            if (isNavRef.current) {
                const route = routeRef.current;
                if (!route.length) return;

                const idx = route.indexOf(cur);
                if (idx === -1) {
                    console.warn("[ULM] off-route at", cur);
                    edgeTarget.current = null; edgeSteps.current = 0; misalignCount.current = 0;
                    rerouteRef.current?.(cur); return;
                }
                if (idx >= route.length - 1) return; // at destination

                const next = route[idx + 1];
                if (!(NB.get(cur)?.has(next) ?? false)) {
                    console.warn("[ULM] route gap", cur, "→", next);
                    rerouteRef.current?.(cur); return;
                }

                const heading = dmHeading.current
                    ?? (magBuf.current.length > 0 ? circMean(magBuf.current) : null);
                const magStab = circConf(magBuf.current);

                if (heading !== null && magStab > REROUTE_MAG_MIN) {
                    const dir = nodeDir(cur, next);
                    if (dir) {
                        const align = headingAlign(heading, dir);
                        if (align < MISALIGN_DOT) {
                            misalignCount.current++;
                            const thr = DEMO_MODE ? DEMO_REROUTE_STEPS : NORMAL_REROUTE_STEPS;
                            if (misalignCount.current >= thr) {
                                console.warn(`[ULM] reroute: ${misalignCount.current} misaligned steps`);
                                edgeTarget.current = null; edgeSteps.current = 0; misalignCount.current = 0;
                                rerouteRef.current?.(cur); return;
                            }
                        } else {
                            misalignCount.current = 0;
                        }
                    }
                } else {
                    misalignCount.current = 0;
                }

                if (edgeTarget.current !== next) {
                    edgeTarget.current = next;
                    edgeSteps.current  = 0;
                }
                edgeSteps.current++;

                const needed = requiredSteps(cur, next);
                console.log(`[ULM NAV] step ${edgeSteps.current}/${needed}  ${cur}→${next}  dev=${dev.toFixed(2)}`);

                if (edgeSteps.current >= needed) {
                    commit(next, `${edgeSteps.current} steps (needed ${needed})`);
                }
                return;
            }

            const heading = dmHeading.current
                ?? (magBuf.current.length > 0 ? circMean(magBuf.current) : null);
            if (heading === null || magBuf.current.length < 2) return;

            const magStab = circConf(magBuf.current);
            if (magStab < FREE_MAG_MIN) return;

            const fromNode  = NM.get(cur);
            const neighbors = NB.get(cur);
            if (!fromNode || !neighbors || neighbors.size === 0) return;

            const dir = headingToDir(heading);
            const scored: { id: string; s: number }[] = [];
            for (const nid of neighbors) {
                const n = NM.get(nid); if (!n) continue;
                const dx = n.x - fromNode.x, dy = n.y - fromNode.y;
                const d  = Math.hypot(dx, dy);
                if (d < 0.001) continue;
                scored.push({ id: nid, s: (dx/d)*dir.dx + (dy/d)*dir.dy });
            }
            if (!scored.length) return;
            scored.sort((a,b) => b.s - a.s);
            const best = scored[0];
            if (best.s < FREE_ALIGN_MIN) return;
            if (scored.length > 1 && best.s - scored[1].s < FREE_GAP_MIN) return;

            if (edgeTarget.current !== best.id) {
                edgeTarget.current = best.id;
                edgeSteps.current  = 0;
            }
            edgeSteps.current++;
            const needed = requiredSteps(cur, best.id);
            console.log(`[ULM FREE] step ${edgeSteps.current}/${needed} ${cur}→${best.id} align=${best.s.toFixed(2)}`);
            if (edgeSteps.current >= needed) {
                commit(best.id, `free-roam ${edgeSteps.current} steps`);
            }
        });
        return () => sub.remove();
    }, [activeFloor]); // eslint-disable-line

    useEffect(() => {
        if (currentNodeId === null) {
            nodeRef.current       = null;
            booted.current        = false;
            edgeTarget.current    = null;
            edgeSteps.current     = 0;
            misalignCount.current = 0;
            gpsBuf.current        = [];
            visualPos.current     = null;
            rerender();
        }
    }, [currentNodeId]);

    useFrame(() => {
        const id = nodeRef.current;
        if (!id || !groupRef.current) return;
        const n = NM.get(id); if (!n) return;
        const target = new THREE.Vector3(n.x*0.1, FY[activeFloor], n.y*0.1);
        if (!visualPos.current) visualPos.current = target.clone();
        else visualPos.current.lerp(target, LERP_SPEED);
        groupRef.current.position.copy(visualPos.current);
    });

    const chevGeo = useMemo(
        () => new THREE.ExtrudeGeometry(makeChevron(0.05), { depth:0.008, bevelEnabled:false }),
        []
    );
    if (!NM.get(nodeRef.current ?? "")) return null;

    return (
        <group ref={groupRef}>
            <mesh renderOrder={1002}>
                <sphereGeometry args={[0.07, 20, 20]} />
                <meshStandardMaterial
                    color={isNavigating ? "#E74C3C" : "#3B82F6"}
                    emissive={isNavigating ? "#E74C3C" : "#3B82F6"}
                    emissiveIntensity={0.8} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh position={[0,-0.012,0]} rotation={[-Math.PI/2,0,0]} renderOrder={1001}>
                <ringGeometry args={[0.085, 0.13, 32]} />
                <meshStandardMaterial
                    color={isNavigating ? "#FCA5A5" : "#93C5FD"}
                    transparent opacity={0.9} side={THREE.DoubleSide}
                    depthTest={false} depthWrite={false} />
            </mesh>
        </group>
    );
}