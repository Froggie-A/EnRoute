 // use-route.ts
 // React hook initializes the database and route-finding to UI
 // line for index.tsx:
 //   const { getRoute, activeRoute, clearRoute, dbReady } = useRoute();
 // find a route between two node IDs
 //   getRoute("hallwayA_1", "room_1255_a", { accessible: false });


import { useEffect, useRef, useState, useCallback } from "react";
import { initSchema, seedIfNeeded, getNodes, getEdges } from "@/navigation/db";
import { findRoute, nearestNode } from "@/navigation/pathfinding";
import type { NavNode, NodeType } from "@/navigation/db";
import type { RouteResult } from "@/navigation/pathfinding";

interface UseRouteOptions {
    accessible?: boolean;
}

interface UseRouteReturn {
    dbReady: boolean;

    activeRoute: RouteResult | null;

    getRoute: (fromId: string, toId: string, opts?: UseRouteOptions) => RouteResult | null;

    // Find the nearest node to a screen tap position on floor
    snapToNode: (x: number, y: number, floor: number) => NavNode | null;

    clearRoute: () => void;

    nodes: NavNode[];

    // ACCESSIBLE MODE
    recalculate: (accessible: boolean) => void;
}

export function useRoute(): UseRouteReturn {
    const [dbReady, setDbReady] = useState(false);
    const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
    const [nodes, setNodes] = useState<NavNode[]>([]);

    // keep last route params so we can recalculate on accessible toggle
    const lastRoute = useRef<{ fromId: string; toId: string } | null>(null);
    const edgesRef = useRef(getEdges());

    useEffect(() => {
        try {
            initSchema();
            seedIfNeeded();
            setNodes(getNodes());
            edgesRef.current = getEdges();
            setDbReady(true);
        } catch (e) {
            console.error("[useRoute] DB init failed:", e);
        }
    }, []);

    const getRoute = useCallback(
        (fromId: string, toId: string, opts: UseRouteOptions = {}): RouteResult | null => {
            if (!dbReady) return null;
            lastRoute.current = { fromId, toId };
            const result = findRoute(fromId, toId, nodes, edgesRef.current, opts.accessible ?? false);
            setActiveRoute(result);
            return result;
        },
        [dbReady, nodes]
    );

    const recalculate = useCallback(
        (accessible: boolean) => {
            if (!lastRoute.current) return;
            const { fromId, toId } = lastRoute.current;
            getRoute(fromId, toId, { accessible });
        },
        [getRoute]
    );

    const snapToNode = useCallback(
        (x: number, y: number, floor: number): NavNode | null => {
            return nearestNode(x, y, floor, nodes);
        },
        [nodes]
    );

    const clearRoute = useCallback(() => {
        setActiveRoute(null);
        lastRoute.current = null;
    }, []);

    return { dbReady, activeRoute, getRoute, snapToNode, clearRoute, nodes, recalculate };
}