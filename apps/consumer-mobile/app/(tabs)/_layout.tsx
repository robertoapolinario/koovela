import { Tabs } from 'expo-router';
import { nativeTabs, tabBarTheme } from '@koovela/ui-native';
import { isEnabled } from '../flags';

/** Abas do consumidor (Figma: Barra de abas · Consumidor): C03, C14, C15, C18; C00 atrás de flag. */
const tabs = nativeTabs('consumer-mobile');

export default function ConsumerTabs() {
  return (
    <Tabs screenOptions={{ ...tabBarTheme }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.key}
          name={tab.key}
          options={{
            title: tab.label,
            tabBarAccessibilityLabel: tab.label,
            tabBarButtonTestID: `tab-${tab.screen}`,
            ...(tab.flag && !isEnabled(tab.flag) ? { href: null } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}
