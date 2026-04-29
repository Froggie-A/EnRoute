import React, { useMemo } from "react";
import * as THREE from "three";
import { Asset } from "expo-asset";
import { useTexture } from "@react-three/drei/native";

type IconType =
  | "studyroom"
  | "emergency"
  | "restroom"
  | "vending"
  | "elevator"
  | "fountain"
  | "fire"
  | "defib"
  | "bottle";

type IconPin = {
  x: number;
  y: number;
  z: number;
  type: IconType;
};

const ICON_DATA: Record<1 | 2, IconPin[]> = {
  1: [
    { x: -1.5, y: 0.15, z: 0.5, type: "studyroom" },
    { x: -1.5, y: 0.15, z: 2.3, type: "studyroom" },
    { x: -1.7, y: 0.15, z: 1.4, type: "studyroom" },
    { x: -4.35, y: 0.15, z: -5.553, type: "studyroom" },
    { x: 6.14, y: 0.15 , z: 1.4, type: "emergency" },
    { x: 5, y: 0.15, z: 5.1, type: "emergency" },
    { x: 4.35, y: 0.15, z: 5.3, type: "emergency" },
    { x: 2.28, y: 0.15, z: 5.25, type: "emergency" },
    { x: -0.55, y: 0.15, z: 5.7, type: "emergency" },
    { x: -0.93, y: 0.15, z: 5.86, type: "emergency" },
    { x: -3.78, y: 0.15, z: 5.4, type: "emergency" },
    { x: -5.7, y: 0.15, z: 3.57, type: "emergency" },
    { x: -5.34, y: 0.15, z: 3.33, type: "emergency" },
    { x: -5.34, y: 0.15, z: 1.43, type: "emergency" },
    { x: -5.34, y: 0.15, z: -0.48, type: "emergency" },
    { x: -5.7, y: 0.15, z: -0.75, type: "emergency" },
    { x: -5.7, y: 0.15, z: -3.35, type: "emergency" },
    { x: -5, y: 0.15, z: -5.64, type: "emergency" },
    { x: -3.65, y: 0.15, z: -5.62, type: "emergency" },
    { x: -0.64, y: 0.15, z: -5.62, type: "emergency" },
    { x: 4.98, y: 0.15, z: -3.8, type: "emergency" },
    { x: 4.55, y: 0.15, z: -3.3, type: "emergency" },
    { x: -0.07, y: 0.15, z: 2.8, type: "restroom" },
    { x: -0.07, y: 0.15, z: 0.08, type: "restroom" },
    { x: 4.8, y: 0.15, z: 0.03, type: "restroom" },
    { x: 4.75, y: 0.15, z: 2.85, type: "restroom" },
    { x: 0.05, y: 0.15, z: -4.53, type: "restroom" },
    { x: -4.21, y: 0.15, z: -4, type: "restroom" },
    { x: 5, y: 0.15, z: 3.28, type: "vending" },
    { x: 0.3, y: 0.15, z: -3.81, type: "vending" },
    { x: 4.58, y: 0.15, z: 3.65, type: "elevator" },
    { x: -0.23, y: 0.15, z: -4.07, type: "elevator" },
    { x: -0.05, y: 0.15, z: 1.8, type: "elevator" },
    { x: 4.45, y: 0.15, z: 2.86, type: "fountain" },
    { x: 4.5, y: 0.15, z: 0.135, type: "fountain" },
    { x: -0.075, y: 0.15, z: -0.2, type: "fountain" },
    { x: -0.075, y: 0.15, z: 3.1, type: "fountain" },
    { x: -0.26, y: 0.15, z: -4.4, type: "fountain" },
    { x: -4.21, y: 0.15, z: -3.7, type: "fountain" },
    { x: -0.08, y: 0, z: 1.25, type: "fire" },
    { x: 1.3, y: 0, z: -0.42, type: "fire" },
    { x: 4, y: 0, z: -0.42, type: "fire" },
    { x: 3.7, y: 0, z: 0.48, type: "fire" },
    { x: 3.75, y: 0, z: 2.4, type: "fire" },
    { x: 3.78, y: 0, z: 3.28, type: "fire" },
    { x: 1.3, y: 0, z: 3.28, type: "fire" },
    { x: 4.215, y: 0, z: 5.1, type: "fire" },
    { x: 2.3, y: 0, z: 4.65, type: "fire" },
    { x: -0.85, y: 0, z: 3.36, type: "fire" },
    { x: -0.9, y: 0, z: 4.66, type: "fire" },
    { x: -3.4, y: 0, z: 4.66, type: "fire" },
    { x: -3.5, y: 0, z: -0.47, type: "fire" },
    { x: -3.76, y: 0, z: -2, type: "fire" },
    { x: -0.56, y: 0, z: -1.88, type: "fire" },
    { x: -1.1, y: 0, z: -3, type: "fire" },
    { x: 1.37, y: 0, z: -2.47, type: "fire" },
    { x: 3.9, y: 0, z: -2.59, type: "fire" },
    { x: 4.1, y: 0, z: -3.51, type: "fire" },
    { x: 4.2, y: 0, z: -4.96, type: "fire" },
    { x: 2.1, y: 0, z: -4.96, type: "fire" },
    { x: 0, y: 0, z: -4.96, type: "fire" },
    { x: -0.48, y: 0, z: -4.3, type: "fire" },
    { x: -4.4, y: 0, z: -3.53, type: "fire" },
    { x: -4.1, y: 0, z: -5.54, type: "fire" },
    { x: -0.3, y: 0, z: 1.25, type: "defib" },
    { x: 4.5, y: 0.15, z: -0.08, type: "bottle" },
    { x: -0.26, y: 0.15, z: -4.61, type: "bottle" },
  ],

  2: [
    { x: 4.2, y: 0.15, z: 5.2, type: "studyroom" },
    { x: 5.7, y: 0.15, z: 4.4, type: "studyroom" },
    { x: 4.21, y: 0.15, z: 1.3, type: "studyroom" },
    { x: -2.1, y: 0.15, z: -2.65, type: "studyroom" },
    { x: -2.08, y: 0.15, z: -5.3, type: "studyroom" },
    { x: -6.175, y: 0.15, z: -4.72, type: "studyroom" },
    { x: -5.35, y: 0.15, z: -0.435, type: "studyroom" },
    { x: -5.35, y: 0.15, z: 3.27, type: "studyroom" },
    { x: -3.66, y: 0.15, z: 5.5, type: "studyroom" },
    { x: 4.9, y: 0.15 , z: 5.3, type: "emergency" },
    { x: -1, y: 0.15, z: 5.65, type: "emergency" },
    { x: -5.7, y: 0.15, z: 3.55, type: "emergency" },
    { x: -5.7, y: 0.15, z: -0.74, type: "emergency" },
    { x: -5.3, y: 0.15, z: -5.45, type: "emergency" },
    { x: 4.8, y: 0.15, z: -3.8, type: "emergency" },
    { x: -0.07, y: 0.15, z: 2.8, type: "restroom" },
    { x: -0.07, y: 0.15, z: 0.08, type: "restroom" },
    { x: 4.75, y: 0.15, z: 0.03, type: "restroom" },
    { x: 4.75, y: 0.15, z: 2.8, type: "restroom" },
    { x: 0, y: 0.15, z: -4.35, type: "restroom" },
    { x: 0.3, y: 0.15, z: -3.7, type: "vending" },
    { x: 4.55, y: 0.15, z: 3.4, type: "elevator" },
    { x: -0.3, y: 0.15, z: -3.97, type: "elevator" },
    { x: -0.06, y: 0.15, z: 1.8, type: "elevator" },
    { x: 4.43, y: 0.15, z: 0.03, type: "fountain" },
    { x: 4.45, y: 0.15, z: 2.92, type: "fountain" },
    { x: -0.27, y: 0.15, z: -4.24, type: "fountain" },
    { x: 3.9, y: 0, z: 3.29, type: "fire" },
    { x: 1.5, y: 0, z: 3.29, type: "fire" },
    { x: -0.87, y: 0, z: 3.34, type: "fire" },
    { x: -4, y: 0, z: 3.31, type: "fire" },
    { x: -3.3, y: 0, z: 4.7, type: "fire" },
    { x: -3.7, y: 0, z: 2.8, type: "fire" },
    { x: -3.7, y: 0, z: 0.15, type: "fire" },
    { x: -3.9, y: 0, z: -0.45, type: "fire" },
    { x: -3.7, y: 0, z: -1.95, type: "fire" },
    { x: 0.7, y: 0, z: -4.85, type: "fire" },
    { x: 3.93, y: 0, z: -4.85, type: "fire" },
    { x: 3.93, y: 0, z: -1.73, type: "fire" },
    { x: 3.91, y: 0, z: -0.47, type: "fire" },
    { x: 1.3, y: 0, z: -0.45, type: "fire" },
    { x: -0.84, y: 0, z: -0.45, type: "fire" },
    { x: -0.53, y: 0, z: -1.2, type: "fire" },
    { x: 4.17, y: 0, z: 0.5, type: "fire" },
    { x: 4.17, y: 0, z: 2.35, type: "fire" },
    { x: -0.25, y: 0, z: 1.25, type: "defib" },
    { x: 4.45, y: 0.15, z: 2.69, type: "bottle" },
    { x: -0.27, y: 0.15, z: -4.46, type: "bottle" },
  ],

};

