
// Old bounding box kept for gpsToModelCoords (initial camera center only)
export const BUILDING_MIN_LAT = 30.406977;
export const BUILDING_MAX_LAT = 30.40852;
export const BUILDING_MIN_LON = -91.180786;
export const BUILDING_MAX_LON = -91.179059;

export const MODEL_MIN_X = -12;
export const MODEL_MAX_X = 12;
export const MODEL_MIN_Z = -18;
export const MODEL_MAX_Z = 18;

// GLB 3D Model Imports
export const FLOOR_MODELS = {
  1: require("../assets/models/1stFloorModel.glb"),
  2: require("../assets/models/2ndFloorModel.glb"),
  3: require("../assets/models/3rdFloorModel.glb"),
} as const;


export type FloorNumber = keyof typeof FLOOR_MODELS;

// Items for the Half-Sheet.
// This includes that room detail page, directions page, profile page, and the default search page.
export type SheetView = "default" | "detail" | "directions" | "profile";


// Handles the gesture movements
export type GestureState = {
  deltaRotate: { x: number; y: number };
  deltaZoom: number;
  deltaPan: { x: number; y: number };
  pinchMidpoint: { x: number; y: number } | null;
};


// Thresholds for the different floors for zooming in and zooming out.
export const FLOOR_CONFIG: Record<
    FloorNumber,
    { switchRadius: number; snapRadius: number; zoomInRadius: number }
> = {
  1: { switchRadius: 50, snapRadius: 10, zoomInRadius: 5 },
  2: { switchRadius: 120, snapRadius: 10, zoomInRadius: 5 },
  3: { switchRadius: 200, snapRadius: 10, zoomInRadius: 5 },
};