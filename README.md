<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# moneySense

SPA React 19 + Vite + Tailwind v4 que importa extratos bancários (OFX/CSV/PDF), categoriza transações via Gemini e roda num único **Cloudflare Worker** com Static Assets (free tier).

A chave da API Gemini **nunca** vai para o bundle do cliente — todas as chamadas passam pelo Worker em `worker/index.ts`, que serve a SPA via `env.ASSETS` e faz proxy de `/api/gemini` para o Gemini usando `env.GEMINI_API_KEY` (Secret).

## Setup local

```bash
# 1. Clone e instale
npm install

# 2. Crie o arquivo de variáveis locais (lido pelo wrangler)
echo "GEMINI_API_KEY=sua_chave_aqui" > .dev.vars

# 3. Build inicial (necessário para o wrangler servir dist/)
npm run build

# 4. Sobe Vite (:3000) + Wrangler (:8788) juntos
npm run dev:full
```

O Vite faz proxy de `/api/*` para `http://localhost:8788`, então a SPA em `http://localhost:3000` chama a Cloudflare Worker de forma transparente.

> Para iterar apenas no front sem reiniciar o wrangler, basta editar e recarregar — o `npm run dev:full` mantém os dois processos vivos.

## Deploy no Cloudflare (Worker + Assets)

```bash
# 1. Autentique no Cloudflare
npx wrangler login

# 2. Configure a chave como Secret (roda 1x)
npx wrangler secret put GEMINI_API_KEY

# 3. Build + deploy
npm run deploy
```

O comando `npm run deploy` roda `vite build` e em seguida `wrangler deploy` (que publica o Worker em `worker/index.ts` com a pasta `dist/` anexada como Static Assets).

### Deploy via Git (dashboard Cloudflare)

Se o projeto estiver conectado ao GitHub, em **Workers & Pages → money-sense-cloud → Settings → Build**:

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

E em **Settings → Variables and Secrets (Production)**: `GEMINI_API_KEY` como **Secret**.

## Como obter a chave Gemini (gratuita)

1. Acesse <https://aistudio.google.com/app/apikey>
2. Crie ou selecione um projeto no Google Cloud
3. Gere uma chave — ela começa com `AIza...`

## Scripts

- `npm run dev` — Vite dev server (porta 3000)
- `npm run dev:worker` — Wrangler rodando o Worker + assets locais (porta 8788)
- `npm run dev:full` — Vite + Wrangler juntos via `concurrently`
- `npm run build` — build de produção em `dist/`
- `npm run lint` — type-check do front (`tsc --noEmit`)
- `npm run lint:worker` — type-check do Worker
- `npm run deploy` — build + `wrangler deploy`

## Arquitetura

- **`src/`** — SPA React (toda a UI e parsers locais OFX/CSV)
- **`src/lib/aiService.ts`** — cliente fino que chama `/api/gemini` (sem SDK)
- **`worker/index.ts`** — Worker único: roteia `/api/gemini` para o Gemini com `env.GEMINI_API_KEY`, delega tudo o mais ao binding `ASSETS`
- **`wrangler.toml`** — config do Worker + Static Assets (`main`, `[assets].directory = "./dist"`, `not_found_handling = "single-page-application"` para o fallback da SPA)

Estado da aplicação vive inteiramente no `localStorage` do navegador. Não há banco de dados.
