export type GeoPoint = {
  lat: number;
  lon: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export const BUILDING_CORNERS = {
  topLeft: {
    lat: 30.408188151295921,
    lon: -91.179059467344004,
  },
  topRight: {
    lat: 30.408520192625705,
    lon: -91.180317796014307,
  },
  bottomRight: {
    lat: 30.407315417070286,
    lon: -91.180786075889799,
  },
  bottomLeft: {
    lat: 30.40697735287446,
    lon: -91.179435094144907,
  },
};

export function normalizeLocationToBuilding(
  lat: number,
  lon: number
): ScreenPoint {
  const { topLeft, topRight, bottomRight, bottomLeft } = BUILDING_CORNERS;

  const minLat = Math.min(
    topLeft.lat,
    topRight.lat,
    bottomRight.lat,
    bottomLeft.lat
  );
  const maxLat = Math.max(
    topLeft.lat,
    topRight.lat,
    bottomRight.lat,
    bottomLeft.lat
  );
  const minLon = Math.min(
    topLeft.lon,
    topRight.lon,
    bottomRight.lon,
    bottomLeft.lon
  );
  const maxLon = Math.max(
    topLeft.lon,
    topRight.lon,
    bottomRight.lon,
    bottomLeft.lon
  );

  const approxX = (lon - minLon) / (maxLon - minLon);
  const approxY = (maxLat - lat) / (maxLat - minLat);

  const clampedApproxX = clamp(approxX, 0, 1);
  const clampedApproxY = clamp(approxY, 0, 1);

  const leftEdge = lerpGeo(topLeft, bottomLeft, clampedApproxY);
  const rightEdge = lerpGeo(topRight, bottomRight, clampedApproxY);

  const topEdge = lerpGeo(topLeft, topRight, clampedApproxX);
  const bottomEdge = lerpGeo(bottomLeft, bottomRight, clampedApproxX);

  const x =
    Math.abs(rightEdge.lon - leftEdge.lon) > 1e-12
      ? (lon - leftEdge.lon) / (rightEdge.lon - leftEdge.lon)
      : clampedApproxX;

  const y =
    Math.abs(bottomEdge.lat - topEdge.lat) > 1e-12
      ? (topEdge.lat - lat) / (topEdge.lat - bottomEdge.lat)
      : clampedApproxY;

  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
  };
}

function lerpGeo(a: GeoPoint, b: GeoPoint, t: number): GeoPoint {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}