import React, { useMemo } from "react";
import * as THREE from "three";
import { Asset } from "expo-asset";
import { useTexture } from "@react-three/drei/native";

type IconPin = {
  x: number;
  y: number;
  z: number;
  floor: 1 | 2 | 3;
  type:
    | "studyroom"
    | "emergency"
    | "restroom"
    | "vending"
    | "elevator"
    | "fountain"
    | "fire"
    | "defib"
    | "bottle";
};

const ICON_DATA: IconPin[] = [
  { x: 10, y: 0.1, z: 0, floor: 1, type: "studyroom" },
  { x: 5, y: 0.1, z: 0, floor: 1, type: "emergency" },
  { x: 10, y: 0.1, z: 0, floor: 1, type: "restroom" },
  { x: 0, y: 0.1, z: 0, floor: 1, type: "restroom" },
  { x: 15, y: 0.1, z: 0, floor: 1, type: "vending" },
  { x: 20, y: 0.1, z: 0, floor: 1, type: "elevator" },
  { x: 25, y: 0.1, z: 0, floor: 1, type: "fountain" },
  { x: -10, y: 0.1, z: 0, floor: 1, type: "fire" },
  { x: 30, y: 0.1, z: 0, floor: 1, type: "defib" },
  { x: 10, y: 0.1, z: 0, floor: 2, type: "bottle" },
];

const studyroomIcon = Asset.fromModule(
  require("../assets/images/study-room-icon.png")
).uri;
const emergencyIcon = Asset.fromModule(
  require("../assets/images/emer-exit-icon.png")
).uri;
const restroomIcon = Asset.fromModule(
  require("../assets/images/restroom-icon.png")
).uri;
const vendingIcon = Asset.fromModule(
  require("../assets/images/vending-mach-icon.png")
).uri;
const elevatorIcon = Asset.fromModule(
  require("../assets/images/elevator-icon.png")
).uri;
const fountainIcon = Asset.fromModule(
  require("../assets/images/water-fount-icon.png")
).uri;
const fireIcon = Asset.fromModule(
  require("../assets/images/fire-exting-icon.png")
).uri;
const defibIcon = Asset.fromModule(
  require("../assets/images/first-aid-icon.png")
).uri;
const bottleIcon = Asset.fromModule(
  require("../assets/images/bottle-fill-icon.png")
).uri;


export default function IconLayer({ activeFloor }: { activeFloor: 1 | 2 | 3 }) {
  const loaded = useTexture([
    studyroomIcon,
    emergencyIcon,
    restroomIcon,
    vendingIcon,
    elevatorIcon,
    fountainIcon,
    fireIcon,
    defibIcon,
    bottleIcon,
  ]) as THREE.Texture[];

  const visibileIcons = ICON_DATA.filter(
    (icon) => icon.floor === activeFloor
  );

  const textures: Record<IconPin["type"], THREE.Texture> = useMemo(
    () => ({
      studyroom: loaded[0],
      emergency: loaded[1],
      restroom: loaded[2],
      vending: loaded[3],
      elevator: loaded[4],
      fountain: loaded[5],
      fire: loaded[6],
      defib: loaded[7],
      bottle: loaded[8],
    }),
    [loaded]
  );

  return (
    <>
      {visibileIcons.map((icon, i) => (
        <sprite
          key={i}
          position={[icon.x, icon.y + 0.2, icon.z]}
          scale={[0.3, 0.3, 0.3]}
        >
          <spriteMaterial map={textures[icon.type]} transparent />
        </sprite>
      ))}
    </>
  );
}