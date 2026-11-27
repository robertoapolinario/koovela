# Quickstart de validação: Política de cancelamento e não comparecimento (010)

Pré-requisitos: specs 001–009 no ar; negócio de beleza e negócio de saúde. Contratos em [contracts/](./contracts/).

## 1. Configurar (P19)

Beleza: janela gratuita 24 h, multa tardia 50%, falta 100%, tolerância 15 min, forma "reter sinal"; sinal "só consumidor novo ou com falta" em "Coloração" (30%). Pré-visualização mostra o texto com exemplo em reais. O seletor de forma de multa só mostra as formas permitidas pelo back-office. Salvar com vigência amanhã → nova versão agendada, auditada.

## 2. Resumo e aceite (C08/W11)

Agendar "Coloração" como consumidor novo → sinal exigido (`PENDENTE_PAGAMENTO` na 009) e o resumo mostra datas e valores calculados. Confirmar → aceite com hash do texto, versão, IP, aparelho e horário. Saúde: resumo diz "taxa de agendamento de R$ 30, abatida do valor do atendimento" sem nenhum preço do serviço.

## 3. Consequências (C13/W15 e contrato)

`POST /v1/internal/scheduling/policy/evaluate`:
- antes da janela → `free`, sinal devolvido integralmente;
- dentro da janela → `late_fee` 50% do preço congelado (arredondado para baixo); sinal de 30% < multa → retém o sinal todo, nada a devolver;
- sinal maior que a multa → retém a multa, devolve o resto;
- agendamento por pacote → falta consome a sessão;
- cancelamento pelo estabelecimento → nunca multa.

```bash
pnpm test:property --filter policy   # retido + devolvido = sinal; multa ≤ preço; nunca negativo
```

## 4. Não comparecimento, contador e "N faltas"

Marcar falta (009) → multa aplicada, contador +1, aviso ao consumidor (011). Com "sinal após 2 faltas", a terceira tentativa exige sinal. Corrigir a falta em 48 h → multa e contador revertidos. Agendamento manual sem "informei a política" → multa registrada como `record_only`.

## 5. Abono e contestação

Recepção abona com motivo → `waived`, auditado. Consumidor contesta em até 7 dias (tela nova) → multa `suspended`; fila na filial; sem decisão em 7 dias → `auto_accepted`. "Não fui atendido" depois de 48 h → `policy.dispute_window_closed`.

## 6. Fila de espera

Cancelamento tardio de horário futuro → evento `scheduling.policy.slot_freed_late.v1` (consumido pela 014).
