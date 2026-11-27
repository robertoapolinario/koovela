import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SdkProvider } from '@koovela/ui-native';

const API = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.koovela.com';

export default function RootLayout() {
  return (
    <SdkProvider baseUrl={API}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SdkProvider>
  );
}
