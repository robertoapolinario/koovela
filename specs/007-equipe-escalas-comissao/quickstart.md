# Quickstart de validação: Equipe, escalas e comissão (007)

Pré-requisitos: specs 001–006 no ar; negócio de beleza com 2 filiais e catálogo; negócio de saúde. Contratos em [contracts/](./contracts/).

## 1. Equipe e serviços (História 1)

P15: cadastrar 3 colaboradores (CLT, PJ, arrendatário), um sem e-mail (agendável sem app) e um com convite (spec 003). Ligar serviços; tentar ligar um combo sem uma das etapas → recusado. No negócio de saúde, colaborador sem conselho/registro/UF não aparece na página pública. Onboarding solo (spec 005) → colaborador da Proprietária criado pelo evento, com escala.

## 2. Escala (História 2)

P17: Ana na filial 1 (seg–sex 9–18) e na filial 2 (sáb 9–14) → ok; Ana na filial 2 na segunda 10–12 → `workforce.schedule_overlap`. Escala além do horário da filial → aviso. `GET /v1/internal/workforce/professionals/{ana}/work-intervals?branch_id=…&from=…&to=…` devolve UTC já sem almoço da filial e sem folgas; filial em `America/Manaus` converte corretamente.

## 3. Folgas e bloqueios (História 3)

K04: Ana pede folga sexta → Gerente aprova em P17 → evento `workforce.availability.changed.v1`; lista de afetados (ou "verificação indisponível" antes da 009); nada cancelado. Pedido sem decisão até o início → `expired`. Motivo: tela avisa sobre dado de saúde; anexo não existe.

## 4. Troca (História 4)

Ana propõe troca com Bia; Bia aceita; Gerente aprova → exceções de escala para as duas; com agendamentos não resolvidos → `workforce.swap_unresolved_appointments`.

## 5. Regras de comissão e [D17] (História 5)

P16: padrão 40%, serviço "Coloração" 50%, Ana + "Coloração" 55% com piso R$ 30. Escolher base "valor com desconto" → a tela mostra exemplo numérico. Simulador: R$ 200, desconto R$ 20, taxa R$ 6 → valores conferidos à mão. Arrendatário com cota do estabelecimento 30% → comissão 70%.

```bash
pnpm test:property --filter commission   # comissão + parte do estabelecimento = base; piso ≤ comissão ≤ teto; nunca negativo
```

Mudança de regra → nova versão e registro na trilha (spec 004).

## 6. Comissão no app (História 6)

K03/KD3 com lançamentos sintéticos (`pnpm koovela fake-event scheduling.appointment.completed.v1 …`): total da semana e do mês, detalhe por atendimento; estorno sintético aparece como linha de ajuste, sem editar a original; outra colaboradora não vê os lançamentos de Ana (404). Estado do recebedor (spec 012) aparece como "pendente" com atalho.

## 7. Perfil, portfólio e encerramento (Histórias 7 e 8)

K05: enviar foto com declaração de uso de imagem → EXIF e geolocalização removidos; pendente até aprovação. Encerrar o vínculo de Bia com agendamentos futuros → `workforce.unresolved_future_appointments`; sem eles → encerrada na data, papel removido (spec 003), fora da página pública, histórico intacto. Recontratar → novo vínculo, mesma pessoa.
