import ExpoModulesCore

public class PrayerAudioFocusModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PrayerAudioFocus")

    Function("getCapabilities") { () -> [String: Any] in
      return [
        "supported": false,
        "platform": "ios",
        "mode": "ios_focus_notification_only",
        "description": "iOS does not allow third-party apps to duck or mute audio from other apps. Prayer Focus uses local notifications and Focus Mode guidance."
      ]
    }

    Function("requestPrayerDucking") { () -> [String: Any] in
      return [
        "supported": false,
        "granted": false,
        "mode": "ios_focus_notification_only",
        "reason": "Unsupported on iOS: Apple restricts external media audio focus to the system."
      ]
    }

    Function("abandonPrayerDucking") { () -> Bool in
      return false
    }
  }
}
