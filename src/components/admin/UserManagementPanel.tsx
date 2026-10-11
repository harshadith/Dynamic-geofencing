import React, { useState, useMemo } from 'react';
import { User, Traveller } from '../../types';
import { 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Shield, 
  Search, 
  Mail, 
  Phone, 
  Clock, 
  Battery, 
  MapPin, 
  Radio, 
  Share2, 
  Check, 
  UserPlus, 
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { DEFAULT_CENTER } from '../../data/demoData';

interface UserManagementPanelProps {
  users: User[];
  travellers: Traveller[];
  currentUserId?: string;
  onSelectTraveller?: (travellerId: string) => void;
  onUpdateRole: (userId: string, newRole: 'tourist' | 'admin') => Promise<void>;
  onSendAlert: (message: string) => void;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  users,
  travellers,
  currentUserId,
  onSelectTraveller,
  onUpdateRole,
  onSendAlert,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'tourist' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'gps_active'>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [isRegisteringTestUser, setIsRegisteringTestUser] = useState(false);

  // Map user ID to active traveller record for GPS telemetry correlation
  const travellerMap = useMemo(() => {
    const map = new Map<string, Traveller>();
    travellers.forEach((trv) => {
      map.set(trv.id, trv);
    });
    return map;
  }, [travellers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search match
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.phone && u.phone.toLowerCase().includes(query)) ||
        u.id.toLowerCase().includes(query);

      // Role filter
      const matchRole = roleFilter === 'all' || u.role === roleFilter;

      // Status filter
      const hasGps = travellerMap.has(u.id);
      const isOnline = u.isOnline || hasGps;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'online' && isOnline) ||
        (statusFilter === 'gps_active' && hasGps);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter, travellerMap]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = users.length;
    const tourists = users.filter((u) => u.role === 'tourist').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const online = users.filter((u) => u.isOnline || travellerMap.has(u.id)).length;
    const gpsActive = users.filter((u) => travellerMap.has(u.id)).length;

    return { total, tourists, admins, online, gpsActive };
  }, [users, travellerMap]);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleRoleToggle = async (targetUser: User) => {
    const newRole: 'tourist' | 'admin' = targetUser.role === 'admin' ? 'tourist' : 'admin';
    setUpdatingUserId(targetUser.id);
    try {
      await onUpdateRole(targetUser.id, newRole);
      onSendAlert(`User ${targetUser.name} role updated to ${newRole.toUpperCase()}`);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateTestUser = async () => {
    setIsRegisteringTestUser(true);
    try {
      const userNum = users.length + 1;
      const newUid = `usr_${Date.now().toString(36)}`;
      const names = ['Alex Vance', 'Elena Rostova', 'Kenji Sato', 'David Miller', 'Chloe Zhang', 'Marcus Wright'];
      const randomName = `${names[userNum % names.length]} (${userNum})`;
      const newUser: User = {
        id: newUid,
        name: randomName,
        email: `user${userNum}@geosafe.app`,
        phone: `+1 555-${String(Math.floor(1000 + Math.random() * 9000))}`,
        role: 'tourist',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isOnline: true,
      };

      // 1. Save user profile
      await setDoc(doc(db, 'users', newUid), newUser);

      // 2. Save active traveller telemetry so they appear on the live radar and map immediately
      const offsetLat = (Math.random() - 0.5) * 0.015;
      const offsetLng = (Math.random() - 0.5) * 0.015;
      const deviceLoc = {
        lat: DEFAULT_CENTER.lat + offsetLat,
        lng: DEFAULT_CENTER.lng + offsetLng,
      };

      const newTraveller: Traveller = {
        id: newUid,
        name: randomName,
        email: newUser.email,
        phone: newUser.phone || '',
        nationality: 'Active Traveler',
        location: deviceLoc,
        lastUpdated: 'Just now',
        batteryLevel: Math.floor(Math.random() * 30) + 70,
        safetyScore: Math.floor(Math.random() * 20) + 80,
        status: 'safe',
        geofenceStatus: 'inside_safe',
      };

      await setDoc(doc(db, 'travellers', newUid), {
        ...newTraveller,
        userId: newUid,
        timestamp: new Date().toISOString(),
      });

      onSendAlert(`User & Live Device "${randomName}" connected and active.`);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRegisteringTestUser(false);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Recently';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Top Banner with Stats & Controls */}
      <div className="p-3 bg-gradient-to-r from-slate-900 to-blue-950 text-white shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold leading-none">Registered & Logged-In Users</h3>
              <p className="text-[10px] text-slate-300">Live database directory from Firestore</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
            {stats.total} Total Users
          </span>
        </div>

        {/* 4 Mini Stat Pills */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5 text-center">
          <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400">Online</span>
            <span className="text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {stats.online}
            </span>
          </div>

          <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400">GPS Live</span>
            <span className="text-xs font-extrabold text-blue-400 flex items-center justify-center gap-1">
              <Radio className="w-2.5 h-2.5 text-blue-400" />
              {stats.gpsActive}
            </span>
          </div>

          <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400">Tourists</span>
            <span className="text-xs font-extrabold text-slate-200">
              {stats.tourists}
            </span>
          </div>

          <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400">Admins</span>
            <span className="text-xs font-extrabold text-amber-300">
              {stats.admins}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopyInvite}
            className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[11px] font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Invite Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-blue-300" />
                <span>Invite User</span>
              </>
            )}
          </button>

          <button
            onClick={handleCreateTestUser}
            disabled={isRegisteringTestUser}
            className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            title="Register a simulated new authenticated user account into Firestore"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isRegisteringTestUser ? 'Adding...' : '+ Add User'}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone or UID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center justify-between gap-1 flex-wrap text-[11px]">
          {/* Role Filter */}
          <div className="flex gap-1">
            {(['all', 'tourist', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2 py-0.5 rounded-lg capitalize font-medium transition-colors ${
                  roleFilter === r
                    ? 'bg-slate-800 text-white font-bold shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r}s`}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-1">
            {(['all', 'online', 'gps_active'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s === 'all' ? 'All' : s === 'online' ? 'Online' : 'GPS Active'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Directory List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredUsers.map((u) => {
          const isCurrentUser = u.id === currentUserId;
          const liveTraveller = travellerMap.get(u.id);
          const hasGps = !!liveTraveller;
          const isOnline = u.isOnline || hasGps;
          const isAdmin = u.role === 'admin';
          const isUpdating = updatingUserId === u.id;

          return (
            <div
              key={u.id}
              className={`p-3 rounded-2xl border transition-all ${
                isCurrentUser
                  ? 'border-blue-300 bg-blue-50/40 shadow-xs ring-1 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* User Header Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {/* Avatar with Online Indicator */}
                  <div className="relative">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-2xs ${
                        isAdmin
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-700'
                          : 'bg-gradient-to-br from-blue-600 to-cyan-700'
                      }`}
                    >
                      {u.photoUrl ? (
                        <img
                          src={u.photoUrl}
                          alt={u.name}
                          className="w-full h-full rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        u.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-slate-900">{u.name}</h4>
                      {isCurrentUser && (
                        <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                          You
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>

                    {/* Email & Phone */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 truncate max-w-[180px]">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        {u.email}
                      </span>
                      {u.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {u.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role Switcher Action */}
                <button
                  onClick={() => handleRoleToggle(u)}
                  disabled={isUpdating}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                    isAdmin
                      ? 'border-amber-200 text-amber-700 hover:bg-amber-50 bg-amber-50/50'
                      : 'border-blue-200 text-blue-700 hover:bg-blue-50 bg-blue-50/50'
                  }`}
                  title={`Change role to ${isAdmin ? 'Tourist' : 'Admin'}`}
                >
                  {isUpdating ? 'Saving...' : isAdmin ? 'Make Tourist' : 'Make Admin'}
                </button>
              </div>

              {/* Status & Live Telemetry Strip */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Last Login Info */}
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Last active: <strong>{formatTimestamp(u.lastLoginAt)}</strong>
                  </span>

                  {/* GPS status */}
                  {hasGps && liveTraveller ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                      <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                      GPS Active ({liveTraveller.safetyScore}% Safety • {liveTraveller.batteryLevel}% Bat)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      No live GPS stream
                    </span>
                  )}
                </div>

                {/* Locate on Map Button (if has GPS) */}
                {hasGps && onSelectTraveller && (
                  <button
                    onClick={() => onSelectTraveller(u.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <MapPin className="w-3 h-3" />
                    Locate on Map
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 mb-1">No Logged-In Users Found</p>
            <p className="text-[11px] text-slate-500 mb-3">
              {searchTerm
                ? 'Try adjusting your search query or filter settings.'
                : 'Share the invite link or click "+ Add User" to register users in the database.'}
            </p>
            <button
              onClick={handleCreateTestUser}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
            >
              + Register Simulated User
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
