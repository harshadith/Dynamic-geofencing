import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { User, Traveller, GeoLocation, GeofenceArea } from '../types';

export interface AuthState {
  firebaseUser: FirebaseUser | null;
  appUser: User | null;
  loading: boolean;
}

/**
 * Register or update real user profile in Firestore
 */
export async function syncUserProfile(firebaseUser: FirebaseUser, customName?: string, role: 'tourist' | 'admin' = 'tourist'): Promise<User> {
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(userDocRef);

  let existingData: any = {};
  if (snap.exists()) {
    existingData = snap.data();
  }

  const name = customName || firebaseUser.displayName || existingData.name || firebaseUser.email?.split('@')[0] || 'Traveler';
  const email = firebaseUser.email || existingData.email || `${firebaseUser.uid.slice(0, 8)}@geosafe.app`;
  const userRole = existingData.role || role;

  const appUser: User = {
    id: firebaseUser.uid,
    name,
    email,
    phone: firebaseUser.phoneNumber || existingData.phone || '+1 555-0199',
    role: userRole,
    photoUrl: firebaseUser.photoURL || existingData.photoUrl || undefined,
    lastLoginAt: new Date().toISOString(),
    createdAt: existingData.createdAt || new Date().toISOString(),
    isOnline: true,
  };

  await setDoc(userDocRef, {
    ...appUser,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return appUser;
}

/**
 * Subscribe to all users registered or logged into the application.
 */
export function subscribeToAllUsers(callback: (users: User[]) => void) {
  const usersRef = collection(db, 'users');
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const userList: User[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        userList.push({
          id: docSnap.id,
          name: d.name || 'User',
          email: d.email || '',
          phone: d.phone || '',
          role: d.role === 'admin' ? 'admin' : 'tourist',
          photoUrl: d.photoUrl || undefined,
          lastLoginAt: d.lastLoginAt || d.updatedAt || undefined,
          lastLogoutAt: d.lastLogoutAt || undefined,
          createdAt: d.createdAt || undefined,
          isOnline: d.isOnline ?? false,
          emergencyContact: d.emergencyContact || undefined,
        });
      });

      // Sort by most recently active / logged in first
      userList.sort((a, b) => {
        const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        return timeB - timeA;
      });

      callback(userList);
    },
    (error) => {
      console.warn('Firestore users subscription notice:', error.message);
    }
  );
}

/**
 * Update user role (e.g. promote to admin or set to tourist) in Firestore.
 */
export async function updateUserRoleInFirestore(userId: string, newRole: 'tourist' | 'admin'): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, {
    role: newRole,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Publish/Update current user's live traveller presence in Firestore.
 * This is what other users / admins see on their radar map!
 */
export async function updateLiveTravellerPresence(
  user: User,
  location: GeoLocation,
  batteryLevel: number = 95,
  safetyScore: number = 88,
  status: 'safe' | 'warning' | 'critical' | 'sos' = 'safe',
  geofenceStatus: 'inside_safe' | 'inside_hazard' | 'outside_geofence' = 'inside_safe'
) {
  if (!user || !user.id) return;

  const travellerDocRef = doc(db, 'travellers', user.id);
  const travellerData: Traveller = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    nationality: 'Verified Account',
    location,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    batteryLevel,
    safetyScore,
    status,
    photoUrl: user.photoUrl,
    geofenceStatus,
  };

  try {
    await setDoc(travellerDocRef, {
      ...travellerData,
      userId: user.id,
      timestamp: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not sync traveller presence to Firestore:', err);
  }
}

/**
 * Subscribe to all real people currently tracked in Firestore.
 */
export function subscribeToRealTravellers(callback: (travellers: Traveller[]) => void) {
  const travellersRef = collection(db, 'travellers');
  return onSnapshot(
    travellersRef,
    (snapshot) => {
      const liveTravellers: Traveller[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        liveTravellers.push({
          id: docSnap.id,
          name: data.name || 'Anonymous Traveler',
          email: data.email || '',
          phone: data.phone || '',
          nationality: data.nationality || 'Registered User',
          location: data.location || { lat: 28.6139, lng: 77.2090 },
          lastUpdated: data.lastUpdated || 'Just now',
          batteryLevel: typeof data.batteryLevel === 'number' ? data.batteryLevel : 85,
          safetyScore: typeof data.safetyScore === 'number' ? data.safetyScore : 90,
          status: data.status || 'safe',
          photoUrl: data.photoUrl,
          geofenceStatus: data.geofenceStatus || 'inside_safe',
        });
      });
      callback(liveTravellers);
    },
    (error) => {
      console.warn('Firestore travellers subscription notice:', error.message);
    }
  );
}

/**
 * Real-time geofences sync in Firestore
 */
export function subscribeToFirestoreGeofences(callback: (geofences: GeofenceArea[]) => void) {
  const geofencesRef = collection(db, 'geofences');
  return onSnapshot(
    geofencesRef,
    (snapshot) => {
      const items: GeofenceArea[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          name: d.name,
          description: d.description || '',
          center: d.center,
          radius: d.radius,
          riskLevel: d.riskLevel,
          type: d.type || 'safe_haven',
          isActive: d.isActive ?? true,
          createdAt: d.createdAt || new Date().toISOString(),
          createdBy: d.createdBy || 'admin',
        });
      });
      if (items.length > 0) {
        callback(items);
      }
    },
    (err) => {
      console.warn('Firestore geofences subscription notice:', err.message);
    }
  );
}

export async function syncGeofenceToFirestore(geofence: GeofenceArea) {
  try {
    const docRef = doc(db, 'geofences', geofence.id);
    await setDoc(docRef, geofence, { merge: true });
  } catch (err) {
    console.warn('Error syncing geofence to Firestore:', err);
  }
}

export async function removeGeofenceFromFirestore(geofenceId: string) {
  try {
    const docRef = doc(db, 'geofences', geofenceId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting geofence from Firestore:', err);
  }
}

/**
 * Authentication Methods
 */
export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return await syncUserProfile(result.user);
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return await syncUserProfile(result.user);
}

export async function registerWithEmail(email: string, pass: string, name: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (name) {
    await updateProfile(result.user, { displayName: name });
  }
  return await syncUserProfile(result.user, name);
}

export async function loginAsGuest(name: string = 'Verified Traveler'): Promise<User> {
  const result = await signInAnonymously(auth);
  return await syncUserProfile(result.user, name);
}

export async function logoutUser(): Promise<void> {
  if (auth.currentUser) {
    try {
      // Mark as offline in user profile
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        isOnline: false,
        lastLogoutAt: new Date().toISOString(),
      }, { merge: true });
      // Remove traveller presence on logout
      await deleteDoc(doc(db, 'travellers', auth.currentUser.uid));
    } catch {}
  }
  await signOut(auth);
}
