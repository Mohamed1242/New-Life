import ExpoModulesCore

public class WakeAlarmModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WakeAlarm")

    Function("getCapabilities") { () -> [String: Any] in
      return [
        "supportsTrueSystemAlarm": false,
        "canScheduleExactAlarms": false,
        "platform": "ios",
        "mode": "scheduled_notification",
        "note": "iOS third-party apps use UNUserNotificationCenter scheduled notifications (64 pending limit) rather than Apple Clock system alarms."
      ]
    }
  }
}
