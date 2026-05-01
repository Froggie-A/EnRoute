// Defines room bounding boxes for all floors and renders invisible 3D hitboxes and text labels over them.
// Provides helpers to look up rooms by ID, screen point, or search query, and to map hitbox IDs to nav node IDs.

import React from "react";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import helvetiker from "three/examples/fonts/helvetiker_regular.typeface.json";

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
      position: [56.25, 0, -15.85],
      size: [15, 2, 7.5],
    },
    {
      id: "room-1225",
      name: "Room 1225",
      navNodeId: "room_1225_a",
      position: [56.25, 0, -7.37],
      size: [15, 2, 7.5],
    },
    {
      id: "room-1253",
      name: "Room 1253",
      navNodeId: "room_1253_a",
      position: [5, 0, -23],
      size: [10, 2, 12],
    },
    {
      id: "room-1206",
      name: "Room 1206",
      navNodeId: "room_1206_a",
      position: [-20, 0, -21],
      size: [8.95, 2, 14],
    },
    {
      id: "room-1263",
      name: "Room 1263",
      navNodeId: "room_1263_a",
      position: [-30.675, 0, -21],
      size: [8.95, 2, 14],
    },
    {
      id: "room-1202",
      name: "Room 1202",
      navNodeId: "room_1202_a",
      position: [-44.25, 0, -19.75],
      size: [9.5, 2, 17.5],
    },
    {
      id: "room-1200",
      name: "Room 1200",
      navNodeId: "room_1200_a",
      position: [-55.5, 0, -19.75],
      size: [9.5, 2, 17.5],
    },
    { //
      id: "room-1262",
      name: "Room 1262",
      navNodeId: "room_1262_a",
      position: [-30.675, 0, -9.5],
      size: [10, 2, 6.5],
    },
    {
      id: "room-1258",
      name: "Room 1258",
      navNodeId: "room_1258_a",
      position: [-20, 0, -9.5],
      size: [10, 2, 6.5],
    },
    {
      id: "room-1256",
      name: "Room 1256",
      navNodeId: "room_1256_a",
      position: [-11, 0, -14],
      size: [7, 2, 15],
    },
    {
      id: "room-1246",
      name: "Room 1246",
      navNodeId: "room_1246_a",
      position: [3, 0, -10.75],
      size: [12, 2, 9],
    },
    {
      id: "room-1244",
      name: "Room 1244",
      navNodeId: "room_1244_a",
      position: [12.10, 0, -11.25],
      size: [4.5, 2, 10],
    },
    {
      id: "room-1240",
      name: "Room 1240",
      navNodeId: "room_1240_a",
      position: [19.5, 0, -11.25],
      size: [8, 2, 10],
    },
    {
      id: "room-1236",
      name: "Room 1236",
      navNodeId: "room_1236_a",
      position: [28, 0, -11.25],
      size: [7, 2, 10],
    },
    {
      id: "room-1232",
      name: "Room 1232",
      navNodeId: "room_1232_a",
      position: [36.8, 0, -11.25],
      size: [8, 2, 10],
    },
    {
      id: "room-1218",
      name: "Room 1218",
      navNodeId: "room_1218_a",
      position: [37.15, 0, -21.35],
      size: [7.5, 2, 6],
    },
    {
      id: "room-1216",
      name: "Room 1216",
      navNodeId: "room_1216_a",
      position: [28.75, 0, -21.35],
      size: [7.5, 2, 6],
    },
    {
      id: "room-1212",
      name: "Room 1212",
      navNodeId: "room_1212_a",
      position: [17, 0, -20.25],
      size: [13, 2, 6.5],
    },
    {
      id: "lab-1154",
      name: "Lab 1154",
      navNodeId: "lab_1154_a",
      position: [32.75, 0, -39.5],
      size: [10.5, 2, 6],
    },
    {
      id: "lab-1139",
      name: "Lab 1139",
      navNodeId: "lab_1139_a",
      position: [23.5, 0, -42.45],
      size: [5, 2, 11],
    },
    {
      id: "lab-1133",
      name: "Lab 1133",
      navNodeId: "lab_1133_a",
      position: [17.25, 0, -42.45],
      size: [5, 2, 11],
    },
    {
      id: "lab-1131",
      name: "Lab 1131",
      navNodeId: "lab_1131_a",
      position: [11.55, 0, -42.45],
      size: [5, 2, 11],
    },
    {
      id: "lab-1114",
      name: "Lab 1114",
      navNodeId: "lab_1114_a",
      position: [-22, 0, -43.45],
      size: [17, 2, 13],
    },
    {
      id: "room-1100",
      name: "Auditorium 1100",
      navNodeId: "room_1100_a",
      position: [-54.75, 0, -46.80],
      size: [18, 2, 14],
    },
    {
      id: "room-1375",
      name: "Panera Bread",
      navNodeId: "room_1375_a",
      position: [52.75, 0, 21.25],
      size: [16, 2, 7.5],
    },
    {
      id: "room-1233",
      name: "Room 1233",
      navNodeId: "room_1233_a",
      position: [32.85, 0, 0.4],
      size: [10.5, 2, 6.2],
    },
    {
      id: "lab-1237",
      name: "Lab 1237",
      navNodeId: "lab_1237_a",
      position: [22.25, 0, 0.4],
      size: [9, 2, 6.2],
    },
    {
      id: "room-1245",
      name: "Room 1245",
      navNodeId: "room_1245_a",
      position: [9.75, 0, 3.75],
      size: [14, 2, 13],
    },
    {
      id: "room-1272",
      name: "Room 1272",
      navNodeId: "room_1272_a",
      position: [-15, 0, 5],
      size: [8, 2, 6],
    },
    {
      id: "room-1259",
      name: "Room 1259",
      navNodeId: "room_1259_a",
      position: [-24.55, 0, 2.5],
      size: [9, 2, 10.5],
    },
    {
      id: "room-1340",
      name: "Room 1340",
      navNodeId: "room_1340_a",
      position: [-24.55, 0, 26.25],
      size: [9, 2, 10.5],
    },
    {
      id: "room-1342",
      name: "Room 1342",
      navNodeId: "room_1342_a",
      position: [-15, 0, 24],
      size: [8, 2, 6],
    },
    {
      id: "room-1350",
      name: "Room 1350",
      navNodeId: "room_1350_a",
      position: [10.35, 0, 24.8],
      size: [14, 2, 13],
    },
    {
      id: "room-1354",
      name: "Room 1354",
      navNodeId: "room_1354_a",
      position: [22.5, 0, 28.45],
      size: [8.25, 2, 6],
    },
    {
      id: "room-1360",
      name: "Room 1360",
      navNodeId: "room_1360_a",
      position: [32.8, 0, 28.45],
      size: [10.5, 2, 6],
    },

    {
      id: "bathroom0",
      name: "Bathroom",
      navNodeId: "bathroom_0",
      position: [-1, 0, 2],
      size: [5, 2, 10],
    },
    {
      id: "bathroom1",
      name: "Bathroom",
      navNodeId: "bathroom_1",
      position: [-42, 0, -40],
      size: [5, 2, 7],
    },
    {
      id: "bathroom2",
      name: "Bathroom",
      navNodeId: "bathroom_2",
      position: [50.25, 0, 0],
      size: [11, 5, 6],
    },
    {
      id: "bathroom3",
      name: "Bathroom",
      navNodeId: "bathroom_3",
      position: [2.5, 0, -45.2],
      size: [11, 5, 5.5],
    },
    {
      id: "bathroom4",
      name: "Bathroom",
      navNodeId: "bathroom_4",
      position: [50.25, 0, 28.45],
      size: [11, 5, 6],
    },
    {
      id: "bathroom5",
      name: "Bathroom",
      navNodeId: "bathroom_5",
      position: [50.25, 0, 28.45],
      size: [11, 5, 6],
    },
    {
      id: "vending0",
      name: "Vending Machine",
      navNodeId: "vending_0",
      position: [3.5, 0, -38.5],
      size: [7.5, 5, 4],
    },
    {
      id: "vending1",
      name: "Vending Machine",
      navNodeId: "vending_1",
      position: [52, 0, 33.8],
      size: [7.5, 5, 4],
    },
  ],
  2: [
    {
      id: "room2213",
      name: "Room 2213",
      navNodeId: "room_2213_a",
      position: [3, 0, -24],
      size: [5, 5, 5],
    },
  ],
  3: [],
};

