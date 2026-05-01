import React from "react";
import * as THREE from "three";

// ─── Zoom helpers ─────────────────────────────────────────────────────────────

export function zoomToWaypoints(
    waypoints: [number, number, number][],
    lerpRadiusRef: React.MutableRefObject<number | null>,
    lerpTargetRef: React.MutableRefObject<THREE.Vector3 | null>,
    sheetFraction: number
) {
  if (waypoints.length === 0) return;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, , z] of waypoints) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ, 0.5);
  const baseRadius = span * 1.6;
  const radius = baseRadius / Math.max(0.1, 1 - sheetFraction);
  lerpTargetRef.current = new THREE.Vector3(cx, 0, cz + radius * sheetFraction * 0.35);
  lerpRadiusRef.current = radius;
}

export function zoomToNavStart(
    waypoints: [number, number, number][],
    lerpRadiusRef: React.MutableRefObject<number | null>,
    lerpTargetRef: React.MutableRefObject<THREE.Vector3 | null>,
    lerpThetaRef: React.MutableRefObject<number | null>,
    lerpPhiRef: React.MutableRefObject<number | null>
) {
  if (waypoints.length < 2) return;
  const [x0, , z0] = waypoints[0];
  const [x1, , z1] = waypoints[1];

  // Bearing of first route segment in THREE space.
  // Camera sits BEHIND the user, looking toward wp[1].
  const dx = x1 - x0;
  const dz = z1 - z0;
  const routeTheta = Math.atan2(dx, dz);
  const camTheta = routeTheta + Math.PI;

  // Shift target forward so user dot sits in the lower visible portion
  const dist = Math.sqrt(dx * dx + dz * dz) || 1;
  const nx = dx / dist;
  const nz = dz / dist;
  lerpTargetRef.current = new THREE.Vector3(x0 + nx * 1.8, 0, z0 + nz * 1.8);
  lerpRadiusRef.current = 4.5;
  lerpThetaRef.current = camTheta;
  lerpPhiRef.current = Math.PI / 2.6;
}