-- ==============================================================================
-- DYNAMIC GEOFENCING & TOUR SAFETY PLATFORM: POSTGRESQL + POSTGIS SCHEMA
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Enumerated types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('tour_guide', 'tourist');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE threat_level AS ENUM ('safe', 'low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE geofence_reason AS ENUM (
        'safe_haven',
        'traffic_congestion',
        'security_threat',
        'street_crime',
        'natural_disaster',
        'crowd_surge',
        'custom_perimeter'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tour_status AS ENUM ('active', 'completed', 'scheduled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'tourist',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tours table
CREATE TABLE IF NOT EXISTS public.tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    code VARCHAR(12) UNIQUE NOT NULL,
    status tour_status DEFAULT 'active',
    city TEXT DEFAULT 'Paris',
    meeting_point GEOMETRY(Point, 4326),
    meeting_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tour Members table (Tourists who joined the tour)
CREATE TABLE IF NOT EXISTS public.tour_members (
    tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
    tourist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(tour_id, tourist_id)
);

-- 6. Dynamic & Adaptive Geofences
CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    reason geofence_reason NOT NULL DEFAULT 'custom_perimeter',
    threat_level threat_level NOT NULL DEFAULT 'medium',
    center GEOMETRY(Point, 4326) NOT NULL,
    base_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 250,
    adaptive_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 250,
    boundary GEOMETRY(Polygon, 4326),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Live Tourist Telemetry & GPS Locations
CREATE TABLE IF NOT EXISTS public.tourist_locations (
    tourist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    speed DOUBLE PRECISION DEFAULT 0,
    battery_level INT DEFAULT 95,
    is_sos BOOLEAN DEFAULT FALSE,
    inside_hazard BOOLEAN DEFAULT FALSE,
    active_threat_level threat_level DEFAULT 'safe',
    last_ping TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(tourist_id, tour_id)
);

-- 8. Real-time Tour Safety Alerts
CREATE TABLE IF NOT EXISTS public.tour_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
    geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
    threat_level threat_level NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PostGIS Spatial GIST Indices for ultra-fast spatial querying
CREATE INDEX IF NOT EXISTS idx_geofences_center ON public.geofences USING GIST(center);
CREATE INDEX IF NOT EXISTS idx_geofences_boundary ON public.geofences USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_tourist_location_gist ON public.tourist_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_tours_code ON public.tours(code);

-- 10. PostGIS Functions

-- Function 1: Calculate Adaptive Geofence Polygon Buffer based on threat level
CREATE OR REPLACE FUNCTION public.calculate_adaptive_geofence(
    p_center GEOMETRY,
    p_base_radius DOUBLE PRECISION,
    p_threat_level threat_level
)
RETURNS GEOMETRY AS $$
DECLARE
    v_multiplier DOUBLE PRECISION := 1.0;
    v_adapted_radius DOUBLE PRECISION;
BEGIN
    -- Adaptive expansion rules:
    -- Safe Haven: 1.0x
    -- Low: 1.0x (localized warning)
    -- Medium: 1.35x (expanding buffer)
    -- High: 1.75x (proactive evacuation buffer)
    -- Critical: 2.5x (massive anomaly exclusion zone)
    CASE p_threat_level
        WHEN 'safe' THEN v_multiplier := 1.0;
        WHEN 'low' THEN v_multiplier := 1.0;
        WHEN 'medium' THEN v_multiplier := 1.35;
        WHEN 'high' THEN v_multiplier := 1.75;
        WHEN 'critical' THEN v_multiplier := 2.5;
        ELSE v_multiplier := 1.0;
    END CASE;

    v_adapted_radius := p_base_radius * v_multiplier;
    -- Buffer in meters using PostGIS geography casting
    RETURN ST_Buffer(p_center::geography, v_adapted_radius)::geometry;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function 2: Query if a tourist coordinate intersects with any active geofences in the tour
CREATE OR REPLACE FUNCTION public.check_tourist_in_geofences(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_tour_id UUID
)
RETURNS TABLE (
    geofence_id UUID,
    name TEXT,
    reason geofence_reason,
    threat_level threat_level,
    distance_meters DOUBLE PRECISION
) AS $$
DECLARE
    v_tourist_pt GEOMETRY;
BEGIN
    v_tourist_pt := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    RETURN QUERY
    SELECT 
        g.id AS geofence_id,
        g.name,
        g.reason,
        g.threat_level,
        ST_Distance(v_tourist_pt::geography, g.center::geography) AS distance_meters
    FROM public.geofences g
    WHERE g.tour_id = p_tour_id
      AND g.is_active = TRUE
      AND (
          (g.boundary IS NOT NULL AND ST_Contains(g.boundary, v_tourist_pt))
          OR ST_DWithin(v_tourist_pt::geography, g.center::geography, g.adaptive_radius_meters)
      );
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. Supabase Realtime publication setup
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tourist_locations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.geofences;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_alerts;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tours;
EXCEPTION WHEN others THEN null;
END $$;
