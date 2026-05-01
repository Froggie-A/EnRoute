// Calibrated affine transform: GPS → node space.
// Calibrated from 3 confirmed ground-truth GPS readings:
//   entrance0 (48,-32), entrance2 (-59,-32), room_1272 (-15,5)
// Uses centered+scaled coords for numerical stability (condition number ~45).
const _GPS_LAT_MEAN = 30.4076288440;
const _GPS_LON_MEAN = -91.1800997696;
const _GPS_LAT_SCALE = 111000.0;
const _GPS_LON_SCALE = 96000.0;

export function gpsToNodeCoords(lat: number, lon: number): { x: number; y: number } {
  const dlat = (lat - _GPS_LAT_MEAN) * _GPS_LAT_SCALE;
  const dlon = (lon - _GPS_LON_MEAN) * _GPS_LON_SCALE;
  return {
    x: 0.81915305 * dlat + 0.66436662 * dlon + (-8.66666667),
    y: -0.30001749 * dlat + 0.72257358 * dlon + (-19.66666667),
  };
}