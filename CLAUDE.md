# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server on port 3000 (host 0.0.0.0)
- `npm run build` — production build
- `npm run lint` — type-check only (`tsc --noEmit`); there is no ESLint config
- `npm run preview` — preview the built bundle

There is no test runner configured.

Requires `GEMINI_API_KEY` in `.env.local`. Vite injects it as `process.env.GEMINI_API_KEY` via `define` in `vite.config.ts` (see the `loadEnv` block) — so the key is **bundled into the client**, not server-side.

## Architecture

moneySense is a single-page React 19 + Vite + Tailwind v4 app that parses bank statements (OFX/CSV/PDF) into categorized transactions. There is **no backend**: all state lives in `localStorage` and all AI calls go directly from the browser to Google Gemini via `@google/genai`.

### Data flow (src/App.tsx is the orchestrator)

1. `App.tsx` holds the single `appData: OFXData` state and persists it to `localStorage` under `@moneysense:data`.
2. File import calls `processFiles()`, which dispatches on extension to a parser in `src/lib/parsers/`:
   - **OFX / CSV** → parsed 100% locally (`ofxParser.ts`, `csvParser.ts`). UI shows a green "processamento local" badge.
   - **PDF** → sent to Gemini (`pdfParser.ts` → `aiService.ts`). UI shows an amber "nuvem" badge. The privacy distinction between local vs. cloud parsing is user-visible and should be preserved.
3. After parsing, **all** new transactions are batch-categorized in a single call to `categorizeTransactionsWithAI()` in `src/lib/aiService.ts`. Don't re-introduce per-transaction AI calls.
4. Transactions are merged with existing ones and deduped by `tx.id` using a `Map` (see `processFiles` in `App.tsx`). Parsers must produce stable IDs for dedup to work.

### AI learning loop

When the user edits a transaction category in `TransactionsList`, `updateTransactionCategory` in `App.tsx` appends `{memo, cleanName, category}` to `localStorage` under `@moneysense:corrections`. `aiService.ts` reads the last 20 corrections and injects them into the Gemini prompt as "CORREÇÕES MANUAIS DO USUÁRIO (PRIORIDADE MÁXIMA)" to bias future categorizations. Any changes to the correction schema must be made in both places.

### Key modules

- `src/lib/parsers/` — one parser per format plus `index.ts` with a `parseBankStatement()` dispatcher (note: `App.tsx` currently calls the individual parsers directly, not the dispatcher).
- `src/lib/aiService.ts` — all Gemini calls. Exports `categorizeTransactionsWithAI`, `extractAndCategorizeFromDocument` (PDF), `checkIfBankStatement`, and `chatWithAI` (used by `GlobalAssistant`).
- `src/components/GlobalAssistant.tsx` — floating chat that receives `appData` and calls `chatWithAI` with a persona + current financial context.
- `src/components/Dashboard.tsx`, `TransactionsList.tsx`, `Sidebar.tsx` — UI; Dashboard also accepts drag-and-dropped files and calls back into `App.processFiles`.

### Styling

- Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config.js` — config is in `src/index.css` using `@theme`).
- `motion/react` (Framer Motion successor) for animations, `lucide-react` for icons, `react-hot-toast` for notifications.
- `@` alias resolves to the project root (see `vite.config.ts`), not to `src/`.

### UI language

User-facing strings are in **Brazilian Portuguese**. Currency defaults to BRL. Keep new UI copy in pt-BR.
