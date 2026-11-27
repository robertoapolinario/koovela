# Research: Educação — aulas avulsas recorrentes (034)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D36 (fase 3), D41 (série de aulas sem matrícula e sem reposição; falta segue o no-show), D18 (série recorrente), D30 (plano mensal e pacotes ficam na 026), PEN-12 (sempre as próximas 4 ocorrências materializadas), PEN-23 (sala é só um nome). Clarify: cobre aula individual em série e vaga fixa recorrente em turma. Base: 005 (vertical do negócio), 006 (serviço), 008 (ocupação, `origin = lesson` já reservado), 009 (check-in e no-show), 010 (janela gratuita, cancelamento tardio, no-show), 011 (avisos), 012 (cartão salvo, cobrança automática, livro de saldos), 013 (motor de séries), 020 (cifragem de anotações e crypto-shredding), 022 (retenção), 025 (atendidos e responsável), 026 (turmas, assentos, inscrições, pacotes, chamada), 033 (local do serviço). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Nenhum motor novo

- **Decisão**: a série de aulas é uma `scheduling_series` da 013 com `kind = lesson`. Não há estados novos (Regras e estados da spec). Este trabalho fica no submódulo `scheduling/lessons`, que contém:
  - a configuração de aula recorrente;
  - o registro da aula;
  - o recesso;
  - o adaptador de vaga recorrente em turma.
- **Por quê**: a spec exige o motor da 013 e a proteção de vaga da 026, sem duplicar nenhum dos dois.
- **Alternativa rejeitada**: um motor próprio de "matrícula". Contraria a D41 e duplica a 013.

## R2. Configuração de aula recorrente

- **Decisão**: `lessons_settings_version`, versionada e ligada a um serviço (aula individual) ou a uma turma (`classes_group`, aula em grupo) (REQ-EDU-001/003). Campos:
  - `enabled`;
  - `frequencies` (subconjunto de `weekly`, o padrão, e `every_2_weeks`);
  - `ends_on` (opcional, por exemplo o fim do semestre);
  - `payment_modes` (subconjunto de `charge_per_lesson` e `package`).
- Só fica disponível quando o negócio é da vertical educação (005). Fora dela, a API responde `lessons.vertical_not_allowed`.
- O schema Zod é **fechado** (`strict`): não aceita campos de matrícula, taxa, período mínimo nem multa de saída. Um teste de contrato garante essa ausência (REQ-EDU-004).
- O plano mensal continua sendo produto da 026 e não entra como forma de pagamento da série.

## R3. Aula individual em série

- **Decisão**: o fluxo "Aulas avulsas recorrentes" cria a série pela API da 013 (REQ-EDU-010):
  - o consumidor informa dia da semana, horário, instrutor, frequência permitida e atendido;
  - a prévia mostra as próximas ocorrências calculadas pela `expand` da 013, com conflitos marcados (feriado da filial, exceção do instrutor, recesso, horário ocupado);
  - as 4 primeiras ocorrências são materializadas como agendamentos da 009 com `origin = lesson`;
  - `ends` vale `on_date` quando a configuração tem `ends_on`, e `never` quando não tem.
- **Aviso obrigatório**: o texto "sem matrícula; falta não tem reposição" tem versão. O aceite grava `lesson_terms_version` e `accepted_at` na série. Sem aceite, a API responde `lessons.terms_not_accepted` (REQ-EDU-011, SC-004).
- **Menor** (REQ-EDU-012): o responsável cria a série com `subject_id` do dependente (025). `consumer_id` é o responsável, que recebe os avisos (011) e paga.
- **Limites por atendido** (REQ-EDU-014): a regra da 013 (até 3 séries ativas por negócio, sem horário sobreposto) passa a usar a chave `(consumer_id, subject_id)`. O próprio consumidor é `self`. Assim, dois filhos podem ter aula no mesmo horário. A mudança é aditiva na 013: a v1.0 continua usando `self`.

## R4. Vaga fixa recorrente em turma

- **Decisão**: uma série com `item_kind = class_group`, materializada como **inscrição** da 026 (`classes_enrollment`) em cada uma das próximas 4 aulas da turma (`classes_session`), e não como agendamento (REQ-EDU-002/013).
  - A ocorrência da 013 ganha `enrollment_id` como alternativa a `appointment_id`.
  - A vaga é protegida pela PK de assento `(session_id, seat_no)` da 026.
  - Aula lotada na materialização fica `in_conflict`. As alternativas são até 3 aulas de outras turmas da mesma modalidade (`service_id`), na mesma semana e com vaga.
  - A frequência da série precisa ser compatível com os dias da turma. Por exemplo, uma turma de sábado só aceita série semanal ou a cada 2 semanas aos sábados.

## R5. Pagamento

- **Decisão**: a 013 ganha `payment_mode = charge_per_lesson`, a cobrança integral do preço da aula, além do sinal por ocorrência.
  - **Por aula**: usa a autorização de cobrança automática no cartão salvo (012, REQ-SER-003). A cobrança acontece **quando termina a janela de cancelamento gratuito** da política congelada (010).
    - Cancelar dentro da janela não gera cobrança nem estorno (REQ-EDU-021).
    - Se a cobrança falhar, a ocorrência fica `PENDENTE_PAGAMENTO` (013).
    - Na turma, usa `pay_mode = single` da 026 com a mesma regra de momento da cobrança.
  - **Pacote**: cada aula reserva um crédito no livro de saldos (012/026) quando é materializada e consome o crédito na presença ou no no-show. Cancelar dentro da janela devolve a reserva. Sem saldo, a série vai para `awaiting_payment` (REQ-SER-004).
