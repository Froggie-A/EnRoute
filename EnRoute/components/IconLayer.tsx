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
  { x: -1.5, y: 0.15, z: 0.5, floor: 1, type: "studyroom" },
  { x: -1.5, y: 0.15, z: 2.3, floor: 1, type: "studyroom" },
  { x: -1.7, y: 0.15, z: 1.4, floor: 1, type: "studyroom" },
  { x: -4.35, y: 0.15, z: -5.553, floor: 1, type: "studyroom" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: 5, y: 0.15, z: 0, floor: 1, type: "emergency" },
  { x: -0.07, y: 0.15, z: 2.8, floor: 1, type: "restroom" },
  { x: -0.07, y: 0.15, z: 0.08, floor: 1, type: "restroom" },
  { x: 4.8, y: 0.15, z: 0.03, floor: 1, type: "restroom" },
  { x: 4.75, y: 0.15, z: 2.85, floor: 1, type: "restroom" },
  { x: 0.05, y: 0.15, z: -4.53, floor: 1, type: "restroom" },
  { x: -4.21, y: 0.15, z: -4, floor: 1, type: "restroom" },
  { x: 5.49, y: 0.15, z: 3.28, floor: 1, type: "vending" },
  { x: 5.3, y: 0.15, z: 3.28, floor: 1, type: "vending" },
  { x: 5.1, y: 0.15, z: 3.28, floor: 1, type: "vending" },
  { x: 4.9, y: 0.15, z: 3.28, floor: 1, type: "vending" },
  { x: 0.57, y: 0.15, z: -3.81, floor: 1, type: "vending" },
  { x: 0.4, y: 0.15, z: -3.81, floor: 1, type: "vending" },
  { x: 0.24, y: 0.15, z: -3.81, floor: 1, type: "vending" },
  { x: 0.05, y: 0.15, z: -3.81, floor: 1, type: "vending" },
  { x: 4.58, y: 0.15, z: 3.65, floor: 1, type: "elevator" },
  { x: -0.23, y: 0.15, z: -4.07, floor: 1, type: "elevator" },
  { x: 0.1, y: 0.15, z: 1.8, floor: 1, type: "elevator" },
  { x: -0.15, y: 0.15, z: 1.8, floor: 1, type: "elevator" },
  { x: 4.45, y: 0.15, z: 2.9, floor: 1, type: "fountain" },
  { x: 4.45, y: 0.15, z: 2.85, floor: 1, type: "fountain" },
  { x: 4.5, y: 0.15, z: 0.05, floor: 1, type: "fountain" },
  { x: -0.03, y: 0.15, z: -0.2, floor: 1, type: "fountain" },
  { x: -0.09, y: 0.15, z: -0.2, floor: 1, type: "fountain" },
  { x: -0.05, y: 0.15, z: 3.1, floor: 1, type: "fountain" },
  { x: -0.26, y: 0.15, z: -4.5, floor: 1, type: "fountain" },
  { x: -0.1, y: 0.15, z: 3.1, floor: 1, type: "fountain" },
  { x: -4.2, y: 0.15, z: -3.7, floor: 1, type: "fountain" },
  { x: -4.27, y: 0.15, z: -3.7, floor: 1, type: "fountain" },
  { x: -0.15, y: 0.15, z: 1.25, floor: 1, type: "fire" },
  { x: 1.3, y: 0.15, z: -0.4, floor: 1, type: "fire" },
  { x: 4, y: 0.15, z: -0.4, floor: 1, type: "fire" },
  { x: 3.7, y: 0.15, z: 0.45, floor: 1, type: "fire" },
  { x: 3.75, y: 0.15, z: 2.4, floor: 1, type: "fire" },
  { x: 3.78, y: 0.15, z: 3.25, floor: 1, type: "fire" },
  { x: 1.3, y: 0.15, z: 3.25, floor: 1, type: "fire" },
  { x: 4.2, y: 0.15, z: 5.1, floor: 1, type: "fire" },
  { x: 2.34, y: 0.15, z: 4.65, floor: 1, type: "fire" },
  { x: -0.85, y: 0.15, z: 3.4, floor: 1, type: "fire" },
  { x: -0.9, y: 0.15, z: 4.7, floor: 1, type: "fire" },
  { x: -3.4, y: 0.15, z: 4.7, floor: 1, type: "fire" },
  { x: -3.5, y: 0.15, z: -0.53, floor: 1, type: "fire" },
  { x: -3.83, y: 0.15, z: -2, floor: 1, type: "fire" },
  { x: -0.64, y: 0.15, z: -1.88, floor: 1, type: "fire" },
  { x: -1.1, y: 0.15, z: -3, floor: 1, type: "fire" },
  { x: 1.37, y: 0.15, z: -2.47, floor: 1, type: "fire" },
  { x: 3.9, y: 0.15, z: -2.55, floor: 1, type: "fire" },
  { x: -10, y: 0.15, z: 0, floor: 1, type: "fire" },
  { x: -10, y: 0.15, z: 0, floor: 1, type: "fire" },
  { x: -10, y: 0.15, z: 0, floor: 1, type: "fire" },
  { x: -0.3, y: 0.15, z: 1.25, floor: 1, type: "defib" },
  { x: 4.5, y: 0.15, z: -0.02, floor: 1, type: "bottle" },
  { x: -0.26, y: 0.15, z: -4.54, floor: 1, type: "bottle" },
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

  const visibleIcons = ICON_DATA.filter(
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
      {visibleIcons.map((icon, i) => (
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