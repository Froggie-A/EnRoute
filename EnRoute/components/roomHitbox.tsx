import React from "react";
import * as THREE from "three";

export type RoomBox = {
  id: string;
  name: string;
  navNodeId: string;
  position: [number, number, number];
  size: [number, number, number];
};

type Props = {
  activeFloor: 1 | 2 | 3;
  selectedRoom: string | null;
  setSelectedRoom: (id: string | null) => void;
};


const ROOM_DATA: Record<1 | 2 | 3, RoomBox[]> = {
  1: [
    {
      id: "room-1221",
      name: "Room 1221",
      navNodeId: "room_1221_a",
      position: [56, 0, -16],
      size: [15, 2, 8],
    },
    {
      id: "room-1253",
      name: "Room 1253",
      navNodeId: "room_1253_a",
      position: [5, 0, -23],
      size: [10, 2, 12],
    },
    {
      id: "bathroom0",
      name: "Bathroom",
      navNodeId: "bathroom_3",
      position: [-1, 0, 2],
      size: [5, 2, 10],
    },
  ],
  2: [],
  3: [],
};

export function getRoomById(
    activeFloor: 1 | 2 | 3,
    roomId: string
): RoomBox | null {
  const rooms = ROOM_DATA[activeFloor] ?? [];
  return rooms.find((room) => room.id === roomId) ?? null;
}

export function getNavNodeId(
    hitboxId: string,
    floor: 1 | 2 | 3
): string | null {
  const room = (ROOM_DATA[floor] ?? []).find((r) => r.id === hitboxId);
  return room?.navNodeId ?? null;
}

export default function RoomHitboxes({
                                       activeFloor,
                                       selectedRoom,
                                       setSelectedRoom,
                                     }: Props) {
  const rooms = ROOM_DATA[activeFloor] ?? [];

  return (
      <group>
        {rooms.map((room) => {
          const isSelected = selectedRoom === room.id;

          return (
              <mesh
                  key={room.id}
                  position={room.position}
                  raycast={THREE.Mesh.prototype.raycast}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedRoom(isSelected ? null : room.id);
                    console.log("clicked:", room.name, "->", room.navNodeId);
                  }}
              >
                <boxGeometry args={room.size} />
                <meshStandardMaterial
                    color={isSelected ? "#2196F3" : "gray"}
                    transparent
                    opacity={0.4}
                />
              </mesh>
          );
        })}
      </group>
  );
}

export function getRoomAtScreenPoint(
    x: number,
    y: number,
    activeFloor: 1 | 2 | 3,
    camera: THREE.Camera,
    screenWidth: number,
    screenHeight: number
) {
  const groupScale = 0.1;
  const rooms = ROOM_DATA[activeFloor] ?? [];

  let bestMatch: { id: string; name: string; depth: number } | null = null;

  for (const room of rooms) {
    const [px, py, pz] = room.position;
    const [sx, sy, sz] = room.size;

    const hx = (sx * groupScale) / 2;
    const hy = (sy * groupScale) / 2;
    const hz = (sz * groupScale) / 2;

    const cx = px * groupScale;
    const cy = py * groupScale;
    const cz = pz * groupScale;

    const corners = [
      new THREE.Vector3(cx - hx, cy - hy, cz - hz),
      new THREE.Vector3(cx - hx, cy - hy, cz + hz),
      new THREE.Vector3(cx - hx, cy + hy, cz - hz),
      new THREE.Vector3(cx - hx, cy + hy, cz + hz),
      new THREE.Vector3(cx + hx, cy - hy, cz - hz),
      new THREE.Vector3(cx + hx, cy - hy, cz + hz),
      new THREE.Vector3(cx + hx, cy + hy, cz - hz),
      new THREE.Vector3(cx + hx, cy + hy, cz + hz),
    ];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let avgDepth = 0;

    for (const corner of corners) {
      const projected = corner.clone().project(camera);
      const screenX = ((projected.x + 1) / 2) * screenWidth;
      const screenY = ((1 - projected.y) / 2) * screenHeight;
      minX = Math.min(minX, screenX);
      maxX = Math.max(maxX, screenX);
      minY = Math.min(minY, screenY);
      maxY = Math.max(maxY, screenY);
      avgDepth += projected.z;
    }

    avgDepth /= corners.length;

    const padding = 12;
    const inside =
        x >= minX - padding &&
        x <= maxX + padding &&
        y >= minY - padding &&
        y <= maxY + padding;

    if (inside) {
      if (!bestMatch || avgDepth < bestMatch.depth) {
        bestMatch = { id: room.id, name: room.name, depth: avgDepth };
      }
    }
  }

  return bestMatch;
}