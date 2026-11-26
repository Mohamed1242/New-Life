package expo.modules.wakealarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra("alarmId") ?: "alarm"
    val title = intent.getStringExtra("alarmTitle") ?: "New Life Wake-Up Alarm"

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      ?: return

    val channelId = "newlife-system-alarms"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      val audioAttrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

      val channel = NotificationChannel(
        channelId,
        "Wake-Up System Alarms",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        setSound(soundUri, audioAttrs)
        enableVibration(true)
        setBypassDnd(true)
      }
      manager.createNotificationChannel(channel)
    }

    val ringIntent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse("newlife:///(modals)/alarm-ring?alarmId=$alarmId")
    ).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val fullScreenPi = PendingIntent.getActivity(
      context,
      alarmId.hashCode(),
      ringIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, channelId)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
    }

    val notification = builder
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(title)
      .setContentText("Tap to Snooze or Dismiss")
      .setCategory(Notification.CATEGORY_ALARM)
      .setAutoCancel(true)
      .setFullScreenIntent(fullScreenPi, true)
      .setContentIntent(fullScreenPi)
      .build()

    manager.notify(alarmId.hashCode(), notification)
    AlarmStore.remove(context, alarmId)
  }
}
