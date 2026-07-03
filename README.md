# Ezra Bid Assistant

A private Chrome extension that helps draft Freelancer.com proposals faster. It extracts visible project details from the page, generates a proposal through your own backend and OpenAI, and lets you copy or insert the text into the bid box. **It never auto-submits bids.**

## Prerequisites

- [Bun](https://bun.sh/) 1.3+ (the repo uses Bun workspaces)
- Google Chrome (Manifest V3 side panel support)
- An [OpenAI API key](https://platform.openai.com/api-keys) with access to the Responses API
- A Freelancer.com account for end-to-end testing

## Repository layout

```
ezra-bid-assistant/
├── backend/     # Next.js API (generate-bid, health)
├── extension/   # Chrome MV3 extension (content script, side panel, options)
├── shared/      # Shared types, prompt builder, API contract
└── docs/        # Product spec and UI reference
```

## Environment setup

### 1. Install dependencies

From the repository root:

```bash
bun install
```

### 2. Configure the backend

Copy the example env file and add your OpenAI key:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | Server-side only; never stored in the extension |
| `OPENAI_MODEL` | No | `gpt-4o` | Model passed to the OpenAI Responses API |
| `OPENAI_TEMPERATURE` | No | `0.7` | Sampling temperature (0–2) |
| `ALLOWED_ORIGINS` | No | — | Comma-separated extra CORS origins for production (see below) |

The extension only needs the **backend base URL** (default `http://localhost:3000`). Model and temperature are backend env vars, not client settings.

**CORS:** The backend reflects `Access-Control-Allow-Origin` only for `chrome-extension://` origins and `http://localhost:3000` / `http://127.0.0.1:3000`. Add production origins via `ALLOWED_ORIGINS` if needed.

### 3. Verify the backend (optional)

With the dev server running (see below):

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{ "status": "ok" }
```

## Local development

Run the backend and extension in **separate terminals**.

### Terminal 1 — Backend

```bash
bun run dev:backend
```

Next.js serves at [http://localhost:3000](http://localhost:3000).

### Terminal 2 — Extension

```bash
bun run dev:extension
```

Vite builds the extension into `extension/dist` with hot reload. After code changes, use **Reload** on the extension card in `chrome://extensions` if the side panel or content script does not update automatically.

### Other useful commands

| Command | Description |
|---------|-------------|
| `bun run build` | Production build for backend and extension |
| `bun run typecheck` | Typecheck all workspaces |
| `bun run lint` | Run Biome lint/format |

## Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `extension/dist` folder (not the `extension` source folder).
5. Pin **Ezra Bid Assistant** from the extensions menu if you want quick access to the side panel.

### Options page

Right-click the extension icon → **Options**, or open it from **Settings** in the side panel. The options page includes:

- **Create Bid** — full-page bid form (manual entry or drafts)
- **Prompt Settings** — sign-off, company, services, default style/length, custom rules
- **Saved Drafts** — locally stored proposals
- **API Settings** — backend URL and **Test Connection** (`GET /api/health`)

Use **Setup guide** in the options sidebar footer for full repository setup docs.

Default backend URL is `http://localhost:3000`. Change it in **API Settings** if your server runs elsewhere.

## Test on Freelancer.com

Use a real project page to validate detection, generation, and insert behavior.

### 1. Start the stack

- Backend running with a valid `OPENAI_API_KEY` in `backend/.env`
- Extension loaded from `extension/dist`
- In **API Settings**, backend URL set (e.g. `http://localhost:3000`) and **Test Connection** succeeds

### 2. Open a project page

Navigate to a Freelancer project URL matching:

```
https://www.freelancer.com/projects/...
```

The content script runs only on `*://*.freelancer.com/projects/*`.

### 3. Confirm detection

- A floating **Generate Bid with Ezra** button appears (bottom-right).
- Click it, or open the side panel from the extension icon.
- Side panel status should show **Project detected** when title or description was extracted.
- If fields are missing, edit them manually or click **Refresh from page**.

### 4. Generate a proposal

1. Optionally add **Extra instructions** and choose **Proposal style** / **Proposal length**.
2. Click **Generate Proposal**.
3. Wait for the generated text in the output area.
4. Use **Regenerate**, **Copy**, **Save Draft**, or **Clear** as needed.

### 5. Insert into the bid box (manual submit only)

1. On Freelancer, open the bid/proposal UI so the bid textarea is visible.
2. In the side panel, click **Insert Into Bid Box**.
3. Confirm the toast: *Proposal inserted. Please review and submit manually.*
4. Review the text in Freelancer’s textarea and **submit the bid yourself**.

The extension only writes into the textarea. It does not click Submit or automate any other form action.

### 6. Troubleshooting on Freelancer

| Issue | What to try |
|-------|-------------|
| No floating button | Confirm URL is `/projects/...`; reload the page; check the extension is enabled |
| “No project detected” | Freelancer may have changed their DOM; fill fields manually or use **Create Bid** in options |
| Health check fails | Ensure `bun run dev:backend` is running and the URL has no trailing path (use `http://localhost:3000`) |
| Generate fails with 503 | Set `OPENAI_API_KEY` in `backend/.env` and restart the backend |
| Insert fails | Open the bid modal first so the textarea exists; then insert again |
| CORS / network errors | Backend must be reachable from the extension; for production, deploy the backend and set that URL in API Settings |

## API reference

### `GET /api/health`

Returns `{ "status": "ok" }`. Used by **Test Connection** in the extension.

### `POST /api/generate-bid`

Request body (all string fields):

```json
{
  "projectTitle": "",
  "projectDescription": "",
  "budget": "",
  "skills": "",
  "clientCountry": "",
  "projectType": "",
  "extraInstructions": "",
  "proposalStyle": "Professional",
  "proposalLength": "Medium",
  "customPromptRules": ""
}
```

Response:

```json
{ "proposal": "Generated proposal text here" }
```

## Safety and permissions

- **No auto-submit** — proposals are inserted as text only; you submit manually.
- **No credential harvesting** — no cookies, passwords, or session tokens are read or sent.
- **Minimal permissions** — `sidePanel`, `storage`, and host access to `*.freelancer.com` only.
- **OpenAI key on server** — the extension talks only to your backend; the API key stays in `backend/.env`.

## Production deployment

1. Deploy the Next.js backend (e.g. Vercel) with `OPENAI_API_KEY` set in the host’s environment.
2. Set `ALLOWED_ORIGINS` to your deployed backend URL if you use a custom domain for API access from the extension.
3. Run `bun run build` and load `extension/dist`, or distribute the built folder as a private unpacked extension.
4. Set the deployed backend URL in **API Settings** and run **Test Connection**.

## Conventions

- **File and folder names** use kebab-case (e.g. `side-panel/`, `create-bid-page.tsx`).
- **Chrome storage keys** use kebab-case (`ezra-settings`, `ezra-drafts`); legacy `ezra_*` keys migrate automatically.
- **TypeScript identifiers** remain camelCase/PascalCase per language norms; API JSON fields match the product spec.

## License

GPL-3.0 — see [LICENSE](LICENSE).
