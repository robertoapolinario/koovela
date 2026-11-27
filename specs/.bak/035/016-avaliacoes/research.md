# Research: Avaliações (016)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: PEN-19 (fora da saúde, públicas se o negócio mostrar na página; Koovela modera; publicação 48 h após o envio, com ou sem resposta), PEN-06 (saúde sempre privada), PEN-26 (médias por contrato para a vitrine da 024). Base: 009 (`CONCLUIDO`), 011 (pedidos e avisos), 004 (auditoria), 005 (página pública). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e projeções

- **Decisão**: submódulo `reviews` do domínio `engagement` (CONST 4.4), tabelas no schema do tenant (REQ-AVA-050). Médias públicas e da vitrine são **projeções** por evento: `reviews_rating_projection` no tenant (página do negócio) e `koovela_platform.engagement_rating_summary` global, alimentada por `engagement.review.*` só com identificadores e nota (REQ-AVA-015/051).
- **Por quê**: a página pública e a vitrine leem sem acessar o schema do tenant a cada visita; os eventos não levam texto nem autor.

## R2. Elegibilidade e pedido

- **Decisão**: só agendamento `CONCLUIDO`, uma vez, pelo consumidor do agendamento (UNIQUE `appointment_id`) (REQ-AVA-001). Pedido 2 h após a conclusão e lembrete no 3º dia pela 011; prazo de 14 dias (REQ-AVA-002). Séries: pedido a cada 5 ocorrências concluídas, avaliação livre em qualquer uma (REQ-AVA-005). Membro da equipe do negócio não avalia (checagem pela 007/003, REQ-AVA-040). Pré-cadastro exige OTP antes de avaliar (REQ-AVA-043). Nenhuma recompensa por avaliação (REQ-AVA-042): a 015 não tem gatilho por avaliação e o lint de contrato proíbe esse vínculo.

## R3. Publicação

- **Decisão**: estados `submitted` → (`held` pela triagem) → `scheduled` → `published` (48 h depois do envio, com ou sem resposta) \| `removed` \| `private`. Em saúde, sempre `private` (REQ-AVA-011). Fora da saúde, visibilidade pública depende de `show_reviews_on_page` do negócio (padrão ligado, desligável pelo Proprietário); quando desligado, as avaliações ficam visíveis só para o tenant e **não entram na vitrine** (REQ-AVA-010). Tarefa no `workers` publica as vencidas.

## R4. Médias e exibição

- **Decisão**: média de 12 meses em uma casa decimal (arredondamento meio para cima calculado sobre soma e contagem inteiras) por estabelecimento, filial e profissional; com menos de 5 avaliações, só "novo" sem média (REQ-AVA-012/013). Autor exibido como "Ana S." e mês do atendimento; nunca foto, celular ou e-mail (REQ-AVA-014). Removidas saem da média e da página, mas continuam guardadas (REQ-AVA-034). Recalculo incremental por evento e reconstrução noturna para corrigir deriva (janela de 12 meses móvel).

## R5. Edição e respostas

- **Decisão**: o consumidor edita em até 14 dias e remove a qualquer momento (REQ-AVA-004). Resposta única por avaliação, até 1.000 caracteres, editável em 24 h, pelo Proprietário, Gerente da filial ou Colaborador do atendimento (REQ-AVA-020). O estabelecimento nunca edita nem remove (REQ-AVA-022). Nota 1–2 avisa Proprietário, Gerente da filial e Colaborador; toda resposta avisa o consumidor (REQ-AVA-021).

## R6. Triagem e moderação

- **Decisão**: triagem automática na criação e na edição: lista de termos ofensivos (pt-BR, versionada no back-office), detector de dados pessoais (celular, e-mail, CPF por regex com dígito verificador) e de termos de saúde; casos detectados ficam `held` com aviso ao consumidor (REQ-AVA-031). Sem IA externa (custo zero e LGPD). Denúncia do estabelecimento com motivo da lista dos termos (ofensa ou discriminação, dado pessoal, dado de saúde, não relacionado, conflito de interesse, spam); a avaliação continua visível até a decisão; SLA de 3 dias úteis (REQ-AVA-030/032). Nota baixa ou crítica nunca é motivo de remoção. Decisão com moderador, motivo e resultado na trilha (004) e aviso aos dois lados (REQ-AVA-033). Fila no back-office (021 reutiliza).
- **Alternativas**: classificador de ML hospedado (custo e envio de texto a terceiros).

## R7. Antifraude

- **Decisão**: alerta quando o volume do dia vindo de agendamentos manuais pagos no local passa de 3× a média diária do negócio (últimos 90 dias): as novas ficam `held` e a Gestão recebe alerta (REQ-AVA-041).

## R8. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Avaliação pós-atendimento · avaliações na página e na escolha de profissional | C13 · C04 · C06 |
| Web do consumidor | Avaliação · avaliações na página | W15 · W05 |
| Painel | Avaliações e respostas | P24 |
| Colaborador | Perfil (avaliações próprias e resposta) | K05 |
| Back-office | Fila de moderação | Sem código (nova; G07 é faturamento) |
| A conferir | Denúncia pelo estabelecimento | Desenhar se não existir |
