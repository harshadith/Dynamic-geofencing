# GeoSafe AI: Dynamic Geofencing & Tour Safety Platform

An enterprise-grade tourist and tour guide safety application built with **Next.js 15 App Router**, **TypeScript**, **Tailwind CSS**, **PostgreSQL + PostGIS**, **Supabase Realtime**, and **Vercel AI SDK** with **Groq LPUs**.

---

## 🌟 Core Features

### 1. Tour Guide Command Center
- **Tour Management**: Create guided tours with unique join codes (e.g., `TOUR-7749`), meeting points, and participant manifests.
- **Live Tourist Radar**: Real-time interactive Leaflet map rendering all tourists' live locations, battery status, and hazard intrusion status.
- **Custom Adaptive Geofences**: Deploy perimeters with threat levels (`SAFE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and reasons (`traffic_congestion`, `security_threat`, `street_crime`, `natural_disaster`, `crowd_surge`, `safe_haven`).
- **Dynamic Anomaly Simulation**: Automatically expands danger perimeters (e.g. +160m flood expansion on River Seine) and alerts tourists.
- **Broadcast Safety Directives**: Push immediate notifications across all connected tourist devices.

### 2. Tourist Safety Navigator
- **Join Expeditions**: Enter a 6-digit tour code to join your tour guide.
- **Real-Time GPS Broadcasting**: Broadcasts live coordinates over Supabase Realtime WebSockets to the guide's map.
- **Boundary Collision Alerts**: Audio-visual modal dialogs instantly trigger when approaching or breaching hazard geofences.
- **Safety-Aware Multi-Criteria Routing**:
  - Evaluates routes across Safety Score (0-100), Distance, Travel Time, Traffic, and Crowd Density.
  - Three distinct paths generated: **Verified Safe Corridor**, **Balanced Transit Arterial**, and **Shortest Direct Path**.
- **Dynamic Route Re-Ranking**: Continuous condition monitoring detects emerging route hazards and automatically switches tourists to safer alternatives.

### 3. AI Safety Co-Pilot (Groq + Vercel AI SDK)
- Ultra-low latency conversational assistant powered by Groq LPUs (`llama-3.3-70b-versatile`).
- **Tool Calling**:
  - `getEmergencyServices`: Fetches nearest hospitals, tourist police stations, trauma centers, and embassies.
  - `getGeofenceStatus`: Queries active spatial hazard zones and anomaly reasons.
  - `explainSafetyAlert`: Delivers instant safety briefings for active threat zones.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 App Router (TypeScript) |
| **Styling & UI** | Tailwind CSS & Lucide Icons |
| **Maps & Spatial** | Leaflet with CartoDB Dark Matter tiles |
| **Database & Spatial** | PostgreSQL + PostGIS (`ST_Contains`, `ST_DWithin`, `ST_Buffer`) |
| **Realtime Telemetry** | Supabase Realtime WebSockets (with BroadcastChannel fallback) |
| **AI Engine** | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/groq`) |

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```
*(Note: If API keys are not yet provided, the application runs with an intelligent offline sync engine and mock AI streaming so you can test all features immediately.)*

### 3. Deploy PostGIS Schema to Supabase
Run the SQL script located in `supabase/schema.sql` inside your Supabase project's SQL Editor to set up:
- PostGIS extensions (`postgis`, `uuid-ossp`)
- `profiles`, `tours`, `tour_members`, `geofences`, `tourist_locations`, and `tour_alerts` tables
- Spatial indices (`GIST`) and `calculate_adaptive_geofence` functions
- Supabase Realtime publication

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Guide: Tourist & Guide Interaction

1. Open **Tour Guide** at [http://localhost:3000/guide](http://localhost:3000/guide) in one browser window.
2. Open **Tourist Portal** at [http://localhost:3000/tourist](http://localhost:3000/tourist) in another window or incognito tab.
3. In the Tourist window, click **"Simulate Walk"** — observe the tourist moving live on the Guide's radar map in real time!
4. In the Guide window, click **"Simulate Anomaly"** — observe the critical flood geofence expand and the Tourist receive an instant collision warning!
5. In the Tourist window, click **"Trigger Route Hazard"** — watch the routing engine dynamically re-rank and switch to the **Verified Safe Corridor**!
6. Click **AI Safety Co-Pilot** in the top right to ask for emergency hospitals or police numbers!
