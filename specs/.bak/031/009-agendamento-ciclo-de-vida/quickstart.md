# Quickstart de validação: Agendamento e ciclo de vida (009)

Pré-requisitos: specs 001–008 no ar; negócio publicado com serviços, combo e 3 profissionais. Contratos em [contracts/](./contracts/), estados em [research.md](./research.md#r2-máquina-de-estados).

## 1. J1 do link à confirmação (História 1)

App e web: `koovela.com/<slug>?src=qr` → serviço → profissional → horário (C07/W10) → etapa 1 (OTP) → resumo com política (C08/W11) → confirmar → C12/W14 com endereço completo, mapa, `.ics` e próximo passo. Esperado: `RASCUNHO` → `CONFIRMADO`; origem `qr`; versões congeladas no registro; p95 ≤ 2 s (`pnpm load --scenario confirm`). Abandonar no resumo por 10 min → `EXPIRADO` e horário liberado. Sexto agendamento futuro no mesmo estabelecimento → `scheduling.future_limit_reached`.

## 2. Meus agendamentos (História 2)

Consumidor com agendamentos em dois tenants sintéticos → C03/W06 lista os dois, com ações; um tenant não consegue ler a projeção (teste). "Agendar de novo" a partir de um concluído abre o fluxo com o mesmo serviço e profissional.

## 3. Remarcar e cancelar (História 3)

C13/W15: remarcar → original `REAGENDADO`, novo `CONFIRMADO`, mesma versão e preço, sem janela livre no meio (teste de corrida). Cancelar → `CANCELADO_USUARIO`; a consequência da política aparece antes (stub da 010 até ela existir). Estabelecimento cancela com motivo → `CANCELADO_ESTABELECIMENTO` e aviso.

## 4. Agenda da equipe (História 4)

P03/P04: colunas por colaborador com ocupações, livres, folgas e bloqueios; abrir em duas abas, criar agendamento numa → aparece na outra em ≤ 5 s (SSE). P05: buscar consumidor por celular; criar um novo sem OTP → pré-cadastro visível só neste tenant. Aprovar uma folga (007) → agendamento aparece em "afetados"; resolver em lote.

## 5. Colaborador (História 5)

K01/KD1: agenda do dia; check-in antes de 30 min → recusado; depois → `EM_ATENDIMENTO`; check-out → `CONCLUIDO` (evento para 012, 015, 016, 017). Serviço "a partir de" com valor final abaixo do mínimo → recusado. Modo avião no app: agenda de 7 dias legível com "sincronizado às…"; check-in sem rede → enviado ao reconectar com `recorded_offline = true`.

## 6. Não comparecimento e pendências (História 6)

Sem check-in após 15 min → equipe marca `NO_SHOW`; corrigir em até 48 h → volta com registro. Fim do dia da filial → `CONFIRMADO` sem check-in na lista de pendências, sem mudar de estado.

## 7. Regras e histórico (História 7)

```bash
pnpm test:property --filter appointment-state   # nenhuma transição proibida
pnpm test:isolation                              # contratos desta spec
```

Mudar o preço do serviço depois de agendar → o agendamento mantém o preço congelado. Tentar apagar um `CONCLUIDO` → impossível.
