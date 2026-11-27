# Research: Favoritos (031)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D36 (fase 3), Koovela controladora dos dados da vitrine (022/024). Base: 003 (conta global), 007 (fim de vínculo), 008 (próximo horário livre via `discovery_listing`), 016 (nota pública), 022 (`HolderDataPort`), 024 (listagens e participação), 028 (opt-in de campanhas). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e localização

- **Decisão**: submódulo `favorites` do domínio `discovery`, no schema global `koovela_discovery` (conta global do consumidor, Koovela controladora); **nunca** no schema de um tenant (REQ-FAV-002). Limite de 200 por consumidor (contador numa linha travada na transação) (REQ-FAV-003).

## R2. O que é favoritado

- **Decisão**: alvo `branch` (estabelecimento/filial) ou `professional` **no contexto de uma filial** (`branch_id` + `professional_ref`, referência pública opaca do profissional na listagem, sem `person_id`) (REQ-FAV-001). Isso evita expor a identidade global do profissional e respeita o isolamento entre vínculos (027).

## R3. Lista de favoritos

- **Decisão**: leitura composta a partir de `discovery_listing` (024): foto, nome, categoria, nota quando pública (ausente em saúde), próximo horário livre; distância só se o app enviar a localização naquela chamada (não guardada) (REQ-FAV-004). Agendar abre o fluxo da 024/009 com estabelecimento e profissional pré-selecionados. Estado `unavailable` derivado da participação (fora da vitrine, despublicado, suspenso) ou do profissional fora da listagem (vínculo encerrado) — mostrado sem link de agendamento e volta a `active` sozinho (REQ-FAV-005).
- **Mesmo fora da vitrine?** Favoritar só é oferecido em telas de negócios com página pública (vitrine, página do estabelecimento); negócio que saiu da vitrine mas mantém página por link continua favoritável pela página e aparece como disponível se a página estiver publicada.

## R4. Privacidade e comunicação

- **Decisão**: favoritar **não** cria consentimento de comunicação nem permite envio (REQ-FAV-006): o `crm` (028) não lê favoritos. O estabelecimento vê só contagens agregadas por negócio, filial e profissional, com "menos de 5" abaixo do limiar, no painel de desempenho da vitrine (024) via `bi-api` (023) (REQ-FAV-007). Nenhum evento leva `consumer_id` para fora do `discovery`. `HolderDataPort` (022) cobre favoritos (REQ-FAV-008).

## R5. Offline e tempo de reflexo

- **Decisão**: o app guarda a última lista (SQLite) e mostra sem rede (REQ-FAV-009). Atualização otimista na interface e cache do TanStack Query invalidado por chave `favorites`; servidor confirma em ≤ 1 s (REQ-FAV-010). O estado "favoritado" nos cartões da vitrine vem de um conjunto de ids carregado uma vez por sessão.

## R6. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Favoritos | A conferir (DF 9.11) |
| Web do consumidor | Favoritos | Sem tela própria (seguir o app) |
| Painel | Contagens no desempenho da vitrine | Tela de participação da 024 |
