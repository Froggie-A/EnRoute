// navigation/seed-nodes-test.ts

// In-memory navigation graph for PFT Hall.
// Defines all nodes (rooms, hallways, entrances, stairs, elevators) and edges, and exports computeEdgeCosts to derive edge weights from node coordinates.

import type { NavNode, NavEdge } from './db';

type RawEdge = Omit<NavEdge, 'cost'>;

export const TEST_NODES: NavNode[] = [

    { id: 'entrance0',    label: 'Entrance',            type: 'entrance',  floor: 1, x:  48,    y: -32,   z: 0, accessible: true },
    { id: 'entrance1',    label: 'Entrance',            type: 'entrance',  floor: 1, x:  64,    y: 15,   z: 0, accessible: true },
    { id: 'entrance2',    label: 'Entrance',            type: 'entrance',  floor: 1, x:  -59,    y: -32,   z: 0, accessible: true },

    { id: 'elevator0',    label: 'Elevator',            type: 'elevator',  floor: 1, x:  47,    y: 36,   z: 0, accessible: true },
    { id: 'elevator1',    label: 'Elevator',            type: 'elevator',  floor: 1, x:  0,    y: 20,   z: 0, accessible: true },
    { id: 'elevator2',    label: 'Elevator',            type: 'elevator',  floor: 1, x:  -3,    y: -43,   z: 0, accessible: true },

    { id: 'stair0',       label: 'Stairs',              type: 'stair',     floor: 1, x:  -19,    y: 15,   z: 0, accessible: false },
    { id: 'stair1',       label: 'Stairs',              type: 'stair',     floor: 1, x:  -35,    y: -30,   z: 0, accessible: false },
    { id: 'stair2',       label: 'Stairs',              type: 'stair',     floor: 1, x:  22,    y: 11,   z: 0, accessible: false },

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

    { id: 'room_1218_a',  label: 'Classroom 1218 - A',  type: 'classroom', floor: 1, x:  36,   y: -25,   z: 0, accessible: true },
    //{ id: 'room_1218_b',  label: 'Classroom 1218 - B',  type: 'classroom', floor: 1, x:  -36,   y: -16,   z: 0, accessible: true },

    { id: 'room_1216_a',  label: 'Classroom 1216 - A',  type: 'classroom', floor: 1, x:  32,   y: -25,   z: 0, accessible: true },

    { id: 'room_1212_a',  label: 'Classroom 1212 - A',  type: 'classroom', floor: 1, x:  23,   y: -24,   z: 0, accessible: true },
    { id: 'room_1212_b',  label: 'Classroom 1212 - B',  type: 'classroom', floor: 1, x:  12,   y: -24,   z: 0, accessible: true },

    { id: 'room_1206_a',  label: 'Classroom 1206 - A',  type: 'classroom', floor: 1, x:  -16,   y: -29,   z: 0, accessible: true },
    { id: 'room_1206_b',  label: 'Classroom 1206 - B',  type: 'classroom', floor: 1, x:  -23,   y: -29,   z: 0, accessible: true },

    { id: 'room_1154_a',  label: 'Classroom 1154 - A',  type: 'classroom', floor: 1, x:  37,   y: -37,   z: 0, accessible: true },
    { id: 'room_1154_b',  label: 'Classroom 1154 - B',  type: 'classroom', floor: 1, x:  29,   y: -37,   z: 0, accessible: true },

    { id: 'room_1139_a',  label: 'Classroom 1139 - A',  type: 'classroom', floor: 1, x:  25,   y: -37,   z: 0, accessible: true },
    //{ id: 'room_1139_b',  label: 'Classroom 1139 - B',  type: 'classroom', floor: 1, x:  12,   y: -24,   z: 0, accessible: true },

    { id: 'room_1133_a',  label: 'Classroom 1133 - A',  type: 'classroom', floor: 1, x:  16,   y: -37,   z: 0, accessible: true },

    { id: 'room_1131_a',  label: 'Classroom 1131 - A',  type: 'classroom', floor: 1, x:  13,   y: -37,   z: 0, accessible: true },

    { id: 'room_1114_a',  label: 'Classroom 1114 - A',  type: 'classroom', floor: 1, x:  -14,   y: -37,   z: 0, accessible: true },
    { id: 'room_1114_b',  label: 'Classroom 1114 - B',  type: 'classroom', floor: 1, x:  -29,   y: -37,   z: 0, accessible: true },

    { id: 'room_1100_a',  label: 'Classroom 1100 - A',  type: 'classroom', floor: 1, x:  -47,   y: -40,   z: 0, accessible: true },

    { id: 'room_1232_a',  label: 'Classroom 1232 - A',  type: 'classroom', floor: 1, x:  41,   y: -6,   z: 0, accessible: true },
    { id: 'room_1232_b',  label: 'Classroom 1232 - B',  type: 'classroom', floor: 1, x:  35,   y: -6,   z: 0, accessible: true },

    { id: 'room_1236_a',  label: 'Classroom 1236 - A',  type: 'classroom', floor: 1, x:  32,   y: -6,   z: 0, accessible: true },
    { id: 'room_1236_b',  label: 'Classroom 1236 - B',  type: 'classroom', floor: 1, x:  26,   y: -6,   z: 0, accessible: true },

    { id: 'room_1240_a',  label: 'Classroom 1240 - A',  type: 'classroom', floor: 1, x:  23.5,   y: -6,   z: 0, accessible: true },
    { id: 'room_1240_b',  label: 'Classroom 1240 - B',  type: 'classroom', floor: 1, x:  17,   y: -6,   z: 0, accessible: true },

    { id: 'room_1244_a',  label: 'Classroom 1244 - A',  type: 'classroom', floor: 1, x:  11.5,   y: -6,   z: 0, accessible: true },

    { id: 'room_1246_a',  label: 'Classroom 1246 - A',  type: 'classroom', floor: 1, x:  8.5,   y: -6,   z: 0, accessible: true },

    { id: 'room_1256_a',  label: 'Classroom 1256 - A',  type: 'classroom', floor: 1, x:  -7,   y: -20,   z: 0, accessible: true },
    { id: 'room_1256_b',  label: 'Classroom 1256 - B',  type: 'classroom', floor: 1, x:  -7,   y: -8,   z: 0, accessible: true },

    { id: 'room_1258_a',  label: 'Classroom 1258 - A',  type: 'classroom', floor: 1, x:  -16,   y: -6,   z: 0, accessible: true },
    { id: 'room_1258_b',  label: 'Classroom 1258 - B',  type: 'classroom', floor: 1, x:  -23,   y: -6,   z: 0, accessible: true },

    { id: 'room_1262_a',  label: 'Classroom 1262 - A',  type: 'classroom', floor: 1, x:  -27,   y: -6,   z: 0, accessible: true },

    { id: 'room_1233_a',  label: 'Classroom 1233 - A',  type: 'classroom', floor: 1, x:  38,   y: -3,   z: 0, accessible: true },

    { id: 'room_1237_a',  label: 'Classroom 1237 - A',  type: 'classroom', floor: 1, x:  26,   y: -3,   z: 0, accessible: true },

    { id: 'room_1245_a',  label: 'Classroom 1245 - A',  type: 'classroom', floor: 1, x:  4.5,   y: -3,   z: 0, accessible: true },
    { id: 'room_1245_b',  label: 'Classroom 1245 - B',  type: 'classroom', floor: 1, x:  4.5,   y: 11,   z: 0, accessible: true },

    { id: 'room_1272_a',  label: 'Classroom 1272 - A',  type: 'classroom', floor: 1, x:  -11,   y: 6,   z: 0, accessible: true },
    { id: 'room_1272_cen',  label: 'Classroom 1272',  type: 'classroom', floor: 1, x:  -15,   y: 5,   z: 0, accessible: true },

    { id: 'room_1259_a',  label: 'Classroom 1259 - A',  type: 'classroom', floor: 1, x:  -27,   y: -3,   z: 0, accessible: true },
    { id: 'room_1259_b',  label: 'Classroom 1259 - B',  type: 'classroom', floor: 1, x:  -25,   y: 8,   z: 0, accessible: true },

    { id: 'room_1360_a',  label: 'Classroom 1360 - A',  type: 'classroom', floor: 1, x:  38,   y: 32,   z: 0, accessible: true },

    { id: 'room_1354_a',  label: 'Classroom 1354 - A',  type: 'classroom', floor: 1, x:  19,   y: 32,   z: 0, accessible: true },

    { id: 'room_1350_a',  label: 'Classroom 1350 - A',  type: 'classroom', floor: 1, x:  5,   y: 19,   z: 0, accessible: true },
    { id: 'room_1350_b',  label: 'Classroom 1350 - B',  type: 'classroom', floor: 1, x:  5,   y: 32,   z: 0, accessible: true },

    { id: 'room_1342_a',  label: 'Classroom 1342 - A',  type: 'classroom', floor: 1, x:  -10,   y: 23,   z: 0, accessible: true },

    { id: 'room_1340_a',  label: 'Classroom 1340 - A',  type: 'classroom', floor: 1, x:  -25,   y: 21,   z: 0, accessible: true },

    { id: 'vending0',  label: 'Vending',  type: 'vending', floor: 1, x:  49,   y: 33,   z: 0, accessible: true },
    { id: 'vending1',  label: 'Vending',  type: 'vending', floor: 1, x:  -3,   y: -38,   z: 0, accessible: true },
    { id: 'vending2',  label: 'Panera',   type: 'vending', floor: 1, x:  60,   y: 18,   z: 0, accessible: true },
    { id: 'vending3',  label: 'Panera',   type: 'vending', floor: 1, x:  50,   y: 18,   z: 0, accessible: true },

    { id: 'bathroom0',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  48,    y:   29,   z: 0, accessible: true },
    { id: 'bathroom1',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  0,     y:   30,   z: 0, accessible: true },
    { id: 'bathroom2',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  0,     y:   -1,   z: 0, accessible: true },
    { id: 'bathroom3',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  -42,   y:   -37,   z: 0, accessible: true },
    { id: 'bathroom4',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  -1,    y:   -46,   z: 0, accessible: true },
    { id: 'bathroom5',   label: 'Bathroom',              type: 'bathroom',  floor: 1, x:  47,    y:   1,   z: 0, accessible: true },

    { id: 'hallway1',     label: 'Hallway 1',            type: 'hallway',   floor: 1, x:  44,    y: -32,   z: 0, accessible: true },
    { id: 'hallway2',     label: 'Hallway 2',            type: 'hallway',   floor: 1, x:  38,    y: -32,   z: 0, accessible: true },
    { id: 'hallway3',     label: 'Hallway 3',            type: 'hallway',   floor: 1, x:  36,    y: -32,   z: 0, accessible: true },
    { id: 'hallway4',     label: 'Hallway 4',            type: 'hallway',   floor: 1, x:  32,    y: -32,   z: 0, accessible: true },
    { id: 'hallway5',     label: 'Hallway 5',            type: 'hallway',   floor: 1, x:  29,    y: -32,   z: 0, accessible: true },
    { id: 'hallway6',     label: 'Hallway 6',            type: 'hallway',   floor: 1, x:  26,    y: -32,   z: 0, accessible: true },
    { id: 'hallway7',     label: 'Hallway 7',            type: 'hallway',   floor: 1, x:  23,    y: -32,   z: 0, accessible: true },
    { id: 'hallway8',     label: 'Hallway 8',            type: 'hallway',   floor: 1, x:  17,    y: -32,   z: 0, accessible: true },
    { id: 'hallway9',     label: 'Hallway 9',            type: 'hallway',   floor: 1, x:  14,    y: -32,   z: 0, accessible: true },
    { id: 'hallway10',     label: 'Hallway 10',            type: 'hallway',   floor: 1, x:  12,    y: -32,   z: 0, accessible: true },
    //{ id: 'hallway11',     label: 'Hallway 11',            type: 'hallway',   floor: 1, x:  -5,    y: -32,   z: 0, accessible: true },
    { id: 'hallway12',     label: 'Hallway 12',            type: 'hallway',   floor: 1, x:  -14,    y: -32,   z: 0, accessible: true },
    { id: 'hallway13',     label: 'Hallway 13',            type: 'hallway',   floor: 1, x:  -16,    y: -32,   z: 0, accessible: true },
    { id: 'hallway14',     label: 'Hallway 14',            type: 'hallway',   floor: 1, x:  -23,    y: -32,   z: 0, accessible: true },
    { id: 'hallway15',     label: 'Hallway 15',            type: 'hallway',   floor: 1, x:  -29,    y: -32,   z: 0, accessible: true },
    //{ id: 'hallway16',     label: 'Hallway 16',            type: 'hallway',   floor: 1, x:  -38,    y: -32,   z: 0, accessible: true },
    { id: 'hallway17',     label: 'Hallway 17',            type: 'hallway',   floor: 1, x:  -41,    y: -32,   z: 0, accessible: true },
    { id: 'hallway18',     label: 'Hallway 18',            type: 'hallway',   floor: 1, x:  -43,    y: -32,   z: 0, accessible: true },
    { id: 'hallway19',     label: 'Hallway 19',            type: 'hallway',   floor: 1, x:  -48,    y: -32,   z: 0, accessible: true },
    { id: 'hallway20',     label: 'Hallway 20',            type: 'hallway',   floor: 1, x:  -53,    y: -32,   z: 0, accessible: true },

    { id: 'hallway21',     label: 'Hallway 21',            type: 'hallway',   floor: 1, x:  44,    y: -19,   z: 0, accessible: true },
    { id: 'hallway22',     label: 'Hallway 22',            type: 'hallway',   floor: 1, x:  44,    y: -13.5, z: 0, accessible: true },
    { id: 'hallway23',     label: 'Hallway 23',            type: 'hallway',   floor: 1, x:  44,    y: -10.5, z: 0, accessible: true },
    { id: 'hallway24',     label: 'Hallway 24',            type: 'hallway',   floor: 1, x:  44,    y: -5,    z: 0, accessible: true },
    { id: 'hallway25',     label: 'Hallway 25',            type: 'hallway',   floor: 1, x:  44,    y: 0,   z: 0, accessible: true },
    { id: 'hallway26',     label: 'Hallway 26',            type: 'hallway',   floor: 1, x:  44,    y: 8, z: 0, accessible: true },
    { id: 'hallway27',     label: 'Hallway 27',            type: 'hallway',   floor: 1, x:  44,    y: 15, z: 0, accessible: true },
    { id: 'hallway28',     label: 'Hallway 28',            type: 'hallway',   floor: 1, x:  44,    y: 20,    z: 0, accessible: true },
    { id: 'hallway29',     label: 'Hallway 29',            type: 'hallway',   floor: 1, x:  44,    y: 29, z: 0, accessible: true },
    { id: 'hallway30',     label: 'Hallway 30',            type: 'hallway',   floor: 1, x:  44,    y: 33,    z: 0, accessible: true },

    { id: 'hallway31',     label: 'Hallway 21',            type: 'hallway',   floor: 1, x:  38,    y: 33,   z: 0, accessible: true },
    { id: 'hallway32',     label: 'Hallway 22',            type: 'hallway',   floor: 1, x:  20,    y: 33, z: 0, accessible: true },
    { id: 'hallway33',     label: 'Hallway 23',            type: 'hallway',   floor: 1, x:  5,    y: 33, z: 0, accessible: true },
    { id: 'hallway34',     label: 'Hallway 24',            type: 'hallway',   floor: 1, x:  0,    y: 33,    z: 0, accessible: true },
    { id: 'hallway35',     label: 'Hallway 25',            type: 'hallway',   floor: 1, x:  -5,    y: 33,   z: 0, accessible: true },

    { id: 'hallway36',     label: 'Hallway 36',            type: 'hallway',   floor: 1, x:  -5,    y: 23, z: 0, accessible: true },
    { id: 'hallway37',     label: 'Hallway 37',            type: 'hallway',   floor: 1, x:  -5,    y: 19, z: 0, accessible: true },
    { id: 'hallway38',     label: 'Hallway 38',            type: 'hallway',   floor: 1, x:  -5,    y: 17,    z: 0, accessible: true },
    { id: 'hallway39',     label: 'Hallway 39',            type: 'hallway',   floor: 1, x:  -5,    y: 15, z: 0, accessible: true },
    { id: 'hallway40',     label: 'Hallway 40',            type: 'hallway',   floor: 1, x:  -5,    y: 13,    z: 0, accessible: true },
    { id: 'hallway41',     label: 'Hallway 41',            type: 'hallway',   floor: 1, x:  -5,    y: 10, z: 0, accessible: true },
    { id: 'hallway42',     label: 'Hallway 42',            type: 'hallway',   floor: 1, x:  -5,    y: 6, z: 0, accessible: true },
    { id: 'hallway43',     label: 'Hallway 43',            type: 'hallway',   floor: 1, x:  -5,    y: -5,    z: 0, accessible: true },
    { id: 'hallway44',     label: 'Hallway 44',            type: 'hallway',   floor: 1, x:  -5,    y: -8, z: 0, accessible: true },
    { id: 'hallway46',     label: 'Hallway 46',            type: 'hallway',   floor: 1, x:  -5,    y: -20,    z: 0, accessible: true },
    { id: 'hallway48',     label: 'Hallway 48',            type: 'hallway',   floor: 1, x:  -5,    y: -38, z: 0, accessible: true },
    { id: 'hallway49',     label: 'Hallway 49',            type: 'hallway',   floor: 1, x:  -5,    y: -43,    z: 0, accessible: true },
    { id: 'hallway50',     label: 'Hallway 50',            type: 'hallway',   floor: 1, x:  -5,    y: -46, z: 0, accessible: true },

    { id: 'hallway53',     label: 'Hallway 53',            type: 'hallway',   floor: 1, x:  -38,   y: -5,   z: 0, accessible: true },
    { id: 'hallway54',     label: 'Hallway 54',            type: 'hallway',   floor: 1, x:  -38,   y: 10,   z: 0, accessible: true },

    { id: 'hallway55',     label: 'Hallway 55',            type: 'hallway',   floor: 1, x:  -25,    y: 10, z: 0, accessible: true },
    { id: 'hallway56',     label: 'Hallway 56',            type: 'hallway',   floor: 1, x:  -21,    y: 10, z: 0, accessible: true },
    { id: 'hallway57',     label: 'Hallway 57',            type: 'hallway',   floor: 1, x:  -21,    y: 15, z: 0, accessible: true },
    { id: 'hallway58',     label: 'Hallway 58',            type: 'hallway',   floor: 1, x:  -21,    y: 19, z: 0, accessible: true },
    { id: 'hallway59',     label: 'Hallway 59',            type: 'hallway',   floor: 1, x:  -25,    y: 19, z: 0, accessible: true },

    { id: 'hallway61',     label: 'Hallway 61',            type: 'hallway',   floor: 1, x:  -27,   y: -5,   z: 0, accessible: true },
    { id: 'hallway62',     label: 'Hallway 62',            type: 'hallway',   floor: 1, x:  -23,   y: -5,   z: 0, accessible: true },
    { id: 'hallway63',     label: 'Hallway 63',            type: 'hallway',   floor: 1, x:  -16,   y: -5,   z: 0, accessible: true },
    { id: 'hallway64',     label: 'Hallway 64',            type: 'hallway',   floor: 1, x:  0,   y: -5,   z: 0, accessible: true },
    { id: 'hallway65',     label: 'Hallway 65',            type: 'hallway',   floor: 1, x:  4.5,   y: -5,   z: 0, accessible: true },
    { id: 'hallway66',     label: 'Hallway 66',            type: 'hallway',   floor: 1, x:  8.5,   y: -5,   z: 0, accessible: true },
    { id: 'hallway67',     label: 'Hallway 67',            type: 'hallway',   floor: 1, x:  11.5,   y: -5,   z: 0, accessible: true },
    { id: 'hallway68',     label: 'Hallway 68',            type: 'hallway',   floor: 1, x:  17,   y: -5,   z: 0, accessible: true },
    { id: 'hallway69',     label: 'Hallway 69',            type: 'hallway',   floor: 1, x:  23.5,   y: -5,   z: 0, accessible: true },
    { id: 'hallway71',     label: 'Hallway 71',            type: 'hallway',   floor: 1, x:  26,   y: -5,   z: 0, accessible: true },
    { id: 'hallway72',     label: 'Hallway 72',            type: 'hallway',   floor: 1, x:  32,   y: -5,   z: 0, accessible: true },
    { id: 'hallway73',     label: 'Hallway 73',            type: 'hallway',   floor: 1, x:  35,   y: -5,   z: 0, accessible: true },
    { id: 'hallway74',     label: 'Hallway 74',            type: 'hallway',   floor: 1, x:  38,   y: -5,   z: 0, accessible: true },
    { id: 'hallway75',     label: 'Hallway 75',            type: 'hallway',   floor: 1, x:  41,   y: -5,   z: 0, accessible: true },

    { id: 'hallway76',     label: 'Hallway 76',            type: 'hallway',   floor: 1, x:  60,   y: 15,   z: 0, accessible: true },
    { id: 'hallway77',     label: 'Hallway 77',            type: 'hallway',   floor: 1, x:  50,   y: 15,   z: 0, accessible: true },
    { id: 'hallway78',     label: 'Hallway 78',            type: 'hallway',   floor: 1, x:  25,   y: 15,   z: 0, accessible: true },
    { id: 'hallway79',     label: 'Hallway 79',            type: 'hallway',   floor: 1, x:  22,   y: 15,   z: 0, accessible: true },
    { id: 'hallway80',     label: 'Hallway 80',            type: 'hallway',   floor: 1, x:  5,   y: 15,   z: 0, accessible: true },
    { id: 'hallway81',     label: 'Hallway 81',            type: 'hallway',   floor: 1, x:  -1,   y: 15,   z: 0, accessible: true },
    { id: 'hallway82',     label: 'Hallway 82',            type: 'hallway',   floor: 1, x:  47,   y: 33,   z: 0, accessible: true },

    { id: 'hallway11',     label: 'Hallway 11',            type: 'hallway',   floor: 1, x:  -5,    y: -32,   z: 0, accessible: true },
    { id: 'hallway47',     label: 'Hallway 47',            type: 'hallway',   floor: 1, x:  -5,    y: -28,   z: 0, accessible: true },

    { id: 'room_2213_a',  label: 'Classroom 2213',  type: 'classroom', floor: 2, x:   3,   y: -24,   z: 0, accessible: true },

    { id: 'hallway1_2',   label: 'Hallway 1_2',  type: 'hallway', floor: 2, x: -20, y: -26, z: 0, accessible: true },
    { id: 'hallway2_2',   label: 'Hallway 2_2',  type: 'hallway', floor: 2, x:  -5, y: -26, z: 0, accessible: true },
    { id: 'hallway3_2',   label: 'Hallway 3_2',  type: 'hallway', floor: 2, x:  -5, y: -22, z: 0, accessible: true },
    { id: 'hallway4_2',   label: 'Hallway 4_2',  type: 'hallway', floor: 2, x:  -5, y: -42, z: 0, accessible: true },
    { id: 'hallway5_2',   label: 'Hallway 5_2',  type: 'hallway', floor: 2, x:  -5, y: -42, z: 0, accessible: true },

    //{ id: 'stair0_2',     label: 'Stairs',  type: 'stair', floor: 2, x: -19, y:  15, z: 0, accessible: false },
    { id: 'stair1_2',     label: 'Stairs',  type: 'stair', floor: 2, x: -35, y: -30, z: 0, accessible: false },
    { id: 'elevator2_2',     label: 'Elevator',  type: 'elevator', floor: 2, x: -3, y: -42, z: 0, accessible: true },

    { id: 'dp_hw29_hw28_1', label: 'Hallway', type: 'hallway', floor: 1, x: 44, y: 24.5, z: 0, accessible: true },

    { id: 'dp_hw26_hw25_1', label: 'Hallway', type: 'hallway', floor: 1, x: 44, y: 4.0,  z: 0, accessible: true },

    { id: 'dp_hw21_hw1_1',  label: 'Hallway', type: 'hallway', floor: 1, x: 44, y: -23.3, z: 0, accessible: true },
    { id: 'dp_hw21_hw1_2',  label: 'Hallway', type: 'hallway', floor: 1, x: 44, y: -27.7, z: 0, accessible: true },

    { id: 'dp_hw10_hw11_1', label: 'Hallway', type: 'hallway', floor: 1, x: 7.8,  y: -32, z: 0, accessible: true },
    { id: 'dp_hw10_hw11_2', label: 'Hallway', type: 'hallway', floor: 1, x: 3.5,  y: -32, z: 0, accessible: true },
    { id: 'dp_hw10_hw11_3', label: 'Hallway', type: 'hallway', floor: 1, x: -0.8, y: -32, z: 0, accessible: true },

    { id: 'dp_hw11_hw12_1', label: 'Hallway', type: 'hallway', floor: 1, x: -9.5, y: -32, z: 0, accessible: true },

    { id: 'dp_hw15_hw16_1', label: 'Hallway', type: 'hallway', floor: 1, x: -33.5, y: -32, z: 0, accessible: true },
    { id: 'hallway45',     label: 'Hallway 45',            type: 'hallway',   floor: 1, x:  -5,    y: -17.5, z: 0, accessible: true },

    { id: 'hallway16',     label: 'Hallway 16',            type: 'hallway',   floor: 1, x:  -38,   y: -32,   z: 0, accessible: true },
    { id: 'hallway70',    label: 'Hallway 70',           type: 'hallway',   floor: 1, x:  -38,   y: -30,   z: 0, accessible: true },
    { id: 'hallway51',    label: 'Hallway 51',           type: 'hallway',   floor: 1, x:  -38,   y: -27,   z: 0, accessible: true },
    { id: 'hallway52',    label: 'Hallway 52',           type: 'hallway',   floor: 1, x:  -38,   y: -16,   z: 0, accessible: true },

];

