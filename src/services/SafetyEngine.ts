import { GeoLocation, SafetyStatus, Incident, RiskZone } from '../types';

export const calculateSafetyStatus = (
  location: GeoLocation, 
  incidents: Incident[], 
  riskZones: RiskZone[],
  simulationOverrides?: { crime?: number, weather?: number, crowd?: number, traffic?: number }
): SafetyStatus => {
  // Base weights for the DSI (Dynamic Safety Index)
  // In a real app, these would come from ML models or dynamic API data.
  // Here we simulate based on proximity to incidents and risk zones.

  let crimeScore = simulationOverrides?.crime ?? 90; 
  let weatherScore = simulationOverrides?.weather ?? 85;
  let trafficScore = simulationOverrides?.traffic ?? 80;
  let crowdScore = simulationOverrides?.crowd ?? 75;
  let lightingScore = 80; // Hardcoded static for demo
  let emergencyScore = 95; // Hardcoded static for demo

  // Calculate distance penalties based on risk zones
  riskZones.forEach(zone => {
    const dist = calculateDistance(location, zone.center);
    if (dist <= zone.radius) {
      if (zone.riskLevel === 'critical') crimeScore -= 40;
      if (zone.riskLevel === 'high') crimeScore -= 25;
      if (zone.riskLevel === 'moderate') crimeScore -= 10;
    }
  });

  // Apply incident penalties
  incidents.forEach(inc => {
    const dist = calculateDistance(location, inc.location);
    if (dist < 500) { // 500m impact radius
      if (inc.type === 'crime') crimeScore -= (inc.severity === 'high' ? 30 : 15);
      if (inc.type === 'accident') trafficScore -= (inc.severity === 'high' ? 30 : 15);
      if (inc.type === 'weather') weatherScore -= 20;
    }
  });

  // Ensure scores remain between 0 and 100
  const clamp = (val: number) => Math.max(0, Math.min(100, val));
  
  const details = {
    crime: clamp(crimeScore),
    weather: clamp(weatherScore),
    traffic: clamp(trafficScore),
    crowd: clamp(crowdScore),
    lighting: lightingScore,
    emergency: emergencyScore
  };

  // Weighted average
  const totalScore = Math.round(
    (details.crime * 0.35) + 
    (details.weather * 0.20) + 
    (details.crowd * 0.15) + 
    (details.traffic * 0.15) + 
    (details.lighting * 0.05) + 
    (details.emergency * 0.10)
  );

  let category: SafetyStatus['category'] = 'SAFE';
  if (totalScore < 40) category = 'HIGH RISK';
  else if (totalScore < 60) category = 'CAUTION';
  else if (totalScore < 80) category = 'MODERATE';

  // Adaptive Geofence logic
  // Lower score = tighter safety geofence required.
  let geofenceRadius = 100; // Base safe radius
  if (category === 'MODERATE') geofenceRadius = 200;
  if (category === 'CAUTION') geofenceRadius = 300;
  if (category === 'HIGH RISK') geofenceRadius = 500; // Represents a larger warning zone needed. 
  // Actually, usually a safe geofence shrinks when danger is high. Let's model it as a warning buffer.
  // If we are in a safe area, the geofence is standard. If danger approaches, the geofence expands to warn earlier.

  return {
    score: totalScore,
    category,
    details,
    geofenceRadius
  };
};

// Haversine formula
export function calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371e3; // metres
  const φ1 = loc1.lat * Math.PI/180;
  const φ2 = loc2.lat * Math.PI/180;
  const Δφ = (loc2.lat-loc1.lat) * Math.PI/180;
  const Δλ = (loc2.lng-loc1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}
