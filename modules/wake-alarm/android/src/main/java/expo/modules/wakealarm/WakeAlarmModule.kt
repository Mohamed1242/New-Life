package expo.modules.wakealarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WakeAlarmModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("WakeAlarm")

    Function("getCapabilities") {
      val ctx = context
      val alarmManager = ctx?.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        alarmManager?.canScheduleExactAlarms() == true
      } else {
        true
      }

      mapOf(
        "supportsTrueSystemAlarm" to true,
        "canScheduleExactAlarms" to canExact,
        "platform" to "android",
        "mode" to if (canExact) "system_alarm" else "scheduled_notification",
        "note" to if (canExact) {
          "Android AlarmManager.setAlarmClock active with BOOT_COMPLETED persistence."
        } else {
          "Exact alarm permission not granted. Grant Alarms & Reminders permission or fall back to scheduled notifications."
        }
      )
    }

    Function("openExactAlarmSettings") {
      val ctx = context ?: return@Function false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${ctx.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        ctx.startActivity(intent)
        true
      } else {
        false
      }
    }

    Function("scheduleExactAlarm") { id: String, title: String, triggerAtMs: Double ->
      val ctx = context
        ?: return@Function mapOf("scheduled" to false, "mode" to "scheduled_notification")
      val triggerMs = triggerAtMs.toLong()
      if (triggerMs <= System.currentTimeMillis()) {
        return@Function mapOf("scheduled" to false, "mode" to "scheduled_notification")
      }

      val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
        alarmManager?.canScheduleExactAlarms() == true

      if (!canExact || alarmManager == null) {
        return@Function mapOf("scheduled" to false, "mode" to "scheduled_notification")
      }

      AlarmStore.save(ctx, id, title, triggerMs)
      armSystemAlarm(ctx, alarmManager, id, title, triggerMs)

      mapOf("scheduled" to true, "mode" to "system_alarm")
    }

    Function("cancelExactAlarm") { id: String ->
      val ctx = context ?: return@Function false
      val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      val intent = Intent(ctx, AlarmReceiver::class.java).apply {
        putExtra("alarmId", id)
      }
      val pi = PendingIntent.getBroadcast(
        ctx,
        id.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      alarmManager?.cancel(pi)
      AlarmStore.remove(ctx, id)
      true
    }
  }

  companion object {
    fun armSystemAlarm(
      ctx: Context,
      alarmManager: AlarmManager,
      id: String,
      title: String,
      triggerMs: Long
    ) {
      val fireIntent = Intent(ctx, AlarmReceiver::class.java).apply {
        putExtra("alarmId", id)
        putExtra("alarmTitle", title)
      }
      val operation = PendingIntent.getBroadcast(
        ctx,
        id.hashCode(),
        fireIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      val launchIntent = Intent(
        Intent.ACTION_VIEW,
        Uri.parse("newlife:///(modals)/alarm-ring?alarmId=$id")
      ).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val showIntent = PendingIntent.getActivity(
        ctx,
        id.hashCode() + 1,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      val info = AlarmManager.AlarmClockInfo(triggerMs, showIntent)
      alarmManager.setAlarmClock(info, operation)
    }
  }
}

internal object AlarmStore {
  private const val PREF_NAME = "newlife_wake_alarms"

  fun save(ctx: Context, id: String, title: String, triggerMs: Long) {
    val prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    prefs.edit().putString(id, "$triggerMs|$title").apply()
  }

  fun remove(ctx: Context, id: String) {
    val prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    prefs.edit().remove(id).apply()
  }

  fun listAll(ctx: Context): List<Triple<String, Long, String>> {
    val prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    val result = mutableListOf<Triple<String, Long, String>>()
    for ((key, value) in prefs.all) {
      val raw = value as? String ?: continue
      val sep = raw.indexOf('|')
      if (sep <= 0) continue
      val ms = raw.substring(0, sep).toLongOrNull() ?: continue
      val title = raw.substring(sep + 1)
      result.add(Triple(key, ms, title))
    }
    return result
  }
}
