// navigation/seed-nodes-test.ts
//
// ─── INSTANT HOT-RELOAD TEST GRAPH ───────────────────────────────────────────
// Edit coordinates here and Ctrl+S — Metro reloads in ~1 second.
// No DB wipe, no seed version bump, no restart needed.
//
// COORDINATE SYSTEM:
//   x, y  =  pre-scale model coords (same numbers as roomHitbox.tsx position[0], position[2])
//   Positive X = right,  Negative X = left
//   Negative Y = toward front of building (rooms along top edge)
//   Positive Y = toward back
//
// HOW TO TUNE A NODE:
//   Change its x or y, save, tap the room → path updates instantly.
// ─────────────────────────────────────────────────────────────────────────────

import type { NavNode, NavEdge } from './db';

type RawEdge = Omit<NavEdge, 'cost'>;

// ─── NODES ────────────────────────────────────────────────────────────────────

export const TEST_NODES: NavNode[] = [

    // Entrances
    { id: 'entrance0',    label: 'Entrance',            type: 'entrance',  floor: 1, x:  48,    y: -32,   z: 0, accessible: true },

    // Rooms — x,y should put the node at the room door / center of the room
    { id: 'room_1221_a',  label: 'Classroom 1221 - A',  type: 'classroom', floor: 1, x:  48,    y: -19,   z: 0, accessible: true },
    { id: 'room_1221_b',  label: 'Classroom 1221 - B',  type: 'classroom', floor: 1, x:  48,    y: -13.5, z: 0, accessible: true },

    { id: 'room_1225_a',  label: 'Classroom 1225 - A',  type: 'classroom', floor: 1, x:  48,    y: -10.5, z: 0, accessible: true },
    { id: 'room_1225_b',  label: 'Classroom 1225 - B',  type: 'classroom', floor: 1, x:  48,    y: -5,    z: 0, accessible: true },

    { id: 'room_1253_a',  label: 'Classroom 1253 - A',  type: 'classroom', floor: 1, x:  -1,    y: -28,   z: 0, accessible: true },
    { id: 'room_1253_b',  label: 'Classroom 1253 - B',  type: 'classroom', floor: 1, x:  -1,    y: -17.5, z: 0, accessible: true },

    { id: 'room_1263_a',  label: 'Classroom 1263 - A',  type: 'classroom', floor: 1, x:  -36,   y: -27,   z: 0, accessible: true },
    { id: 'room_1263_b',  label: 'Classroom 1263 - B',  type: 'classroom', floor: 1, x:  -36,   y: -16,   z: 0, accessible: true },

    { id: 'room_1202_a',  label: 'Classroom 1202 - A',  type: 'classroom', floor: 1, x:  -41,   y: -30,   z: 0, accessible: true },
    { id: 'room_1200_a',  label: 'Classroom 1200 - A',  type: 'classroom', floor: 1, x:  -53,   y: -30,   z: 0, accessible: true },

    // Bathrooms — positions match roomHitbox.tsx
    { id: 'bathroom_3',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  -1,    y:   2,   z: 0, accessible: true },
    { id: 'bathroom_5',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  -42,   y: -40,   z: 0, accessible: true },
    { id: 'bathroom_0',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  -30,   y:  15,   z: 0, accessible: true },

    // Hallway nodes — intersections and turns along the actual corridors
    { id: 'hallway1',     label: 'Hallway 1',            type: 'hallway',   floor: 1, x:  44,    y: -32,   z: 0, accessible: true },
    { id: 'hallway2',     label: 'Hallway 2',            type: 'hallway',   floor: 1, x:  44,    y: -19,   z: 0, accessible: true },
    { id: 'hallway3',     label: 'Hallway 3',            type: 'hallway',   floor: 1, x:  44,    y: -13.5, z: 0, accessible: true },
    { id: 'hallway4',     label: 'Hallway 4',            type: 'hallway',   floor: 1, x:  44,    y: -10.5, z: 0, accessible: true },
    { id: 'hallway5',     label: 'Hallway 5',            type: 'hallway',   floor: 1, x:  44,    y: -5,    z: 0, accessible: true },

    { id: 'hallway6',     label: 'Hallway 6',            type: 'hallway',   floor: 1, x:  -5,    y: -32,   z: 0, accessible: true },
    { id: 'hallway7',     label: 'Hallway 7',            type: 'hallway',   floor: 1, x:  -5,    y: -28,   z: 0, accessible: true },
    { id: 'hallway8',     label: 'Hallway 8',            type: 'hallway',   floor: 1, x:  -5,    y: -17.5, z: 0, accessible: true },

    { id: 'hallway9',     label: 'Hallway 9',            type: 'hallway',   floor: 1, x:  -38,   y: -32,   z: 0, accessible: true },
    { id: 'hallway10',    label: 'Hallway 10',           type: 'hallway',   floor: 1, x:  -38,   y: -27,   z: 0, accessible: true },
    { id: 'hallway11',    label: 'Hallway 11',           type: 'hallway',   floor: 1, x:  -38,   y: -16,   z: 0, accessible: true },

    { id: 'hallway12',    label: 'Hallway 12',           type: 'hallway',   floor: 1, x:  -41,   y: -32,   z: 0, accessible: true },
    { id: 'hallway13',    label: 'Hallway 13',           type: 'hallway',   floor: 1, x:  -53,   y: -32,   z: 0, accessible: true },

];

