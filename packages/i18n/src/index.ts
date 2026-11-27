import i18next, { type i18n as I18n } from 'i18next';
import ptBR from './locales/pt-BR.json' with { type: 'json' };

export const resources = { 'pt-BR': { translation: ptBR } } as const;
export const defaultLocale = 'pt-BR';

export function createI18n(): I18n {
  const instance = i18next.createInstance();
  void instance.init({
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    resources,
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

const shared = createI18n();

/** Tradução pt-BR. Devolve a própria chave quando não existe. */
export const t = (key: string, vars?: Record<string, unknown>): string => shared.t(key, vars ?? {});

/** Todas as chaves folha (para testes de cobertura de i18n). */
export function allKeys(obj: unknown = ptBR, prefix = ''): string[] {
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => allKeys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}
