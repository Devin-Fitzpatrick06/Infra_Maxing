# GPU Reservation Optimizer — Hackathon Build Plan

**Status:** Working plan · **Date:** 2026-07-18 · **Cycle:** Builders Cup X

> **The product:** combine Ornn's compute forward curves with a company's *live* GPU telemetry from Datadog to recommend reserve-vs-on-demand timing and quantify the savings.
>
> **Judge feedback we're building around:** *"Don't ship a data-API wrapper with a dashboard on top. Show versatility."*
>
> **Our reading of that:** the savings thesis is right — we're not changing it. The upgrade is (a) a **live Datadog integration** so recommendations run on the customer's real usage and cost data instead of static exports, and (b) a **scenario sandbox** UI that lets teams *explore* trade-offs interactively instead of reading a report. (An agentic layer is scoped out for now; parked at the bottom for post-hackathon.)

---

## Judging rubric → what we're optimizing for

| Rubric axis | What we ship to win it |
| :--- | :--- |
| **Technical complexity** | Forward-curve integration; deterministic recommendation engine; live Datadog ingest + normalization pipeline; backtest engine; interactive sandbox that re-runs the projection on every input change |
| **Pitch** | One number: "$X saved on backtested spend using Ornn + your Datadog." Anchored on real (or realistic-fixture) Datadog data |
| **Original idea & real problem** | Forward-curve *timing* is the novel input; every FinOps tool today looks only at current price. Real problem: GPU spend is a top-3 line item and reservation decisions are made blind to the forecast |
| **"Would I invest in this?"** | Adoption is trivial — plug in Datadog, get a recommendation. No data pipeline to build. Savings compound; the tool pays for itself in the first pilot |
| **Track fit — save time / money** | Direct: fewer hours spent modeling in spreadsheets, and hard $ off the compute bill |

---

## What stays (the core)

The concept-doc engine is intact:

1. **Ornn forward curve** by GPU type → market forecast for compute prices.
2. **Customer's own usage forecast + reservation posture** → what they need to buy.
3. **Recommendation engine** → reserve now / wait / mix, with **projected $ saving vs. staying on-demand** and a **confidence band**.
4. **Backtest** against 6–12 months of history → the credibility number.

The concept doc's caveats also stay (chip coverage, forecasts can be wrong, human approves before commit, scope is raw GPU not API bills).

---

## What we're adding

### 1. Datadog integration — live company data (the technical-complexity story)

The point of the Datadog integration is to kill the "you export a CSV and we plot it" workflow. Customers connect Datadog once; the app pulls their real GPU utilization, instance-hours, and cost data on a schedule, feeds it into the recommendation engine, and keeps every recommendation grounded in live telemetry.

**What the integration does (straight ETL, no LLM in the loop):**

- **Connect.** OAuth or API+App key flow against Datadog. Store credentials in Supabase.
- **Discover workloads.** List GPU-tagged hosts and containers via Datadog's hosts/tags APIs. Group by tag conventions (`workload`, `env`, `team`) into workload records in Supabase. The user confirms/edits the grouping in a one-time setup screen — no reasoning agent required, just a good UI.
- **Ingest metrics.** Scheduled fetch of the metrics we need per workload:
  - GPU utilization: `nvidia.gpu.utilization`, `dcgm.gpu.util`
  - Instance-hours: `system.core.count` scoped to GPU hosts, or Datadog's host-hours
  - Cost: Datadog Cloud Cost Management API (`/api/v2/cost/aws_cur_config`, hourly breakdowns)
  - Reservation vs on-demand mix: derived from cost line items
- **Normalize.** Roll up to daily usage series per workload and per GPU type, in the exact shape the recommendation engine expects. This is the boring but essential glue.
- **Refresh.** Cron re-runs the ingest daily; a webhook/manual trigger allows on-demand refresh in the demo.
- **Provenance.** Every metric shown in the UI carries the Datadog query that produced it, viewable on hover.

**Why this is technically interesting even without an agent:** Datadog's cost API isn't trivial — cost data is delayed, tag conventions vary, and joining utilization to cost requires careful time alignment. The pipeline that turns raw Datadog into a clean per-workload usage/cost series is a real chunk of engineering, and it's what makes the recommendation trustworthy.

### 2. Scenario sandbox — the primary UI (the "not a dashboard" story)

The main interactive surface is a **sandbox**, not a report. Users drag sliders and watch the projection re-run in real time.

**What's on the screen:**

