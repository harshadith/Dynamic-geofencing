import { GeoPoint, DynamicGeofence, ThreatLevel, GeofenceReason, TouristTelemetry, EmergencyService } from '@/types';

// Default Paris tourist center coordinates (Louvre / Île de la Cité hub)
export const DEFAULT_MAP_CENTER: GeoPoint = { lat: 48.8566, lng: 2.3522 };

// Haversine formula to calculate distance in meters between two coordinates
export function calculateDistanceMeters(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Adaptive Geofencing Algorithm:
// Rather than fixed boundary, the adaptive geofence varies dynamically based on risk estimate:
// Low risk: localized warning area (1.0x)
// Medium risk: expanding buffer (1.35x)
// High risk: aggressive warning area (1.75x)
// Critical / Disasters: severe buffer expansion (2.5x)
export function computeAdaptiveRadius(
  baseRadius: number,
  threatLevel: ThreatLevel,
  reason: GeofenceReason
): number {
  let threatMultiplier = 1.0;
  switch (threatLevel) {
    case 'safe':
      threatMultiplier = 1.0;
      break;
    case 'low':
      threatMultiplier = 1.0;
      break;
    case 'medium':
      threatMultiplier = 1.35;
      break;
    case 'high':
      threatMultiplier = 1.75;
      break;
    case 'critical':
      threatMultiplier = 2.5;
      break;
  }

  let reasonMultiplier = 1.0;
  switch (reason) {
    case 'traffic_congestion':
      reasonMultiplier = 1.1;
      break;
    case 'crowd_surge':
      reasonMultiplier = 1.25;
      break;
    case 'street_crime':
      reasonMultiplier = 1.3;
      break;
    case 'security_threat':
      reasonMultiplier = 1.5;
      break;
    case 'natural_disaster':
      reasonMultiplier = 1.8;
      break;
    default:
      reasonMultiplier = 1.0;
      break;
  }

  return Math.round(baseRadius * threatMultiplier * reasonMultiplier);
}

// Check tourist status against all active geofences in the tour
export function evaluateTouristGeofenceCollisions(
  touristLocation: GeoPoint,
  geofences: DynamicGeofence[]
): {
  status: TouristTelemetry['geofenceStatus'];
  activeZone?: DynamicGeofence;
  warningDistance?: number;
} {
  let activeHazardZone: DynamicGeofence | null = null;
  let activeSafeHavenZone: DynamicGeofence | null = null;
  let nearHazardZone: DynamicGeofence | null = null;
  let shortestDistanceToHazard = Infinity;

  for (const gf of geofences) {
    if (!gf.isActive) continue;

    const dist = calculateDistanceMeters(touristLocation, gf.center);
    const radius = gf.adaptiveRadiusMeters;

    if (gf.reason === 'safe_haven' || gf.threatLevel === 'safe') {
      if (dist <= radius) {
        activeSafeHavenZone = gf;
      }
    } else {
      // It is a threat / hazard / restriction zone
      if (dist <= radius) {
        if (!activeHazardZone || getThreatWeight(gf.threatLevel) > getThreatWeight(activeHazardZone.threatLevel)) {
          activeHazardZone = gf;
        }
      } else if (dist <= radius + 100) {
        // Warning proximity (within 100m of edge)
        nearHazardZone = gf;
        shortestDistanceToHazard = Math.min(shortestDistanceToHazard, dist - radius);
      }
    }
  }

  if (activeHazardZone) {
    return {
      status: 'in_hazard_zone',
      activeZone: activeHazardZone,
    };
  }

  if (nearHazardZone) {
    return {
      status: 'in_warning_zone',
      activeZone: nearHazardZone,
      warningDistance: Math.round(shortestDistanceToHazard),
    };
  }

  if (activeSafeHavenZone) {
    return {
      status: 'in_safe_haven',
      activeZone: activeSafeHavenZone,
    };
  }

  return {
    status: 'safe',
  };
}

export function getThreatWeight(threat: ThreatLevel): number {
  switch (threat) {
    case 'safe':
      return 0;
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    case 'critical':
      return 4;
  }
}

// Emergency Services in the region
export const PREDEFINED_EMERGENCY_SERVICES: EmergencyService[] = [
  {
    id: 'hosp-1',
    name: 'Hôtel-Dieu Central Emergency Hospital',
    type: 'hospital',
    location: { lat: 48.8546, lng: 2.3482 },
    address: '1 Parvis Notre-Dame, 75004 Paris',
    phone: '+33 1 42 34 82 34',
  },
  {
    id: 'police-1',
    name: 'Central Tourist Police & Security Directorate',
    type: 'police',
    location: { lat: 48.8552, lng: 2.3465 },
    address: '9 Boulevard du Palais, 75004 Paris',
    phone: '112 / +33 1 53 71 53 71',
  },
  {
    id: 'hosp-2',
    name: 'Pitié-Salpêtrière Trauma Center',
    type: 'hospital',
    location: { lat: 48.8398, lng: 2.3654 },
    address: '47-83 Boulevard de l\'Hôpital, 75013 Paris',
    phone: '+33 1 42 16 00 00',
  },
  {
    id: 'embassy-1',
    name: 'International Diplomatic & Consular Assistance',
    type: 'embassy',
    location: { lat: 48.8687, lng: 2.3195 },
    address: '2 Avenue Gabriel, 75008 Paris',
    phone: '+33 1 43 12 22 22',
  },
];
