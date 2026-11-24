# Real Android device checklist

Everything below is **PENDING**: nothing in this report was executed on a physical phone. Desktop-Chrome results (390×844 iframe) are not a device test.

Suggested devices: one low-end Android (2–3 GB RAM, Android 11+, Chrome) and one mid-range. Record device model, Android version, Chrome version and network for each run.

| # | Test | Steps | Pass criteria | Result |
|---|---|---|---|---|
| 1 | Swipe gestures | Open feed, swipe up/down through all reels quickly and slowly | Snaps one reel per swipe; no double-skips; only the visible reel animates | PENDING |
| 2 | In-feed answer | Answer the remix reel with the on-screen keyboard | Numeric keyboard opens; feed does not scroll away while typing; feedback visible above keyboard | PENDING |
| 3 | Camera recording | Evidence → "Record or choose a video" | Camera opens (`capture=environment`); clip saved; plays back after reload | PENDING |
| 4 | Microphone permission | (Voice evidence not implemented) | Mark N/A until voice evidence exists | PENDING / N/A |
| 5 | Media upload size | Record ~45 s and ~70 s clips | 45 s accepted; >60 MB rejected with message | PENDING |
| 6 | Device audio | Learn → Audio (Kannada) on speaker and earphones | Plays; no clipping; hidden gracefully if it fails | PENDING |
| 7 | Kannada font rendering | Switch to ಕನ್ನಡ on every screen | Conjuncts render correctly (e.g. ಸ್ಟಾಕ್, ಪ್ರಯತ್ನ); no tofu boxes; no clipped lines | PENDING |
| 8 | Kannada semantic review | Fluent speaker reads all KN strings + `lesson.json` kn_turns | Natural, correct; terms acceptable to target learners | UNVERIFIED |
| 9 | Kannada pronunciation | Fluent listener plays `public/media/audio/kn_basic_sample.m4a` | Intelligible, natural | UNVERIFIED |
| 10 | Install / offline reload | Load once on Wi-Fi, wait for "Offline ready", enable airplane mode, kill Chrome, reopen | App loads; language, lesson progress, work-order result persist | PENDING |
| 11 | Storage eviction | Fill device storage / leave app unused for 7 days | Learner events survive or loss is visible to the user (never silent) | PENDING |
| 12 | Low memory | Open 10 other tabs/apps, return to feed with remix video | No crash; video falls back to poster if needed | PENDING |
| 13 | Large system font | Android font size max + display size max | No overlapped/clipped text; headings scale (known issue: px headings) | PENDING (expected partial fail) |
| 14 | Reduced motion | Android "Remove animations" | Diagram static, no drip/speed-line animation | PENDING |
| 15 | Slow 2G throttle | Chrome DevTools remote debugging → 2G profile, cold load | First render and offline-ready times recorded | PENDING |
| 16 | Battery / thermals | 15 min continuous feed use | Record battery drop; no thermal throttling warnings | PENDING |
