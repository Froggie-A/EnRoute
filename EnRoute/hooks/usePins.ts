import { useState } from "react";

export type Pin = {
  x: number;
  y: number;
  z: number;
};

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);

  return { pins, setPins };
}