// ─── EDGES ────────────────────────────────────────────────────────────────────
// Costs are computed automatically from node distances.
// NOTE: two edges in the original had wrong fromNodeId (hallway4/5 instead of
// hallway7/8) — those are corrected here.

export const TEST_EDGES: RawEdge[] = [

    // Entrance → main hallway spine
    { id: 'en0_hw1',      fromNodeId: 'entrance0',  toNodeId: 'hallway1',    type: 'door',    accessible: true, bidirectional: true },

    // Right wing (rooms 1221, 1225)
    { id: 'hw1_hw2',      fromNodeId: 'hallway1',   toNodeId: 'hallway2',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw2_hw3',      fromNodeId: 'hallway2',   toNodeId: 'hallway3',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw3_hw4',      fromNodeId: 'hallway3',   toNodeId: 'hallway4',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw4_hw5',      fromNodeId: 'hallway4',   toNodeId: 'hallway5',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw2_1221a',    fromNodeId: 'hallway2',   toNodeId: 'room_1221_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw3_1221b',    fromNodeId: 'hallway3',   toNodeId: 'room_1221_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw4_1225a',    fromNodeId: 'hallway4',   toNodeId: 'room_1225_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw5_1225b',    fromNodeId: 'hallway5',   toNodeId: 'room_1225_b', type: 'door',    accessible: true, bidirectional: true },

    // Main spine → middle section (rooms 1253)
    { id: 'hw1_hw6',      fromNodeId: 'hallway1',   toNodeId: 'hallway6',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw6_hw7',      fromNodeId: 'hallway6',   toNodeId: 'hallway7',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw7_hw8',      fromNodeId: 'hallway7',   toNodeId: 'hallway8',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw7_1253a',    fromNodeId: 'hallway7',   toNodeId: 'room_1253_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw8_1253b',    fromNodeId: 'hallway8',   toNodeId: 'room_1253_b', type: 'door',    accessible: true, bidirectional: true },

    // Main spine → left section (rooms 1263, 1202, 1200)
    { id: 'hw6_hw9',      fromNodeId: 'hallway6',   toNodeId: 'hallway9',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw9_hw10',     fromNodeId: 'hallway9',   toNodeId: 'hallway10',   type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw10_hw11',    fromNodeId: 'hallway10',  toNodeId: 'hallway11',   type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw10_1263a',   fromNodeId: 'hallway10',  toNodeId: 'room_1263_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw11_1263b',   fromNodeId: 'hallway11',  toNodeId: 'room_1263_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw9_hw12',     fromNodeId: 'hallway9',   toNodeId: 'hallway12',   type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw12_hw13',    fromNodeId: 'hallway12',  toNodeId: 'hallway13',   type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw12_1202a',   fromNodeId: 'hallway12',  toNodeId: 'room_1202_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw13_1200a',   fromNodeId: 'hallway13',  toNodeId: 'room_1200_a', type: 'door',    accessible: true, bidirectional: true },

];
// ─── EDGE COST COMPUTATION ────────────────────────────────────────────────────
// Called by db.ts at seed time and by use-test-route.ts at runtime.
// Cost = Euclidean distance in model-space units (same as feet at this scale).

export function computeEdgeCosts(nodes: NavNode[]): NavEdge[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return TEST_EDGES.map(edge => {
        const from = nodeMap.get(edge.fromNodeId);
        const to   = nodeMap.get(edge.toNodeId);
        let cost = 1;
        if (!from || !to) {
            console.warn('[seed-nodes-test] missing node for edge:', edge.id);
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