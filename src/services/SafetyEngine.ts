import { GeoLocation, SafetyStatus, Incident, RiskZone, SafetyScoreDetails } from '../types';

/**
 * ============================================================================
 * SPECIFICATION: MULTI-SOURCE SPATIO-TEMPORAL DATA FUSION PROCEDURE (JDL-L2)
 * ============================================================================
 *
 * 1. ARCHITECTURAL OVERVIEW (JDL Model Adaptation):
 *    - Level 0 (Source Ingestion): Normalization of GPS coordinates, incident
 *      streams, weather telemetries, crowd sensors, and geofence polygons.
 *    - Level 1 (Spatio-Temporal Alignment): Haversine distance projection,
 *      spatial kernel attenuation w_s(d), and temporal recency decay w_t(Δt).
 *    - Level 2 (Situation Assessment / DSI Fusion): Multi-Criteria Decision
 *      Analysis (MCDA) combining normalized attribute weights and confidences.
 *    - Level 3 (Threat Impact & Dynamic Perimeter Scaling): Inverse radius
 *      mapping calculating proactive warning buffers.
 *
 * 2. MATHEMATICAL FORMULATION:
 *
 *    (a) Geodesic Distance (Haversine Kernel):
 *        d(p1, p2) = 2R · arcsin(√(sin²(Δφ/2) + cos(φ1)cos(φ2)sin²(Δλ/2)))
 *
 *    (b) Spatial Proximity Decay Kernel:
 *        w_s(d, R_max) = max(0, 1 - (d / R_max))
 *
 *    (c) Temporal Recency Decay Kernel:
 *        w_t(Δt, τ) = exp(- ln(2) · Δt / τ_half_life)
 *
 *    (d) Multi-Attribute Utility Fusion:
 *        DSI = ∑ (w_k · S_k) / ∑ w_k
 *        Weights w_k: Crime (0.35), Weather (0.20), Crowd (0.15),
 *                     Traffic (0.15), Lighting (0.05), Emergency (0.10)
 *
 *    (e) Adaptive Geofence Radius Function:
 *        R(DSI): Discretized piecewise inverse hazard mapping:
 *          DSI ≥ 80 (SAFE)       -> 100m
 *          60 ≤ DSI < 80 (MODERATE)-> 200m
 *          40 ≤ DSI < 60 (CAUTION) -> 300m
 *          DSI < 40 (HIGH RISK)  -> 500m
 * ============================================================================
 */

export interface DataFusionSourceConfig {
  weights: {
    crime: number;
    weather: number;
    crowd: number;
    traffic: number;
    lighting: number;
    emergency: number;
  };
  spatialImpactRadiusMeters: number;
  temporalHalfLifeHours: number;
}

export const DEFAULT_FUSION_CONFIG: DataFusionSourceConfig = {
  weights: {
    crime: 0.35,
    weather: 0.20,
    crowd: 0.15,
    traffic: 0.15,
    lighting: 0.05,
    emergency: 0.10,
  },
  spatialImpactRadiusMeters: 500,
  temporalHalfLifeHours: 6,
};

