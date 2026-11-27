# Research: Back-office de gestão (021)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 002 (tenants, suspensão), 003 (matriz, MFA, sessão de suporte, recuperação), 004 (auditoria, flags), 012 (recebedor, estornos, chargebacks, conciliação), 015/016 (pontos, avaliações), 019 (assinatura, concessões aplicadas, inadimplência), 020 (anotações nunca expostas). Restrições: serviços externos gratuitos; tenant nunca acessado diretamente (CONST II). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e acesso a dados

- **Decisão**: domínio `backoffice` (CONST 4.4) com dados próprios em `koovela_platform` (concessões, alertas, investigações, observações, filas). **Nunca** lê o schema de um tenant: o detalhe do tenant compõe respostas dos contratos das specs donas (002, 005, 012, 019, 003) e de projeções agregadas (REQ-BKO-002/053). Acesso só por `admin.koovela.com` (Cloudflare Access + MFA + lista de IPs, 001/003) (REQ-BKO-052). Cada tela e ação com célula na matriz, testada (REQ-BKO-051).

## R2. Mascaramento e "ver completo"

- **Decisão**: os contratos consumidos pelo back-office devolvem PII **já mascarada** (`a***@d***.com`, `(11) 9****-1234`, `***.456.789-**`). "Ver completo" chama um endpoint de revelação por campo, que exige justificativa (texto + referência de atendimento opcional), registra na trilha (004) e devolve o valor com `Cache-Control: no-store` (REQ-BKO-003). Busca por CNPJ ou e-mail **completo** via hash (não por prefixo) (REQ-BKO-001).

## R3. Visão geral e detalhe

- **Decisão**: visão geral (G01) de uma projeção `bko_platform_kpi` atualizada a cada 15 min a partir de eventos e métricas (tenants ativos, ativados, em degustação, North Star, GMV, inadimplência, chargebacks e alertas abertos, saúde técnica do Prometheus) (REQ-BKO-006). Detalhe do tenant (G02) por composição de contratos com timeout por parte e indicação de parte indisponível. Observações internas não sensíveis só para a Gestão (REQ-BKO-005). Abrir sessão de suporte pela 003 com justificativa ligada ao atendimento (REQ-BKO-004).

## R4. Onboarding e KYC

- **Decisão**: G04 lista tenants em onboarding com passo, dias parados e recebedor (de eventos de 002/005/012); > 7 dias parados → fila do Comercial/Growth (REQ-BKO-010). Recebedor recusado ou em análise > 3 dias úteis → fila do Financeiro/Ops com motivo do PSP e ação "pedir documento/correção" (aviso ao tenant e tela no painel) e reenviar (REQ-BKO-011). Bloquear/desbloquear recebedor pelo comando da 012 com motivo e aviso ao Proprietário (REQ-BKO-012). **Situação do CNPJ** por consulta pública gratuita (BrasilAPI, com cache de 7 dias e degradação graciosa quando fora do ar) e comparação titular do recebedor × cadastro (REQ-BKO-013). Só o CNPJ do negócio é enviado (dado público).
- **Alternativas**: APIs pagas de bureau (violam custo zero).

## R5. Concessões

- **Decisão**: tipos `trial_days`, `subscription_discount_pct`, `subscription_discount_cents`, `booking_fee_waiver_days`, `one_off_credit` com valor, duração, motivo, autor (REQ-BKO-020). Limites por perfil em `bko_grant_limits` versionado (padrão Comercial/Growth: degustação ≤ 30 dias, desconto ≤ 50% por ≤ 3 ciclos, crédito ≤ R$ 300); acima, segunda degustação ou tenant inadimplente → `awaiting_approval` do Financeiro/Ops (REQ-BKO-021). Aplicação pela 019 via evento `backoffice.grant.activated.v1`; Proprietário vê data de fim, aviso 7 dias antes (REQ-BKO-022). Painel por período e autor: quantidade, valor, tempo pedido → vigência, conversão (primeira fatura cheia paga) (REQ-BKO-023). Tudo auditado (REQ-BKO-024).

## R6. Motor de antifraude

- **Decisão**: motor de regras declarativo no `workers` (`packages/domain/fraud-rules`), regras versionadas no back-office (limites, janelas, severidade), consumindo sinais de 003 (logins, OTP), 008 (holds), 009 (cancelamentos, no-show), 012 (recusas, chargebacks), 015 (abuso de pontos), 016 (picos de avaliação) (REQ-BKO-030). Cada alerta: tipo, severidade, alvo, evidências (ids), regra e versão. Agrupamento de alertas iguais para o mesmo alvo em 24 h (REQ-BKO-038). Chargeback do tenant > 1% do volume de cartão em 30 dias → severidade alta (REQ-BKO-036).
  - **Automático só retém ou limita por até 72 h** (pontos `pending_review`, avaliações `held`, limite de tentativas); ao vencer sem decisão humana, a retenção cai e a severidade sobe (REQ-BKO-032).
  - **Bloqueio de consumidor e suspensão de tenant só por humano**; ações: falso positivo, reter pontos ou avaliações, bloquear meio de pagamento, reter repasses, bloqueio temporário do consumidor, suspender tenant (002) (REQ-BKO-033). Toda decisão com motivo e auditoria (REQ-BKO-031).
  - Consumidor bloqueado vê motivo genérico e canal de revisão; revisão por **outra pessoa** em até 5 dias úteis (REQ-BKO-034).
  - Alvo colaborador = **vínculo** no tenant, nunca a pessoa em outros tenants (REQ-BKO-035).
  - A investigação **nunca** mostra anotações ou alertas de cuidado (contratos da 020 não expostos ao back-office; teste de matriz) (REQ-BKO-037).
- **Alternativas**: modelo de ML (sem dados de treino na v1.0; decisão automatizada sensível pela LGPD art. 20).

## R7. Chargebacks e estornos

- **Decisão**: fila em G08 com prazo, valor, motivo, tenant e dossiê automático da 012; pedir complemento ao tenant (tela no painel; o Proprietário anexa até 3 dias antes do prazo), enviar defesa pelo `PaymentProvider`, acompanhar (REQ-BKO-040/041). A 2 dias do prazo sem defesa → alerta (REQ-BKO-042). Estorno manual acima de R$ 500 (configurável) exige segunda pessoa do Financeiro/Ops (REQ-BKO-043).

## R8. Segunda pessoa

- **Decisão**: componente comum `dual_control` (mesmo da 019 para planos): ação fica `pending_second_approval`; a mesma pessoa só aprova com justificativa extra, marcada `no_second_person` e contada nas métricas (REQ-BKO-054).

## R9. Filas reunidas

- **Decisão**: "Filas" agrega por contrato as filas das outras specs (moderação 016, recuperação de segundo fator 003, troca de slug 005, divergências de conciliação 012, inadimplência 019, falhas de provisionamento 002, quebra da trilha 004, alertas de fidelidade 015, falhas fiscais 017), cada item com dono e prazo, levando à tela da spec dona (REQ-BKO-050).

## R10. Telas

| Superfície | Tela | Código |
|---|---|---|
| Back-office | Visão geral · Tenants · Onboarding e KYC · Concessões · Antifraude, estornos e chargebacks | G01 · G02 · G04 · G06 · G08 |
| Back-office | Filas reunidas | Sem código (nova) |
| Painel | Pedido de documento · aviso de concessão · complemento de chargeback | A conferir (provavelmente novas) |
| App / web do consumidor | Aviso de bloqueio e pedido de revisão | A conferir (nova) |