export const TEST_EDGES: RawEdge[] = [

    { id: 'en0_hw1',      fromNodeId: 'entrance0',  toNodeId: 'hallway1',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'en1_hw76',      fromNodeId: 'entrance1',  toNodeId: 'hallway76',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'en2_hw20',      fromNodeId: 'entrance2',  toNodeId: 'hallway20',    type: 'door',    accessible: true, bidirectional: true },

    { id: 'br0_hw29',      fromNodeId: 'bathroom0',  toNodeId: 'hallway29',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'br1_hw34',      fromNodeId: 'bathroom1',  toNodeId: 'hallway34',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'br2_hw64',      fromNodeId: 'bathroom2',  toNodeId: 'hallway64',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'br3_hw18',      fromNodeId: 'bathroom3',  toNodeId: 'hallway18',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'br4_hw50',      fromNodeId: 'bathroom4',  toNodeId: 'hallway50',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'br5_hw25',      fromNodeId: 'bathroom5',  toNodeId: 'hallway25',    type: 'door',    accessible: true, bidirectional: true },

    { id: 'v0_hw82',      fromNodeId: 'vending0',  toNodeId: 'hallway82',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'v1_hw48',      fromNodeId: 'vending1',  toNodeId: 'hallway48',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'v2_hw76',      fromNodeId: 'vending2',  toNodeId: 'hallway76',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'v3_hw77',      fromNodeId: 'vending3',  toNodeId: 'hallway77',    type: 'door',    accessible: true, bidirectional: true },

    { id: 'ev0_hw82',      fromNodeId: 'elevator0',  toNodeId: 'hallway82',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'ev1_hw81',      fromNodeId: 'elevator1',  toNodeId: 'hallway81',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'ev2_hw49',      fromNodeId: 'elevator2',  toNodeId: 'hallway49',    type: 'door',    accessible: true, bidirectional: true },

    { id: 'st0_hw57',      fromNodeId: 'stair0',  toNodeId: 'hallway57',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'st1_hw70',      fromNodeId: 'stair1',  toNodeId: 'hallway70',    type: 'door',    accessible: true, bidirectional: true },
    { id: 'st2_hw79',      fromNodeId: 'stair2',  toNodeId: 'hallway79',    type: 'door',    accessible: true, bidirectional: true },

    { id: 'hw21_hw22',      fromNodeId: 'hallway21',   toNodeId: 'hallway22',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw22_hw23',      fromNodeId: 'hallway22',   toNodeId: 'hallway23',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw23_hw24',      fromNodeId: 'hallway23',   toNodeId: 'hallway24',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw24_hw25',      fromNodeId: 'hallway24',   toNodeId: 'hallway25',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw26_hw27',      fromNodeId: 'hallway26',   toNodeId: 'hallway27',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw27_hw28',      fromNodeId: 'hallway27',   toNodeId: 'hallway28',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw29_hw30',      fromNodeId: 'hallway29',   toNodeId: 'hallway30',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw35_hw36',      fromNodeId: 'hallway35',   toNodeId: 'hallway36',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw36_hw37',      fromNodeId: 'hallway36',   toNodeId: 'hallway37',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw37_hw38',      fromNodeId: 'hallway37',   toNodeId: 'hallway38',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw38_hw39',      fromNodeId: 'hallway38',   toNodeId: 'hallway39',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw39_hw40',      fromNodeId: 'hallway39',   toNodeId: 'hallway40',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw40_hw41',      fromNodeId: 'hallway40',   toNodeId: 'hallway41',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw41_hw42',      fromNodeId: 'hallway41',   toNodeId: 'hallway42',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw42_hw43',      fromNodeId: 'hallway42',   toNodeId: 'hallway43',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw43_hw44',      fromNodeId: 'hallway43',   toNodeId: 'hallway44',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw44_hw45',      fromNodeId: 'hallway44',   toNodeId: 'hallway45',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw45_hw46',      fromNodeId: 'hallway45',   toNodeId: 'hallway46',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw46_hw47',      fromNodeId: 'hallway46',   toNodeId: 'hallway47',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw47_hw11',      fromNodeId: 'hallway47',   toNodeId: 'hallway11',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw11_hw48',      fromNodeId: 'hallway11',   toNodeId: 'hallway48',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw48_hw49',      fromNodeId: 'hallway48',   toNodeId: 'hallway49',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw49_hw50',      fromNodeId: 'hallway49',   toNodeId: 'hallway50',    type: 'hallway', accessible: true, bidirectional: true },

    { id: 'hw16_hw70',      fromNodeId: 'hallway16',   toNodeId: 'hallway70',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw70_hw51',      fromNodeId: 'hallway70',   toNodeId: 'hallway51',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw51_hw52',      fromNodeId: 'hallway51',   toNodeId: 'hallway52',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw52_hw53',      fromNodeId: 'hallway52',   toNodeId: 'hallway53',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw53_hw54',      fromNodeId: 'hallway53',   toNodeId: 'hallway54',    type: 'hallway', accessible: true, bidirectional: true },

    { id: 'hw1_hw2',      fromNodeId: 'hallway1',   toNodeId: 'hallway2',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw2_hw3',      fromNodeId: 'hallway2',   toNodeId: 'hallway3',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw3_hw4',      fromNodeId: 'hallway3',   toNodeId: 'hallway4',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw4_hw5',      fromNodeId: 'hallway4',   toNodeId: 'hallway5',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw5_hw6',      fromNodeId: 'hallway5',   toNodeId: 'hallway6',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw6_hw7',      fromNodeId: 'hallway6',   toNodeId: 'hallway7',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw7_hw8',      fromNodeId: 'hallway7',   toNodeId: 'hallway8',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw8_hw9',      fromNodeId: 'hallway8',   toNodeId: 'hallway9',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw9_hw10',      fromNodeId: 'hallway9',   toNodeId: 'hallway10',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw12_hw13',      fromNodeId: 'hallway12',   toNodeId: 'hallway13',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw13_hw14',      fromNodeId: 'hallway13',   toNodeId: 'hallway14',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw14_hw15',      fromNodeId: 'hallway14',   toNodeId: 'hallway15',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw16_hw17',      fromNodeId: 'hallway16',   toNodeId: 'hallway17',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw17_hw18',      fromNodeId: 'hallway17',   toNodeId: 'hallway18',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw18_hw19',      fromNodeId: 'hallway18',   toNodeId: 'hallway19',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw19_hw20',      fromNodeId: 'hallway19',   toNodeId: 'hallway20',    type: 'hallway', accessible: true, bidirectional: true },

    { id: 'hw53_hw61',      fromNodeId: 'hallway53',   toNodeId: 'hallway61',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw61_hw62',      fromNodeId: 'hallway61',   toNodeId: 'hallway62',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw62_hw63',      fromNodeId: 'hallway62',   toNodeId: 'hallway63',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw63_hw43',      fromNodeId: 'hallway63',   toNodeId: 'hallway43',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw43_hw64',      fromNodeId: 'hallway43',   toNodeId: 'hallway64',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw64_hw65',      fromNodeId: 'hallway64',   toNodeId: 'hallway65',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw65_hw66',      fromNodeId: 'hallway65',   toNodeId: 'hallway66',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw66_hw67',      fromNodeId: 'hallway66',   toNodeId: 'hallway67',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw67_hw68',      fromNodeId: 'hallway67',   toNodeId: 'hallway68',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw68_hw69',      fromNodeId: 'hallway68',   toNodeId: 'hallway69',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw69_hw71',      fromNodeId: 'hallway69',   toNodeId: 'hallway71',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw69_hw71',      fromNodeId: 'hallway69',   toNodeId: 'hallway71',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw71_hw72',      fromNodeId: 'hallway71',   toNodeId: 'hallway72',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw72_hw73',      fromNodeId: 'hallway72',   toNodeId: 'hallway73',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw73_hw74',      fromNodeId: 'hallway73',   toNodeId: 'hallway74',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw74_hw75',      fromNodeId: 'hallway74',   toNodeId: 'hallway75',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw75_hw24',      fromNodeId: 'hallway75',   toNodeId: 'hallway24',    type: 'hallway', accessible: true, bidirectional: true },

    { id: 'hw76_hw77',      fromNodeId: 'hallway76',   toNodeId: 'hallway77',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw77_hw27',      fromNodeId: 'hallway77',   toNodeId: 'hallway27',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw27_hw78',      fromNodeId: 'hallway27',   toNodeId: 'hallway78',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw78_hw79',      fromNodeId: 'hallway78',   toNodeId: 'hallway79',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw79_hw80',      fromNodeId: 'hallway79',   toNodeId: 'hallway80',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw80_hw81',      fromNodeId: 'hallway80',   toNodeId: 'hallway81',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw81_hw39',      fromNodeId: 'hallway81',   toNodeId: 'hallway39',    type: 'hallway', accessible: true, bidirectional: true },

    { id: 'hw54_hw55',      fromNodeId: 'hallway54',   toNodeId: 'hallway55',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw55_hw56',      fromNodeId: 'hallway55',   toNodeId: 'hallway56',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw56_hw57',      fromNodeId: 'hallway56',   toNodeId: 'hallway57',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw57_hw58',      fromNodeId: 'hallway57',   toNodeId: 'hallway58',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw58_hw59',      fromNodeId: 'hallway58',   toNodeId: 'hallway59',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw41_hw56',      fromNodeId: 'hallway41',   toNodeId: 'hallway56',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw37_hw58',      fromNodeId: 'hallway37',   toNodeId: 'hallway58',    type: 'hallway', accessible: true, bidirectional: true },

    { id: 'hw82_hw30',      fromNodeId: 'hallway82',   toNodeId: 'hallway30',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw30_hw31',      fromNodeId: 'hallway30',   toNodeId: 'hallway31',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw31_hw32',      fromNodeId: 'hallway31',   toNodeId: 'hallway32',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw32_hw33',      fromNodeId: 'hallway32',   toNodeId: 'hallway33',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw33_hw34',      fromNodeId: 'hallway33',   toNodeId: 'hallway34',    type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw34_hw35',      fromNodeId: 'hallway34',   toNodeId: 'hallway35',    type: 'hallway', accessible: true, bidirectional: true },

    { id: 'dp_hw29_m1',   fromNodeId: 'hallway29',       toNodeId: 'dp_hw29_hw28_1', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_m1_hw28',   fromNodeId: 'dp_hw29_hw28_1', toNodeId: 'hallway28',       type: 'hallway', accessible: true, bidirectional: true },

    { id: 'dp_hw26_m1',   fromNodeId: 'hallway26',       toNodeId: 'dp_hw26_hw25_1', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_m1_hw25',   fromNodeId: 'dp_hw26_hw25_1', toNodeId: 'hallway25',       type: 'hallway', accessible: true, bidirectional: true },

    { id: 'dp_hw21_m1',   fromNodeId: 'hallway21',      toNodeId: 'dp_hw21_hw1_1',  type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_m1_m2',     fromNodeId: 'dp_hw21_hw1_1', toNodeId: 'dp_hw21_hw1_2',  type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_m2_hw1',    fromNodeId: 'dp_hw21_hw1_2', toNodeId: 'hallway1',        type: 'hallway', accessible: true, bidirectional: true },

    { id: 'dp_hw10_m1',    fromNodeId: 'hallway10',       toNodeId: 'dp_hw10_hw11_1', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_10m1_m2',    fromNodeId: 'dp_hw10_hw11_1', toNodeId: 'dp_hw10_hw11_2', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_10m2_m3',    fromNodeId: 'dp_hw10_hw11_2', toNodeId: 'dp_hw10_hw11_3', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_10m3_hw11',  fromNodeId: 'dp_hw10_hw11_3', toNodeId: 'hallway11',       type: 'hallway', accessible: true, bidirectional: true },

    { id: 'dp_hw11_m1',    fromNodeId: 'hallway11',       toNodeId: 'dp_hw11_hw12_1', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_11m1_hw12',  fromNodeId: 'dp_hw11_hw12_1', toNodeId: 'hallway12',       type: 'hallway', accessible: true, bidirectional: true },

    { id: 'dp_hw15_m1',    fromNodeId: 'hallway15',       toNodeId: 'dp_hw15_hw16_1', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'dp_15m1_hw16',  fromNodeId: 'dp_hw15_hw16_1', toNodeId: 'hallway16',       type: 'hallway', accessible: true, bidirectional: true },

    { id: 'hw21_1221a',    fromNodeId: 'hallway21',   toNodeId: 'room_1221_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw22_1221b',    fromNodeId: 'hallway22',   toNodeId: 'room_1221_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw23_1225a',    fromNodeId: 'hallway23',   toNodeId: 'room_1225_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw24_1225b',    fromNodeId: 'hallway24',   toNodeId: 'room_1225_b', type: 'door',    accessible: true, bidirectional: true },

    { id: 'hw47_1253a',    fromNodeId: 'hallway47',   toNodeId: 'room_1253_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw46_1256a',    fromNodeId: 'hallway46',   toNodeId: 'room_1256_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw45_1253b',    fromNodeId: 'hallway45',   toNodeId: 'room_1253_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw44_1256b',    fromNodeId: 'hallway44',   toNodeId: 'room_1256_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw42_1272a',    fromNodeId: 'hallway42',   toNodeId: 'room_1272_a', type: 'door',    accessible: true, bidirectional: true },
    { id: '1272c_1272a',    fromNodeId: 'room_1272_cen',   toNodeId: 'room_1272_a', type: 'door',    accessible: true, bidirectional: true },

    { id: 'hw36_1342a',    fromNodeId: 'hallway36',   toNodeId: 'room_1342_a', type: 'door',    accessible: true, bidirectional: true },

    { id: 'hw51_1263a',    fromNodeId: 'hallway51',   toNodeId: 'room_1263_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw52_1263b',    fromNodeId: 'hallway52',   toNodeId: 'room_1263_b', type: 'door',    accessible: true, bidirectional: true },

    { id: 'hw2_1154a',    fromNodeId: 'hallway2',   toNodeId: 'room_1154_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw5_1154b',    fromNodeId: 'hallway5',   toNodeId: 'room_1154_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw3_1218a',    fromNodeId: 'hallway3',   toNodeId: 'room_1218_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw4_1216a',    fromNodeId: 'hallway4',   toNodeId: 'room_1216_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw6_1139a',    fromNodeId: 'hallway6',   toNodeId: 'room_1139_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw7_1212a',    fromNodeId: 'hallway7',   toNodeId: 'room_1212_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw10_1212b',    fromNodeId: 'hallway10',   toNodeId: 'room_1212_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw8_1133a',    fromNodeId: 'hallway8',   toNodeId: 'room_1133_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw9_1131a',    fromNodeId: 'hallway9',   toNodeId: 'room_1131_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw12_1114a',    fromNodeId: 'hallway12',   toNodeId: 'room_1114_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw13_1206a',    fromNodeId: 'hallway13',   toNodeId: 'room_1206_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw14_1206b',    fromNodeId: 'hallway14',   toNodeId: 'room_1206_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw15_1114b',    fromNodeId: 'hallway15',   toNodeId: 'room_1114_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw17_1202a',    fromNodeId: 'hallway17',   toNodeId: 'room_1202_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw19_1100a',    fromNodeId: 'hallway19',   toNodeId: 'room_1100_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw20_1200a',    fromNodeId: 'hallway20',   toNodeId: 'room_1200_a', type: 'door',    accessible: true, bidirectional: true },

    { id: 'hw75_1232a',    fromNodeId: 'hallway75',   toNodeId: 'room_1232_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw73_1232b',    fromNodeId: 'hallway73',   toNodeId: 'room_1232_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw74_1233a',    fromNodeId: 'hallway74',   toNodeId: 'room_1233_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw72_1236a',    fromNodeId: 'hallway72',   toNodeId: 'room_1236_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw71_1236b',    fromNodeId: 'hallway71',   toNodeId: 'room_1236_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw71_1237a',    fromNodeId: 'hallway71',   toNodeId: 'room_1237_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw69_1240a',    fromNodeId: 'hallway69',   toNodeId: 'room_1240_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw68_1240b',    fromNodeId: 'hallway68',   toNodeId: 'room_1240_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw67_1244a',    fromNodeId: 'hallway67',   toNodeId: 'room_1244_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw66_1246a',    fromNodeId: 'hallway66',   toNodeId: 'room_1246_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw65_1245a',    fromNodeId: 'hallway65',   toNodeId: 'room_1245_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw63_1238a',    fromNodeId: 'hallway63',   toNodeId: 'room_1258_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw62_1238b',    fromNodeId: 'hallway62',   toNodeId: 'room_1258_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw61_1262a',    fromNodeId: 'hallway61',   toNodeId: 'room_1262_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw61_1259a',    fromNodeId: 'hallway61',   toNodeId: 'room_1259_a', type: 'door',    accessible: true, bidirectional: true },

    { id: 'hw80_1245b',    fromNodeId: 'hallway80',   toNodeId: 'room_1245_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw80_1350a',    fromNodeId: 'hallway80',   toNodeId: 'room_1350_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw55_1259b',    fromNodeId: 'hallway55',   toNodeId: 'room_1259_b', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw59_1340a',    fromNodeId: 'hallway59',   toNodeId: 'room_1340_a', type: 'door',    accessible: true, bidirectional: true },

    { id: 'hw31_1360a',    fromNodeId: 'hallway31',   toNodeId: 'room_1360_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw32_1354a',    fromNodeId: 'hallway32',   toNodeId: 'room_1354_a', type: 'door',    accessible: true, bidirectional: true },
    { id: 'hw33_1350b',    fromNodeId: 'hallway33',   toNodeId: 'room_1350_b', type: 'door',    accessible: true, bidirectional: true },

    //{ id: 'st0_cross',    fromNodeId: 'stair0',    toNodeId: 'stair0_2',   type: 'stair', accessible: false, bidirectional: true },
    { id: 'st1_cross',    fromNodeId: 'stair1',    toNodeId: 'stair1_2',   type: 'stair', accessible: false, bidirectional: true },
    { id: 'ev2_cross',    fromNodeId: 'elevator2',    toNodeId: 'elevator2_2',   type: 'elevator', accessible: true, bidirectional: true },

    { id: 'st1_2_hw5_2',  fromNodeId: 'stair1_2',  toNodeId: 'hallway5_2', type: 'stair', accessible: false, bidirectional: true },
    //{ id: 'st0_2_hw3_2',  fromNodeId: 'stair0_2',  toNodeId: 'hallway3_2', type: 'stair', accessible: false, bidirectional: true },

    { id: 'hw2_2_hw4_2',  fromNodeId: 'hallway2_2', toNodeId: 'hallway4_2', type: 'hallway', accessible: true, bidirectional: true },

    { id: 'hw1_2_hw2_2',  fromNodeId: 'hallway1_2', toNodeId: 'hallway2_2', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw2_2_hw3_2',  fromNodeId: 'hallway2_2', toNodeId: 'hallway3_2', type: 'hallway', accessible: true, bidirectional: true },
    { id: 'hw3_2_2213a',  fromNodeId: 'hallway3_2', toNodeId: 'room_2213_a', type: 'door',   accessible: true, bidirectional: true },

    { id: 'hw4_2_ev2_2',  fromNodeId: 'hallway4_2', toNodeId: 'elevator2_2', type: 'elevator', accessible: true, bidirectional: true },

];

/** Computes edge costs from Euclidean distance between node pairs, using a fixed penalty for floor transitions. */
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