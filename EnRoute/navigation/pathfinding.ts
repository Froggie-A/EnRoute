// navigation/pathfinding.ts

// A* pathfinding over the nav graph.
// Computes the shortest route between two node IDs and returns step-by-step instructions with distances, walk times, and turn directions.

import type { NavNode, NavEdge } from './db';

const WALK_FT_PER_SEC = 0.58;
const FLOOR_TRANSITION_PENALTY_SEC = 30;

export type TurnDirection =
    | 'straight'
    | 'slight_left'
    | 'left'
    | 'sharp_left'
    | 'slight_right'
    | 'right'
    | 'sharp_right'
    | 'u_turn'
    | 'take_elevator'
    | 'take_stairs'
    | 'arrived';

export interface RouteStep {
    node: NavNode;
    distanceFt: number;
    walkSeconds: number;
    instruction: string;
    bearing: number;
    isFloorTransition: boolean;
}

export interface RouteResult {
    steps: RouteStep[];
    totalDistanceFt: number;
    totalWalkSeconds: number;
    floorTransitions: number;
}

interface HeapItem { nodeId: string; f: number; }

class MinHeap {
    private items: HeapItem[] = [];

    push(item: HeapItem): void {
        this.items.push(item);
        this.bubbleUp(this.items.length - 1);
    }

    pop(): HeapItem | undefined {
        const top = this.items[0];
        const last = this.items.pop()!;
        if (this.items.length > 0) { this.items[0] = last; this.sinkDown(0); }
        return top;
    }

    get size(): number { return this.items.length; }

    private bubbleUp(i: number): void {
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.items[p].f <= this.items[i].f) break;
            [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
            i = p;
        }
    }

    private sinkDown(i: number): void {
        const n = this.items.length;
        while (true) {
            let s = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.items[l].f < this.items[s].f) s = l;
            if (r < n && this.items[r].f < this.items[s].f) s = r;
            if (s === i) break;
            [this.items[s], this.items[i]] = [this.items[i], this.items[s]];
            i = s;
        }
    }
}

/** Returns the Euclidean distance between two nodes. */
function euclidean(a: NavNode, b: NavNode): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/** Returns the bearing in degrees from node A to node B (0 = north, 90 = east). */
function bearing(from: NavNode, to: NavNode): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const rad = Math.atan2(dx, -dy);
    return ((rad * 180) / Math.PI + 360) % 360;
}

/** Returns the relative turn direction given two consecutive bearings. */
function turnDirection(incomingBearing: number, outgoingBearing: number): TurnDirection {
    let diff = outgoingBearing - incomingBearing;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    if (diff >= -15 && diff <= 15)   return 'straight';
    if (diff > 15 && diff <= 45)     return 'slight_right';
    if (diff > 45 && diff <= 120)    return 'right';
    if (diff > 120 && diff <= 165)   return 'sharp_right';
    if (diff > 165 || diff < -165)   return 'u_turn';
    if (diff < -15 && diff >= -45)   return 'slight_left';
    if (diff < -45 && diff >= -120)  return 'left';
    return 'sharp_left';
}

/** Returns a human-readable instruction string for a given turn direction and destination node. */
function turnInstruction(
    dir: TurnDirection,
    nextNode: NavNode,
    edge?: NavEdge
): string {
    if (dir === 'arrived')        return `You have arrived at ${nextNode.label}`;
    if (dir === 'take_elevator')  return `Take the elevator to floor ${nextNode.floor}`;
    if (dir === 'take_stairs')    return `Take the stairs to floor ${nextNode.floor}`;
    if (dir === 'straight')       return `Continue straight`;
    if (dir === 'slight_left')    return `Bear left`;
    if (dir === 'left')           return `Turn left`;
    if (dir === 'sharp_left')     return `Turn sharp left`;
    if (dir === 'slight_right')   return `Bear right`;
    if (dir === 'right')          return `Turn right`;
    if (dir === 'sharp_right')    return `Turn sharp right`;
    if (dir === 'u_turn')         return `Turn around`;
    return `Continue`;
}

/**
 * Runs A* pathfinding from startId to endId across the provided node and edge sets.
 * Returns a RouteResult with steps, distances, and walk times, or null if no path exists.
 */