- **Por quê**: cobrar no fim da janela gratuita evita cobrar e estornar a cada cancelamento gratuito.
- **Alternativa rejeitada**: cobrar na materialização, como no sinal da 013. Isso gera estornos frequentes, com custo do PSP e ruído no extrato.

## R6. Sem reposição (D41)

- **Decisão**: nenhum caminho de código cria crédito, ocorrência extra ou agendamento a partir de falta ou cancelamento do aluno (REQ-EDU-020, SC-001).
  - O `lessons` não tem a ação "repor". O motivo `makeup` não existe no livro de saldos.
  - Um teste de propriedade cobre todas as combinações (cancelamento dentro da janela, fora da janela, no-show; pagamento por aula ou por pacote; individual ou turma) e verifica que o número de ocorrências futuras e o saldo de créditos nunca aumentam.
- **Faltas seguidas** (REQ-EDU-022): usa o `consecutive_no_shows` da 013 (padrão 2), que leva a série a `paused_for_no_shows` com aviso.
- **Encerrar a série** (História 3, cenário 6): as ocorrências futuras são canceladas sem multa de saída. As que já estão dentro da janela de cancelamento tardio seguem a política da 010.

## R7. Aula cancelada pela escola

- **Decisão**: o cancelamento pela escola ou pelo instrutor (`CANCELADO_ESTABELECIMENTO` na 009, ou `studio_cancelled` na 026) **não conta como falta** e não mexe no contador (REQ-EDU-023, SC-003).
  - Na cobrança por aula: sem cobrança, ou estorno integral se já foi cobrada.
  - No pacote: a reserva do crédito é revertida. Não é um crédito novo.
- **Oferta de outro horário**: a ação "oferecer outro horário nesta semana" no painel e no `/pro` envia ao consumidor (011) um link de agendamento avulso com o serviço pré-selecionado e a janela restrita àquela semana. É um agendamento normal (`origin = lesson`, sem `series_id`), pago normalmente, e não é reposição de falta.

## R8. Recesso

- **Decisão**: `scheduling_branch_recess` registra filial, período, motivo e autor (REQ-EDU-024). Ao declarar:
  - as ocorrências de séries `kind = lesson` da filial no período ficam `skipped` com `skip_reason = recess`, sem custo, e os agendamentos já materializados são cancelados pelo estabelecimento sem cobrança;
  - as aulas das turmas no período são canceladas pela escola (026), com reversão de créditos e estornos;
  - os avisos vão pela 011;
  - a materialização futura pula o período, porque a `expand` consulta os recessos como exceção.
- O recesso não conta como falta. Evento `scheduling.branch.recess_declared.v1`.
- **Por quê**: um ato único para "férias da escola" evita que o negócio cancele centenas de aulas uma a uma.

## R9. Presença e registro da aula

- **Decisão**:
  - **Presença** (REQ-EDU-030): na aula individual, check-in e no-show da 009 pelo `pro-mobile` e pelo `/pro`. Na turma, a chamada da 026. A Recepção pode marcar presença.
  - **Registro** (REQ-EDU-031/032): `lessons_record` tem **um registro por aluno e por aula**, ligado ao agendamento ou à inscrição. Na turma, o instrutor escreve um texto e pode usar "aplicar a todos", que copia o texto para o registro de cada aluno. Assim, nenhum aluno vê o registro de outro.
  - O conteúdo tem até 1.000 caracteres, sem anexos, e é cifrado por envelope com a chave do tenant e `key_ref` para crypto-shredding, como a 020. Pode ser editado por 24 h e depois é fechado.
  - **Leitura**: o aluno adulto (`self`) ou o responsável pelo menor (025), em "Minhas séries", via `HolderDataPort`; o instrutor autor; o Proprietário.
  - O Gerente registra nas aulas da filial, mas não lê os registros, conforme a tabela de Permissões da spec. Ver Riscos no plano.
  - Teste de autorização para cada papel (SC-005).
  - Retenção pelo prazo do agendamento (022). Evento `scheduling.lesson.recorded.v1`, sem o conteúdo.
  - É separado do `care_note` da 020, porque a anotação da 020 é interna ao negócio e este registro é feito para o aluno ver.

## R10. Outras regras herdadas

- **Troca de instrutor por um período**: lista de afetados da 013/009, com "passar a outro instrutor".
- **Mudança de preço**: vale para as ocorrências materializadas depois do aviso (REQ-SER-013).
- **Série com fim**: termina na última ocorrência, com convite para criar outra.
- **Local**: segue o `location` do serviço (033), que pode ser na filial ou no endereço do aluno. Aula online fica fora do escopo.

## R11. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Aulas avulsas recorrentes (escolha, prévia, aviso, pagamento) · Minhas séries com registros | Nova (DF 9.11), a conferir no Figma |
| Web do consumidor | Mesmo fluxo | Sem tela própria (seguir o app) |
| Painel do cliente | Gestão de séries (013) e grade de turmas (026) com a marca "aula" · Configurar aula recorrente · Recesso | Telas da 013 e 026; recesso a conferir |
| App do colaborador e `/pro` | Presença e registro da aula | A conferir |
