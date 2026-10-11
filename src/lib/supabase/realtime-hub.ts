import { supabase, isSupabaseConfigured } from './client';
import { TouristTelemetry, DynamicGeofence, TourAlert, TourMember } from '@/types';

type RealtimePayload =
  | { type: 'LOCATION_UPDATE'; payload: TouristTelemetry }
  | { type: 'GEOFENCE_UPDATE'; payload: DynamicGeofence[] }
  | { type: 'ALERT_BROADCAST'; payload: TourAlert }
  | { type: 'MEMBER_JOINED'; payload: TourMember };

type ListenerCallback = (data: RealtimePayload) => void;

class RealtimeHub {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<ListenerCallback>> = new Map();
  private supabaseChannels: Map<string, any> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('geosafe_tour_realtime');
      this.broadcastChannel.onmessage = (event) => {
        const { tourId, data } = event.data;
        if (tourId && data) {
          this.notifyLocalListeners(tourId, data);
        }
      };
    }
  }

  // Subscribe to tour events
  public subscribeToTour(tourId: string, callback: ListenerCallback): () => void {
    if (!this.listeners.has(tourId)) {
      this.listeners.set(tourId, new Set());
    }
    this.listeners.get(tourId)!.add(callback);

    // If Supabase is configured, connect to Supabase Realtime channel
    if (isSupabaseConfigured && supabase && !this.supabaseChannels.has(tourId)) {
      const channel = supabase.channel(`tour:${tourId}`);

      channel
        .on('broadcast', { event: 'location_update' }, ({ payload }) => {
          this.notifyLocalListeners(tourId, { type: 'LOCATION_UPDATE', payload });
        })
        .on('broadcast', { event: 'geofence_update' }, ({ payload }) => {
          this.notifyLocalListeners(tourId, { type: 'GEOFENCE_UPDATE', payload });
        })
        .on('broadcast', { event: 'alert_broadcast' }, ({ payload }) => {
          this.notifyLocalListeners(tourId, { type: 'ALERT_BROADCAST', payload });
        })
        .on('broadcast', { event: 'member_joined' }, ({ payload }) => {
          this.notifyLocalListeners(tourId, { type: 'MEMBER_JOINED', payload });
        })
        .subscribe((status) => {
          console.log(`Supabase Realtime status for tour ${tourId}:`, status);
        });

      this.supabaseChannels.set(tourId, channel);
    }

    return () => {
      const subs = this.listeners.get(tourId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.listeners.delete(tourId);
          if (this.supabaseChannels.has(tourId)) {
            supabase?.removeChannel(this.supabaseChannels.get(tourId));
            this.supabaseChannels.delete(tourId);
          }
        }
      }
    };
  }

  // Broadcast Tourist GPS Location
  public broadcastLocation(tourId: string, telemetry: TouristTelemetry) {
    const data: RealtimePayload = { type: 'LOCATION_UPDATE', payload: telemetry };
    this.dispatch(tourId, 'location_update', data);
  }

  // Broadcast Geofence Changes
  public broadcastGeofences(tourId: string, geofences: DynamicGeofence[]) {
    const data: RealtimePayload = { type: 'GEOFENCE_UPDATE', payload: geofences };
    this.dispatch(tourId, 'geofence_update', data);
  }

  // Broadcast Safety Alert
  public broadcastAlert(tourId: string, alert: TourAlert) {
    const data: RealtimePayload = { type: 'ALERT_BROADCAST', payload: alert };
    this.dispatch(tourId, 'alert_broadcast', data);
  }

  // Broadcast Member Join
  public broadcastMemberJoin(tourId: string, member: TourMember) {
    const data: RealtimePayload = { type: 'MEMBER_JOINED', payload: member };
    this.dispatch(tourId, 'member_joined', data);
  }

  private dispatch(tourId: string, eventName: string, data: RealtimePayload) {
    // 1. Notify listeners in current tab
    this.notifyLocalListeners(tourId, data);

    // 2. Broadcast to other tabs / windows via BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ tourId, data });
    }

    // 3. Broadcast to Supabase Realtime WebSocket if connected
    if (isSupabaseConfigured && supabase) {
      const channel = this.supabaseChannels.get(tourId) || supabase.channel(`tour:${tourId}`);
      channel.send({
        type: 'broadcast',
        event: eventName,
        payload: data.payload,
      });
    }
  }

  private notifyLocalListeners(tourId: string, data: RealtimePayload) {
    const subs = this.listeners.get(tourId);
    if (subs) {
      subs.forEach((cb) => cb(data));
    }
  }
}

export const realtimeHub = new RealtimeHub();