export function findRoute(
    startId: string,
    endId: string,
    nodes: NavNode[],
    edges: NavEdge[],
    accessible = false
): RouteResult | null {
    const nodeMap = new Map<string, NavNode>(nodes.map(n => [n.id, n]));
    const start = nodeMap.get(startId);
    const end   = nodeMap.get(endId);
    if (!start || !end) return null;

    if (startId === endId) {
        return {
            steps: [{ node: start, distanceFt: 0, walkSeconds: 0, instruction: `You are at ${start.label}`, bearing: 0, isFloorTransition: false }],
            totalDistanceFt: 0, totalWalkSeconds: 0, floorTransitions: 0,
        };
    }

    const adj = new Map<string, { neighborId: string; cost: number; edgeType: string }[]>();
    for (const n of nodes) adj.set(n.id, []);

    for (const edge of edges) {
        if (accessible && !edge.accessible) continue;
        adj.get(edge.fromNodeId)?.push({ neighborId: edge.toNodeId, cost: edge.cost, edgeType: edge.type });
        if (edge.bidirectional) {
            adj.get(edge.toNodeId)?.push({ neighborId: edge.fromNodeId, cost: edge.cost, edgeType: edge.type });
        }
    }

    const gCost   = new Map<string, number>([[startId, 0]]);
    const cameFrom = new Map<string, string>();
    const heap    = new MinHeap();
    heap.push({ nodeId: startId, f: euclidean(start, end) });

    while (heap.size > 0) {
        const { nodeId } = heap.pop()!;
        if (nodeId === endId) return buildResult(nodeId, cameFrom, nodeMap, edges, accessible);

        const currentG = gCost.get(nodeId)!;
        for (const { neighborId, cost } of adj.get(nodeId) ?? []) {
            const tentativeG = currentG + cost;
            if (tentativeG < (gCost.get(neighborId) ?? Infinity)) {
                gCost.set(neighborId, tentativeG);
                cameFrom.set(neighborId, nodeId);
                const neighbor = nodeMap.get(neighborId);
                if (neighbor) heap.push({ nodeId: neighborId, f: tentativeG + euclidean(neighbor, end) });
            }
        }
    }

    return null;
}

/** Reconstructs the path from the A* cameFrom map and builds the full RouteResult. */
function buildResult(
    endId: string,
    cameFrom: Map<string, string>,
    nodeMap: Map<string, NavNode>,
    edges: NavEdge[],
    accessible: boolean
): RouteResult {
    const path: NavNode[] = [];
    let current = endId;
    while (current) {
        path.unshift(nodeMap.get(current)!);
        current = cameFrom.get(current)!;
    }

    const edgeMap = new Map<string, NavEdge>();
    for (const e of edges) {
        edgeMap.set(`${e.fromNodeId}|${e.toNodeId}`, e);
        if (e.bidirectional) edgeMap.set(`${e.toNodeId}|${e.fromNodeId}`, e);
    }

    const steps: RouteStep[] = [];
    let totalDistanceFt = 0;
    let totalWalkSeconds = 0;
    let floorTransitions = 0;

    steps.push({
        node: path[0],
        distanceFt: 0,
        walkSeconds: 0,
        instruction: `Start at ${path[0].label}`,
        bearing: 0,
        isFloorTransition: false,
    });

    for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        const edge = edgeMap.get(`${prev.id}|${curr.id}`);

        const isFloorTransition = prev.floor !== curr.floor;
        const distanceFt = edge?.cost ?? Math.round(euclidean(prev, curr));

        const segmentSeconds = isFloorTransition
            ? FLOOR_TRANSITION_PENALTY_SEC
            : distanceFt / WALK_FT_PER_SEC;

        const segBearing = bearing(prev, curr);
        let dir: TurnDirection;

        if (isFloorTransition) {
            dir = (edge?.type === 'elevator' || curr.type === 'elevator') ? 'take_elevator' : 'take_stairs';
        } else if (i === path.length - 1) {
            dir = 'arrived';
        } else if (i === 1) {
            dir = 'straight';
        } else {
            const prevBearing = bearing(path[i - 2], prev);
            dir = turnDirection(prevBearing, segBearing);
        }

        const instruction = (i === path.length - 1)
            ? `You have arrived at ${curr.label}`
            : turnInstruction(dir, curr, edge);

        steps.push({
            node: curr,
            distanceFt,
            walkSeconds: Math.round(segmentSeconds),
            instruction,
            bearing: Math.round(segBearing),
            isFloorTransition,
        });

        totalDistanceFt += distanceFt;
        totalWalkSeconds += segmentSeconds;
        if (isFloorTransition) floorTransitions++;
    }

    return {
        steps,
        totalDistanceFt: Math.round(totalDistanceFt),
        totalWalkSeconds: Math.round(totalWalkSeconds),
        floorTransitions,
    };
}

/** Returns the nearest node on the given floor to the provided (x, y) position. */
export function nearestNode(x: number, y: number, floor: number, nodes: NavNode[]): NavNode | null {
    let best: NavNode | null = null;
    let bestDist = Infinity;
    for (const n of nodes) {
        if (n.floor !== floor) continue;
        const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
        if (d < bestDist) { bestDist = d; best = n; }
    }
    return best;
}