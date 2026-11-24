# Scroll Fuel on Android: reference skeleton

**Status: not compiled, not run.** No Android SDK was available when this was written. Treat `GateService.kt` as a design you can check, not as working code.

## How it works
1. A foreground service polls the foreground app every 500 ms with `UsageStatsManager.queryEvents`. The user grants Usage Access in system settings.
2. While Instagram or YouTube is in front, it drains the tank (`fuelMs` in SharedPreferences). The rules are the same as `app/src/flux/fuel.ts`: long gaps never drain and the tank caps at 30 min.
3. At zero it adds a full-screen `WebView` with `TYPE_APPLICATION_OVERLAY`. This needs "Display over other apps", which the user grants. The WebView loads `#/flux-gate` from the bundled `app/dist` through `WebViewAssetLoader`, so the tollbooth opens offline and nothing calls a model.
4. When a card is solved, the page calls the JavaScript interface `ScrollProofAndroid.unlock(minutes, kind)`; this hook already exists in `Gate.tsx`. The service refuels and removes the overlay, and the user is back in the same video.

## Before shipping
- Wire the manifest: `PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW` and `FOREGROUND_SERVICE` permissions, plus the foreground-service type declaration Android 14+ requires.
- Add a settings screen to choose the gated apps.
- Ask for both special permissions with a plain explanation, and handle the user saying no.
- Battery: 500 ms polling is for the prototype. Measure it, and back off when the screen is off.
- Play policy on usage access, overlays and foreground services changes over time. Check the current policy pages before submitting. We have not verified any specific 2026 policy claims.

## iPhone
iOS has no overlay. The Screen Time APIs (FamilyControls, ManagedSettings, DeviceActivity) can shield chosen apps after a time budget. Tapping the shield would open ScrollProof for one card, then lift it. This needs Apple's Family Controls entitlement, which Apple must approve.
