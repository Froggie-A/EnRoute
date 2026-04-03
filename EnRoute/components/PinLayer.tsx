import React, { useMemo, useCallback } from "react";
import { useThree } from "@react-three/fiber/native";
import * as THREE from "three";

import { usePins, Pin } from "@/hooks/usePins";

type Props = {
  pinMode: boolean;
  setPinMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function PinLayer({ pinMode, setPinMode }: Props) {
  const { pins, setPins } = usePins();
  const { camera, scene, gl } = useThree();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  const handlePointerDown = useCallback(
    (event: any) => {
      if (!pinMode) return;

      console.log("TOUCH DETECTED"); // 🔥 debug

      // Get screen coordinates
      const { clientX, clientY } = event.nativeEvent;
      const rect = gl.domElement.getBoundingClientRect();

      // Convert to normalized device coordinates
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      // Raycast against entire scene
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const point = intersects[0].point;

        // Snap to grid
        const snapSize = 0.5;

        const snappedPoint: Pin = {
          x: Math.round(point.x / snapSize) * snapSize,
          y: Math.round(point.y / snapSize) * snapSize,
          z: Math.round(point.z / snapSize) * snapSize,
        };

        setPins((prev) => [...prev, snappedPoint]);

        // Exit pin mode
        setPinMode(false);
      }
    },
    [pinMode, camera, scene, gl, raycaster, pointer, setPins, setPinMode]
  );

  return (
    <>
      {/* Invisible interaction layer */}
      <mesh
        onPointerDown={handlePointerDown}
        position={[0, 0, 0]}
      >
        <boxGeometry args={[1000, 1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Render pins */}
      {pins.map((pin, index) => (
        <mesh key={index} position={[pin.x, pin.y, pin.z]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="red" />
        </mesh>
      ))}
    </>
  );
}