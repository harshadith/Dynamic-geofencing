import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

// Lazy Groq client instance
let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    groqClient = new Groq({ apiKey: key });
  }
  return groqClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Chat Route powered by Groq API
  app.post('/api/chat', async (req, res) => {
    try {
      const { query, history } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      const groqApiKey = process.env.GROQ_API_KEY;
      
      // If Groq API key is present, use Groq LPU inference
      if (groqApiKey && groqApiKey.trim().length > 0) {
        const groq = getGroqClient();

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          {
            role: 'system',
            content:
              'You are GeoSafe Assistant, a high-speed travel safety assistant. STRICT REQUIREMENT: Keep every response short, concise, and compact. Limit your answer to 2-3 brief sentences or 2-3 concise bullet points. Avoid pleasantries, filler phrases, long introductions, or repetitive disclaimers. Deliver only the most relevant, direct safety guidance, destination status, or route advice immediately.'
          }
        ];

        if (Array.isArray(history)) {
          for (const msg of history) {
            if (msg && typeof msg.text === 'string' && msg.text.trim()) {
              messages.push({
                role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.text
              });
            }
          }
        }

        messages.push({
          role: 'user',
          content: query
        });

        // Get active chat models from Groq API if possible, with prioritized fallbacks
        let dynamicModels: string[] = [];
        try {
          const modelList = await groq.models.list();
          const chatFilter = (id: string) =>
            !id.includes('whisper') &&
            !id.includes('prompt-guard') &&
            !id.includes('orpheus') &&
            !id.includes('safeguard');
          dynamicModels = (modelList.data || [])
            .map((m: any) => m.id)
            .filter(chatFilter);
        } catch {
          // fallback to hardcoded list if models.list fails
        }

        const candidateModels = Array.from(
          new Set([
            process.env.GROQ_MODEL,
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'qwen/qwen3.6-27b',
            'qwen/qwen3.8-27b',
            'groq/compound',
            ...dynamicModels,
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant'
          ].filter(Boolean) as string[])
        );

        let completion: any = null;
        let successfulModel = '';
        let lastError: any = null;

        for (const modelName of candidateModels) {
          try {
            completion = await groq.chat.completions.create({
              model: modelName,
              messages,
              temperature: 0.5,
              max_tokens: 300,
            });
            successfulModel = modelName;
            break;
          } catch (err: any) {
            lastError = err;
            const errMsg = err?.message || '';
            const errCode = err?.code || err?.status || err?.error?.code;
            // If model is decommissioned, not found, or inaccessible, try next candidate
            if (
              errCode === 404 ||
              errCode === 400 ||
              errCode === 'model_not_found' ||
              errCode === 'model_decommissioned' ||
              errMsg.includes('does not exist') ||
              errMsg.includes('model_not_found') ||
              errMsg.includes('decommissioned') ||
              errMsg.includes('do not have access')
            ) {
              console.warn(`Groq model ${modelName} unavailable (${errCode || errMsg}), trying next candidate...`);
              continue;
            }
            throw err;
          }
        }

        if (!completion && lastError) {
          throw lastError;
        }

        const replyText =
          completion?.choices[0]?.message?.content ||
          'I am ready to assist you with GeoSafe tourism safety and navigation.';

        return res.json({
          text: replyText,
          provider: 'groq',
          model: successfulModel
        });
      }

      // Fallback if GROQ_API_KEY is not yet configured
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const formattedHistory = (history || []).map((msg: any) => ({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));

        let validHistory = [...formattedHistory];
        while (validHistory.length > 0 && validHistory[0].role === 'model') {
          validHistory.shift();
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [...validHistory, { role: 'user', parts: [{ text: query }] }],
          config: {
            systemInstruction:
              'You are GeoSafe Assistant on GeoSafeAI. STRICT REQUIREMENT: Keep responses short, compact, and direct (max 2-3 brief sentences or 2-3 bullet points). Do not provide filler, long introductions, or excessive disclaimers. Focus purely on immediate travel safety and navigation guidance.',
            maxOutputTokens: 250,
            temperature: 0.5,
          }
        });

        return res.json({
          text: response.text,
          provider: 'gemini-fallback',
          notice: 'Tip: Add GROQ_API_KEY in Secrets to enable ultra-fast Groq LPU inference.'
        });
      }

      // If neither key is configured
      return res.status(400).json({
        error:
          'GROQ_API_KEY is not configured. Please add GROQ_API_KEY to your environment or AI Studio Secrets to enable the Groq AI Chatbot.'
      });
    } catch (error: any) {
      console.error('Chat API Error:', error);
      res.status(500).json({
        error: error.message || 'Failed to generate response'
      });
    }
  });

  // Admin AI Chat & Dynamic Task Execution Route
  app.post('/api/admin/chat', async (req, res) => {
    try {
      const { query, history, geofences = [], travellers = [], destinations = [] } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      const landmarkMap: Record<string, { lat: number; lng: number }> = {
        'grand museum': { lat: 48.8606, lng: 2.3376 },
        'riverside': { lat: 48.8530, lng: 2.3499 },
        'old town': { lat: 48.8584, lng: 2.3518 },
        'cathedral': { lat: 48.8530, lng: 2.3499 },
        'city center': { lat: 48.8566, lng: 2.3522 },
        'south avenue': { lat: 48.8520, lng: 2.3550 },
      };

      const systemPrompt = `You are GeoSafe AI Operations Controller, an autonomous dispatcher for tourism safety.
You can monitor travellers, assess risks, and directly perform operational tasks to dynamically ADD, REMOVE, or UPDATE geofences.

STRICT INSTRUCTIONS:
1. Always keep your response concise (1-2 direct, clear sentences).
2. If the user command involves adding, removing, updating a geofence, or locating a traveller, YOU MUST append an action line in this exact format:
ACTION: {"type": "ADD_GEOFENCE" | "REMOVE_GEOFENCE" | "UPDATE_GEOFENCE" | "LOCATE_TRAVELLER" | "BROADCAST_ALERT", "payload": { ... }}

Payload specifications:
- ADD_GEOFENCE: { "name": string, "description": string, "center": {"lat": number, "lng": number}, "radius": number (in meters, e.g. 300 to 600), "riskLevel": "safe"|"moderate"|"high"|"critical", "type": "safe_haven"|"restricted"|"hazard"|"tourist_perimeter" }
- REMOVE_GEOFENCE: { "id": string (the exact id of the geofence to remove) }
- UPDATE_GEOFENCE: { "id": string, "radius": number }
- LOCATE_TRAVELLER: { "id": string, "name": string }
- BROADCAST_ALERT: { "message": string }

Known Landmarks:
- Grand Museum: lat 48.8606, lng 2.3376
- Riverside Walk: lat 48.8530, lng 2.3499
- Old Town Square: lat 48.8584, lng 2.3518
- Cathedral of Light: lat 48.8530, lng 2.3499
- City Center: lat 48.8566, lng 2.3522

Current Active Geofences in system:
${JSON.stringify((geofences as any[]).map(g => ({ id: g.id, name: g.name, radius: g.radius, riskLevel: g.riskLevel, type: g.type, center: g.center })))}

Current Monitored Travellers:
${JSON.stringify((travellers as any[]).map(t => ({ id: t.id, name: t.name, status: t.status, location: t.location, battery: t.batteryLevel })))}`;

      const groqApiKey = process.env.GROQ_API_KEY;
      let rawResponseText = '';
      let provider = '';
      let modelUsed = '';

      if (groqApiKey && groqApiKey.trim().length > 0) {
        const groq = getGroqClient();
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt }
        ];

        if (Array.isArray(history)) {
          for (const msg of history) {
            if (msg && typeof msg.text === 'string' && msg.text.trim()) {
              messages.push({
                role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.text
              });
            }
          }
        }
        messages.push({ role: 'user', content: query });

        const candidateModels = [
          process.env.GROQ_MODEL,
          'openai/gpt-oss-120b',
          'openai/gpt-oss-20b',
          'qwen/qwen3.6-27b',
          'llama-3.3-70b-versatile',
          'llama-3.1-8b-instant'
        ].filter(Boolean) as string[];

        for (const m of candidateModels) {
          try {
            const completion = await groq.chat.completions.create({
              model: m,
              messages,
              max_tokens: 350,
              temperature: 0.2
            });
            rawResponseText = completion.choices[0]?.message?.content || '';
            provider = 'groq';
            modelUsed = m;
            break;
          } catch (err: any) {
            console.warn(`Model ${m} failed for admin chat:`, err?.message);
          }
        }
      }

      if (!rawResponseText && process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Admin Command: ${query}` }] }],
          config: { maxOutputTokens: 350, temperature: 0.2 }
        });
        rawResponseText = geminiRes.text || '';
        provider = 'gemini';
        modelUsed = 'gemini-2.5-flash';
      }

      // Parse ACTION block if present
      let parsedAction: any = null;
      let cleanText = rawResponseText;

      const actionMatch = rawResponseText.match(/ACTION:\s*(\{[\s\S]*?\})(?:\n|$)/);
      if (actionMatch) {
        try {
          parsedAction = JSON.parse(actionMatch[1]);
          cleanText = rawResponseText.replace(/ACTION:\s*\{[\s\S]*?\}(?:\n|$)/g, '').trim();
        } catch (e) {
          console.error('Failed to parse AI action JSON:', e);
        }
      }

      // Fallback intent extraction if the model replied naturally without formatted ACTION:
      if (!parsedAction) {
        const lowerQ = query.toLowerCase();
        if ((lowerQ.includes('add') || lowerQ.includes('create') || lowerQ.includes('set up') || lowerQ.includes('new')) && lowerQ.includes('geofence')) {
          const radiusMatch = lowerQ.match(/(\d+)\s*(?:m|meter|meters)/);
          const radius = radiusMatch ? parseInt(radiusMatch[1], 10) : 350;
          let center = { lat: 48.8566, lng: 2.3522 };
          for (const [key, coords] of Object.entries(landmarkMap)) {
            if (lowerQ.includes(key)) {
              center = coords;
              break;
            }
          }
          const isSafe = lowerQ.includes('safe') || lowerQ.includes('haven') || lowerQ.includes('perimeter');
          const isCritical = lowerQ.includes('critical') || lowerQ.includes('danger') || lowerQ.includes('severe');
          const isHigh = lowerQ.includes('high') || lowerQ.includes('hazard') || lowerQ.includes('accident');
          
          parsedAction = {
            type: 'ADD_GEOFENCE',
            payload: {
              name: `Dynamic Zone: ${query.slice(0, 30)}...`,
              description: `Generated via AI command: "${query}"`,
              center,
              radius,
              riskLevel: isSafe ? 'safe' : isCritical ? 'critical' : isHigh ? 'high' : 'moderate',
              type: isSafe ? 'safe_haven' : isCritical ? 'hazard' : isHigh ? 'hazard' : 'restricted'
            }
          };
        } else if ((lowerQ.includes('remove') || lowerQ.includes('delete') || lowerQ.includes('clear')) && (lowerQ.includes('geofence') || lowerQ.includes('zone'))) {
          // Check for matching ID or name in geofences
          let targetId = '';
          for (const gf of geofences as any[]) {
            if (lowerQ.includes(gf.id.toLowerCase()) || lowerQ.includes(gf.name.toLowerCase())) {
              targetId = gf.id;
              break;
            }
          }
          if (targetId) {
            parsedAction = {
              type: 'REMOVE_GEOFENCE',
              payload: { id: targetId }
            };
          }
        }
      }

      if (!cleanText) {
        cleanText = 'Admin command processed. Geofence configuration updated.';
      }

      return res.json({
        text: cleanText,
        action: parsedAction,
        provider: provider || 'local-engine',
        model: modelUsed || 'default'
      });
    } catch (error: any) {
      console.error('Admin Chat API Error:', error);
      res.status(500).json({ error: error.message || 'Admin chat processing failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
