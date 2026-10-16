# BillCraft

Premium privacy-first business document studio for invoices, quotations, receipts and GST calculations. **No account, no backend, no cloud document storage** — everything happens in your browser.

## Features

- 🧾 **Invoices, quotations, receipts, estimates and proforma invoices** with one-tap conversion between document types
- 🇮🇳 **GST support** — CGST + SGST, IGST, per-item tax control, automatic calculations
- 🖨️ **PDF export and printing** via jsPDF + html2canvas
- 📚 **Template gallery** with multiple professional document layouts
- 🧰 **Business tools** — including UPI QR code generation
- 🌗 **Light and dark themes** with the BillCraft brand palette
- 📱 **Mobile-first responsive interface** with bottom tab navigation
- ⌨️ **Command palette**, live document preview and editor
- 🔒 **Privacy-first** — all data stays in your browser's local storage; nothing is sent to any server

Six navigation tabs: **Home, Create, Editor, Templates, Tools, Settings**.

## Technology Stack (verified from this repository)

- **Next.js 15** (App Router, static export via `output: 'export'`)
- **React 19** + TypeScript
- **Tailwind CSS 4**
- **jsPDF + html2canvas** for PDF generation
- **qrcode** for UPI payment QR codes
- **Bun** as the package manager (`bun.lock`)

BillCraft is a fully static, browser-only application. There is no authentication, no backend server, no database and no cloud document storage. Invoice calculations, document rendering and PDF generation all run locally in the browser.

## Local Development

```bash
bun install
bun run dev
```

Then open http://localhost:3000. In local development the site is served from the root path, no base path is needed.

## Build

```bash
bun install
bun run build
```

The production build is exported to the `out/` directory as a fully static site.

> Note: when building for GitHub Pages manually, set the sub-path so assets resolve correctly:
>
> ```bash
> NEXT_PUBLIC_BASE_PATH=/billcraft bun run build
> ```

## Deployment — GitHub Pages

BillCraft deploys automatically to GitHub Pages through GitHub Actions.

**Repository → Settings → Pages** must have the publishing source set to **GitHub Actions** (not a branch folder). If this is already the case, nothing else is needed.

### How it works

1. Every push to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
2. The workflow installs dependencies with Bun (using the committed `bun.lock`), runs the production build, verifies `out/index.html` exists, uploads the build as a Pages artifact and deploys it with the official GitHub Pages actions.
3. Manual deployments are also possible: **Actions → Deploy BillCraft to GitHub Pages → Run workflow**.

The workflow uses the minimum required permissions (`contents: read`, `pages: write`, `id-token: write`) and a concurrency group so conflicting deployments cannot run in parallel. A failed build never deploys — the deploy job only starts after a successful build.

### Live website

Once deployed, the site is available at:

```
https://pdfly-source.github.io/billcraft/
```

### Troubleshooting a failed deployment

- **Actions tab → "Deploy BillCraft to GitHub Pages"** — open the failed run and check which step failed.
- Build errors appear in the **build** job; Pages errors appear in the **deploy** job.
- If deployment fails with a 404 after a successful build, check **Settings → Pages** — the source must be **GitHub Actions**.
- Stale site after a merge: re-run the workflow manually via **workflow_dispatch**.
- Pull the latest `main` before pushing to avoid lockfile (`bun.lock`) conflicts.

## Privacy and Static Hosting Limitations

- BillCraft stores all data (business details, documents, settings) **only in the browser's local storage**. Clearing browser data deletes it — use the export features to keep backups.
- Nothing you type is ever sent to a server; there are no analytics, tracking or backend calls.
- GitHub Pages hosts only static files — there is no server-side processing of any kind.
- No secrets, tokens, API keys or real customer data belong in this repository.

## Brand

| Color | Hex |
| --- | --- |
| Royal Plum | `#593C8F` |
| Mint Mist | `#A8D5BA` |
| Vanilla Cream | `#FAF6EE` |
| Deep Ink | `#17151F` |

Official logos live in [`public/assets/`](public/assets/).
