// use-route.ts
// React hook initializes the database and route-finding to UI
// Usage in index.tsx:
//   const { getRoute, activeRoute, clearRoute, dbReady } = useRoute();
//   getRoute("hallwayA_1", "room_1255_a", { accessible: false });

import { useEffect, useRef, useState, useCallback } from "react";
import { initSchema, seedIfNeeded, getNodes, getEdges } from "@/navigation/db";
import { findRoute, nearestNode } from "@/navigation/pathfinding";
import type { NavNode, NavEdge } from "@/navigation/db";
import type { RouteResult } from "@/navigation/pathfinding";

interface UseRouteOptions {
    accessible?: boolean;
}

interface UseRouteReturn {
    dbReady: boolean;
    activeRoute: RouteResult | null;
    getRoute: (fromId: string, toId: string, opts?: UseRouteOptions) => RouteResult | null;
    snapToNode: (x: number, y: number, floor: number) => NavNode | null;
    clearRoute: () => void;
    nodes: NavNode[];
    recalculate: (accessible: boolean) => void;
}

export function useRoute(): UseRouteReturn {
    const [dbReady, setDbReady] = useState(false);
    const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
    const [nodes, setNodes] = useState<NavNode[]>([]);

    const lastRoute = useRef<{ fromId: string; toId: string } | null>(null);
    // IMPORTANT: do NOT call getEdges() here — tables don't exist yet at module load time
    const edgesRef = useRef<NavEdge[]>([]);

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
            if (!dbReady) {
                console.warn("[getRoute] db not ready yet");
                return null;
            }
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