import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber/native";
import * as THREE from "three";


export function SceneCapture({
                        sceneRef,
                      }: {
  sceneRef: React.MutableRefObject<THREE.Object3D[] | null>;
}) {
  const { scene } = useThree();
  useEffect(() => {
    sceneRef.current = scene.children;
  }, [scene, sceneRef]);
  return null;
}