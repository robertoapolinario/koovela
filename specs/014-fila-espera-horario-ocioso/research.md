# Research: Fila de espera e horário ocioso (014)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: PEN-18 (tudo configurável pelo back-office e pelo negócio, com padrões), PEN-06 (sem desconto em saúde), PEN-09 (taxa da Koovela no split ou na fatura). Base: 008 (ocupação, hold), 009 (fluxo de agendamento, origem), 010 (`slot_freed_late`), 011 (avisos, silêncio, opt-in por canal), 012 (split com `koovela_idle_fee`). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: submódulo `waitlist` (fila) e `idle` (horário ocioso) do domínio `scheduling` (CONST 4.4), tabelas no schema do tenant. Opt-in de ofertas por estabelecimento e canal guardado no tenant e espelhado nas preferências globais da 011 para exibição no perfil (REQ-FIL-060).

## R2. Detecção de vaga

- **Decisão**: consumidor no `workers` de `scheduling.occupancy.released.v1`, `scheduling.occupancy.hold_expired.v1`, `scheduling.policy.slot_freed_late.v1` e `workforce.availability.changed.v1` (REQ-FIL-010). Para cada horário liberado:
  1. recalcula o tempo livre do profissional;
  2. busca entradas compatíveis (serviço cabe inteiro com preparo e limpeza, profissional igual ou "qualquer", filial e período), em ordem de entrada (REQ-FIL-011);
  3. exclui quem cancelou aquele horário (REQ-FIL-015).
  
  Meta: oferta em ≤ 1 min (REQ-FIL-062).

## R3. Ofertas em lotes de 3 e primeiro aceite vence

- **Decisão**: `waitlist_offer` por horário em rodadas de 3 entradas, com prazo de 15 min (5 min se o horário começa em menos de 2 h); ao vencer, próxima rodada, até acabar a fila ou passar a antecedência mínima (REQ-FIL-012). Aceite = `createHold` da 008 com `origin = waitlist`: a célula garante que **só o primeiro aceite vence**; os demais recebem "a vaga já foi preenchida" e continuam na fila (REQ-FIL-013). Depois, fluxo normal da 009 (política, pagamento, confirmação; REQ-FIL-014). Idempotência por `(horário, consumidor)` (REQ-FIL-061). Aviso transacional, sem opt-in de promoção (REQ-FIL-015).

## R4. Fila: entrada e limites

- **Decisão**: até 30 dias, no máximo 3 entradas ativas por consumidor e negócio, saída a qualquer momento, encerramento automático quando o consumidor agenda o mesmo serviço no período por outro caminho (consumidor de `scheduling.appointment.confirmed.v1`) (REQ-FIL-002/003/004). Oferta automática desligável pelo Proprietário (REQ-FIL-016). Encaixe manual pela Recepção na tela P07 cria agendamento manual com origem `waitlist`, encerra a entrada e bloqueia a oferta automática daquele horário (REQ-FIL-021).

## R5. Regra de horário ocioso

- **Decisão**: regra por negócio (P08): serviços e profissionais elegíveis, dias e faixas, janela de antecedência (X–Y horas), desconto, consumidores elegíveis e limite de ofertas por consumidor, **dentro dos limites do back-office** (PEN-18: padrões 180 dias, 50%, 2–48 h, 2 ofertas por semana). Em saúde, a regra não existe (PEN-06). Um *scanner* a cada 15 min no `workers` procura horários elegíveis ainda livres que entraram na janela; a **fila daquele horário tem prioridade** (REQ-FIL-032). Não envia no horário de silêncio (011), nem para quem está no limite de agendamentos futuros, nem para serviço coberto por pacote (REQ-FIL-035).

## R6. Preço com desconto e taxa

- **Decisão**: preço com desconto = `floor(preço × (10000 − desconto_bps) / 10000)` em centavos, congelado no agendamento (REQ-FIL-033); comissão pela base da `[D17]` (007). Agendamento concluído e pago com origem `idle_offer` gera a **taxa de horário ocioso** da Koovela (`idle_fee_bps` versionada no back-office, 012), retida no split ou somada na fatura conforme o PEN-09 (REQ-FIL-050). Origem `waitlist` sem desconto nem taxa, salvo quando veio de oferta da regra (REQ-FIL-051). A tela da regra mostra a taxa e um exemplo do valor líquido (REQ-FIL-034).

## R7. Opt-in de ofertas

- **Decisão**: padrão "sem opt-in"; pergunta na tela de confirmação (C12/W14) e gestão em Perfil e notificações (C18/W20); registro com estabelecimento, canal, versão do texto e horário; descadastro em um clique em cada oferta (REQ-FIL-040/041/042), usando o modelo de preferências da 011 (que já prevê o opt-in de campanhas da 028).

## R8. Resultado da regra

- **Decisão**: painel com ofertas enviadas, aceitas, agendamentos concluídos, receita, descontos e taxa por período (REQ-FIL-052), calculado a partir dos eventos.

## R9. Telas

| Superfície | Tela | Código |
|---|---|---|
| App / web do consumidor | Fila de espera e aviso de vaga | C17 · W19 |
| App / web do consumidor | Opt-in na Confirmação · ofertas em Perfil e notificações | C12 · C18 · W14 · W20 |
| Painel | Fila de espera e encaixe · Regra de horário ocioso | P07 · P08 |
| Back-office | Limites e taxa de horário ocioso | Sem código (tela nova) |
| A conferir | Oferta de horário ocioso para o consumidor · painel de resultado da regra | Desenhar se não existirem |
