import { GeoLocation, Incident, RiskZone, TouristDestination, EmergencyService, GeofenceArea, Traveller } from '../types';

// Default center: Somewhere in a generic city (e.g., Paris coordinates for a recognizable tourist city context, but abstract)
export const DEFAULT_CENTER: GeoLocation = { lat: 48.8566, lng: 2.3522 };

export const DEMO_DESTINATIONS: TouristDestination[] = [
  {
    id: 'd1',
    name: 'Grand Museum',
    description: 'Historical museum with priceless artifacts.',
    category: 'Historical',
    location: { lat: 48.8606, lng: 2.3376 },
    safetyScore: 92,
    currentCrowd: 'moderate'
  },
  {
    id: 'd2',
    name: 'Riverside Walk',
    description: 'Scenic walk along the main river.',
    category: 'Nature',
    location: { lat: 48.8530, lng: 2.3499 },
    safetyScore: 75,
    currentCrowd: 'high'
  },
  {
    id: 'd3',
    name: 'Old Town Square',
    description: 'Bustling square with street performers and cafes.',
    category: 'Entertainment',
    location: { lat: 48.8584, lng: 2.3518 },
    safetyScore: 65,
    currentCrowd: 'high'
  },
  {
    id: 'd4',
    name: 'Cathedral of Light',
    description: 'Iconic religious site.',
    category: 'Religious',
    location: { lat: 48.8530, lng: 2.3499 },
    safetyScore: 85,
    currentCrowd: 'low'
  }
];

export const DEMO_INCIDENTS: Incident[] = [
  {
    id: 'i1',
    type: 'crime',
    location: { lat: 48.8590, lng: 2.3450 },
    severity: 'medium',
    timestamp: new Date().toISOString(),
    description: 'Pickpocketing reported in crowded area.'
  },
  {
    id: 'i2',
    type: 'accident',
    location: { lat: 48.8520, lng: 2.3550 },
    severity: 'high',
    timestamp: new Date().toISOString(),
    description: 'Traffic accident blocking major intersection.'
  }
];

export const DEMO_GEOFENCE_AREAS: GeofenceArea[] = [
  {
    id: 'gf-safe-1',
    name: 'Grand Museum Safe Haven',
    description: 'Designated tourist safety zone with 24/7 security escorts and medical assistance.',
    center: { lat: 48.8606, lng: 2.3376 },
    radius: 400,
    riskLevel: 'safe',
    type: 'safe_haven',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdBy: 'admin'
  },
  {
    id: 'gf-safe-2',
    name: 'Riverside Tourism Corridor',
    description: 'Well-lit pedestrian corridor monitored by tourist patrol.',
    center: { lat: 48.8530, lng: 2.3499 },
    radius: 450,
    riskLevel: 'safe',
    type: 'tourist_perimeter',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: 'admin'
  },
  {
    id: 'r1',
    name: 'Old Town Crime Watch',
    description: 'Area with recent uptick in petty pickpocketing and crowded evening bottlenecks.',
    center: { lat: 48.8580, lng: 2.3450 },
    radius: 300,
    riskLevel: 'moderate',
    type: 'restricted',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdBy: 'system'
  },
  {
    id: 'r2',
    name: 'South Avenue Accident Hazard',
    description: 'Traffic collision hazard zone with emergency services on scene.',
    center: { lat: 48.8520, lng: 2.3550 },
    radius: 250,
    riskLevel: 'high',
    type: 'hazard',
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    createdBy: 'system'
  }
];

// Backwards-compatible risk zones reference
export const DEMO_RISK_ZONES: RiskZone[] = DEMO_GEOFENCE_AREAS.map(gf => ({
  id: gf.id,
  center: gf.center,
  radius: gf.radius,
  riskLevel: gf.riskLevel === 'safe' ? 'moderate' : gf.riskLevel,
  description: gf.description,
}));

// No fake users - active travellers are authenticated people connected to the live database
export const DEMO_TRAVELLERS: Traveller[] = [];

export const DEMO_EMERGENCY_SERVICES: EmergencyService[] = [
  {
    id: 'e1',
    type: 'hospital',
    name: 'Central City Hospital',
    location: { lat: 48.8550, lng: 2.3400 },
    phone: '911'
  },
  {
    id: 'e2',
    type: 'police',
    name: 'Tourist Police Station',
    location: { lat: 48.8610, lng: 2.3500 },
    phone: '911'
  }
];

