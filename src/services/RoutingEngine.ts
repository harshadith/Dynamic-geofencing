import { GeoLocation, RouteOption, TouristDestination } from '../types';
import { DEMO_RISK_ZONES, DEMO_INCIDENTS } from '../data/demoData';

export const generateRoutes = (start: GeoLocation, end: TouristDestination): RouteOption[] => {
  // In a real app, this would call a routing API (like Mapbox, OSRM, Google Maps)
  // to get real paths. Here, we generate straight line paths with slight variations 
  // to simulate different route options and calculate their mock safety/risk scores.

  const distanceKm = calculateDistance(start, end.location) / 1000;
  
  // Base path (straight line for demo)
  const generatePath = (variation: number): GeoLocation[] => {
    return [
      start,
      { 
        lat: start.lat + (end.location.lat - start.lat) * 0.5 + variation, 
        lng: start.lng + (end.location.lng - start.lng) * 0.5 - variation 
      },
      end.location
    ];
  };

  const shortestRoute: RouteOption = {
    id: 'route_shortest',
    type: 'shortest',
    distance: Number((distanceKm).toFixed(1)),
    estimatedTime: Math.round(distanceKm * 15), // roughly 15 mins per km walking/city driving
    safetyScore: 54, // Lower safety score for demo to show contrast
    riskScore: 78,
    path: generatePath(0),
    explanation: ['Optimizes for shortest distance and time.'],
    drawbacks: ['Passes through high traffic zone.', 'Higher incident density nearby.']
  };

  const safestRoute: RouteOption = {
    id: 'route_safest',
    type: 'safest',
    distance: Number((distanceKm * 1.3).toFixed(1)), // 30% longer
    estimatedTime: Math.round(distanceKm * 1.3 * 15),
    safetyScore: 88,
    riskScore: 22,
    path: generatePath(0.005),
    explanation: [
      'Avoids known moderate risk zones.',
      'Well-lit major avenues.',
      'Lower crowd density along the path.',
      'Passes near Tourist Police Station.'
    ]
  };

  const balancedRoute: RouteOption = {
    id: 'route_balanced',
    type: 'balanced',
    distance: Number((distanceKm * 1.1).toFixed(1)),
    estimatedTime: Math.round(distanceKm * 1.1 * 15),
    safetyScore: 75,
    riskScore: 45,
    path: generatePath(-0.003),
    explanation: [
      'Reasonable time compromise.',
      'Avoids the primary high-risk traffic zone.',
      'Standard city path.'
    ]
  };

  return [safestRoute, balancedRoute, shortestRoute]; // Safest first as default recommendation
};

function calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371e3;
  const φ1 = loc1.lat * Math.PI/180;
  const φ2 = loc2.lat * Math.PI/180;
  const Δφ = (loc2.lat-loc1.lat) * Math.PI/180;
  const Δλ = (loc2.lng-loc1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
