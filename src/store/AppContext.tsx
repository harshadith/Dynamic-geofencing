import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { User, GeoLocation, SafetyStatus, GeofenceArea, Traveller, RiskZone } from '../types';
import { DEFAULT_CENTER, DEMO_GEOFENCE_AREAS } from '../data/demoData';
import { calculateDistance, calculateSafetyStatus } from '../services/SafetyEngine';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  syncUserProfile,
  updateLiveTravellerPresence,
  subscribeToRealTravellers,
  subscribeToFirestoreGeofences,
  syncGeofenceToFirestore,
  removeGeofenceFromFirestore,
  subscribeToAllUsers,
  updateUserRoleInFirestore,
} from '../services/authService';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  toggleUserRole: () => void;
  allUsers: User[];
  updateUserRole: (userId: string, newRole: 'tourist' | 'admin') => Promise<void>;
  currentLocation: GeoLocation;
  setCurrentLocation: (loc: GeoLocation) => void;
  isDemoLocation: boolean;
  setIsDemoLocation: (isDemo: boolean) => void;
  safetyStatus: SafetyStatus | null;
  setSafetyStatus: (status: SafetyStatus | null) => void;
  emergencyActive: boolean;
  setEmergencyActive: (active: boolean) => void;
  // Geofence Management
  geofences: GeofenceArea[];
  addGeofence: (newGf: Omit<GeofenceArea, 'id' | 'createdAt'> & { id?: string }) => GeofenceArea;
  removeGeofence: (id: string) => boolean;
  updateGeofence: (id: string, updates: Partial<GeofenceArea>) => void;
  activeRiskZones: RiskZone[];
  // Real Travellers Monitoring
  travellers: Traveller[];
  updateTravellerLocation: (id: string, loc: GeoLocation) => void;
  selectedTravellerId: string | null;
  setSelectedTravellerId: (id: string | null) => void;
  // Auth UI
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  batteryLevel: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial authenticated account for the primary user
const INITIAL_ACCOUNT: User = {
  id: 'usr_harshadithn',
  name: 'Harshadith N',
  email: 'harshadithn383@gmail.com',
  phone: '+1 234 567 8900',
  role: 'admin',
  emergencyContact: {
    name: 'Emergency Response Center',
    phone: '911',
    relation: 'Authority',
  },
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(INITIAL_ACCOUNT);
  const [currentLocation, setCurrentLocation] = useState<GeoLocation>(DEFAULT_CENTER);
  const [isDemoLocation, setIsDemoLocation] = useState<boolean>(false);
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus | null>(null);
  const [emergencyActive, setEmergencyActive] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number>(95);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Geofence areas state
  const [geofences, setGeofences] = useState<GeofenceArea[]>(() => {
    const saved = localStorage.getItem('geosafe_geofences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEMO_GEOFENCE_AREAS;
  });

  // Real logged-in travellers (starts empty or with current logged-in user - NO FAKE USERS)
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [selectedTravellerId, setSelectedTravellerId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // 1. Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const appUser = await syncUserProfile(fbUser);
          setUser(appUser);
          await updateLiveTravellerPresence(appUser, currentLocation, batteryLevel, 94, 'safe');
        } catch (err) {
          console.warn('Error syncing user profile on auth change:', err);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 1b. Automatically register and heartbeat the active user profile & live telemetry in Firestore
  useEffect(() => {
    if (!user) return;

    const syncCurrentPresence = async () => {
      try {
        await setDoc(doc(db, 'users', user.id), {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '+91 98450 12345',
          role: user.role,
          photoUrl: user.photoUrl || '',
          lastLoginAt: new Date().toISOString(),
          isOnline: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        await updateLiveTravellerPresence(
          user,
          currentLocation,
          batteryLevel,
          safetyStatus?.score || 94,
          'safe'
        );
      } catch (err) {
        console.warn('Sync presence error:', err);
      }
    };

    syncCurrentPresence();
    const interval = setInterval(syncCurrentPresence, 20000);
    return () => clearInterval(interval);
  }, [user, currentLocation, batteryLevel, safetyStatus]);

  // 1c. Real-time Firestore sync for all logged-in and registered users
  useEffect(() => {
    const unsubscribeUsers = subscribeToAllUsers((usersList) => {
      if (usersList.length > 0) {
        setAllUsers(usersList);
      } else if (user) {
        setAllUsers([user]);
      }
    });
    return () => unsubscribeUsers();
  }, [user]);

  // 2. Real-time Firestore sync for logged-in travellers
  useEffect(() => {
    const unsubscribeTravellers = subscribeToRealTravellers((liveTravellers) => {
      // Re-evaluate geofence status dynamically
      const evaluated = liveTravellers.map((trv) => {
        let insideSafe = false;
        let insideHazard = false;
        let matchingZoneId: string | undefined = undefined;

        for (const gf of geofences) {
          if (!gf.isActive) continue;
          const dist = calculateDistance(trv.location, gf.center);
          if (dist <= gf.radius) {
            matchingZoneId = gf.id;
            if (gf.riskLevel === 'safe' || gf.type === 'safe_haven' || gf.type === 'tourist_perimeter') {
              insideSafe = true;
            } else {
              insideHazard = true;
            }
          }
        }

        const geofenceStatus: Traveller['geofenceStatus'] = insideHazard
          ? 'inside_hazard'
          : insideSafe
          ? 'inside_safe'
          : 'outside_geofence';

        return {
          ...trv,
          currentZoneId: matchingZoneId,
          geofenceStatus,
        };
      });

      // If user is logged in and not yet in the remote list, ensure current user is present
      if (user && !evaluated.some((t) => t.id === user.id)) {
        const currentUserAsTraveller: Traveller = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          nationality: 'Verified User',
          location: currentLocation,
          lastUpdated: 'Just now',
          batteryLevel,
          safetyScore: safetyStatus?.score || 92,
          status: 'safe',
          photoUrl: user.photoUrl,
          geofenceStatus: 'inside_safe',
        };
        setTravellers([currentUserAsTraveller, ...evaluated]);
      } else {
        setTravellers(evaluated);
      }
    });

    return () => unsubscribeTravellers();
  }, [user, geofences, currentLocation, batteryLevel, safetyStatus]);

  // 3. Real-time Firestore sync for Geofences
  useEffect(() => {
    const unsubscribeGf = subscribeToFirestoreGeofences((remoteGfs) => {
      if (remoteGfs.length > 0) {
        setGeofences(remoteGfs);
      }
    });
    return () => unsubscribeGf();
  }, []);

  // 4. Track real device battery
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        const update = () => setBatteryLevel(Math.round(battery.level * 100));
        update();
        battery.addEventListener('levelchange', update);
      });
    }
  }, []);

  // 5. Track real device GPS location
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentLocation(newLoc);
          setIsDemoLocation(false);

          // Calculate safety score at real location
          const score = calculateSafetyStatus(newLoc, [], []);
          setSafetyStatus(score);

          // Publish real-time presence to Firestore
          if (user) {
            updateLiveTravellerPresence(user, newLoc, batteryLevel, score.score, 'safe');
          }
        },
        (err) => {
          console.warn('GPS location permission or retrieval:', err.message);
          // Fallback location
          if (user) {
            updateLiveTravellerPresence(user, currentLocation, batteryLevel, 90, 'safe');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [user, batteryLevel]);

  // Save to localStorage when geofences change
  useEffect(() => {
    localStorage.setItem('geosafe_geofences', JSON.stringify(geofences));
  }, [geofences]);

  // Geofence management functions
  const addGeofence = (newGf: Omit<GeofenceArea, 'id' | 'createdAt'> & { id?: string }): GeofenceArea => {
    const created: GeofenceArea = {
      ...newGf,
      id: newGf.id || `gf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      isActive: newGf.isActive ?? true,
    };
    setGeofences((prev) => [created, ...prev]);
    syncGeofenceToFirestore(created);
    return created;
  };

  const removeGeofence = (id: string): boolean => {
    let removed = false;
    setGeofences((prev) => {
      const filtered = prev.filter((g) => g.id !== id);
      if (filtered.length !== prev.length) removed = true;
      return filtered;
    });
    removeGeofenceFromFirestore(id);
    return removed;
  };

  const updateGeofence = (id: string, updates: Partial<GeofenceArea>) => {
    setGeofences((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const updated = { ...g, ...updates };
          syncGeofenceToFirestore(updated);
          return updated;
        }
        return g;
      })
    );
  };

  // Convert geofences into RiskZone[]
  const activeRiskZones = useMemo<RiskZone[]>(() => {
    return geofences
      .filter((g) => g.isActive)
      .map((g) => ({
        id: g.id,
        center: g.center,
        radius: g.radius,
        riskLevel: g.riskLevel === 'safe' ? 'moderate' : g.riskLevel,
        description: g.description,
      }));
  }, [geofences]);

  const updateTravellerLocation = (id: string, loc: GeoLocation) => {
    setTravellers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              location: loc,
              lastUpdated: 'Just now',
              recentPath: [...(t.recentPath || []), loc].slice(-20),
            }
          : t
      )
    );
  };

  const toggleUserRole = () => {
    setUser((prev) => {
      if (!prev) return null;
      const nextRole = prev.role === 'admin' ? 'tourist' : 'admin';
      return {
        ...prev,
        role: nextRole,
      };
    });
  };

  const updateUserRole = async (userId: string, newRole: 'tourist' | 'admin') => {
    await updateUserRoleInFirestore(userId, newRole);
    if (user && user.id === userId) {
      setUser((prev) => (prev ? { ...prev, role: newRole } : null));
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        toggleUserRole,
        allUsers,
        updateUserRole,
        currentLocation,
        setCurrentLocation,
        isDemoLocation,
        setIsDemoLocation,
        safetyStatus,
        setSafetyStatus,
        emergencyActive,
        setEmergencyActive,
        geofences,
        addGeofence,
        removeGeofence,
        updateGeofence,
        activeRiskZones,
        travellers,
        updateTravellerLocation,
        selectedTravellerId,
        setSelectedTravellerId,
        isAuthModalOpen,
        setIsAuthModalOpen,
        batteryLevel,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
