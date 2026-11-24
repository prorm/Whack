# Offline architecture

The inherited service worker precaches the app and uses a bounded optional-media cache. The Lite mission entry requests a 9,856 B WebP poster. Video and audio wait for explicit use in Lite. The offline profile offers the cited transcript, calculations and local assessment. Reviewed releases and attempts are stored on the device. Attachments and recordings use IndexedDB. The numeric review queue stores admissions and withdrawals independently of private media. A server tombstone prevents an old queued upload from reopening a revoked result.

The final Chromium cold Lite run transferred **146,066 B** of HTTP response bodies. The first useful action appeared in **336 ms**, the service worker was ready in **542 ms**, and explicitly requested source video was ready in **172 ms**. The worksheet reloaded with the server stopped in **155 ms**. The **2,542 B** reviewed text pack includes version, source excerpts, skill prerequisites and an independently computed key. Chromium reported about **4.22 MB** of JS heap near cold entry. These are single Windows desktop measurements with mobile viewport emulation. [Browser evidence](../../moonshot/benchmarks/browser-results.json)

| Production question | Current decision |
| --- | --- |
| Resumable capture uploads | Keep private recordings locally for this demo. For consented transfer, propose fixed-size chunks, content hash, final digest, durable upload state and explicit expiring tokens |
| Background transfer | Use foreground resume on online events. Platform-specific background sync reliability is a test item |
| Storage limits and mobile memory | Keep source compressed and optional. Test clear failure states, eviction and storage persistence on real low-memory devices |
| Deduplication and version updates | Cache immutable resources and store versioned content. Plan atomic activation and pinning for downloadable catalogs |
| Cross-device access | Browser device tokens index this pilot's evidence. Account recovery, merge and migration need new work |

Physical Android, actual 3G, media permissions on physical hardware, background sync, quota stress, and low-memory eviction are pending. The desktop benchmark used an emulated Android-sized viewport and browser-supplied microphone audio. [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) · [Browser storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) · [Background sync availability](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
