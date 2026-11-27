import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

/** Shell nativo do consumidor (REQ-FND-062/063/065): abas C03/C14/C15/C18; C00 atrás de flag. */
const TABS = [
  ['C03', 'Agendamentos'],
  ['C14', 'Séries'],
  ['C15', 'Fidelidade'],
  ['C18', 'Perfil'],
] as const;

describe('abas do app do consumidor', () => {
  it('abre em C03 e cada aba leva à tela com o código', async () => {
    await renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByTestId('screen-C03')).toBeTruthy();
    for (const [code] of TABS) {
      await act(async () => {
        await fireEvent.press(screen.getByTestId(`tab-${code}`));
      });
      expect(await screen.findByTestId(`screen-${code}`)).toBeTruthy();
    }
  });

  it('cada aba tem papel, rótulo acessível e alvo de toque ≥ 44 pt', async () => {
    await renderRouter('app', { initialUrl: '/' });
    for (const [code, label] of TABS) {
      const tab = screen.getByTestId(`tab-${code}`);
      expect(tab.props.accessibilityLabel ?? tab.props['aria-label']).toBe(label);
      expect(['button', 'tab']).toContain(tab.props.accessibilityRole ?? tab.props.role);
      // O alvo de toque é o próprio botão da aba ou o item que o envolve (tabBarItemStyle).
      let node: typeof tab | null = tab;
      let target = 0;
      for (let i = 0; node && i < 6; i += 1, node = node.parent) {
        const st = StyleSheet.flatten(node.props?.style) ?? {};
        target = Math.max(target, Number(st.minHeight ?? 0), Number(st.height ?? 0));
      }
      expect(target).toBeGreaterThanOrEqual(44);
    }
  });

  it('C00 (Início) fica escondida enquanto a flag discovery.home_tab estiver desligada', async () => {
    await renderRouter('app', { initialUrl: '/' });
    expect(screen.queryByTestId('tab-C00')).toBeNull();
  });
});
