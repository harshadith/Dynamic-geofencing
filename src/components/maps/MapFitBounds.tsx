import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapFitBoundsProps {
  points: google.maps.LatLngLiteral[];
  padding?: number;
}

export const MapFitBounds = ({ points, padding = 40 }: MapFitBoundsProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    points.forEach(pt => bounds.extend(pt));
    map.fitBounds(bounds, {
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
    });
  }, [map, points, padding]);

  return null;
};