- **Left panel — inputs (sliders + toggles):**
  - Reservation mix: % steady-load reserved (0–100%)
  - Commitment horizon: 3 / 6 / 12 / 36 months
  - Usage forecast bias: -25% to +25% (stress test)
  - Curve scenario: `market` (Ornn baseline) / `bull` / `bear` / `flat`
  - Workload scope: multi-select over the workloads ingested from Datadog
- **Center — projection chart:** cost trajectory over the horizon under the selected inputs, overlaid against the all-on-demand baseline. The shaded delta is the savings.
- **Right — summary card:** current projected $ saving, confidence band, break-even month, recommended mix. One-click "Adopt this scenario" writes it as a decision record.
- **Bottom — evidence strip:** every input traces back to a Datadog query or Ornn curve fetch. Hover any number to see the raw source.

**Why this beats a dashboard:** a dashboard tells you what happened. A sandbox lets you *test what to do next* — the exact modeling infra teams do in spreadsheets today, but with live Datadog data and a real forward curve underneath.

---

## Phases

Time budget: hackathon week. Every phase has a **demo artifact**.

### Phase 0 — Foundations (half-day)

- [ ] Next.js 16 + Supabase + shadcn scaffold runs end-to-end.
- [ ] Ornn forward-curve access confirmed (or fixture matching the shape) for H100 + one mid-range chip.
- [ ] Datadog account + API/App keys for a demo org (or a synthetic Datadog fixture that mirrors the real API shape).
- [ ] Decision record schema in Supabase: `{id, workload, question, recommendation, saving_estimate, confidence_band, rationale, datadog_queries, ornn_snapshot, created_at, approved_by, realized_delta}`.

**Demo artifact:** curl the Ornn curve and a Datadog metric from local, both land in the app.

### Phase 1 — Recommendation engine (Day 1)

The math. Deterministic, pure functions.

- [ ] Implement the reserve-vs-on-demand model: inputs (curve, usage series, current posture, discount schedule) → outputs (recommended mix, projected saving, confidence band).
- [ ] Deterministic given the same inputs — important for backtest reproducibility and for real-time sandbox re-runs.
- [ ] Persist every run as a decision record.

**Demo artifact:** given a fixture workload, engine returns "reserve X of steady load, save $Y over 6mo, ±Z% confidence" with the tool trace.

### Phase 2 — Backtest (Day 2)

The credibility number.

- [ ] `backtest(strategy, window)` over 6–12 months of history.
- [ ] Metrics: cumulative $ saved vs. all-on-demand baseline, hit rate, worst month.
- [ ] "Backtest this recommendation" replays the engine's own logic historically.

**Demo artifact:** *"Following this recommendation over the last 12 months would have saved $X."* The pitch anchor.

### Phase 3 — Datadog integration (Day 3) — **the technical-complexity phase**

Live company data end-to-end.

- [ ] Datadog credential storage in Supabase (encrypted).
- [ ] **Connect flow:** simple settings screen for API + App key.
- [ ] **Workload discovery:** fetch GPU-tagged hosts/containers, group by tag conventions, let user confirm/edit groupings in a setup screen.
- [ ] **Metric ingest:** scheduled fetch of utilization + instance-hours + cost per workload; store daily rollups in Supabase.
- [ ] **Cost normalization:** join Datadog cost line items to workloads; classify reservation vs on-demand.
- [ ] **Refresh cron:** daily re-run; on-demand trigger for the demo.
- [ ] **Query provenance:** persist the exact Datadog query for every stored data point so the UI can show sources.

**Demo artifact:** connect a Datadog account, run discovery + ingest, see 3 workloads with 30 days of real (or fixture) data ready for the sandbox — live on stage in under a minute.

### Phase 4 — Scenario sandbox UI (Day 4) — **the UX story**

The primary interactive surface.

