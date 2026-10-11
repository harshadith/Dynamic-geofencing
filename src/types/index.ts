export type UserRole = 'tour_guide' | 'tourist';

export type ThreatLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export type GeofenceReason =
  | 'safe_haven'
  | 'traffic_congestion'
  | 'security_threat'
  | 'street_crime'
  | 'natural_disaster'
  | 'crowd_surge'
  | 'custom_perimeter';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  nationality?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
}

export interface Tour {
  id: string;
  code: string; // e.g. "SAFE-492"
  title: string;
  description: string;
  guideId: string;
  guideName: string;
  city: string;
  status: 'active' | 'completed' | 'scheduled';
  meetingPoint: GeoPoint;
  meetingAddress: string;
  createdAt: string;
}

export interface TourMember {
  tourId: string;
  touristId: string;
  touristName: string;
  touristEmail: string;
  joinedAt: string;
  status: 'active' | 'departed';
}

export interface DynamicGeofence {
  id: string;
  tourId: string;
  name: string;
  reason: GeofenceReason;
  threatLevel: ThreatLevel;
  center: GeoPoint;
  baseRadiusMeters: number;
  adaptiveRadiusMeters: number; // Expands/contracts based on risk estimate
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  description: string;
  anomalyDetails?: {
    reportedCases?: number;
    delayMinutes?: number;
    spreadRateMetersPerMin?: number;
    evacuationRecommended?: boolean;
  };
}

export interface TouristTelemetry {
  touristId: string;
  tourId: string;
  name: string;
  avatarUrl?: string;
  location: GeoPoint;
  heading?: number;
  speed?: number; // km/h
  batteryLevel: number; // 0-100
  isSos: boolean;
  lastPing: string;
  geofenceStatus: 'safe' | 'in_safe_haven' | 'in_warning_zone' | 'in_hazard_zone';
  activeAlertZoneName?: string;
  activeThreatLevel?: ThreatLevel;
}

export interface NavigationRouteOption {
  id: string;
  type: 'safest' | 'balanced' | 'shortest';
  title: string;
  distanceKm: number;
  durationMinutes: number;
  safetyScore: number; // 0 - 100
  riskScore: number; // 0 - 100
  trafficLevel: 'low' | 'moderate' | 'heavy' | 'congested';
  crowdDensity: 'light' | 'moderate' | 'dense' | 'hazardous';
  waypoints: GeoPoint[];
  highlights: string[];
  cautions: string[];
  intersectionsWithHazards: number;
}

export interface EmergencyService {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'embassy' | 'fire_station';
  location: GeoPoint;
  address: string;
  phone: string;
  distanceMeters?: number;
}

export interface TourAlert {
  id: string;
  tourId: string;
  title: string;
  message: string;
  severity: ThreatLevel;
  createdAt: string;
  geofenceId?: string;
}
