// components/nodeDebugLayer.tsx
//
// Debug overlay that renders every node as a colored sphere and every edge
// as a line. Toggle with the debug button in index.tsx.
//
// Node colors:
//   entrance  → red
//   hallway   → blue
//   classroom → green
//   bathroom  → orange
//   everything else → yellow
//
// Edges are rendered as thin white lines between connected nodes.

import React, { useMemo } from "react";
import * as THREE from "three";
import { TEST_NODES, TEST_EDGES } from "@/navigation/seed-nodes";

const SCALE = 1; // must match Building group scale in index.tsx
const NODE_Y = 0.25; // float slightly above floor surface

function nodeColor(type: string): string {
    switch (type) {
        case "entrance":  return "#FF3B30";
        case "hallway":   return "#007AFF";
        case "classroom": return "#34C759";
        case "bathroom":  return "#FF9500";
        case "stairs":    return "#AF52DE";
        case "elevator":  return "#5AC8FA";
        default:          return "#FFD60A";
    }
}

// ─── Edge lines ───────────────────────────────────────────────────────────────
function EdgeLines() {
    const geometry = useMemo(() => {
        const nodeMap = new Map(TEST_NODES.map(n => [n.id, n]));
        const positions: number[] = [];

        for (const edge of TEST_EDGES) {
            const from = nodeMap.get(edge.fromNodeId);
            const to   = nodeMap.get(edge.toNodeId);
            if (!from || !to) continue;

            positions.push(
                from.x * SCALE, NODE_Y, from.y * SCALE,
                to.x   * SCALE, NODE_Y, to.y   * SCALE,
            );
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        return geo;
    }, []);

    return (
        <lineSegments geometry={geometry} renderOrder={1005}>
            <lineBasicMaterial
                color="black"
                opacity={0.9}
                transparent
                depthTest={false}
            />
        </lineSegments>
    );
}

// ─── Node spheres ─────────────────────────────────────────────────────────────
function NodeSpheres() {
    return (
        <>
            {TEST_NODES.map((node) => (
                <mesh
                    key={node.id}
                    position={[node.x * SCALE, NODE_Y, node.y * SCALE]}
                    renderOrder={1006}
                >
                    <sphereGeometry args={[0.5, 16, 16]} />
                    <meshBasicMaterial
                        color={nodeColor(node.type)}
                        depthTest={false}
                    />
                </mesh>
            ))}
        </>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────
type Props = { visible?: boolean };

export default function NodeDebugLayer({ visible = true }: Props) {
    if (!visible) return null;
    return (
        <group>
            <EdgeLines />
            <NodeSpheres />
        </group>
    );
}