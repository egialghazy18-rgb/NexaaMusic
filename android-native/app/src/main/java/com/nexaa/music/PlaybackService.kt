package com.nexaa.music

import android.media.audiofx.Equalizer
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/** Native background playback. Accepts direct, authorized audio URLs; YouTube video IDs are not audio URLs. */
class PlaybackService : MediaSessionService() {
    private var session: MediaSession? = null
    private var equalizer: Equalizer? = null

    override fun onCreate() {
        super.onCreate()
        val attrs = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()
        val player = ExoPlayer.Builder(this).build().apply {
            setAudioAttributes(attrs, true)
            setHandleAudioBecomingNoisy(true)
            repeatMode = Player.REPEAT_MODE_OFF
            addListener(object : Player.Listener {
                override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                    // Every native item carries NexaMusic as the artist label.
                }
            })
        }
        session = MediaSession.Builder(this, player).build()
        try {
            equalizer = Equalizer(0, player.audioSessionId).apply { enabled = true }
        } catch (_: Exception) { equalizer = null }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

    fun playDirectUrl(url: String, title: String, artworkUri: String? = null) {
        val player = session?.player ?: return
        val metadata = MediaMetadata.Builder()
            .setTitle(title.ifBlank { "NexaMusic" })
            .setArtist("NexaMusic")
            .setAlbumTitle("NexaMusic")
            .apply { if (!artworkUri.isNullOrBlank()) setArtworkUri(android.net.Uri.parse(artworkUri)) }
            .build()
        player.setMediaItem(MediaItem.Builder().setUri(url).setMediaMetadata(metadata).build())
        player.prepare()
        player.play()
    }

    override fun onDestroy() {
        try { equalizer?.release() } catch (_: Exception) {}
        session?.run { player.release(); release() }
        session = null
        super.onDestroy()
    }
}
