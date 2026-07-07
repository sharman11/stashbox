/**
 * Expo dynamic config.
 *
 * Replaces app.json so we can conditionally include the AdMob plugin only
 * for Android builds — iOS ships without ads, so the native AdMob SDK and
 * the matching Info.plist / IDFA permissions stay off iOS entirely.
 *
 * The platform gate uses EAS_BUILD_PLATFORM (set automatically by EAS Build)
 * with a local fallback (EXPO_PUBLIC_TARGET_PLATFORM) for when you prebuild
 * locally. Default behavior (no env var) keeps AdMob on so Android-only
 * workflows (`expo run:android`, `eas build -p android`) Just Work.
 */

const targetPlatform =
  process.env.EAS_BUILD_PLATFORM ||
  process.env.EXPO_PUBLIC_TARGET_PLATFORM ||
  '';
const isIosBuild = targetPlatform === 'ios';

const ADMOB_PLUGIN = [
  'react-native-google-mobile-ads',
  {
    androidAppId: 'ca-app-pub-4989174984802618~5106255545',
  },
];

const basePlugins = [
  'expo-router',
  [
    'expo-splash-screen',
    {
      image: './assets/images/splash-icon.png',
      imageWidth: 1,
      resizeMode: 'contain',
      backgroundColor: '#0B3D2E',
      dark: {
        backgroundColor: '#0B3D2E',
      },
    },
  ],
  'expo-audio',
  'expo-font',
  [
    'expo-notifications',
    {
      icon: './assets/images/android-icon-monochrome.png',
      color: '#1DB954',
      defaultChannel: 'reminders',
    },
  ],
  [
    'expo-build-properties',
    {
      android: {
        enableProguardInReleaseBuilds: true,
        enableShrinkResourcesInReleaseBuilds: true,
        enableMinifyInReleaseBuilds: true,
      },
    },
  ],
  'expo-localization',
];

const plugins = isIosBuild ? basePlugins : [...basePlugins, ADMOB_PLUGIN];

module.exports = {
  expo: {
    name: 'Stashbox',
    slug: 'stashbox',
    version: '2.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'stashbox',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    android: {
      package: 'com.stashbox.app',
      versionCode: 2,
      adaptiveIcon: {
        // Solid background color — no backgroundImage; the referenced file
        // never existed and backgroundColor fills the same role.
        backgroundColor: '#E6F4EA',
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'INTERNET',
        'VIBRATE',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
      blockedPermissions: [
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.RECORD_AUDIO',
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
      name: 'Stashbox',
      shortName: 'Stashbox',
      description: 'Save money daily, one cell at a time',
      backgroundColor: '#F5F7FA',
      themeColor: '#0B3D2E',
      lang: 'en',
    },
    plugins,
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'fd5c34ae-3e7c-4baa-94db-884de9df7654',
      },
    },
    ios: {
      bundleIdentifier: 'com.stashbox.app',
      buildNumber: '1',
      supportsTablet: false,
      config: {
        usesNonExemptEncryption: false,
      },
      // No NSUserTrackingUsageDescription — iOS doesn't ship AdMob/IDFA.
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
      },
    },
  },
};
