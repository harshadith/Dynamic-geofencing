export type Role = 'tourist' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  photoUrl?: string;
  emergencyContact?: EmergencyContact;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Incident {
  id: string;
  type: 'crime' | 'accident' | 'hazard' | 'weather' | 'crowd';
  location: GeoLocation;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  description: string;
}

export interface RiskZone {
  id: string;
  center: GeoLocation;
  radius: number; // in meters
  riskLevel: 'moderate' | 'high' | 'critical';
  description: string;
}

export interface TouristDestination {
  id: string;
  name: string;
  description: string;
  category: string;
  location: GeoLocation;
  safetyScore: number;
  currentCrowd: 'low' | 'moderate' | 'high';
}

export interface SafetyScoreDetails {
  crime: number;
  weather: number;
  traffic: number;
  crowd: number;
  lighting: number;
  emergency: number;
}

export interface SafetyStatus {
  score: number;
  category: 'SAFE' | 'MODERATE' | 'CAUTION' | 'HIGH RISK';
  details: SafetyScoreDetails;
  geofenceRadius: number;
}

export interface RouteOption {
  id: string;
  type: 'shortest' | 'safest' | 'balanced';
  distance: number; // in km
  estimatedTime: number; // in minutes
  safetyScore: number;
  riskScore: number;
  path: GeoLocation[];
  explanation: string[];
  drawbacks?: string[];
}

export type SafeRoute = RouteOption;

export interface EmergencyService {
  id: string;
  type: 'hospital' | 'police' | 'fire' | 'shelter';
  name: string;
  location: GeoLocation;
  distance?: number;
  phone: string;
}

export type GeofenceType = 'safe_haven' | 'restricted' | 'hazard' | 'tourist_perimeter';
export type GeofenceRiskLevel = 'safe' | 'moderate' | 'high' | 'critical';

export interface GeofenceArea {
  id: string;
  name: string;
  description: string;
  center: GeoLocation;
  radius: number; // in meters
  riskLevel: GeofenceRiskLevel;
  type: GeofenceType;
  isActive: boolean;
  createdAt: string;
  createdBy?: 'admin' | 'ai_assistant' | 'system';
}

export interface Traveller {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  location: GeoLocation;
  lastUpdated: string;
  batteryLevel: number; // 0-100
  safetyScore: number; // 0-100
  status: 'safe' | 'warning' | 'critical' | 'sos';
  photoUrl?: string;
  currentZoneId?: string;
  geofenceStatus: 'inside_safe' | 'inside_hazard' | 'outside_geofence';
  recentPath?: GeoLocation[];
}

export type AdminActionType =
  | 'ADD_GEOFENCE'
  | 'REMOVE_GEOFENCE'
  | 'UPDATE_GEOFENCE'
  | 'LOCATE_TRAVELLER'
  | 'BROADCAST_ALERT';

export interface AdminChatAction {
  type: AdminActionType;
  payload: any;
  summary?: string;
}
