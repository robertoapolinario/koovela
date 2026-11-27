# Research: Eventos — propostas, contratos e sinal (035)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas:

- **D36**: fase 3.
- **D42**: reserva por dia ou período, sempre com proposta; sinal definido pelo fornecedor; contrato aceito no app; pré-reserva da data enquanto a proposta vale.
- **PEN-29**: aceite simples com reautenticação e evidências por padrão; assinatura avançada acima de um valor que o fornecedor define.
- **PEN-31**: validade configurável, de 1 a 15 dias, com 7 como valor inicial.
- **PEN-14**: o split segue o do tenant.
- **PEN-19**: a avaliação segue a 016.

Base: 003 (CPF cifrado, data de nascimento, reautenticação `POST /v1/auth/step-up`), 004 (auditoria e flags), 008 (`granularity = day_period` e `origin = event_hold` já reservados), 011 (avisos), 012 (pagamento com split, estorno, idempotência), 016 (avaliação e reputação interna), 017 (retenção de 5 anos com bloqueio de remoção no bucket), 018 (PDF por HTML e Chromium headless no `workers`), 019 (itens de uso na fatura), 021 (suporte), 022 (retenção e `HolderDataPort`), 024 (vitrine), 033 (`quote_request`, fotos, `quotes_limits`, `consumer_quotes_index`).

Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: o domínio `quotes` (CONST 4.4), no schema do tenant, recebe os submódulos `events`, `proposals`, `contracts` e `date-holds` (REQ-EVT-040).
  - O pedido de proposta é um `quotes_request` da 033 com `kind = event` e campos de evento (REQ-EVT-010).
  - Sinal e saldo são pagamentos do `payments` (012) ligados ao contrato.
  - O consumidor lê "Meus eventos" pela projeção `koovela_projections.consumer_events_index`, alimentada por eventos, no mesmo padrão da 009 e da 033.

## R2. Configuração do fornecedor

- **Decisão**: `quotes_event_settings_version` é versionada por filial ou por profissional (REQ-EVT-001/002/004/005). Campos:
  - unidade `full_day` ou `periods`, com até 6 períodos (código, nome, início e fim em hora local);
  - `capacity` (padrão 1);
  - sinal `percent` de 1.000 a 5.000 pontos-base (padrão 3.000) ou `fixed_cents`;
  - saldo em até 3 parcelas, com quitação padrão 7 dias antes do evento;
  - faixas de cancelamento `{min_days_before, refund_deposit_pct, refund_balance_pct}`;
  - `advanced_signature_above_cents` (opcional);
  - `validity_days`, dentro dos limites do back-office (R6);
  - `accepts_short_notice`.
- **Bloqueios**: `quotes_date_block` (data, período opcional, motivo). Uma data bloqueada não recebe pré-reserva.
- **Por que no `quotes`**: a regra de eventos é independente do motor de horários. Só a ocupação do profissional toca a 008 (R3).
- **Mudanças** valem só para propostas novas (CONST III): a proposta congela o `settings_version_id`.

## R3. Pré-reserva com garantia no banco (CONST I)

- **Decisão**: a garantia contra reserva dupla é uma tabela de vagas por unidade, `quotes_date_slot`, com PK `(scope_kind, scope_id, date, period_code, slot_no)`. É o mesmo padrão dos assentos da 026 (REQ-EVT-013, SC-001).
  - `slot_no` vai de 1 até a capacidade congelada.
  - Pré-reservar insere a linha no primeiro `slot_no` livre. Se a PK conflitar, tenta o próximo. Esgotada a capacidade, responde `quotes.date_unavailable` e o fornecedor vê o motivo.
  - Evento de vários dias: todas as datas e períodos entram numa única transação, em ordem crescente de data. É tudo ou nada.
  - `quotes_date_hold` aponta para as vagas e guarda o estado `held`, `confirmed`, `released` ou `fulfilled`.
- **Profissional** (por exemplo, fotógrafo): a capacidade é sempre 1. Na mesma transação, o sistema cria uma ocupação da 008 com `granularity = day_period`, `origin = event_hold` e as células do período: `hold` na pré-reserva e `definitive` na confirmação.
  - Assim, a agenda de horários do profissional também fica bloqueada.
  - Se o período já tiver horários ocupados na 008, a pré-reserva falha com `quotes.professional_busy`.
- **Filial** (espaço de festas): capacidade N, sem células.
- **Disponibilidade para o consumidor** (REQ-EVT-011): `free`, `negotiating` (há `held` e não há vaga livre) ou `occupied` (todas as vagas `confirmed`, ou data bloqueada). Ninguém vê quem ocupa a data.
- **Alternativas**: só células de 5 minutos da 008 (não representam capacidade maior que 1 por filial); lock em Redis (o banco já garante).

