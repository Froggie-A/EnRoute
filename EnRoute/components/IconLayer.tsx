import React, { useMemo } from "react";
import * as THREE from "three";
import { Asset } from "expo-asset";
import { useTexture } from "@react-three/drei/native";

type IconPin = {
  x: number;
  y: number;
  z: number;
  type:
    | "studyroom"
    | "emergency"
    | "restroom"
    | "vending"
    | "elevator"
    | "fountain"
    | "fire"
    | "defib";
};

const ICON_DATA: IconPin[] = [
  { x: 1, y: 0.5, z: 0, type: "studyroom" },
  { x: 5, y: 0.5, z: 0, type: "emergency" },
  { x: 10, y: 0.5, z: 0, type: "restroom" },
  { x: 10, y: 0.5, z: 20, type: "restroom" },
  { x: 15, y: 0.5, z: 0, type: "vending" },
  { x: 20, y: 0.5, z: 0, type: "elevator" },
  { x: 25, y: 0.5, z: 0, type: "fountain" },
  { x: -1, y: 0.5, z: 0, type: "fire" },
  { x: 30, y: 0.5, z: 0, type: "defib" },
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

export default function IconLayer() {
  const loaded = useTexture([
    studyroomIcon,
    emergencyIcon,
    restroomIcon,
    vendingIcon,
    elevatorIcon,
    fountainIcon,
    fireIcon,
    defibIcon,
  ]) as THREE.Texture[];

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
    }),
    [loaded]
  );

  return (
    <>
      {ICON_DATA.map((icon, i) => (
        <sprite
          key={i}
          position={[icon.x, icon.y + 0.2, icon.z]}
          scale={[1.5, 1.5, 1.5]}
        >
          <spriteMaterial map={textures[icon.type]} transparent />
        </sprite>
      ))}
    </>
  );
}