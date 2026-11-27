# Quickstart de validação: Back-office de gestão (021)

Pré-requisitos: specs 001–020 no ar; três pessoas da Gestão (Suporte, Comercial/Growth, Financeiro/Ops ×2); dados sintéticos. Contratos em [contracts/](./contracts/).

## 1. Acesso e matriz

Acessar fora de `admin.koovela.com` ou sem MFA → bloqueado na borda.

```bash
pnpm test:rbac --filter backoffice   # uma célula por tela e ação; nenhuma leitura de anotação ou alerta de cuidado
pnpm test:arch --filter backoffice   # nenhum acesso direto a schema de tenant (só contratos e projeções)
```

## 2. Tenants (G01, G02)

Buscar por CNPJ completo e por e-mail completo; prefixo de e-mail → sem resultado. Detalhe com PII mascarada; "ver completo" do celular → exige justificativa, registro na trilha. Abrir sessão de suporte com justificativa. Visão geral com KPIs da última atualização (≤ 15 min).

## 3. Onboarding e KYC (G04)

Tenant parado há 8 dias → fila do Comercial/Growth. Recebedor recusado → fila do Financeiro/Ops com motivo; pedir documento → aparece no painel do tenant; reenviar. Bloquear recebedor → Proprietário avisado. Situação do CNPJ consultada (cache); serviço fora do ar → "indisponível", sem erro.

## 4. Concessões (G06)

Comercial/Growth concede 20 dias → ativa; 45 dias → aguardando aprovação; Financeiro/Ops aprova → 019 aplica, Proprietário vê data de fim, aviso 7 dias antes. Painel com conversão por autor.

## 5. Antifraude (G08)

Injetar 10 recusas de cartão do mesmo aparelho → alerta (agrupado em 24 h). Regra de pontos → retenção automática; após 72 h sem decisão → retenção cai e severidade sobe. Tentar bloquear consumidor por regra automática → impossível (só humano). Bloquear (humano, com motivo) → consumidor vê motivo genérico e pede revisão; a mesma pessoa tenta revisar → exige justificativa extra e marca "sem segunda pessoa". Alerta sobre colaborador → ação afeta só o vínculo naquele tenant.

## 6. Chargebacks e estornos

Chargeback com dossiê; pedir complemento → Proprietário anexa pelo painel; a 2 dias do prazo sem defesa → alerta. Estorno de R$ 800 → aguarda segunda pessoa do Financeiro/Ops.

## 7. Filas reunidas

Itens de moderação, recuperação de segundo fator, troca de slug, conciliação, inadimplência, provisionamento, trilha e fiscal aparecem com dono e prazo, levando à tela dona.
