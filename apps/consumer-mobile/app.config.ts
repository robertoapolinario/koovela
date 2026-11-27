import type { ExpoConfig } from 'expo/config';

/** App do consumidor (com.koovela.app). Links universais em US10 (REQ-FND-090). */
const config: ExpoConfig = {
  name: 'Koovela',
  slug: 'koovela',
  scheme: 'koovela',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.koovela.app',
    supportsTablet: false,
    // Associated Domains exigem a conta Apple Developer (docs/ops/runbooks/apple-pendente.md).
    associatedDomains: ['applinks:koovela.com', 'applinks:app.koovela.com'],
  },
  android: {
    package: 'com.koovela.app',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true, // verificado contra https://koovela.com/.well-known/assetlinks.json
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          { scheme: 'https', host: 'koovela.com', pathPattern: '/..*' },
          { scheme: 'https', host: 'app.koovela.com', pathPattern: '/.*' },
        ],
      },
    ],
  },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
};

export default config;
