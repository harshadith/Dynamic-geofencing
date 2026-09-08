// OpenFreeMap vector styles - 100% free open-source vector tile hosting
export const OPENFREEMAP_STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  fiord: 'https://tiles.openfreemap.org/styles/fiord',
  '3d': 'https://tiles.openfreemap.org/styles/liberty', // OpenFreeMap implements 3D building perspectives on top of liberty style
} as const;

export type OpenFreeMapStyleId = keyof typeof OPENFREEMAP_STYLES;

/**
 * Creates a GeoJSON Polygon representing a circle at the specified coordinates and radius in meters.
 */
export function createGeoJsonCircle(
  center: { lat: number; lng: number },
  radiusInMeters: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const km = radiusInMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center.lng + x, center.lat + y]);
  }
  // Close the polygon
  coords.push(coords[0]);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}
