 // navigation/db.ts
 // database layer

import { openDatabaseSync, SQLiteDatabase } from "expo-sqlite";
import { SEED_NODES } from './seed-nodes';
import { computeEdgeCosts } from './seed-edges';

export type NodeType =
    | "room"
    | "hallway"
    | "entrance"
    | "exit"
    | "elevator"
    | "stairs"
    | "bathroom"
    | "water_fountain"
    | "vending"
    | "study_spot"
    | "fire_exit"
    | "fire_extinguisher"
    | "aed"
    | "user_pin"
    | string;

export type EdgeType =
    | "hallway"
    | "door"
    | "stairs"
    | "elevator"
    | string;

export interface NavNode {
    id: string;
    label: string;
    type: NodeType;
    floor: number;
    x: number;
    y: number;
    z: number;
    accessible: boolean;
}

export interface NavEdge {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    cost: number;
    type: EdgeType;
    accessible: boolean;
    bidirectional: boolean;
}

// open/create db

 let _db: SQLiteDatabase | null = null;

 export function getDb(): SQLiteDatabase {
     if (!_db) {
         _db = openDatabaseSync("enroute.db");
         _db.execSync("PRAGMA foreign_keys = ON;");
     }
     return _db;
 }

// schema

export function initSchema(): void {
    const db = getDb();

    db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nav_nodes (
      id         TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      type       TEXT NOT NULL,
      floor      INTEGER NOT NULL,
      x          REAL NOT NULL,
      y          REAL NOT NULL,
      z          REAL NOT NULL,
      accessible INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS nav_edges (
      id            TEXT PRIMARY KEY,
      from_node_id  TEXT NOT NULL,
      to_node_id    TEXT NOT NULL,
      cost          REAL NOT NULL,
      type          TEXT NOT NULL,
      accessible    INTEGER NOT NULL DEFAULT 1,
      bidirectional INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (from_node_id) REFERENCES nav_nodes(id),
      FOREIGN KEY (to_node_id)   REFERENCES nav_nodes(id)
    );
  `);
}

// seeding

const SEED_VERSION = "1";

export function seedIfNeeded(): void {
    const db = getDb();

    const row = db.getFirstSync<{ value: string }>(
        "SELECT value FROM app_meta WHERE key = 'seed_version'"
    );

    if (row?.value === SEED_VERSION) return;

    db.execSync("DELETE FROM nav_edges; DELETE FROM nav_nodes;");

    const insertNode = db.prepareSync(
        `INSERT OR REPLACE INTO nav_nodes (id, label, type, floor, x, y, z, accessible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertEdge = db.prepareSync(
        `INSERT OR REPLACE INTO nav_edges (id, from_node_id, to_node_id, cost, type, accessible, bidirectional)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const SEED_EDGES = computeEdgeCosts(SEED_NODES);

    for (const n of SEED_NODES) {
        insertNode.executeSync([
            n.id, n.label, n.type, n.floor,
            n.x, n.y, n.z, n.accessible ? 1 : 0,
        ]);
    }

    for (const e of SEED_EDGES) {
        insertEdge.executeSync([
            e.id, e.fromNodeId, e.toNodeId, e.cost,
            e.type, e.accessible ? 1 : 0, e.bidirectional ? 1 : 0,
        ]);
    }

    insertNode.finalizeSync();
    insertEdge.finalizeSync();

    db.runSync(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_version', ?)",
        [SEED_VERSION]
    );
}

// query helpers
// load nodes
export function getNodes(floor?: number): NavNode[] {
    const db = getDb();
    const rows = floor !== undefined
        ? db.getAllSync<any>("SELECT * FROM nav_nodes WHERE floor = ?", [floor])
        : db.getAllSync<any>("SELECT * FROM nav_nodes");

    return rows.map(rowToNode);
}

// load one
export function getNode(id: string): NavNode | null {
    const db = getDb();
    const row = db.getFirstSync<any>("SELECT * FROM nav_nodes WHERE id = ?", [id]);
    return row ? rowToNode(row) : null;
}

// load edges
export function getEdges(): NavEdge[] {
    const db = getDb();
    const rows = db.getAllSync<any>("SELECT * FROM nav_edges");
    return rows.map(rowToEdge);
}

// amenity search (filter by type)
export function getNodesByType(type: NodeType, floor?: number): NavNode[] {
    const db = getDb();
    const rows = floor !== undefined
        ? db.getAllSync<any>(
            "SELECT * FROM nav_nodes WHERE type = ? AND floor = ?",
            [type, floor]
        )
        : db.getAllSync<any>("SELECT * FROM nav_nodes WHERE type = ?", [type]);

    return rows.map(rowToNode);
}

// helpers
function rowToNode(r: any): NavNode {
    return {
        id: r.id,
        label: r.label,
        type: r.type,
        floor: r.floor,
        x: r.x,
        y: r.y,
        z: r.z,
        accessible: r.accessible === 1,
    };
}

function rowToEdge(r: any): NavEdge {
    return {
        id: r.id,
        fromNodeId: r.from_node_id,
        toNodeId: r.to_node_id,
        cost: r.cost,
        type: r.type,
        accessible: r.accessible === 1,
        bidirectional: r.bidirectional === 1,
    };
}