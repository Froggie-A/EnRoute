// components/UserLocationMarker.tsx
//
// ══════════════════════════════════════════════════════════════════════════════
const DEMO_MODE       = true;
// ── Demo start: match this to DEMO_START_NODE in index.tsx ──
const DEMO_START_NODE = "room_1263_cen";  // ← "vending0" or "room_1263_a"
const STEP_BUFFER     = 0;
// ══════════════════════════════════════════════════════════════════════════════

import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber/native";
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion } from "expo-sensors";
import { TEST_NODES, TEST_EDGES } from "@/navigation/seed-nodes";

// ─── Measured step counts (ground truth) ─────────────────────────────────────
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

// ─── Graph ────────────────────────────────────────────────────────────────────
const NB = new Map<string, Set<string>>();
const NM = new Map<string, { id: string; x: number; y: number; floor: number }>();
for (const n of TEST_NODES) { NB.set(n.id, new Set()); NM.set(n.id, n); }
for (const e of TEST_EDGES) {
    NB.get(e.fromNodeId)?.add(e.toNodeId);
    if (e.bidirectional) NB.get(e.toNodeId)?.add(e.fromNodeId);
}

function requiredSteps(fromId: string, toId: string): number {
    const key = `${fromId}|${toId}`, rev = `${toId}|${fromId}`;
    const m = DEMO_EDGE_STEPS[key] ?? DEMO_EDGE_STEPS[rev];
    if (m !== undefined) return Math.max(1, m - STEP_BUFFER);
    const a = NM.get(fromId), b = NM.get(toId);
    if (!a || !b) return 3;
    return Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) * METERS_PER_NODE / STEP_M) - STEP_BUFFER);
}

// ─── GPS ──────────────────────────────────────────────────────────────────────
const LAT_MEAN = 30.4076288440, LON_MEAN = -91.1800997696;
const LAT_SCALE = 111000.0, LON_SCALE = 96000.0;
function gpsToNode(lat: number, lon: number) {
    const dlat = (lat - LAT_MEAN) * LAT_SCALE, dlon = (lon - LON_MEAN) * LON_SCALE;
    return { x: 0.81915305*dlat + 0.66436662*dlon - 8.66666667,
        y: -0.30001749*dlat + 0.72257358*dlon - 19.66666667 };
}

// ─── Heading (for reroute detection and free-roam only) ───────────────────────
const EAST_NX=0.676834, EAST_NY=0.736135, NORTH_NX=0.939000, NORTH_NY=-0.343916;
const HEADING_OFFSET = 180;
function headingToDir(deg: number) {
    const h = ((deg + HEADING_OFFSET + 360) % 360) * Math.PI / 180;
    return { dx: Math.sin(h)*EAST_NX + Math.cos(h)*NORTH_NX,
        dy: Math.sin(h)*EAST_NY + Math.cos(h)*NORTH_NY };
}
function circMean(a: number[]) {
    let sx=0,cx=0;
    for (const v of a) { sx+=Math.sin(v*Math.PI/180); cx+=Math.cos(v*Math.PI/180); }
    const m = Math.atan2(sx/a.length, cx/a.length) * 180/Math.PI;
    return m < 0 ? m+360 : m;
}
function circConf(a: number[]) {
    if (a.length < 2) return 0.4;
    let sx=0,cx=0;
    for (const v of a) { sx+=Math.sin(v*Math.PI/180); cx+=Math.cos(v*Math.PI/180); }
    return Math.sqrt((sx/a.length)**2 + (cx/a.length)**2);
}
function nodeDir(a: string, b: string) {
    const na=NM.get(a), nb=NM.get(b);
    if (!na||!nb) return null;
    const dx=nb.x-na.x, dy=nb.y-na.y, d=Math.hypot(dx,dy);
    return d < 0.001 ? null : { dx:dx/d, dy:dy/d };
}
function headingAlign(deg: number, dir: {dx:number,dy:number}) {
    const h = headingToDir(deg);
    return h.dx*dir.dx + h.dy*dir.dy;
}

// ─── Tuning ───────────────────────────────────────────────────────────────────
const ACCEL_MS = 40, MAG_MS = 100, DM_MS = 100;

// Step detection — your devs are consistently 2.3–5.5, threshold is fine
const STEP_THRESH = 2.2;  // slightly lower for sensitivity
const STEP_MIN_MS = 300;  // 300ms = max ~3.3 steps/sec (faster than before)
const ACCEL_BUF   = 4;    // smaller buffer = faster response

// Reroute: only fires when heading is confidently wrong for many steps
// In demo mode this is very conservative — 14 steps facing wrong direction
const DEMO_REROUTE_STEPS   = 14;
const NORMAL_REROUTE_STEPS = 5;
const MISALIGN_DOT         = -0.30;
const REROUTE_MAG_MIN      = 0.55;

// Free-roam (non-navigating only)
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

const FY: Record<1|2|3, number> = { 1:0.05, 2:0.15, 3:0.25 };

function makeChevron(s=0.05): THREE.Shape {
    const sh = new THREE.Shape();
    sh.moveTo(0,-s*1.2); sh.lineTo(s*.55,s*.7); sh.lineTo(s*.18,s*.3);
    sh.lineTo(-s*.18,s*.3); sh.lineTo(-s*.55,s*.7); sh.closePath();
    return sh;
}

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

    // Edge tracking
    const edgeTarget    = useRef<string|null>(null);
    const edgeSteps     = useRef(0);
    const misalignCount = useRef(0);

    // Stale-closure refs
    const routeRef  = useRef(routeNodeIds);
    const isNavRef  = useRef(isNavigating);
    const rerouteRef = useRef(onRerouteNeeded);
    useEffect(() => { routeRef.current  = routeNodeIds;    }, [routeNodeIds]);
    useEffect(() => { isNavRef.current  = isNavigating;    }, [isNavigating]);
    useEffect(() => { rerouteRef.current = onRerouteNeeded; }, [onRerouteNeeded]);

    // ── Commit ────────────────────────────────────────────────────────────────
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

    // ── Bootstrap ─────────────────────────────────────────────────────────────
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

    // ── Magnetometer ──────────────────────────────────────────────────────────
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

    // ── DeviceMotion ──────────────────────────────────────────────────────────
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

    // ── Accelerometer: pure step counter, NO gyro gate ────────────────────────
    // The gyro was blocking nearly every step (gyroC=0.00 while walking).
    // Phone held flat causes constant gyro noise. Removed entirely for nav mode.
    // Reroute detection still uses magnetometer heading independently.
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

            // ── NAVIGATION: pure step counting, no gyro gate ──────────────────
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

                // Reroute: only using magnetometer, not gyro (gyro unreliable flat)
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

                // Track edge — reset only when target node changes (route update)
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

            // ── FREE-ROAM: heading-based (not navigating) ─────────────────────
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

    // ── Reset ─────────────────────────────────────────────────────────────────
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

    // ── Visual lerp ───────────────────────────────────────────────────────────
    useFrame(() => {
        const id = nodeRef.current;
        if (!id || !groupRef.current) return;
        const n = NM.get(id); if (!n) return;
        const target = new THREE.Vector3(n.x*0.1, FY[activeFloor], n.y*0.1);
        if (!visualPos.current) visualPos.current = target.clone();
        else visualPos.current.lerp(target, LERP_SPEED);
        groupRef.current.position.copy(visualPos.current);
    });

    // ── Geometry ──────────────────────────────────────────────────────────────
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