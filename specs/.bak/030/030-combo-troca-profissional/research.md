# Research: Combo com troca de profissional (030)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D34 (combo com etapas por profissionais diferentes), D19 (opção "mesmo profissional"). Base pronta na v1.0: 006 (combo e plano de etapas, versionado), 007 (intervalos de trabalho em UTC, comissão por etapa), 008 (lock Redis por profissional e data em **ordem lexicográfica** com teto de 2 s, células no banco, **combo atômico** com ocupação-mãe + uma por etapa; modelo já aceita `per_step`), 009 (agendamento, remarcação, troca de profissional pela Recepção), 010 (política). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: definição no `catalog` (006: `combo_rule = per_step`, etapas com profissionais possíveis e intervalos versionados); busca de sequências e reserva no `scheduling` (008/009). Nenhum domínio novo.

## R2. Configuração do combo com troca

- **Decisão**: 2 a 5 etapas, cada uma com serviço e `eligible_professionals` (`all_who_perform` ou lista) (REQ-CTR-001); intervalo de 0 a 15 min único ou por transição (REQ-CTR-002); preço, etapas, profissionais e intervalos versionados, congelados no agendamento (REQ-CTR-004). Disponibilidade por filial: indisponível se alguma etapa ficar sem profissional possível ativo na filial; profissional que sai (`workforce.engagement.ended.v1`) é removido das etapas com aviso; etapa vazia desativa o combo (REQ-CTR-003).

## R3. Busca de sequências viáveis

- **Decisão**: função pura `findSequences(plan, freeTimeByProfessional, startCandidates)` em `packages/domain/combo-sequencing`: para cada início candidato (grade de 5 min), busca em profundidade pelas etapas na ordem; cada etapa tenta os profissionais possíveis com tempo livre (008) para duração + preparo + limpeza, e a próxima etapa precisa começar entre o fim da anterior e `fim + intervalo máximo` (REQ-CTR-010). Poda: interrompe ao achar a primeira sequência para listar o início; ao escolher o horário, enumera até 20 sequências para sugerir e para as trocas. Teto de complexidade: 5 etapas × profissionais possíveis (tipicamente ≤ 6) é pequeno; tempo livre vem do cache Redis da 008 (REQ-CTR-014: ≤ 1 s p95).
- **Sugestão** (REQ-CTR-011): ordenação pela regra do negócio — padrão: menor espera total; empate pelo profissional menos ocupado no dia; preferir não trocar de profissional sem necessidade (Regras).
- **Trocas pelo consumidor** (REQ-CTR-012): para cada etapa, lista os profissionais possíveis com flag `viable`; escolher um refaz as etapas seguintes; inviáveis vêm desabilitados com o motivo (`busy`, `breaks_interval`, `not_in_branch`).
- **Mesmo profissional** (REQ-CTR-013): opção exibida quando algum profissional executa todas as etapas (reaproveita o caminho `same_for_all` da v1.0).
- **Teste de propriedade**: toda sequência oferecida respeita ordem, durações, preparo/limpeza, intervalo máximo e tempo livre.

## R4. Reserva atômica

- **Decisão**: usa o caminho de combo atômico da 008: locks de todos os `(profissional, data)` da sequência **adquiridos juntos em ordem lexicográfica** (teto 2 s) e uma transação com ocupação-mãe + ocupações por etapa e suas células; qualquer conflito desfaz tudo (REQ-CTR-020). Na falha, a resposta traz a próxima sequência viável no mesmo horário ou nos mais próximos (recalculada após a falha) (REQ-CTR-021).
- **Portão de merge** (REQ-CTR-022): N pedidos disputando o profissional de uma etapa → exatamente 1 aceito; falha injetada na última etapa → nenhuma ocupação.

## R5. Depois de reservado

- **Decisão**:
  - Troca de profissional de **uma etapa** pela Recepção: substitui só a ocupação da etapa (lock + células do novo, libera o antigo na mesma transação), com aviso ao consumidor (REQ-CTR-030).
  - Remarcação: reserva atômica da nova sequência e liberação das antigas juntas, na mesma transação (REQ-CTR-031).
  - Cancelamento: sempre do combo inteiro, com a política aplicada ao combo; o consumidor nunca cancela uma etapa isolada (REQ-CTR-032).
  - Etapa atrasada: o check-out tardio (ou ausência de check-out no horário previsto) que empurre a próxima etapa além do intervalo gera aviso ao profissional seguinte e à Recepção com as opções aguardar, trocar profissional ou remarcar a etapa (ação só da Recepção) (REQ-CTR-033).
  - Ausência de profissional (folga, fim de vínculo) leva o combo à lista de afetados (009) com sugestão de outro profissional possível para a etapa (REQ-CTR-034).
  - Comissão por etapa, com o desconto do combo rateado por etapa proporcionalmente ao preço avulso de cada serviço, arredondado para baixo e o resto na última etapa (REQ-CTR-035), calculada pelo contrato da 007.

## R6. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel | Configuração do combo com troca | P12 (catálogo) — a conferir (DF 9.10) |
| App do consumidor | Combo com troca de profissional | A conferir (DF 9.10) |
| Web do consumidor | Combo com troca (em Data e horário) | A conferir |
| Colaborador | Etapa do combo na agenda | K01 · KD1 |
| A conferir | Aviso de etapa atrasada para a Recepção | Desenhar se não existir |