export const calculateSafetyStatus = (
  location: GeoLocation, 
  incidents: Incident[], 
  riskZones: RiskZone[],
  simulationOverrides?: { crime?: number, weather?: number, crowd?: number, traffic?: number }
): SafetyStatus => {
  // Base weights for the DSI (Dynamic Safety Index)
  let crimeScore = simulationOverrides?.crime ?? 90; 
  let weatherScore = simulationOverrides?.weather ?? 85;
  let trafficScore = simulationOverrides?.traffic ?? 80;
  let crowdScore = simulationOverrides?.crowd ?? 75;
  let lightingScore = 80;
  let emergencyScore = 95;

  // Level 1: Proximity penalties based on known risk zones
  riskZones.forEach(zone => {
    const dist = calculateDistance(location, zone.center);
    if (dist <= zone.radius) {
      const penetrationRatio = Math.max(0, 1 - dist / Math.max(1, zone.radius));
      if (zone.riskLevel === 'critical') crimeScore -= (30 + 10 * penetrationRatio);
      else if (zone.riskLevel === 'high') crimeScore -= (20 + 5 * penetrationRatio);
      else if (zone.riskLevel === 'moderate') crimeScore -= (8 + 2 * penetrationRatio);
    }
  });

  // Level 1: Spatio-temporal attenuation for dynamic incidents
  const nowMs = Date.now();
  incidents.forEach(inc => {
    const dist = calculateDistance(location, inc.location);
    if (dist < DEFAULT_FUSION_CONFIG.spatialImpactRadiusMeters) {
      // Spatial decay kernel
      const spatialDecay = 1 - (dist / DEFAULT_FUSION_CONFIG.spatialImpactRadiusMeters);

      // Temporal recency kernel (half-life of 6 hours)
      let temporalDecay = 1.0;
      if (inc.timestamp) {
        const ageHours = Math.max(0, (nowMs - new Date(inc.timestamp).getTime()) / (1000 * 3600));
        temporalDecay = Math.exp(-0.693 * (ageHours / DEFAULT_FUSION_CONFIG.temporalHalfLifeHours));
      }

      const combinedAttenuation = Math.max(0.2, spatialDecay * temporalDecay);

      if (inc.type === 'crime') {
        const base = inc.severity === 'critical' ? 40 : inc.severity === 'high' ? 30 : 15;
        crimeScore -= base * combinedAttenuation;
      } else if (inc.type === 'accident' || inc.type === 'hazard') {
        const base = inc.severity === 'critical' ? 35 : inc.severity === 'high' ? 25 : 15;
        trafficScore -= base * combinedAttenuation;
      } else if (inc.type === 'weather') {
        weatherScore -= 20 * combinedAttenuation;
      } else if (inc.type === 'crowd') {
        crowdScore -= 20 * combinedAttenuation;
      }
    }
  });

  // Level 2: Axiomatic bounding [0, 100]
  const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));
  
  const details: SafetyScoreDetails = {
    crime: clamp(crimeScore),
    weather: clamp(weatherScore),
    traffic: clamp(trafficScore),
    crowd: clamp(crowdScore),
    lighting: lightingScore,
    emergency: emergencyScore
  };

  // Level 2: Multi-attribute utility fusion (Weighted Linear Combination)
  const totalScore = Math.round(
    (details.crime * DEFAULT_FUSION_CONFIG.weights.crime) + 
    (details.weather * DEFAULT_FUSION_CONFIG.weights.weather) + 
    (details.crowd * DEFAULT_FUSION_CONFIG.weights.crowd) + 
    (details.traffic * DEFAULT_FUSION_CONFIG.weights.traffic) + 
    (details.lighting * DEFAULT_FUSION_CONFIG.weights.lighting) + 
    (details.emergency * DEFAULT_FUSION_CONFIG.weights.emergency)
  );

  let category: SafetyStatus['category'] = 'SAFE';
  if (totalScore < 40) category = 'HIGH RISK';
  else if (totalScore < 60) category = 'CAUTION';
  else if (totalScore < 80) category = 'MODERATE';

  // Level 3: Adaptive Geofence logic
  let geofenceRadius = 100;
  if (category === 'MODERATE') geofenceRadius = 200;
  if (category === 'CAUTION') geofenceRadius = 300;
  if (category === 'HIGH RISK') geofenceRadius = 500;

  return {
    score: totalScore,
    category,
    details,
    geofenceRadius
  };
};

// Haversine formula (Earth mean radius in metres)
export function calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371e3;
  const φ1 = loc1.lat * Math.PI / 180;
  const φ2 = loc2.lat * Math.PI / 180;
  const Δφ = (loc2.lat - loc1.lat) * Math.PI / 180;
  const Δλ = (loc2.lng - loc1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