## R4. Proposta

- **Decisão**: `quotes_proposal` com versões imutáveis `quotes_proposal_version` (REQ-EVT-012):
  - itens `{descrição, quantidade, valor_unitário_cents}` e `total = Σ`;
  - sinal calculado pela regra congelada, que o fornecedor pode ajustar dentro da faixa;
  - parcelas do saldo, até 3, com soma igual a `total − sinal`;
  - datas e períodos (um ou vários dias seguidos), profissional (quando a capacidade é por profissional) e `valid_until`.
- **Estados**: `draft` → `sent` → `accepted` → `contracted`, ou `superseded`, `declined`, `expired`.
- **Nova versão**: substitui a anterior (`superseded`), mantém a pré-reserva e estende `held_until` para a validade da nova, sempre dentro dos limites. Se a nova versão muda a data, troca a pré-reserva atomicamente: reserva a nova antes de liberar a antiga.
- **Prazo curto** (evento em menos de 7 dias): só com `accepts_short_notice`. Nesse caso, o saldo vence junto com o sinal, num único pagamento do total. Data passada é rejeitada.
- **Montagem rápida** (SC-005): itens frequentes reaproveitados de propostas anteriores do negócio e cálculo automático do sinal e das parcelas.

## R5. Contrato: modelo, renderização e PDF

- **Decisão**:
  - **Modelo base da Koovela**: `koovela_platform.quotes_contract_base_version`, versionado. Só pode ser usado com a revisão jurídica registrada (`legal_reviewed_by`, `legal_reviewed_at`). A flag `quotes.events` só liga com uma versão revisada (REQ-EVT-020).
  - **Modelo do fornecedor**: `quotes_contract_template_version` = versão do modelo base + cláusulas próprias em Markdown restrito (sem HTML nem scripts).
  - **Campos automáticos**: partes, CPF mascarado na visualização, data, período, local, itens, valores, sinal, parcelas e faixas de cancelamento. São preenchidos por um conjunto fechado de variáveis, sem lógica (REQ-EVT-003).
  - **Cláusula do arrependimento** (CDC art. 49, 7 dias com devolução integral): fixa e não removível. As faixas do fornecedor são mostradas como "após 7 dias do aceite".
  - **Renderização**: Markdown → HTML sanitizado → PDF pelo Chromium headless no `workers` (como a 018). O PDF final é guardado no Object Storage com retenção de 5 anos e bloqueio de remoção (como a 017), e as duas partes o recebem (REQ-EVT-022, SC-003).
- **Alternativa rejeitada**: editor livre de documento, que permitiria remover cláusulas obrigatórias e dificultaria a evidência.

## R6. Validade (PEN-31)

- **Decisão**: os `quotes_limits` da 033 ganham `event_validity_days_min` (1), `event_validity_days_max` (15) e o valor inicial de configuração 7 (REQ-EVT-014). O fornecedor escolhe dentro desses limites, e a proposta congela o valor.
- O `workers` faz duas coisas:
  - aviso 24 h antes do vencimento às duas partes, pela 011;
  - no vencimento, proposta `expired` e pré-reserva `released`, com as vagas e as células liberadas (REQ-EVT-015).

## R7. Aceite e evidências (PEN-29)

- **Decisão**: o aceite exige (REQ-EVT-020/023):
  - **maior de 18 anos**: data de nascimento da conta (003); sem ela, o consumidor informa e ela é verificada antes do aceite;
  - **nome completo e CPF**: gravados na conta, com o CPF cifrado e com dígito verificador validado;
  - **reautenticação** com segundo fator há no máximo 5 minutos (`auth_time` da 003).
- **Evidência** (`quotes_contract_acceptance`, append-only):
  - SHA-256 do PDF exatamente como foi exibido, junto com a versão do modelo base, a versão do modelo do fornecedor e a versão da proposta;
  - instante do servidor, `consumer_id`, aparelho (fingerprint), IP e user-agent;
  - texto do botão aceito.
  - O IP e o aparelho são lidos só pelo Proprietário e, em disputa, pela Gestão, com acesso auditado.
- **Assinatura avançada**: contratos com `total ≥ advanced_signature_above_cents` passam pela porta `SignatureProvider` (`createEnvelope`, `status`, `downloadSigned`, webhook). O custo de cada envelope entra como item de uso na fatura do tenant (019, `usage:advanced_signature`). Assim, a Koovela não absorve o custo e o fornecedor que escolhe a opção paga por ela.
  - O primeiro adaptador será um provedor nacional com API e cobrança por documento, escolhido na contratação.
  - A opção fica atrás da flag `quotes.advanced_signature`, desligada até haver contrato com o provedor.
  - A assinatura qualificada ICP-Brasil fica fora do escopo.
