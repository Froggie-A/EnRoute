// utils/routeToWaypoints.ts
// Converts a RouteResult into world-space [x, y, z] waypoints for TestPath.
//
// MODE: USE_MODEL_SPACE_COORDS = true
//   Node x,y are pre-scale model coords (same as roomHitbox.tsx positions).
//   worldX = node.x * 0.1,  worldZ = node.y * 0.1
//   Use this with seed-nodes-test.ts.
//
// MODE: USE_MODEL_SPACE_COORDS = false
//   Node x,y are legacy seed coords (0-750, 0-780 range).
//   Uses affine transform. Use with the original seed-nodes.ts.

import type { RouteResult } from "@/navigation/pathfinding";

// ── Switch this when toggling between test and production data ────────────────
const USE_MODEL_SPACE_COORDS = true;
// ─────────────────────────────────────────────────────────────────────────────

const FLOOR_Y    = -0.2;   // confirmed floor surface Y
const GROUP_SCALE = 0.1;   // Building group scale in index.tsx

// Legacy transform (only used when USE_MODEL_SPACE_COORDS = false)
const Axx =  0.052162, Axy = -0.168076, Bx = 47.9131;
const Azx = -0.157218, Azy =  0.003359, Bz = 63.1001;

function nodeToWorld(x: number, y: number): [number, number, number] {
    if (USE_MODEL_SPACE_COORDS) {
        return [x * GROUP_SCALE, FLOOR_Y, y * GROUP_SCALE];
    }
    return [
        (Axx * x + Axy * y + Bx) * GROUP_SCALE,
        FLOOR_Y,
        (Azx * x + Azy * y + Bz) * GROUP_SCALE,
    ];
}

export function routeToWaypoints(
    route: RouteResult | null
): [number, number, number][] {
    if (!route || route.steps.length < 2) return [];

    const waypoints: [number, number, number][] = [];

    for (const step of route.steps) {
        const wp = nodeToWorld(step.node.x, step.node.y);
        if (waypoints.length > 0) {
            const prev = waypoints[waypoints.length - 1];
            const dx = wp[0] - prev[0], dz = wp[2] - prev[2];
            if (Math.sqrt(dx * dx + dz * dz) < 0.001) continue;
        }
        waypoints.push(wp);
    }

    return waypoints;
}
// Returns waypoints tagged with their floor — used to filter path per floor
export type FlooredWaypoint = { pos: [number, number, number]; floor: number };

export function routeToWaypointsWithFloor(
    route: RouteResult | null
): FlooredWaypoint[] {
    if (!route || route.steps.length < 2) return [];
    const result: FlooredWaypoint[] = [];
    for (const step of route.steps) {
        const pos = nodeToWorld(step.node.x, step.node.y);
        if (result.length > 0) {
            const prev = result[result.length - 1].pos;
            if (Math.sqrt((pos[0]-prev[0])**2 + (pos[2]-prev[2])**2) < 0.001) continue;
        }
        result.push({ pos, floor: step.node.floor });
    }
    return result;
}