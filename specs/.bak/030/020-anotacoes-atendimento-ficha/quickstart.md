# Quickstart de validação: Anotações de atendimento e ficha (020)

Pré-requisitos: specs 001–019 no ar; negócio de saúde (anotações ligadas) e de beleza (desligadas); Proprietário, Gerente, Recepção, duas profissionais (A atende a consumidora; B não). Contratos em [contracts/](./contracts/).

## 1. Consentimento

Profissional A tenta anotar sem consentimento → `care.consent_required`. Recepção pede consentimento por OTP no balcão → código chega ao celular da consumidora; ela informa; registro com aparelho, IP, versão do texto. Consumidora revoga no app → novas anotações bloqueadas, estabelecimento avisado.

## 2. Anotação

A anota em `EM_ATENDIMENTO` (texto + 2 fotos); edita em 24 h → nova versão; depois → `care.note_closed`, adendo com data e autor. Tentar anotar 8 dias após a conclusão → `care.window_closed`. Aviso "não substitui o prontuário" visível.

```bash
pnpm test:security --filter care-notes   # conteúdo cifrado no banco; nada em log, evento ou índice de busca
```

## 3. Quem lê (PEN-10)

```bash
pnpm test:rbac --filter care   # uma célula por papel, inclusive Suporte e SRE em sessão de suporte (nunca leem)
```

Esperado: A lê; consumidora lê no histórico; Proprietário lê; B (não atende) → `care.read_forbidden`; Gerente → negado até o Proprietário liberar; Recepção nunca. Toda leitura gera registro na trilha, sem conteúdo. Encerrar o vínculo de A → A perde o acesso.

## 4. Alerta de cuidado

A cria alerta "alergia a látex"; outra profissional com agendamento da consumidora vê o conteúdo; Recepção vê só "há alerta". Proprietário desativa → histórico.

## 5. Ficha e base (P11)

Ficha mostra histórico, faltas, séries, saldos, pontos, avaliações e indicativo de alerta. Preferências com aviso de não registrar saúde. Base com 10 mil consumidores: filtros ≤ 2 s; busca por nome ou celular completo. Gerente vê só a filial, sem gasto se não liberado. Exportar base como Gerente → negado; como Proprietário → step-up, sem anotações nem alertas.

## 6. Retenção e titular

Simular último atendimento há 5 anos e 1 dia → anotações, fotos e alertas eliminados (chave destruída). Pedido de eliminação do titular via 022 → contrato `erase` concluído por evento.
