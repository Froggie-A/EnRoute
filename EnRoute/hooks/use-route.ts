// hooks/use-route.ts
// Provides getRoute and snapToNode for the Directions sheet (Navigate button flow).
// Reads directly from TEST_NODES in memory — no DB async timing issues.

import { useCallback } from "react";
import { TEST_NODES, computeEdgeCosts } from "@/navigation/seed-nodes";
import { findRoute, nearestNode } from "@/navigation/pathfinding";
import type { NavNode } from "@/navigation/db";
import type { RouteResult } from "@/navigation/pathfinding";

interface UseRouteOptions {
    accessible?: boolean;
}

// Build edges once at module load — they're derived from TEST_NODES which
// is static until the next hot reload, at which point the module re-evaluates.
const EDGES = computeEdgeCosts(TEST_NODES);

export function useRoute() {
    const getRoute = useCallback(
        (fromId: string, toId: string, opts: UseRouteOptions = {}): RouteResult | null => {
            return findRoute(fromId, toId, TEST_NODES, EDGES, opts.accessible ?? false);
        },
        []
    );

    const snapToNode = useCallback(
        (x: number, y: number, floor: number): NavNode | null => {
            return nearestNode(x, y, floor, TEST_NODES);
        },
        []
    );

    return {
        getRoute,
        snapToNode,
        dbReady: true,   // always ready — no async DB needed
        nodes: TEST_NODES,
    };
}