const textureSources = {
  studyroom: Asset.fromModule(require("../assets/images/study-room-icon.png")).uri,
  emergency: Asset.fromModule(require("../assets/images/emer-exit-icon.png")).uri,
  restroom: Asset.fromModule(require("../assets/images/restroom-icon.png")).uri,
  vending: Asset.fromModule(require("../assets/images/vending-mach-icon.png")).uri,
  elevator: Asset.fromModule(require("../assets/images/elevator-icon.png")).uri,
  fountain: Asset.fromModule(require("../assets/images/water-fount-icon.png")).uri,
  fire: Asset.fromModule(require("../assets/images/fire-exting-icon.png")).uri,
  defib: Asset.fromModule(require("../assets/images/first-aid-icon.png")).uri,
  bottle: Asset.fromModule(require("../assets/images/bottle-fill-icon.png")).uri,
};

export default function IconLayer({
  activeFloor,
}: {
  activeFloor: 1 | 2;
}) {

  const texturesArray = useTexture(Object.values(textureSources)) as THREE.Texture[];

  const textureLookup: Record<IconType, THREE.Texture> = {
    studyroom: texturesArray[0],
    emergency: texturesArray[1],
    restroom: texturesArray[2],
    vending: texturesArray[3],
    elevator: texturesArray[4],
    fountain: texturesArray[5],
    fire: texturesArray[6],
    defib: texturesArray[7],
    bottle: texturesArray[8],
  };

  const visibleIcons = ICON_DATA[activeFloor];

  return (
    <>
      {visibleIcons.map((icon, i) => (
        <sprite
          key={i}
          position={[icon.x, icon.y + 0.2, icon.z]}
          scale={[0.27, 0.27, 0.27]}
        >
          <spriteMaterial
            map={textureLookup[icon.type]}
            transparent
          />
        </sprite>
      ))}
    </>
  );
}