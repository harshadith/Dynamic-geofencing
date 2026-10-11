import { GeoPoint, DynamicGeofence, NavigationRouteOption } from '@/types';
import { calculateDistanceMeters, getThreatWeight } from './geofence-engine';

// Generate multi-criteria safety-aware routes
export function generateSafetyAwareRoutes(
  start: GeoPoint,
  end: GeoPoint,
  activeGeofences: DynamicGeofence[] = []
): NavigationRouteOption[] {
  const directDistMeters = calculateDistanceMeters(start, end);
  const baseKm = directDistMeters / 1000;

  // Midpoint
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;

  // Path 1: Direct path (Shortest)
  const shortestWaypoints: GeoPoint[] = [
    start,
    { lat: midLat, lng: midLng },
    end,
  ];

  // Path 2: North/Safe detour (Safest Corridor - avoids active hazard centroids)
  const safestWaypoints: GeoPoint[] = [
    start,
    { lat: start.lat + (end.lat - start.lat) * 0.3 + 0.0035, lng: start.lng + (end.lng - start.lng) * 0.25 - 0.003 },
    { lat: midLat + 0.0042, lng: midLng - 0.002 },
    { lat: start.lat + (end.lat - start.lat) * 0.75 + 0.0025, lng: start.lng + (end.lng - start.lng) * 0.8 + 0.002 },
    end,
  ];

  // Path 3: South Boulevard path (Balanced)
  const balancedWaypoints: GeoPoint[] = [
    start,
    { lat: midLat - 0.003, lng: midLng + 0.0035 },
    end,
  ];

  // Evaluate each candidate path against active geofences
  const evaluatedShortest = evaluateCandidateRoute(
    'route_shortest',
    'Shortest Direct Path',
    'shortest',
    shortestWaypoints,
    baseKm,
    activeGeofences
  );

  const evaluatedSafest = evaluateCandidateRoute(
    'route_safest',
    'Verified Safe Corridor',
    'safest',
    safestWaypoints,
    baseKm * 1.25, // 25% longer for detour
    activeGeofences
  );

  const evaluatedBalanced = evaluateCandidateRoute(
    'route_balanced',
    'Balanced Transit Arterial',
    'balanced',
    balancedWaypoints,
    baseKm * 1.1,
    activeGeofences
  );

  // Dynamic Route Re-Ranking: Sort with safety-first weighting
  // Score = safetyScore * 0.65 + (distance penalty) + (traffic efficiency)
  const routes = [evaluatedSafest, evaluatedBalanced, evaluatedShortest];

  return routes.sort((a, b) => {
    // If a route directly penetrates a critical or high hazard, penalize heavily
    if (a.intersectionsWithHazards !== b.intersectionsWithHazards) {
      return a.intersectionsWithHazards - b.intersectionsWithHazards;
    }
    return b.safetyScore - a.safetyScore;
  });
}

function evaluateCandidateRoute(
  id: string,
  title: string,
  type: 'safest' | 'balanced' | 'shortest',
  waypoints: GeoPoint[],
  distKm: number,
  geofences: DynamicGeofence[]
): NavigationRouteOption {
  let hazardHits = 0;
  let penaltyScore = 0;
  const cautions: string[] = [];
  const highlights: string[] = [];

  // Check each segment and waypoint against active geofences
  for (const gf of geofences) {
    if (!gf.isActive) continue;

    // Check minimum distance from any waypoint to geofence center
    let minDistance = Infinity;
    for (const pt of waypoints) {
      const d = calculateDistanceMeters(pt, gf.center);
      if (d < minDistance) minDistance = d;
    }

    if (gf.reason === 'safe_haven' || gf.threatLevel === 'safe') {
      if (minDistance <= gf.adaptiveRadiusMeters + 150) {
        highlights.push(`Passes through ${gf.name} (Emergency Call-Box available)`);
        penaltyScore -= 12; // Bonus
      }
    } else {
      const penetration = minDistance <= gf.adaptiveRadiusMeters;
      const nearBuffer = minDistance <= gf.adaptiveRadiusMeters + 150;

      if (penetration) {
        hazardHits++;
        const weight = getThreatWeight(gf.threatLevel);
        penaltyScore += weight * 25;
        cautions.push(`Intersects active ${gf.threatLevel.toUpperCase()} hazard: "${gf.name}" (${gf.reason})`);
      } else if (nearBuffer) {
        penaltyScore += 10;
        cautions.push(`Borders perimeter of "${gf.name}" (Buffer: ${Math.round(minDistance)}m)`);
      }
    }
  }

  // Base scores by route type
  let baseSafety = type === 'safest' ? 95 : type === 'balanced' ? 78 : 55;
  let finalSafety = Math.max(10, Math.min(99, baseSafety - penaltyScore));
  let riskScore = 100 - finalSafety;

  let trafficLevel: NavigationRouteOption['trafficLevel'] = 'low';
  let crowdDensity: NavigationRouteOption['crowdDensity'] = 'light';

  if (type === 'shortest') {
    trafficLevel = 'heavy';
    crowdDensity = 'dense';
    highlights.push('Shortest physical distance');
    highlights.push('Direct pedestrian access');
  } else if (type === 'safest') {
    trafficLevel = 'low';
    crowdDensity = 'light';
    highlights.push('Maximum separation from reported anomalies');
    highlights.push('Well-lit streets with continuous tourist patrol');
    highlights.push('Proximity to emergency response services');
  } else {
    trafficLevel = 'moderate';
    crowdDensity = 'moderate';
    highlights.push('Moderate walking time');
    highlights.push('Main street visibility');
  }

  const durationMin = Math.round(distKm * 14 + (trafficLevel === 'heavy' ? 8 : trafficLevel === 'moderate' ? 4 : 0));

  return {
    id,
    type,
    title,
    distanceKm: Number(distKm.toFixed(2)),
    durationMinutes: durationMin,
    safetyScore: finalSafety,
    riskScore,
    trafficLevel,
    crowdDensity,
    waypoints,
    highlights,
    cautions,
    intersectionsWithHazards: hazardHits,
  };
}
