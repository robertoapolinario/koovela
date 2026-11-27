# Quickstart de validação: Colaborador em vários negócios (027)

Pré-requisitos: specs 001–026 no ar; dois tenants sintéticos (Salão A, Salão B); uma colaboradora com vínculo nos dois. Contratos em [contracts/](./contracts/).

## 1. Segundo vínculo

Salão B convida a colaboradora (mesmo celular) → aceite pela 003; vínculo independente com escala e comissão próprias. Como Salão A, procurar qualquer sinal do vínculo em B → nada.

```bash
pnpm test:isolation --filter multi-engagement   # nenhuma rota de tenant revela outros vínculos
```

## 2. Agenda unificada

App e `/pro`: dia e semana com A e B por cor. Check-in num atendimento de B → executa no contexto de B. Modo avião → próximos 7 dias legíveis.

## 3. Conflito (C6)

Agendar 15h em A e 15h em B → conflito detectado: colaboradora vê os dois; A e B veem só "compromisso fora deste negócio 15h–16h", com marca na agenda. Recepção de A tentando agendar 15h manualmente → aviso antes de confirmar. Remarcar o de B → conflito encerrado (texto nunca diz "resolvido automaticamente").

```bash
pnpm test:contract --filter cross-tenant-conflict   # criação, remarcação, cancelamento, fim de vínculo (portão de merge)
```

## 4. Bloqueio opcional

Colaboradora liga "bloquear nos outros negócios" → agendamento em A cria "indisponível" em B (sem detalhes), com a proteção da 008; desligar remove os futuros. Proprietário de B tenta ligar por ela → sem opção.

## 5. Folga, comissões e perfil

"Pedir folga em todos" → dois pedidos separados, aprovados por regras de cada um. Comissões por negócio e total. Perfil global ajustado em B; portfólio e avaliações de A não aparecem em B. Encerrar vínculo com A → B intacto; conflitos com A encerrados.
