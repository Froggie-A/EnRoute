// hooks/use-test-route.ts
// Hook that returns a getTestRoute function for running A* directly on the in-memory test graph.
// Intended for quick iteration — edit seed-nodes.ts and hot-reload updates the path instantly.

import { useMemo } from "react";
import { TEST_NODES, TEST_EDGES } from "@/navigation/seed-nodes";
import { findRoute } from "@/navigation/pathfinding";
import type { NavNode, NavEdge } from "@/navigation/db";
import type { RouteResult } from "@/navigation/pathfinding";

/** Computes edge costs from node coordinates for the test graph. */
function buildEdges(nodes: NavNode[]): NavEdge[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return TEST_EDGES.map(edge => {
        const from = nodeMap.get(edge.fromNodeId);
        const to   = nodeMap.get(edge.toNodeId);
        let cost = 1;
        if (!from || !to) {
            console.warn('[use-test-route] missing node for edge:', edge.id,
                '— check that', edge.fromNodeId, 'and', edge.toNodeId, 'exist in TEST_NODES');
        } else if (from.floor !== to.floor) {
            cost = 30;
        } else {
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            cost = Math.sqrt(dx * dx + dy * dy);
        }
        return { ...edge, cost };
    });
}

/** Returns a getTestRoute function that runs A* on the in-memory test graph. */
export function useTestRoute() {
    const edges = useMemo(() => buildEdges(TEST_NODES), []);

    return function getTestRoute(fromId: string, toId: string): RouteResult | null {
        const result = findRoute(fromId, toId, TEST_NODES, edges);
        if (result) {
            console.log('[testRoute]', fromId, '→', toId, result.steps.length + ' steps');
        } else {
            console.warn('[testRoute] no route found:', fromId, '→', toId,
                '\n  Check both IDs exist in seed-nodes-test.ts and are connected by edges.');
        }
        return result;
    };
}