/** Returns the RoomBox with the given ID on the specified floor, or null if not found. */
export function getRoomById(
    activeFloor: 1 | 2 | 3,
    roomId: string
): RoomBox | null {
  const rooms = ROOM_DATA[activeFloor] ?? [];
  return rooms.find((room) => room.id === roomId) ?? null;
}

/** Returns the nav node ID associated with a hitbox ID on the given floor. */
export function getNavNodeId(
    hitboxId: string,
    floor: 1 | 2 | 3
): string | null {
  const room = (ROOM_DATA[floor] ?? []).find((r) => r.id === hitboxId);
  return room?.navNodeId ?? null;
}

/** Renders a 3D text label above a room hitbox. */
function RoomLabel({ room, selected }: { room: RoomBox; selected: boolean }) {
  const geometry = React.useMemo(() => {
    const font = new FontLoader().parse(helvetiker as any);
    const label = room.name.replace("Room ", "");

    const geo = new TextGeometry(label, {
      font,
      size: 1.4,
      height: 0.05,
      curveSegments: 2,
    });

    geo.computeBoundingBox();

    const box = geo.boundingBox;
    if (box) {
      const xOffset = -0.5 * (box.max.x - box.min.x);
      const yOffset = -0.5 * (box.max.y - box.min.y);
      geo.translate(xOffset, yOffset, 0);
    }

    return geo;
  }, [room.name]);

  return (
      <mesh
          geometry={geometry}
          position={[
            room.position[0],
            room.position[1] + 1.2,
            room.position[2],
          ]}
          rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
          renderOrder={1004}
      >
        <meshBasicMaterial
            color={selected ? "#1A6BFF" : "#1A365D"}
            depthTest={false}
        />
      </mesh>
  );
}

