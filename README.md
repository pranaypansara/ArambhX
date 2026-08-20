# ARAMBHX — Student Pulse

AI-powered Academic Dropout Prediction & Intervention System — frontend.

Built with React 19 + Vite + Tailwind CSS v4 + react-router-dom + recharts + lucide-react.

## Getting started

```bash
npm install
npm run dev      # start local dev server
npm run build    # production build to /dist
```

## Project structure

```
src/
  data/mockData.js         # mock data shaped 1:1 to the Postgres/Neon schema
                            # (users, students, attendance_records, academic_records,
                            # predictions, prediction_factors, alerts, interventions,
                            # intervention_outcomes, notifications). Swap this module
                            # for real fetch() calls against the Express API and the
                            # rest of the app needs no changes.
  lib/riskUtils.js          # risk-level colors, date/time formatting helpers
  components/
    layout/                 # Sidebar, Topbar, AppShell (routing outlet + Pulse AI launcher)
    ui/                     # KpiCard, RiskBadge, RiskGauge, TrendIndicator, StudentAvatar,
                             # Skeleton/EmptyState/ErrorState, Toast, Modal/Drawer, Page headers
    charts/                  # RiskLandscape (signature scatter), RiskTrendChart, ShapChart,
                              # StudentRiskLine, InterventionSnapshot
    student/                 # RiskJourneyTimeline
    ai/                      # PulseAIPanel (floating chat), ProactiveInsights
  pages/                     # one file per screen (see below)
```

## Screens implemented

| # | Screen | Route |
|---|--------|-------|
| 01 | Faculty Command Center | `/` |
| 02 | Student Priority Queue | `/students` |
| 03 | Student Profile / Risk Story | `/students/:id` |
| 04 | Why Did This Change? explorer | `/students/:id?tab=why` |
| 05 | Multi-Factor Alert Detective | `/alerts` |
| 06 | Intervention Copilot | `/interventions` (Copilot tab) |
| 07 | Intervention Workflow | `/interventions` (Workflow tab) |
| 08 | Intervention Impact Loop | `/outcomes` (Impact Loop tab) |
| 09 | Adaptive Escalation | `/outcomes` (Escalation tab) |
| 10 | Student Comparison Mode | `/comparison` |
| 11 | Smart Notification Center | `/notifications` |
| 12/13 | Pulse AI + Proactive Insights | `/pulse-ai` (+ floating panel everywhere) |
| 14 | Reports & Analytics | `/reports` |
| — | Risk Intelligence (institutional view) | `/risk-intelligence` |
| — | Settings | `/settings` |
| — | Student-facing dashboard | `/student-view` |

## Design system

- **Palette**: deep navy/teal foundation (`--color-void`, `--color-deep`, `--color-panel`),
  teal/cobalt accents, restrained lime (positive), amber (warning), coral (critical).
- **Type**: Sora (display/headings), IBM Plex Sans (body), IBM Plex Mono (all data — risk
  scores, percentages, IDs, timestamps) — set up in `src/index.css` via `@theme`.
- **Signature visual**: the Risk Landscape (`components/charts/RiskLandscape.jsx`) is a
  hand-built SVG scatter — risk probability × deterioration velocity, quadrant-labeled,
  with a short "comet trail" behind each node hinting at recent trajectory.
- Motion: CSS-only (count-up KPIs, animated risk gauges/lines, skeleton shimmer, node-in
  stagger on the scatter plot) — no animation library dependency.
- A high-contrast theme toggle lives in the top nav (moon/sun icon) alongside a Settings
  shortcut, satisfying the "theme/settings controls" requirement without undermining the
  intentional dark palette.

## Interactive/workflow features worth knowing about

- **Priority Queue** filters on risk level, department, semester, risk trend, alert type,
  and intervention status, plus five sort modes including "Intervention overdue." Priority
  score is a blend of risk + deterioration velocity + open-alert count — not raw risk — so
  a fast-deteriorating student can rank above a higher but stable one, per the brief.
- **Intervention Workflow** is editable: click any row to open a drawer and update status
  and notes (state lives in-memory; wire to a `PATCH /api/interventions/:id` call when the
  backend is ready).
- **Confirmation dialogs** guard the two irreversible actions in the demo (Resolve Alert,
  Escalate Case) using the shared `Modal` component.
- **Reports** has a working CSV export (`Export student risk summary`) built from the same
  mock data — swap `downloadCsv` for a real endpoint call if you want server-generated
  exports instead.
- **Student-facing dashboard** (`/student-view`) never surfaces a raw risk percentage —
  it shows a composite "Overall Progress" status (On Track / Needs Attention / In Recovery)
  instead, plus its own lightweight Pulse AI chat scoped to supportive, actionable language.

## Connecting to the real backend

Replace the exports in `src/data/mockData.js` with `fetch()` calls to your
Node/Express + pg + Neon API (e.g. `GET /api/students`, `GET /api/predictions/:studentId`,
etc.), keeping the same shapes. Every page/component consumes these functions rather than
raw arrays, so the swap is localized to that one file plus adding loading/error states
where the `Skeleton`/`ErrorState` components already exist as placeholders (see Overview.jsx
for an example of the loading-skeleton pattern already wired up).

## Known trade-offs (given competition timeline)

- Pulse AI is currently a rule-based assistant over the in-memory mock data (pattern
  matching on the question + student names) — structured so a real LLM/RAG backend call
  can be dropped into `buildAnswer()` in `PulseAIPanel.jsx` without changing the UI.
- No auth flow is wired up yet (role is fixed to the mock `CURRENT_USER`); the `users`
  table and RBAC concept are modeled in the data layer so this is straightforward to add.
- The `ErrorState` component exists in the shared UI kit but isn't triggered anywhere live,
  since all data is synchronous mock data with nothing that can fail — wire it up alongside
  real API calls (a fetch `catch` block is the natural place).
- Bundle is a single chunk (~776 KB / ~224 KB gzip) — fine for a demo; route-based
  `React.lazy` code-splitting is a quick follow-up if needed.
