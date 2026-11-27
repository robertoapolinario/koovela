# Research: CRM e campanhas (028)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D32 (campanhas por opt-in, cota por plano e excedente na fatura, sem WhatsApp), PEN-06 (saúde: campanhas permitidas sem preço, desconto ou promoção de preço), mesmo consentimento das ofertas de horário ocioso (014). Base: 011 (envio, silêncio, preferências, domínio `news.koovela.com`), 014 (`scheduling_offer_optin`), 015 (tier), 019 (item de uso na fatura), 020 (ficha e projeção `records_consumer_summary`), 021 (concessão de cota, pausa), 022 (registro central de consentimentos, `HolderDataPort`), 025 (atendidos). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: submódulo `crm` do domínio `engagement`, schema do tenant (segmentos, campanhas, automações, resultados) (REQ-CRM-060). O envio é sempre um **pedido de aviso** ao `notification` (011) com `category = marketing`; o `crm` nunca fala com provedor de mensagem.

## R2. Consentimento único de comunicações promocionais

- **Decisão**: `engagement_marketing_consent` (tenant) por consumidor, estabelecimento e canal, com versão do texto, data, aparelho e origem, espelhado no registro central da 022 (REQ-CRM-001/002). **Substitui** o `scheduling_offer_optin` da 014: na implementação da 028, a 014 passa a ler este consentimento por contrato e a tabela antiga é migrada (expandir → migrar → contrair) (REQ-CRM-004). Padrão "sem opt-in"; pergunta na Confirmação (C12/W14) e gestão por estabelecimento em Perfil e notificações (C18/W20). Menores e atendidos (025) nunca recebem: o segmento só inclui titulares com conta (REQ-CRM-005).
- **Descadastro**: link/token por mensagem e canal, sem login, efeito ≤ 1 min (o `notification` checa o consentimento no momento do envio, não só na seleção) (REQ-CRM-003).

## R3. Segmentos

- **Decisão**: regras declarativas (JSON validado por esquema) sobre a projeção `records_consumer_summary` da 020 (dias desde o último atendimento, atendimentos, gasto 12 meses, serviços, profissional, filial, etiquetas, tier da 015, faltas, aniversário no mês) (REQ-CRM-010). Avaliação em SQL gerado no schema do tenant (nunca entre tenants) (REQ-CRM-012). O segmento mostra total e alcançáveis por canal (opt-in + destino válido); lista nominal só ao Proprietário, sem exportação aqui (REQ-CRM-011). Gerente só alcança a própria filial. Sugeridos editáveis: sumidos há 60 dias, frequentes, aniversariantes, sem volta após o primeiro (REQ-CRM-013).

## R4. Campanha

- **Decisão**: nome, segmento, canais (`push` \| `email` \| `sms`; **sem WhatsApp** — validação no contrato) (REQ-CRM-020/021), texto por canal com variáveis (`{primeiro_nome}`, `{negocio}`, `{link}`), imagem opcional no e-mail, oferta opcional (desconto em serviços escolhidos, validade), envio imediato ou agendado. Prévia por canal e envio de teste ao Proprietário (REQ-CRM-023). E-mail sempre de `ofertas@news.koovela.com` (REQ-CRM-022). Cada mensagem identifica o estabelecimento e tem descadastro; SMS começa com "Koovela/{negocio}:" (REQ-CRM-026).
- **Bloqueio de conteúdo**: lista da Gestão (reaproveita a da 016) e, em saúde, detector de preço/desconto/promoção (valores monetários, `%`, "desconto", "promoção", "off", oferta anexada) → campanha bloqueada com o motivo (REQ-CRM-028).

## R5. Cota, excedente e limites

- **Decisão**: cota mensal por canal e preço do excedente por envio, por plano, versionados na 019 (REQ-CRM-040). Antes de enviar: alcançáveis, consumo da cota e custo do excedente; sem confirmação, envia só até a cota (REQ-CRM-024). Excedente vira item `usage:crm_<canal>` na fatura (REQ-CRM-042). Back-office mostra uso por tenant e permite cota extra por concessão da 021 (REQ-CRM-041). Silêncio sem exceção e limite por consumidor (padrão 2 campanhas por estabelecimento a cada 7 dias, configurável pela Gestão) aplicados no `notification` (REQ-CRM-025).

## R6. Oferta e atribuição

- **Decisão**: link da campanha carrega token assinado `(campaign_id, consumer_id, offer_id, exp)`; a oferta só vale por esse link, dentro da validade, com o preço congelado no agendamento (origem `campaign`) e sem acumular com resgate de fidelidade (REQ-CRM-027). Atribuição: agendamento pelo link, ou recebimento + agendamento no estabelecimento em até 7 dias sem outra campanha entre os dois (configurável) (REQ-CRM-031). Resultado por canal: enviados, entregues, aberturas (pixel só no e-mail), cliques, descadastros, agendamentos e atendimentos atribuídos, receita, descontos e reativações (REQ-CRM-030).

## R7. Antifraude e auditoria

- **Decisão**: descadastro > 2%, reclamação de spam ou bounce > 5% numa campanha → `paused` e novas campanhas do tenant bloqueadas até revisão da Gestão (fila da 021), com aviso ao Proprietário (REQ-CRM-043). Envios, pausas, revisões e concessões na trilha (REQ-CRM-044).

## R8. Automações

- **Decisão**: sumido há N dias, aniversário, N dias após o primeiro atendimento sem volta; texto, canais, oferta e limite mensal (REQ-CRM-050). Tarefa diária no `workers` avalia as condições; idempotência por `(automation_id, consumer_id, cycle_key)` (ex.: aniversário = ano; sumido = data do último atendimento) — uma única vez por ciclo, respeitando opt-in, silêncio, limite e cota (REQ-CRM-051).

## R9. Privacidade

- **Decisão**: `HolderDataPort` (022) cobre consentimentos e histórico de envios (REQ-CRM-061); conteúdo das mensagens fica 90 dias (011).

## R10. Provedores de envio em volume (risco de custo)

- **Decisão**: os planos gratuitos usados na 001/011 (e-mail com limite diário baixo; SMS sem plano gratuito) **não comportam campanhas**. O custo de envio é coberto pela cota do plano e pelo excedente cobrado do tenant (019); a escolha do provedor de e-mail em volume (com domínio `news.koovela.com` separado) e de SMS fica como **pendência comercial**, atrás do adaptador de canais da 011. Até a escolha, a flag `crm.campaigns` fica desligada.

## R11. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel | Campanhas (segmentos, resultados, automações) | A conferir (DF 9.10) |
| Back-office | Cota de envios do CRM por tenant | A conferir (DF 9.10) |
| App / web do consumidor | Consentimento na Confirmação · gestão por estabelecimento | C12 · W14 · C18 · W20 |
