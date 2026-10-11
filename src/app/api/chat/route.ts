import { streamText, tool } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { PREDEFINED_EMERGENCY_SERVICES } from '@/lib/safety/geofence-engine';
import { INITIAL_GEOFENCES } from '@/data/initial-data';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const groqApiKey = process.env.GROQ_API_KEY;

    // Define AI tools for interactive backend queries
    const safetyTools = {
      getEmergencyServices: tool({
        description:
          'Fetches predefined nearby emergency contacts such as tourist police stations, general hospitals, trauma centers, and embassies.',
        parameters: z.object({
          serviceType: z
            .enum(['all', 'hospital', 'police', 'embassy'])
            .describe('The category of emergency facility needed'),
        }),
        execute: async ({ serviceType }) => {
          if (serviceType === 'all') {
            return PREDEFINED_EMERGENCY_SERVICES;
          }
          return PREDEFINED_EMERGENCY_SERVICES.filter((s) => s.type === serviceType);
        },
      }),

      getGeofenceStatus: tool({
        description:
          'Retrieves active dynamic geofences, anomaly causes (traffic, crime, disaster, crowd surge), and their risk levels.',
        parameters: z.object({
          threatFilter: z
            .enum(['all', 'hazard_only', 'safe_only'])
            .optional()
            .describe('Filter zones by safety or hazard level'),
        }),
        execute: async ({ threatFilter }) => {
          if (threatFilter === 'safe_only') {
            return INITIAL_GEOFENCES.filter((g) => g.threatLevel === 'safe');
          }
          if (threatFilter === 'hazard_only') {
            return INITIAL_GEOFENCES.filter((g) => g.threatLevel !== 'safe');
          }
          return INITIAL_GEOFENCES;
        },
      }),

      explainSafetyAlert: tool({
        description:
          'Provides an official safety briefing for an anomaly or hazard in the tour area.',
        parameters: z.object({
          hazardName: z.string().describe('The name of the hazard or geofence'),
        }),
        execute: async ({ hazardName }) => {
          const match = INITIAL_GEOFENCES.find((g) =>
            g.name.toLowerCase().includes(hazardName.toLowerCase())
          );
          if (match) {
            return {
              zone: match.name,
              threatLevel: match.threatLevel,
              reason: match.reason,
              adaptiveRadius: `${match.adaptiveRadiusMeters} meters`,
              advisory: match.description,
              recommendedAction:
                match.threatLevel === 'critical'
                  ? 'Immediate perimeter evacuation required. Reroute through nearest Safe Haven.'
                  : 'Maintain heightened awareness, avoid side alleyways, and follow Tour Guide broadcast.',
            };
          }
          return { message: `No specific hazard entry found for "${hazardName}". Area is currently standard status.` };
        },
      }),
    };

    // If Groq API Key is configured, use Vercel AI SDK with Groq
    if (groqApiKey && groqApiKey.trim().length > 0) {
      const model = groq(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile');

      const result = streamText({
        model,
        messages,
        system:
          'You are GeoSafe AI Co-Pilot, an intelligent tourist safety and tour guide navigator assistant. ' +
          'You provide fast, concise, and actionable guidance for tourists and guides. ' +
          'STRICT REQUIREMENT: Be concise and helpful (max 2-3 sentences or bullet points). ' +
          'When asked about emergency numbers, nearby hospitals, police stations, or active hazards, ' +
          'ALWAYS invoke the appropriate tool to fetch accurate real-time data.',
        tools: safetyTools,
        maxSteps: 3,
      });

      return result.toDataStreamResponse();
    }

    // High-performance intelligent mock stream when Groq API key is not yet set
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const queryLower = lastUserMessage.toLowerCase();

    let simulatedReply =
      'I am your GeoSafe AI Assistant. All tour telemetry and geofences are currently monitored in real time.';

    if (queryLower.includes('police') || queryLower.includes('hospital') || queryLower.includes('emergency')) {
      const services = PREDEFINED_EMERGENCY_SERVICES.map(
        (s) => `• **${s.name}** (${s.type.toUpperCase()}): Call ${s.phone} at ${s.address}`
      ).join('\n');
      simulatedReply = `Here are the verified emergency facilities nearby:\n\n${services}\n\n*Emergency SOS line is open 24/7.*`;
    } else if (queryLower.includes('hazard') || queryLower.includes('geofence') || queryLower.includes('traffic') || queryLower.includes('threat')) {
      simulatedReply =
        'Active hazards in Paris Heritage Tour:\n' +
        '• **Quai de la Tournelle**: CRITICAL flood surge anomaly (500m buffer)\n' +
        '• **Châtelet Subway**: HIGH crime/pickpocket advisory (480m buffer)\n' +
        '• **Rue de Rivoli**: MEDIUM traffic gridlock (310m buffer)\n\n' +
        'Recommended route: Follow the **Notre-Dame Safe Haven Corridor** (Safety Score: 95/100).';
    } else if (queryLower.includes('route') || queryLower.includes('navigation') || queryLower.includes('safe')) {
      simulatedReply =
        'For optimal security, our navigation engine has selected the **Verified Safe Corridor** (Safety Score 95/100). ' +
        'It detours 400m north to avoid the Rue de Rivoli congestion and keeps you within 150m of the tourist police post.';
    } else if (queryLower.includes('tour') || queryLower.includes('guide')) {
      simulatedReply =
        'You are connected to **Paris Historic Heritage & Seine River Corridor** (Code: `TOUR-7749`), guided by Master Guide Laurent Mercier. 3 other tourists are actively broadcasting telemetry.';
    }

    // Return as AI stream format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(simulatedReply)}\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Chat error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
