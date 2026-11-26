Pod::Spec.new do |s|
  s.name           = 'PrayerAudioFocus'
  s.version        = '1.0.0'
  s.summary        = 'Prayer Audio Focus capability bridge for iOS/Android'
  s.license        = 'MIT'
  s.author         = 'New Life'
  s.homepage       = 'https://newlife.local'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
