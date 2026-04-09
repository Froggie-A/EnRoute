import React from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber/native";
import { TextureLoader } from "expo-three";

type IconPin = {
  x: number;
  y: number;
  z: number;
  type: "studyroom" | "emergency" | "restroom" | "vending" | "elevator" | "fountain" | "fire" | "defib";
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

export default function IconLayer() {
  const [
    studyroomTexture,
    emergencyTexture,
    restroomTexture,
    vendingTexture,
    elevatorTexture,
    fountainTexture,
    fireTexture,
    defibTexture,
  ] = useLoader(TextureLoader, [
    require("../assets/images/study-room-icon.png"),
    require("../assets/images/emer-exit-icon.png"),
    require("../assets/images/restroom-icon.png"),
    require("../assets/images/vending-mach-icon.png"),
    require("../assets/images/elevator-icon.png"),
    require("../assets/images/water-fount-icon.png"),
    require("../assets/images/fire-exting-icon.png"),
    require("../assets/images/first-aid-icon.png"),
  ]) as THREE.Texture[];

  const textures: Record<IconPin["type"], THREE.Texture> = {
    studyroom: studyroomTexture,
    emergency: emergencyTexture,
    restroom:  restroomTexture,
    vending:   vendingTexture,
    elevator:  elevatorTexture,
    fountain:  fountainTexture,
    fire:      fireTexture,
    defib:     defibTexture,
  };

  return (
    <>
      {ICON_DATA.map((icon, i) => (
        <sprite key={i} position={[icon.x, icon.y + 0.2, icon.z]}>
          <spriteMaterial attach="material" map={textures[icon.type]} />
        </sprite>
      ))}
    </>
  );
}