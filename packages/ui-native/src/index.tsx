import navigation from '@koovela/contracts/ui/shell-navigation.json';
import { tokens } from '@koovela/design-tokens';
import { t } from '@koovela/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { configureSdk, useGetHealth } from '@koovela/sdk';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

/** Componentes nativos equivalentes aos da web, só com tokens (REQ-FND-060/061). */
const px = (v: string) => Number.parseFloat(v);
export const TOUCH_TARGET = px(tokens.size['touch-target']);
const c = tokens.color;

interface Typo {
  readonly fontSize: string;
  readonly fontWeight: number;
  readonly lineHeight: number;
}
/** Estilo de texto a partir do token de tipografia (sem família: o app carrega DM Sans pelo expo-font). */
const type = (tk: Typo) => ({ fontSize: px(tk.fontSize), fontWeight: String(tk.fontWeight) as '400', lineHeight: Math.round(px(tk.fontSize) * tk.lineHeight) });
const f = tokens.font as unknown as { title: Record<'2', Typo>; number: Typo; button: Typo; small: Typo };

export interface NativeTab {
  readonly key: string;
  readonly label: string;
  readonly screen: string;
  readonly flag?: string;
}

/** Abas do app a partir do contrato de UI (REQ-FND-063). */
export function nativeTabs(shell: 'consumer-mobile' | 'pro-mobile'): NativeTab[] {
  const raw = (navigation.shells as unknown as Record<string, { items: { key: string; label_i18n: string; screen: string; flag?: string }[] }>)[shell];
  if (!raw) throw new Error(`shell desconhecido: ${shell}`);
  return raw.items.map((i) => ({ key: i.key.replace(/_/g, '-'), label: t(i.label_i18n), screen: i.screen, ...(i.flag ? { flag: i.flag } : {}) }));
}

export const tabBarTheme = {
  tabBarActiveTintColor: c.text.brand,
  tabBarInactiveTintColor: c.text.secondary,
  tabBarStyle: { backgroundColor: c.surface.card, borderTopColor: c.border.default },
  tabBarItemStyle: { minHeight: TOUCH_TARGET },
  headerStyle: { backgroundColor: c.surface.card },
  headerTintColor: c.text.primary,
} as const;

export function Button({ label, ...rest }: PressableProps & { readonly label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.button} {...rest}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected = false, ...rest }: PressableProps & { readonly label: string; readonly selected?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} style={[styles.chip, selected && styles.chipSelected]} {...rest}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

/** Tela vazia com o código da tela do protótipo (REQ-FND-063). */
export function EmptyScreen({ code, title, children }: { readonly code: string; readonly title: string; readonly children?: ReactNode }) {
  return (
    <View style={styles.screen} testID={`screen-${code}`}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.code}>{t('shell.empty_screen', { code })}</Text>
      {children}
      <ApiStatus />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: px(tokens.space['5']), gap: px(tokens.space['3']), backgroundColor: c.surface.page },
  title: { ...type(f.title['2']), color: c.text.primary },
  code: { ...type(f.number), color: c.text.brand },
  button: { minHeight: TOUCH_TARGET, paddingHorizontal: px(tokens.space['4']), borderRadius: px(tokens.radius.md), backgroundColor: c.surface.brand, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...type(f.button), color: c.text['on-brand'] },
  chip: { minHeight: TOUCH_TARGET, paddingHorizontal: px(tokens.space['3']), borderRadius: px(tokens.radius.pill), backgroundColor: c.surface.muted, borderWidth: 1, borderColor: c.border.default, justifyContent: 'center' },
  chipSelected: { backgroundColor: c.surface['brand-subtle'], borderColor: c.surface.brand },
  chipText: { ...type(f.small), color: c.text.primary },
  status: { ...type(f.small), color: c.text.secondary, padding: px(tokens.space['3']), textAlign: 'center', backgroundColor: c.surface.card },
});

/** Tela de uma aba: título vem do contrato + i18n (nada de texto literal no app). */
export function TabScreen({ shell, code }: { readonly shell: 'consumer-mobile' | 'pro-mobile'; readonly code: string }) {
  const tab = nativeTabs(shell).find((x) => x.screen === code);
  return <EmptyScreen code={code} title={tab?.label ?? t('shell.empty_screen', { code })} />;
}

/** Estado da API pelo SDK gerado (T114). A base vem de EXPO_PUBLIC_API_BASE_URL (ex.: https://api.koovela.com). */
export function ApiStatus() {
  const q = useGetHealth({ query: { refetchInterval: 60_000, retry: false } });
  const state = q.isPending ? 'unknown' : q.data?.status === 200 ? (q.data.data.status === 'ok' ? 'ok' : q.data.data.status) : 'down';
  return (
    <Text accessibilityRole="text" accessibilityLiveRegion="polite" testID={`api-status-${state}`} style={styles.status}>
      {t(`shell.status_${state}`)}
    </Text>
  );
}

export function SdkProvider({ children, baseUrl }: { readonly children: ReactNode; readonly baseUrl: string }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  configureSdk({ baseUrl });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
