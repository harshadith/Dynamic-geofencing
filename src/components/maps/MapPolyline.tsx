import React, { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

export interface MapPolylineProps {
  path: google.maps.LatLngLiteral[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  strokeDash?: boolean;
  key?: React.Key;
}

export const MapPolyline = ({
  path,
  strokeColor = '#3b82f6',
  strokeOpacity = 1.0,
  strokeWeight = 4,
  strokeDash = false,
}: MapPolylineProps) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || path.length < 2) return;

    const lineSymbol = strokeDash
      ? {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 3,
        }
      : undefined;

    const polyline = new google.maps.Polyline({
      map,
      path,
      strokeColor,
      strokeOpacity: strokeDash ? 0 : strokeOpacity,
      strokeWeight,
      icons: strokeDash && lineSymbol
        ? [
            {
              icon: lineSymbol,
              offset: '0',
              repeat: '14px',
            },
          ]
        : undefined,
    });

    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
    };
  }, [map, strokeColor, strokeOpacity, strokeWeight, strokeDash, JSON.stringify(path)]);

  return null;
};