- [ ] Left-panel controls (sliders + toggles as spec'd above).
- [ ] Center projection chart with baseline overlay and savings delta.
- [ ] Right-panel summary card + "Adopt this scenario" action.
- [ ] Evidence strip: every number traces back to a Datadog query or Ornn fetch.
- [ ] Real-time re-run: engine is fast enough (deterministic math) that sliders feel live. Debounce at ~50ms.
- [ ] Curve scenarios: bull / bear / flat / market pre-computed as perturbations of the Ornn curve so switching is instant.

**Demo artifact:** drag "% steady-load reserved" from 0% to 80%; projected saving climbs from $0 to $X in real time; hit "Adopt" to write a decision.

### Phase 5 — Curve-shift alerts + realized-vs-predicted (Day 5, morning)

The proactive touch + the "does it actually work" loop. Still deterministic — no LLM.

- [ ] Nightly job re-runs every open decision against the latest Ornn curve + latest Datadog ingest.
- [ ] If a recommendation flips (or projected saving moves > threshold), fire an in-app notification with a link back to the sandbox pre-loaded to the new scenario.
- [ ] Approved decisions accumulate a realized-vs-predicted delta over time, backfilled from Datadog cost data.

**Demo artifact:** perturb the fixture curve mid-demo, refresh — a notification fires and the sandbox opens on the new recommendation.

### Phase 6 — Polish & pitch (Day 5, afternoon)

- [ ] "Explain this decision" — re-render the rationale for any past decision.
- [ ] 3-minute demo script: Datadog connect → workloads discovered → sandbox drag → adopt scenario → force curve shift → notification fires. Hit every rubric axis once.
- [ ] Fallback recording for network flakes.
- [ ] Pitch slide with the backtested $X and the "plug in Datadog, go" adoption story.

**Demo artifact:** the pitch.

---

## Pitch flow (aligned to rubric)

1. **Problem (real & original).** GPU reservations = mortgages made blind to the rate forecast. Every FinOps tool looks at *today's* price.
2. **Insight.** Ornn now publishes forward curves for compute. That's the missing input.
3. **Product.** Connect Datadog → we pull your real usage → sandbox lets you test scenarios against the forward curve → adopt one → we track realized savings.
4. **Technical depth.** Show the Datadog ingest pipeline live; show query provenance on every number in the sandbox.
5. **Proof.** Backtested $X saved over the last 12 months on this fixture (or pilot) data.
6. **Adoption.** No pipeline to build. One Datadog connection. Recommendations in minutes.
7. **Why us / why now.** Forward curves are new (Ornn 2025+); Datadog Cloud Cost Management makes the ingest tractable; GPU spend is a top-3 line item at any AI-heavy org.

---

## What we're explicitly cutting

- Real cloud billing integrations beyond Datadog Cloud Cost — Datadog is our single seam.
- Multi-tenant auth — one demo workspace.
- **Agentic layer** — parked for post-hackathon (see bottom).
- Slack / chat / CLI surfaces — the sandbox is the UI.
- Coverage across every GPU chip — H100 + one mid-range chip; coverage caveat on-screen verbatim from the concept doc.
- Reports / static PDFs — the sandbox is the report.

---

## Risks & mitigations

| Risk | Mitigation |
| :---- | :---- |
| Datadog API access unavailable for demo | Ship a Datadog-shaped fixture server that mirrors the real API contracts; swap in real Datadog if we get keys in time |
| Datadog cost API is delayed / gappy | Fall back to utilization × posted on-demand price for the demo; note the reconciliation path in the pitch |
| Sandbox feels sluggish | Engine is pure math, deterministic; pre-compute the curve scenarios; debounce slider updates |
| Ornn coverage thin for our chips | Fix chip mix in Phase 0; if Ornn covers only H100, demo on H100 and note the roadmap explicitly |
| Backtest number underwhelms | Choose window + workloads honestly; a real modest $X with a caveat beats a fabricated 10× |
| Judges see forecasts as unreliable | Confidence band + explicit "human approves" pattern in the UI; concept-doc caveats stay on the pitch slide |

---

## Success criteria for the demo

- Connecting Datadog → workloads ingested → sandbox usable happens **live on stage** in under a minute.
- Every number in the sandbox has a **traceable source** (Datadog query or Ornn snapshot).
- Backtest reports a defensible **$-saved figure**.
- A **curve-shift notification** fires unprompted during the demo.
- Nothing on screen looks like "SELECT * FROM ..." wrapped in a chart.

---

## Parked for post-hackathon: agentic layer

Not building this now, but noting it here so we don't lose the thread.

Once the deterministic pipeline is in production, an agent layer on top could:
- Auto-classify new workloads as they appear in Datadog (instead of the user confirming groupings once).
- Answer ad-hoc questions in natural language ("what if we let the H100 reservation lapse?") without requiring a sandbox interaction.
- Draft renewal-decision briefs on a schedule.
- Reconcile mismatches between declared reservation posture and observed cost behavior.

Everything the agent would do is a layer over the deterministic engine we're building in Phases 1–3. Deferring it keeps the demo focused and the technical story crisp.

---

## Open questions before Phase 1

1. **Datadog access** — do we have API + App keys for a working account with GPU-tagged hosts? *(Gating for Phase 3.)*
2. **Ornn access** — API or fixture? Coverage for our chip mix?
3. **Backtest history** — real historical Ornn slice, or synthetic mean-reverting curve?
