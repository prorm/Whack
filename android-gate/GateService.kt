// REFERENCE SKELETON — NOT COMPILED OR RUN. No Android SDK was available when this was written.
// Thin native wrapper for Scroll Fuel on Android: polls the foreground app with UsageStatsManager and, when the tank
// is empty on a gated app, draws the FLUX tollbooth (the same #/flux-gate web page, bundled offline) over it.
package com.capable.gate

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

class GateService : Service() {
    private val gated = setOf("com.instagram.android", "com.google.android.youtube") // user-selectable in settings
    private val prefs by lazy { getSharedPreferences("scroll_fuel", MODE_PRIVATE) }
    private val handler = Handler(Looper.getMainLooper())
    private var overlay: WebView? = null
    private var lastTick = System.currentTimeMillis()
    private var current: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        val ch = NotificationChannel("fuel", "Scroll Fuel", NotificationManager.IMPORTANCE_MIN)
        getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        // Android 14+: declare foregroundServiceType="specialUse" with a PROPERTY_SPECIAL_USE_FGS_SUBTYPE in the manifest
        startForeground(1, Notification.Builder(this, "fuel").setContentTitle("Scroll Fuel is on").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).build())
        handler.post(tick)
    }

    /** Every 500 ms: who is in front? Drain the tank only while a gated app is. Show the toll at zero. */
    private val tick = object : Runnable {
        override fun run() {
            val now = System.currentTimeMillis()
            current = foregroundPackage(now) ?: current
            var fuel = prefs.getLong("fuelMs", 10 * 60_000L)
            val gap = now - lastTick
            if (current in gated && overlay == null && gap in 1..1500) fuel = (fuel - gap).coerceAtLeast(0)
            lastTick = now
            prefs.edit().putLong("fuelMs", fuel).apply()
            if (fuel <= 0 && current in gated && overlay == null) showToll(current!!)
            handler.postDelayed(this, 500)
        }
    }

    private fun foregroundPackage(now: Long): String? {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = usm.queryEvents(now - 10_000, now)
        val e = UsageEvents.Event()
        var pkg: String? = null
        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            if (e.eventType == UsageEvents.Event.ACTIVITY_RESUMED) pkg = e.packageName
        }
        return pkg
    }

    private fun showToll(app: String) {
        // Requires Settings.canDrawOverlays(this) (SYSTEM_ALERT_WINDOW, granted by the user in system settings).
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this)) // app/dist copied to src/main/assets/
            .build()
        val web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, req: WebResourceRequest) = loader.shouldInterceptRequest(req.url)
            }
            addJavascriptInterface(Bridge(), "CapableAndroid")
            val id = if (app == "com.instagram.android") "instagram" else "youtube-shorts"
            loadUrl("https://appassets.androidplatform.net/index.html#/flux-gate?app=$id")
        }
        val lp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, 0, PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.TOP }
        getSystemService(WindowManager::class.java).addView(web, lp)
        overlay = web
    }

    /** Called by the tollbooth page (Gate.tsx) when a card is solved or the DM break is taken. */
    inner class Bridge {
        @JavascriptInterface
        fun unlock(minutes: Int, kind: String) {
            val ms = (minutes.coerceIn(0, 30) * 60_000L)
            prefs.edit().putLong("fuelMs", ms).apply()
            handler.post {
                overlay?.let { getSystemService(WindowManager::class.java).removeView(it); it.destroy() }
                overlay = null
            }
        }
    }
}
