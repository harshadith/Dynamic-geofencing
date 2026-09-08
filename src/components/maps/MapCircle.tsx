import React, { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

export interface MapCircleProps {
  center: google.maps.LatLngLiteral;
  radius: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
  onClick?: () => void;
  key?: React.Key;
}

export const MapCircle = ({
  center,
  radius,
  strokeColor = '#3b82f6',
  strokeOpacity = 0.8,
  strokeWeight = 2,
  fillColor = '#3b82f6',
  fillOpacity = 0.2,
  onClick
}: MapCircleProps) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    const circle = new google.maps.Circle({
      map,
      center,
      radius,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      fillColor,
      fillOpacity,
    });

    if (onClick) {
      circle.addListener('click', onClick);
    }

    circleRef.current = circle;

    return () => {
      google.maps.event.clearInstanceListeners(circle);
      circle.setMap(null);
    };
  }, [map, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity, onClick]);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radius);
    }
  }, [center.lat, center.lng, radius]);

  return null;
};
