/**
 * Cloudflare Worker — serve a SPA (via ASSETS binding) e faz proxy
 * seguro para a API Gemini em /api/gemini.
 *
 * A chave GEMINI_API_KEY vive APENAS em env.GEMINI_API_KEY (Secret do
 * Worker configurado no dashboard). Nunca é exposta ao cliente.
 */

interface Env {
  GEMINI_API_KEY: string;
  ASSETS: Fetcher;
}

const ALLOWED_ACTIONS = new Set([
  'categorize',
  'parsePdf',
  'parsePdfMulti',
  'checkStatement',
  'chat',
]);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

interface GeminiRequest {
  action?: string;
  model?: string;
  body?: Record<string, unknown>;
}

async function handleGemini(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: 'GEMINI_API_KEY não configurada no ambiente.' }, 500);
  }

  let payload: GeminiRequest;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }

  const { action, model, body } = payload;
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return json({ error: `Action inválida: ${action}` }, 400);
  }
  if (!model || typeof model !== 'string') {
    return json({ error: 'Campo "model" ausente.' }, 400);
  }
  if (!body || typeof body !== 'object') {
    return json({ error: 'Campo "body" ausente.' }, 400);
  }

  const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return json(
      { error: 'Falha ao contatar a API Gemini.', detail: String(err) },
      502,
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/gemini') {
      return handleGemini(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