/** Renders invisible click hitboxes and labels for all rooms on the active floor. */
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

          const isSpecial =
              room.id.includes("bath") ||
              room.id.includes("vending");

          return (
              <group key={room.id}>
                {/* Invisible hitbox */}
                <mesh
                    position={room.position}
                    raycast={THREE.Mesh.prototype.raycast}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedRoom(isSelected ? null : room.id);
                    }}
                >
                  <boxGeometry args={room.size} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>

                {/* ONLY render label if not special */}
                {!isSpecial && (
                    <RoomLabel room={room} selected={isSelected} />
                )}
              </group>
          );
        })}
      </group>
  );
}

/** Returns all room boxes for the given floor. */
export function getRoomsForFloor(floor: 1 | 2 | 3): RoomBox[] {
  return ROOM_DATA[floor] ?? [];
}

/** Returns the room closest to the given screen-space point by projecting all room corners through the camera. */
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

/** Finds a room on the given floor whose ID or name matches the search query. */
export function findRoomBySearch(floor: 1 | 2 | 3, query: string) {
  const cleaned = query
      .toLowerCase()
      .replace("pft", "")
      .replace("room", "")
      .replace(/\s+/g, "")
      .trim();

  const rooms = ROOM_DATA[floor] ?? [];

  return rooms.find((room: any) => {
    const id = String(room.id ?? "").toLowerCase().replace(/\s+/g, "");
    const name = String(room.name ?? "").toLowerCase().replace(/\s+/g, "");
    const label = String(room.label ?? "").toLowerCase().replace(/\s+/g, "");

    return (
        id.includes(cleaned) ||
        name.includes(cleaned) ||
        label.includes(cleaned)
    );
  });
}

/** Returns all rooms on the given floor whose numeric ID starts with the query string. */
export function findRoomsStartingWith(
    floor: 1 | 2 | 3,
    query: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  const rooms = ROOM_DATA[floor] ?? [];

  return rooms.filter((room) => {
    const roomNumber = room.id.match(/\d+/)?.[0] || "";

    return roomNumber.startsWith(normalizedQuery);
  });
}