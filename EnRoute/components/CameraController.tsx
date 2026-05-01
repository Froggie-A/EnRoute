import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber/native";
import * as THREE from "three";


import {
  FLOOR_CONFIG,
  type GestureState,
} from "@/components/mapConfig";

// ─── Camera controller ────────────────────────────────────────────────────────

export function CameraController({
                            gestureRef,
                            onRadiusChange,
                            lerpRadiusRef,
                            lerpTargetRef,
                            maxRadius,
                            cameraRef,
                            targetRef,
                            mapSizeRef,
                            lerpThetaRef,
                            lerpPhiRef,
                          }: {
  gestureRef: React.MutableRefObject<GestureState>;
  onRadiusChange: (radius: number) => void;
  lerpRadiusRef: React.MutableRefObject<number | null>;
  lerpTargetRef: React.MutableRefObject<THREE.Vector3 | null>;
  maxRadius: number;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  targetRef: React.MutableRefObject<THREE.Vector3>;
  mapSizeRef: React.MutableRefObject<{ width: number; height: number }>;
  lerpThetaRef: React.MutableRefObject<number | null>;
  lerpPhiRef: React.MutableRefObject<number | null>;
}) {
  const { camera } = useThree();
  const spherical = useRef(
      new THREE.Spherical(FLOOR_CONFIG[1].snapRadius, Math.PI / 4, 0)
  );
  const maxRadiusRef = useRef(maxRadius);

  useEffect(() => {
    maxRadiusRef.current = maxRadius;
  }, [maxRadius]);

  useFrame((_, delta) => {
    // Lerp target position
    if (lerpTargetRef.current !== null) {
      targetRef.current.lerp(lerpTargetRef.current, 1 - Math.pow(0.008, delta));
      if (targetRef.current.distanceTo(lerpTargetRef.current) < 0.015) {
        targetRef.current.copy(lerpTargetRef.current);
        lerpTargetRef.current = null;
      }
    }

    // Lerp radius
    if (lerpRadiusRef.current !== null) {
      spherical.current.radius = THREE.MathUtils.lerp(
          spherical.current.radius,
          lerpRadiusRef.current,
          1 - Math.pow(0.01, delta)
      );
      gestureRef.current.deltaZoom = 0;
      if (Math.abs(spherical.current.radius - lerpRadiusRef.current) < 0.05) {
        lerpRadiusRef.current = null;
      }
    }

    // Lerp theta (nav start heading)
    if (lerpThetaRef.current !== null) {
      spherical.current.theta = THREE.MathUtils.lerp(
          spherical.current.theta,
          lerpThetaRef.current,
          1 - Math.pow(0.001, delta)
      );
      if (Math.abs(spherical.current.theta - lerpThetaRef.current) < 0.005) {
        lerpThetaRef.current = null;
      }
    }

    // Lerp phi (nav tilt angle)
    if (lerpPhiRef.current !== null) {
      spherical.current.phi = THREE.MathUtils.lerp(
          spherical.current.phi,
          lerpPhiRef.current,
          1 - Math.pow(0.001, delta)
      );
      if (Math.abs(spherical.current.phi - lerpPhiRef.current) < 0.005) {
        lerpPhiRef.current = null;
      }
    }

    const g = gestureRef.current;
    const offset = new THREE.Vector3().setFromSpherical(spherical.current);
    const right = new THREE.Vector3()
        .crossVectors(offset, new THREE.Vector3(0, 1, 0))
        .normalize();
    const forward = new THREE.Vector3()
        .crossVectors(right, new THREE.Vector3(0, 1, 0))
        .normalize();

    spherical.current.theta -= g.deltaRotate.x * 0.0035;

    spherical.current.phi = Math.max(
        0.35,
        Math.min(Math.PI / 2.15, spherical.current.phi - g.deltaRotate.y * 0.0032)
    );

// drag map naturally with finger
    targetRef.current.addScaledVector(right, g.deltaPan.x * 0.009);
    targetRef.current.addScaledVector(forward, g.deltaPan.y * 0.009);

    if (g.deltaZoom !== 0 && lerpRadiusRef.current === null) {
      const prev = spherical.current.radius;
      const next = Math.max(
          0.1,
          Math.min(maxRadiusRef.current * 1.2, prev * (1 - g.deltaZoom * 0.0045))
      );
      const dr = next - prev;
      if (g.pinchMidpoint && dr !== 0) {
        const { width, height } = mapSizeRef.current;
        const ndcX = (g.pinchMidpoint.x / width) * 2 - 1;
        const ndcY = -(g.pinchMidpoint.y / height) * 2 + 1;
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        const wp = new THREE.Vector3();
        ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), wp);
        if (wp) targetRef.current.lerp(wp, (-dr / prev) * 0.6);
      }
      spherical.current.radius = next;
    }

    onRadiusChange(spherical.current.radius);
    camera.position.copy(
        new THREE.Vector3().setFromSpherical(spherical.current).add(targetRef.current)
    );
    camera.lookAt(targetRef.current);
    cameraRef.current = camera;

    g.deltaRotate.x *= 0.70;
    g.deltaRotate.y *= 0.70;
    g.deltaZoom *= 0.65;
    g.deltaPan.x *= 0.72;
    g.deltaPan.y *= 0.72;

    if (Math.abs(g.deltaRotate.x) < 0.001) g.deltaRotate.x = 0;
    if (Math.abs(g.deltaRotate.y) < 0.001) g.deltaRotate.y = 0;
    if (Math.abs(g.deltaZoom) < 0.001) { g.deltaZoom = 0; g.pinchMidpoint = null; }
    if (Math.abs(g.deltaPan.x) < 0.001) g.deltaPan.x = 0;
    if (Math.abs(g.deltaPan.y) < 0.001) g.deltaPan.y = 0;
  });

  return null;
}