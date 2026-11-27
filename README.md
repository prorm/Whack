# CAPABLE

**Prove it. Don't claim it.**

Every engineering student grinds the same puzzles and polishes the same résumé, and AI now does both for free, so those signals no longer prove anything. CAPABLE replaces them with the work itself: compiled from what employers actually need, practised in workplace labs, proven on a task you've never seen, and updated the moment the job changes.

<img src="docs/media/homepage.png" alt="CAPABLE homepage with a live solar experiment and a cell temperature slider" width="100%">

## How it works

| Step | Route | What happens |
|---|---|---|
| **Work Compiler** | `#/demand` (organization seat) | An employer describes the work in their own words. CAPABLE maps it to tasks, capabilities on a shared graph and the prerequisites they never wrote down. Unknown tools are flagged *awaiting validation*. Optional Gemini second opinion, restricted to graph ids. |
| **Demand graph** | `#/demand` | Several employers normalised into one shared foundation plus their own branches. A changed requirement shows only what is new. |
| **Career GPS** | `#/gps` | The shortest path from your evidence to a role. Proven steps are skipped; a skill you declare goes straight to an unseen task. |
| **FLUX Learn** | `#/home` → `#/fl-course` | Narrated, interactive lessons (teach → predict → experiment → trace → test → train → job ticket → project). First course: Rooftop Solar Technician. Story episodes for payments and EV charging. |
| **Work labs** | `#/codelab`, `#/datalab`, `#/capable`, `#/capable-forge` | CodeLab (a failing payment webhook), DataLab (a messy payout reconciliation), the Practical Arena (3D electrical fault finding) and Solar Forge. Practice is graded on the device. |
| **AI Pair** | `#/ailab` | AI fluency, graded in every lab: brief an assistant without leaking secrets, catch the patch or diagnosis it gets confidently wrong, prove it with a test or a meter reading. Software and trades tracks. |
| **Revision reels** | `#/flux-reels` | Only concepts you've already learned, on a 1 · 3 · 7 · 21-day ladder; your misses come back first. |
| **Unseen proof** | lab "Unseen trial" | The server draws a variant you never practised, re-grades it (CodeLab code runs in a locked sandbox against hidden tests) and signs an Ed25519 receipt. |
| **Proof Passport** | `#/sp-passport`, `#/capable-proof` | One evidence view, with level and source. Share with a QR code; anyone can verify the signature in their own browser (`#/capable-public`). Revoke and the link returns 410. |
| **Opportunity Exchange** | `#/exchange` | Jobs, internships, apprenticeships and paid projects with per-requirement coverage and no hidden score. Learners choose who sees what. |
| **Field Scars** | `#/sp-teach` | Experienced workers turn real site mistakes into reviewed cards (safety and slop sieve, 2-of-3 master review). |

All employers, people and listings are fictional and labelled **DEMO**. Identity is never claimed as verified.

## Run

```sh
npm install --prefix app
npm run demo --prefix app          # build + server (SQLite) on http://127.0.0.1:4173
```

For the phone-verification demo, start the server on the network and open the app via the laptop's LAN IP:

```sh
cd app && npm run build && node ../scripts/capable_server.mjs --port 4173 --host 0.0.0.0 --data .data/demo.sqlite
```

`#/home?demo=seed` loads a labelled demo learner; `#/home?demo=reset` wipes this device.

## Verify

```sh
npm run test:all --prefix app      # 65 tests: FLUX engine + curriculum, capability layer + AI Pair, server trials and signatures
npm run lint --prefix app
```

## Repository

| Path | Contents |
|---|---|
| [`app/src/sp/`](app/src/sp/) | The shell: Learn · Revise · Proof · Jobs · Teach, the employer seat and the public share view |
| [`app/src/flux/`](app/src/flux/) | FLUX engine (`physics.ts`, `memory.ts`, `assess.ts`, `passport.ts`, `skills.ts`), FLUX Learn (`learn/`), episodes, reels, Field Scars, Lab Blueprints |
| [`app/src/os/`](app/src/os/) | Capability layer: taxonomy, Work Compiler, Career GPS, market, evidence, CodeLab, DataLab, AI Pair, and their UI |
| [`app/src/capable/`](app/src/capable/) | TradeLab: Practical Arena, Solar Forge, Mentor, signed receipts |
| [`scripts/`](scripts/) | `capable_server.mjs` (static + API), `capable_upgrade.mjs` (trials, grading, Ed25519), `codelab_sandbox.mjs`, media and narration scripts |
| [`remotion/`](remotion/) | The CAPABLE X film (`src/capx/`); render with `npm run render --prefix remotion` → `out/CAPABLE-X-Film.mp4` (not committed, 230 MB) |
| [`reports/final/`](reports/final/) | [Pitch](reports/final/CAPABLE_X_PITCH.md) · [Plan](reports/final/CAPABLE_X_PLAN.md) · [A–Z](reports/final/CAPABLE_A_TO_Z.md) · [Pilot plan](reports/final/PILOT_PLAN.md) |
| [`pitch/`](pitch/) | Web slide deck |

## Boundaries

- **No AI grades anything.** Grading is deterministic code; AI only proposes (the compiler's second opinion), explains (Mentor) or plays a labelled role (AI Pair's scripted assistant).
- Capabilities without a validated lab are marked *awaiting validation* and can never be awarded.
- Hazardous skills only lead to a supervised, in-person practical. The electrical labs are simulations.
- A signature proves the record is authentic, not who produced it.
