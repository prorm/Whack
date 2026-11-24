# ScrollProof 4.0 experience sprint

Verified on 24 November 2026 in desktop Chromium 157 on Windows. The primary journey starts with school or job goals, asks learners to confirm a skill, and uses the existing diagnostic and competency graph to recommend lessons. It continues through timed revision, an unseen payout worksheet, trainer review and an opt-in Skill Passport preview. Stock variance is covered in the diagnostic and lessons. The formal assessment in this demo is the payout worksheet.

## Delivery measurements

Each cold scenario used a fresh Chromium browser context with a 390 × 844 CSS-pixel mobile viewport. Times run from navigation to the revision heading and service worker readiness. Bytes are HTTP response bodies served during the measurement window, including compressed app files and the offline pack install, excluding headers and uploads. These are individual runs on localhost. The slow scenario adds 800 ms server delay per request and browser throttling at 150 ms latency, 125,000 B/s down and 50,000 B/s up.

| Scenario | Revision heading | Offline pack ready | Total served | Media served |
| --- | ---: | ---: | ---: | ---: |
| Rich, cold | 489 ms | 741 ms | 295,930 B | 173,541 B |
| Lite, cold | 415 ms | 634 ms | 161,035 B | 38,646 B |
| Offline profile, first online install | 325 ms | 530 ms | 122,389 B | 0 B |
| Lite, throttled | 4,329 ms | 6,176 ms | 161,035 B | 38,646 B |
| Rich, media unavailable | 466 ms | 801 ms | 122,599 B | 0 B |

- Rich video began playing at 805 ms. The cached clip is 134,895 B and the still is 38,646 B. On a warm Rich reload, the video played with zero media bytes served.
- The offline pack held five cache entries, with 394,675 B of decoded contents. Optional audio loaded only after an explicit action. The five reel sound effects total 25,616 B. The English lesson tracks are 133,910–233,665 B each.
- With the server process stopped and Chromium offline, the payout challenge reloaded in 447 ms with zero network bytes. The draft survived another reload. A correct submission stayed pending until the server restarted, then synced and became available for review.
- The showcase contains a 1080 × 1920 H.264 video and an AAC sound-effects track. It runs 19.52 seconds and is 4,916,493 B. The app composes personalized reels from reusable media and text on the device. The showcase file is for playback and review. [Showcase MP4](../outputs/experience_sprint/scrollproof-payout-check.mp4)

## What passed

- All 35 existing engine tests, the production build, and Remotion type-checking passed. App lint exited successfully with warnings.
- Browser checks covered editable job-to-skill suggestions, an adaptive diagnostic, saved lesson answers across modes, optional audio, personalized repair, the recall gate, an unseen worksheet, reconnect sync, review, consent revocation, and detaching a prior review when a new attempt starts.
- Rich, Lite, Offline and Data Saver were exercised. Injected media failures left the calculation and recall available. Review rejected attempts with a missing upload, a different device token or a missing configured trainer code. Parallel retries preserved one stored submission.
- Axe found zero WCAG A/AA rule violations across 20 checked screen states. The checked controls met the 44 × 44 CSS px target using their associated label area where applicable. At 320 CSS px and 200% text size the checked screens had no horizontal overflow, and the recall and feedback buttons fit inside the reel. Keyboard submission and reduced-motion scene controls were exercised.

The browser screenshots include [onboarding](../outputs/experience_sprint/desktop-onboarding.png), [diagnostic](../outputs/experience_sprint/mobile-diagnostic.png), [learning path](../outputs/experience_sprint/mobile-path.png), [reel recall](../outputs/experience_sprint/mobile-reel-recall.png), [offline review](../outputs/experience_sprint/mobile-review-pending.png) and the [consented Skill Passport](../outputs/experience_sprint/mobile-passport.png). Detailed timings, requests, cache entries and audit results are available in the [browser measurements](../outputs/experience_sprint/browser-measurements.json).

## Remaining work

- **Physical Android device and learner pilot: NOT TESTED.** Touch, camera, audio playback, low-end performance, system font settings and offline reload still need physical-device validation. The pilot and delayed recall follow-up need participants. Manual screen-reader testing is also pending.
- Kannada glyphs rendered in Chromium. Parts of the journey, diagnostics and lessons remain English, the Kannada narration covers the basic lesson, and fluent review of Kannada text and audio is pending. [Kannada reel capture](../outputs/experience_sprint/mobile-kannada-reel.png)
- Sync is scoped to this browser's device token. The review confirms the exact worksheet on the server. Identity verification, learner accounts, cross-device recovery and external credential issuance remain outside this demo. The employer preview stays on the learner's device.
