# iOS: pendências até existir a conta Apple Developer (REQ-FND-094)

Situação em 2026-11-27: **não há conta Apple Developer** (US$ 99/ano — fora do custo R$ 0 da REQ-FND-048 até
haver decisão). Por isso, nesta fase:

| Item | Estado | Depende de |
|---|---|---|
| Build iOS para **simulador** (`mobile.yml`, `ios-simulator`) | ✅ no CI, sem assinatura | — |
| Assinatura, provisioning profiles | ⏳ pendente | conta Apple Developer |
| TestFlight | ⏳ pendente | conta + App Store Connect |
| Teste em iPhone real | ⏳ pendente | conta (perfil de desenvolvimento) |
| Links universais no iOS (`associatedDomains` + AASA com `APPLE_TEAM_ID`) | ⏳ parcial: configurado no `app.config.ts`; o AASA é publicado vazio até haver Team ID | Team ID |

## Quando a conta existir

1. Registre os bundle IDs `com.koovela.app` e `com.koovela.pro` com a capability **Associated Domains**.
2. Defina a variável `APPLE_TEAM_ID` no environment de build da web do consumidor e faça deploy: o
   `apple-app-site-association` passa a listar `<TEAM_ID>.com.koovela.app`.
3. Crie uma chave da App Store Connect API e adicione ao `mobile.yml` um job `ios-testflight`
   (`expo prebuild` + `xcodebuild archive` + `fastlane pilot`).
4. Valide o link universal num iPhone real (quickstart §10) e atualize esta página.
