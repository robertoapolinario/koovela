# Research: Colaborador em vários negócios (027)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D31 (uma pessoa, vários vínculos), C6 (detecção e aviso obrigatórios; **bloqueio entre negócios só se o próprio colaborador ligar**, CONST 1.1.0), C5 (projeção do colaborador por eventos). Base: 003 (pessoa global, convite e aceite), 007 (vínculo, escala, folga, comissão), 008 (`person_occupancy_index` em `koovela_projections` e `scheduling.cross_tenant_conflict.detected.v1`, já previstos), 009 (agendamento manual), 011 (avisos), 016 (avaliações por negócio), 018 (comissões). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e fronteiras

- **Decisão**: o vínculo continua no `workforce` de cada tenant (007). A visão do colaborador é a projeção **`pro_unified_agenda`** em `koovela_projections`, dona `workforce`, alimentada por eventos de 008/009/013/026 com `person_id` (REQ-MUL-011). A detecção de conflito é a do `scheduling` (008, `person_occupancy_index`). Nenhum tenant lê o schema de outro, e nenhuma resposta a um tenant revela a existência de outros vínculos (REQ-MUL-002/033): a projeção só é servida a rotas `/v1/pro/*` autenticadas como a própria pessoa.
- **Teste**: contrato que tenta, como tenant A, descobrir vínculos da pessoa no tenant B por qualquer rota → sempre 404/sem dado.

## R2. Vários vínculos

- **Decisão**: convite e aceite pela 003 em cada tenant, criando `workforce_engagement` independente (papel, filial, serviços, escala, regra de comissão do próprio tenant) (REQ-MUL-001). Encerrar um vínculo não toca os outros (REQ-MUL-003); a 008 retira as janelas daquele tenant do índice e encerra os conflitos dele (REQ-MUL-023).

## R3. Agenda unificada

- **Decisão**: endpoint `/v1/pro/agenda` lê a projeção (dia e semana; cor e nome por negócio escolhidos pelo colaborador) (REQ-MUL-010). Ações (check-in, check-out, anotação) **redirecionam para o contexto do tenant dono** (o app troca o "tenant ativo" e chama as rotas do tenant com as permissões dele) (REQ-MUL-012). Offline: o app guarda os próximos 7 dias em SQLite cifrado (Expo SecureStore para a chave), atualizado a cada abertura e por push silencioso (REQ-MUL-013).

## R4. Conflitos (C6)

- **Decisão**: detecção na criação e em toda mudança (REQ-MUL-020, já na 008). Este spec entrega a **visualização e o ciclo de vida**: `pro_conflict` (projeção) com estado `open` → `closed` por remarcação, troca de profissional, cancelamento ou fim de vínculo, nunca "resolvido automaticamente" (REQ-MUL-023).
  - Colaborador: os dois atendimentos completos (cada um lido do próprio tenant pela projeção, que guarda só o necessário: horário, serviço, negócio).
  - Cada tenant: só o próprio atendimento e "compromisso fora deste negócio" com o horário da sobreposição — marca na agenda (P03) e aviso (011) (REQ-MUL-021).
  - Agendamento manual (009/P03): antes de confirmar, a Recepção vê "o profissional tem compromisso fora deste negócio neste horário" (consulta ao índice da 008 por `person_id` sem retornar o tenant de origem) (REQ-MUL-022).
- **Portão de merge**: teste de contrato com dois tenants sintéticos (criação, remarcação, cancelamento, fim de vínculo) (REQ-MUL-026).

## R5. Bloqueio opcional entre negócios

- **Decisão**: preferência `cross_block_enabled` da **pessoa** (só ela liga; nenhum tenant pode). Ligada, cada ocupação definitiva dela em um tenant gera, nos outros tenants com vínculo ativo, uma ocupação `external_block` ("indisponível", sem detalhes) pela mesma rotina de células e lock da 008 (REQ-MUL-024). Se a célula já estiver ocupada no outro tenant, o bloqueio não é criado e o conflito segue pelo fluxo de aviso. Desligar remove os bloqueios futuros. Cancelamento ou remarcação na origem atualiza os bloqueios por evento (idempotente por `source_occupancy_id`).
- **Alternativas**: bloqueio obrigatório (rejeitado no clarify, C6).

## R6. Escalas, folgas, comissões e perfil

- **Decisão**:
  - Escalas sobrepostas entre negócios: aviso na agenda unificada com atalho "pedir ajuste" em cada tenant (REQ-MUL-025).
  - "Pedir folga em todos": um envio cria pedidos separados em cada tenant, aprovados pelas regras de cada um (REQ-MUL-030).
  - "Comissões": soma por negócio e total a partir dos contratos da 018 (`/v1/pro/settlement/*` por tenant) (REQ-MUL-031).
  - Perfil profissional global (003) com sobreposição por tenant (nome de exibição, bio, foto); portfólio e avaliações ficam por negócio (REQ-MUL-032/033).

## R7. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do colaborador | Agendas de vários negócios | K01 (modo unificado) — a conferir (DF 9.10) |
| `/pro` | Agenda unificada | KD1 (modo unificado) |
| Painel | Marca e aviso de conflito · aviso no agendamento manual | P03 |
| A conferir | Aviso de conflito ao colaborador · "pedir folga em todos" | Desenhar se não existirem |
