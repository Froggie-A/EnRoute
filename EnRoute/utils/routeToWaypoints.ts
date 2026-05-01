// utils/routeToWaypoints.ts
// Converts a RouteResult into Three.js world-space waypoints for TestPath.
// Supports both model-space coords (used with seed-nodes.ts) and a legacy affine transform mode.

import type { RouteResult } from "@/navigation/pathfinding";

const USE_MODEL_SPACE_COORDS = true;

const FLOOR_Y    = -0.2;
const GROUP_SCALE = 0.1;

const Axx =  0.052162, Axy = -0.168076, Bx = 47.9131;
const Azx = -0.157218, Azy =  0.003359, Bz = 63.1001;

/** Converts node model-space coords to Three.js world-space. */
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

/** Converts a RouteResult into a flat array of world-space waypoints for TestPath. */
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
export type FlooredWaypoint = { pos: [number, number, number]; floor: number };

/** Converts a RouteResult into world-space waypoints tagged with their floor number. */
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