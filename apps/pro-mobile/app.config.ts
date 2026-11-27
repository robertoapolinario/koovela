import type { ExpoConfig } from 'expo/config';

/** App do colaborador (com.koovela.pro). */
const config: ExpoConfig = {
  name: 'Koovela Pro',
  slug: 'koovela-pro',
  scheme: 'koovela-pro',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: { bundleIdentifier: 'com.koovela.pro', supportsTablet: false },
  android: { package: 'com.koovela.pro' },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
};

export default config;
