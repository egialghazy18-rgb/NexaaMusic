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
        val web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webChromeClient = WebChromeClient()
            webViewClient = WebViewClient()
            loadUrl("https://nexaastudiov34.vercel.app/")
        }
        webView = web
        setContentView(web)
    }

    override fun onDestroy() {
        webView?.destroy(); webView = null
        controllerFuture?.let { MediaController.releaseFuture(it) }
        super.onDestroy()
    }
}
