import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapRecenterProps {
  center: google.maps.LatLngLiteral;
  zoom?: number;
  key?: React.Key;
}

export const MapRecenter = ({ center, zoom }: MapRecenterProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    if (zoom !== undefined) {
      map.setZoom(zoom);
    }
  }, [map, center.lat, center.lng, zoom]);

  return null;
};
