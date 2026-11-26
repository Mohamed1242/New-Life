package expo.modules.prayeraudiofocus

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PrayerAudioFocusModule : Module() {
  private var activeFocusRequest: AudioFocusRequest? = null
  private val focusChangeListener = AudioManager.OnAudioFocusChangeListener { }

  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("PrayerAudioFocus")

    Function("getCapabilities") {
      mapOf(
        "supported" to true,
        "platform" to "android",
        "apiLevel" to Build.VERSION.SDK_INT,
        "mode" to "duck_other_media",
        "description" to "Requests transient Android Audio Focus (MAY_DUCK) so compliant media players gently lower volume during Prayer Focus Mode."
      )
    }

    Function("requestPrayerDucking") {
      val manager = audioManager
        ?: return@Function mapOf(
          "supported" to false,
          "granted" to false,
          "reason" to "AudioManager service unavailable"
        )

      val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val attrs = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()

        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
          .setAudioAttributes(attrs)
          .setAcceptsDelayedFocusGain(false)
          .setWillPauseWhenDucked(false)
          .setOnAudioFocusChangeListener(focusChangeListener)
          .build()

        activeFocusRequest = req
        manager.requestAudioFocus(req) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      } else {
        @Suppress("DEPRECATION")
        manager.requestAudioFocus(
          focusChangeListener,
          AudioManager.STREAM_MUSIC,
          AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
        ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      }

      mapOf(
        "supported" to true,
        "granted" to granted,
        "mode" to "duck_other_media"
      )
    }

    Function("abandonPrayerDucking") {
      val manager = audioManager ?: return@Function false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        activeFocusRequest?.let { req ->
          manager.abandonAudioFocusRequest(req)
        }
        activeFocusRequest = null
      } else {
        @Suppress("DEPRECATION")
        manager.abandonAudioFocus(focusChangeListener)
      }
      true
    }
  }
}
