// navigation/db.ts

import { openDatabaseSync, SQLiteDatabase } from "expo-sqlite";
import { TEST_NODES as SEED_NODES, computeEdgeCosts } from "./seed-nodes";

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

export type EdgeType = "hallway" | "door" | "stairs" | "elevator" | string;

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

let _db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
    if (!_db) {
        _db = openDatabaseSync("enroute.db");
        _db.execSync("PRAGMA foreign_keys = ON;");
    }
    return _db;
}

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

// Bump when seed data changes to force a re-seed on next launch
const SEED_VERSION = "7";

export function seedIfNeeded(): void {
    const db = getDb();
    const row = db.getFirstSync<{ value: string }>(
        "SELECT value FROM app_meta WHERE key = 'seed_version'"
    );
    if (row?.value === SEED_VERSION) return;

    db.execSync("PRAGMA foreign_keys = OFF;");
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
        insertNode.executeSync([n.id, n.label, n.type, n.floor, n.x, n.y, n.z, n.accessible ? 1 : 0]);
    }
    for (const e of SEED_EDGES) {
        insertEdge.executeSync([e.id, e.fromNodeId, e.toNodeId, e.cost, e.type, e.accessible ? 1 : 0, e.bidirectional ? 1 : 0]);
    }

    insertNode.finalizeSync();
    insertEdge.finalizeSync();

    db.execSync("PRAGMA foreign_keys = ON;");
    db.runSync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_version', ?)", [SEED_VERSION]);
}

export function getNodes(floor?: number): NavNode[] {
    const db = getDb();
    const rows = floor !== undefined
        ? db.getAllSync<any>("SELECT * FROM nav_nodes WHERE floor = ?", [floor])
        : db.getAllSync<any>("SELECT * FROM nav_nodes");
    return rows.map(rowToNode);
}

export function getNode(id: string): NavNode | null {
    // Read directly from in-memory TEST_NODES — instant, no SQLite round-trip.
    // This always has the latest data regardless of whether seedIfNeeded() has run.
    return SEED_NODES.find(n => n.id === id) ?? null;
}

export function getEdges(): NavEdge[] {
    const db = getDb();
    return db.getAllSync<any>("SELECT * FROM nav_edges").map(rowToEdge);
}

export function getNodesByType(type: NodeType, floor?: number): NavNode[] {
    const db = getDb();
    const rows = floor !== undefined
        ? db.getAllSync<any>("SELECT * FROM nav_nodes WHERE type = ? AND floor = ?", [type, floor])
        : db.getAllSync<any>("SELECT * FROM nav_nodes WHERE type = ?", [type]);
    return rows.map(rowToNode);
}

function rowToNode(r: any): NavNode {
    return { id: r.id, label: r.label, type: r.type, floor: r.floor, x: r.x, y: r.y, z: r.z, accessible: r.accessible === 1 };
}

function rowToEdge(r: any): NavEdge {
    return { id: r.id, fromNodeId: r.from_node_id, toNodeId: r.to_node_id, cost: r.cost, type: r.type, accessible: r.accessible === 1, bidirectional: r.bidirectional === 1 };
}