package expo.modules.wakealarm

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (
      action != Intent.ACTION_BOOT_COMPLETED &&
      action != Intent.ACTION_TIME_SET &&
      action != Intent.ACTION_TIMEZONE_CHANGED
    ) {
      return
    }

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      alarmManager.canScheduleExactAlarms()
    if (!canExact) return

    val now = System.currentTimeMillis()
    for ((id, triggerMs, title) in AlarmStore.listAll(context)) {
      if (triggerMs > now + 5_000L) {
        WakeAlarmModule.armSystemAlarm(context, alarmManager, id, title, triggerMs)
      } else {
        AlarmStore.remove(context, id)
      }
    }
  }
}
