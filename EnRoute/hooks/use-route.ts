// hooks/use-route.ts
// Hook that exposes getRoute and snapToNode backed by the in-memory TEST_NODES graph.
// Used by the Directions sheet to compute routes without any SQLite dependency.

import { useCallback } from "react";
import { TEST_NODES, computeEdgeCosts } from "@/navigation/seed-nodes";
import { findRoute, nearestNode } from "@/navigation/pathfinding";
import type { NavNode } from "@/navigation/db";
import type { RouteResult } from "@/navigation/pathfinding";

interface UseRouteOptions {
    accessible?: boolean;
}

const EDGES = computeEdgeCosts(TEST_NODES);

/** Returns getRoute and snapToNode helpers backed by the in-memory TEST_NODES graph. */
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
        dbReady: true,
        nodes: TEST_NODES,
    };
}