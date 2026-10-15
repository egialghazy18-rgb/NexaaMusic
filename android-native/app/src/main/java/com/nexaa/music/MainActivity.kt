package com.nexaa.music

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture

class MainActivity : AppCompatActivity() {
    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // MediaController binds the service. Do not start a foreground service while
        // idle; Media3 promotes it when native audio actually begins playback.
        connectController()
        handleIncomingIntent(intent)
        showWebHome()
    }

    private fun handleIncomingIntent(incoming: Intent?) {
        val uri = incoming?.data
        if (uri?.scheme == "nexaamusic" && uri.host == "play") {
            val audio = uri.getQueryParameter("url")
            if (!audio.isNullOrBlank()) {
                playUrl(audio, uri.getQueryParameter("title") ?: "NexaMusic", uri.getQueryParameter("artwork"))
            }
        } else if (uri != null && (uri.scheme == "https" || uri.scheme == "http") &&
            incoming?.type?.startsWith("audio/") == true) {
            playUrl(uri.toString(), uri.lastPathSegment ?: "NexaMusic", null)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingIntent(intent)
    }

    private fun connectController() {
        val token = SessionToken(this, ComponentName(this, PlaybackService::class.java))
        controllerFuture = MediaController.Builder(this, token).buildAsync()
    }

    private fun playUrl(url: String, title: String, artwork: String?) {
        if (!url.startsWith("https://") && !url.startsWith("http://")) return
        val future = controllerFuture ?: return
        future.addListener({
            try {
                val controller = future.get()
                val item = androidx.media3.common.MediaItem.Builder().setUri(url)
                    .setMediaMetadata(androidx.media3.common.MediaMetadata.Builder()
                        .setTitle(title).setArtist("NexaMusic").setAlbumTitle("NexaMusic")
                        .apply { if (!artwork.isNullOrBlank()) setArtworkUri(Uri.parse(artwork)) }.build()).build()
                controller.setMediaItem(item); controller.prepare(); controller.play()
            } catch (_: Exception) { }
        }, { command -> runOnUiThread(command) })
    }

    private fun showWebHome() {
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(0xFF0B0D1D.toInt()) }
        val title = TextView(this).apply { text = "NEXA MUSIC · NATIVE AUDIO PREVIEW"; setTextColor(0xFFE6E2FF.toInt()); textSize = 17f; gravity = Gravity.CENTER; setPadding(16,18,16,12) }
        val hint = TextView(this).apply { text = "Tes player native dengan URL audio langsung yang kamu punya izin untuk putar. Video ID YouTube bukan URL audio langsung."; setTextColor(0xFFB7B8CA.toInt()); textSize = 13f; setPadding(18,6,18,10) }
        val url = EditText(this).apply { hint = "https://.../track.mp3"; setSingleLine(true); setTextColor(-1); setHintTextColor(0xFF88899A.toInt()); setPadding(16,12,16,12) }
        val trackTitle = EditText(this).apply { hint = "Judul lagu"; setSingleLine(true); setTextColor(-1); setHintTextColor(0xFF88899A.toInt()); setPadding(16,12,16,12) }
        val play = Button(this).apply { text = "PUTAR DI PLAYER NATIVE"; setOnClickListener { val u = url.text.toString().trim(); if (u.isNotBlank()) playUrl(u, trackTitle.text.toString().ifBlank { "NexaMusic" }, null) } }
        val web = WebView(this).apply {
            settings.javaScriptEnabled = true; settings.domStorageEnabled = true; webChromeClient = WebChromeClient(); webViewClient = WebViewClient()
            loadUrl("https://nexaasolar.vercel.app/")
        }
        webView = web
        root.addView(title); root.addView(hint); root.addView(url); root.addView(trackTitle); root.addView(play)
        root.addView(web, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
    }

    override fun onDestroy() {
        webView?.destroy(); webView = null
        controllerFuture?.let { MediaController.releaseFuture(it) }
        super.onDestroy()
    }
}
