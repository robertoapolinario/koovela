import { Tabs } from 'expo-router';
import { nativeTabs, tabBarTheme } from '@koovela/ui-native';

/** Abas do colaborador (Figma: Barra de abas · Colaborador): K01, K03, K04, K05. */
const tabs = nativeTabs('pro-mobile');

export default function ProTabs() {
  return (
    <Tabs screenOptions={{ ...tabBarTheme }}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.key} name={tab.key} options={{ title: tab.label, tabBarAccessibilityLabel: tab.label, tabBarButtonTestID: `tab-${tab.screen}` }} />
      ))}
    </Tabs>
  );
}