- **Por quê**: o aceite simples atende à MP 2.200-2 (art. 10 §2º) com evidências fortes e custo zero. A avançada é opcional e o fornecedor paga.

## R8. Sinal e confirmação

- **Decisão**: depois do aceite, a proposta fica `accepted` e o pagamento do sinal é criado na 012 com split do tenant (REQ-EVT-024), `Idempotency-Key = contract_id:deposit` e Pix ou cartão.
  - O prazo é `min(aceite + 24 h, valid_until)` (REQ-EVT-021).
  - Pago: contrato `active`, pré-reserva `confirmed`, ocupação da 008 `definitive` e PDF final emitido.
  - Não pago no prazo: o aceite perde efeito, a proposta volta a `sent` e a pré-reserva continua até `valid_until`. O consumidor pode aceitar de novo, o que gera nova evidência.
  - Meta de ponta a ponta (aceite, contrato e sinal): até 5 minutos (SC-002).
- A nota fiscal do fornecedor segue a 017, a partir dos pagamentos.

## R9. Saldo

- **Decisão**: `quotes_installment` com estados `due`, `paid`, `overdue` e `refunded` (REQ-EVT-030).
  - Aviso 3 dias antes, com link de pagamento no app (012, Pix ou cartão).
  - No vencimento sem pagamento: `overdue` e aviso ao fornecedor, que decide conforme o contrato. Não há cobrança automática nem cancelamento automático.
  - No dia do evento com valores em aberto: aviso de saldo pendente ao fornecedor. A cobrança fora do app não é tratada pela Koovela.

## R10. Cancelamento e devolução

- **Decisão**: o endpoint de simulação mostra o valor antes de confirmar (REQ-EVT-031).
  - **Pelo consumidor**:
    - até 7 dias do aceite do contrato: devolução de 100% do que foi pago (REQ-EVT-032, SC-004);
    - depois disso: a faixa congelada pelos dias até o evento define `refund_deposit_pct × sinal pago + refund_balance_pct × parcelas pagas`, arredondado em centavos a favor do consumidor.
  - **Pelo fornecedor** (REQ-EVT-033): devolução de 100% do que foi pago. A multa prevista no contrato fica registrada e é mostrada às partes, mas a liquidação acontece fora da Koovela, porque a Koovela não debita o fornecedor nesta fase. A marca de cancelamento vai para a reputação interna (016).
  - **Execução**: estornos pela 012, do pagamento mais recente para o mais antigo, com idempotência por `contract_id:cancel`. Em seguida: contrato `cancelled_by_*`, pré-reserva `released`, vagas e células liberadas. Tudo vai para a trilha da 004 (REQ-EVT-035).

## R11. Aditivo

- **Decisão**: `quotes_contract_amendment`, proposto pelo Gerente ou pelo Proprietário, com o que muda (convidados, itens, valores, data) (História 3, cenário 6).
  - É aceito da mesma forma que o contrato (R7), com novo PDF e nova evidência. O contrato passa a `amended`, e as versões anteriores continuam guardadas.
  - **Mudança de data**: reserva a nova data na aceitação e libera a antiga atomicamente. Sem vaga, a aceitação falha.
  - **Diferença de valor**: a mais gera nova parcela; a menos gera devolução proporcional pela 012.

## R12. Realização e avaliação

- **Decisão**: o fornecedor marca "realizado", ou o `workers` marca 24 h depois do fim do último período (REQ-EVT-034).
  - Contrato `fulfilled` e pré-reserva `fulfilled`.
  - Convite para avaliar pela 016, com as regras públicas da PEN-19.

## R13. Dados pessoais

- **Decisão**:
  - CPF: na conta (003); no contrato, só o snapshot cifrado.
  - Local do evento: cifrado.
  - Descrição e fotos: regras da 033. São retidas por 90 dias se não virarem contrato; se viraram, pelo prazo do contrato.
  - Contrato, evidências e PDF: retidos por 5 anos depois do evento (CC art. 206 §5º). Têm prioridade sobre o pedido de eliminação (022), por exercício regular de direitos.
  - O `HolderDataPort` exporta contratos e evidências do próprio consumidor.

## R14. Vitrine e telas

- **Decisão**: a listagem da 024 ganha `booking_mode = proposal`, e o cartão mostra "pedir proposta" em vez de horários.

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Evento: pedir proposta · Evento: proposta, contrato e sinal · Meus eventos (parcelas, cancelamento com simulação) | Novas (DF 9.11), a conferir no Figma |
| Web do consumidor | Mesmos fluxos | Sem tela própria (seguir o app) |
| Painel do cliente | Eventos: calendário de datas, propostas e contratos · Configuração · Editor do modelo · Aditivos | Calendário e propostas (DF 9.11); editor e aditivos a conferir |
