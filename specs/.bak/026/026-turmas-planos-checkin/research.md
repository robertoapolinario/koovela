# Research: Turmas, planos e check-in (026)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D30 (turmas com capacidade, sem fila de espera, pacotes e planos de aulas, check-in por QR), D28/025 (menor inscrito pelo responsável), PEN-23 (sala só como nome), PEN-07 (pacotes). Base: 006 (catálogo e devolução mínima REQ-CAT-044), 007 (comissão), 008 (ocupação do instrutor com `capacity_unit`, preparada para a tabela de vagas desta spec), 009 (Meus agendamentos por evento), 010 (política), 012 (livro de saldos, cobrança, split), 017 (nota a cada cobrança), 019 (suspensão do tenant). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: submódulo `classes` do `scheduling` (turmas, aulas, inscrições, check-in) e submódulo `memberships` do `payments` (assinatura recorrente do aluno). Definições de pacote e plano de aulas no `catalog` (006), versionadas. Tudo no schema do tenant; créditos no livro de saldos da 012 (REQ-TUR-052).

## R2. Turmas e aulas

- **Decisão**: `classes_group` (modalidade = serviço do catálogo, nível, instrutor, filial, sala por nome, dias e horário, duração, capacidade 2–100, início, fim, preço avulso) e `classes_session` gerada até o horizonte do negócio por tarefa diária (reaproveita `expand()` da 013 para a recorrência semanal) (REQ-TUR-001/002). Cada aula ocupa o tempo do instrutor pela 008 (lock + células) com `capacity_unit = class` (uma ocupação por aula, não por aluno). Sala é só nome: sobreposição gera aviso sem bloqueio (PEN-23, REQ-TUR-005). Mudanças valem para aulas futuras; capacidade nunca abaixo dos inscritos de uma aula (REQ-TUR-004). Cancelar aula ou trocar instrutor: aviso (011), devolução de créditos e estorno de avulsos (012) (REQ-TUR-003).

## R3. Vagas sem dupla reserva

- **Decisão**: tabela `classes_seat` com PK `(session_id, seat_no)` (1..capacidade) — a **regra no banco** — e lock Redis por aula (`lock:class:{session_id}`) na inscrição (REQ-TUR-010). A inscrição, numa transação, trava a linha da aula `FOR UPDATE`, escolhe o menor `seat_no` livre e insere; UNIQUE `(session_id, subject_id)` impede inscrição dupla. Teste de concorrência (N inscrições simultâneas na última vaga → exatamente 1) como **portão de merge** (REQ-TUR-015). Lotada → sem fila; resposta traz as próximas aulas da mesma modalidade com vaga (REQ-TUR-011).
- **Alternativas**: contador `enrolled < capacity` com `CHECK` (funciona, mas sem a garantia por PK que a CONST I pede como "regra no banco" explícita).

## R4. Formas de pagamento da inscrição

- **Decisão**: `avulso` (cobrança pela 012 com split), `credit` (pacote: reserva no livro de saldos na inscrição, consumo na presença) ou `plan` (uso do plano: reserva de uso na inscrição, consumo na presença) (REQ-TUR-012). Menor inscrito pelo responsável, que paga e é dono dos créditos (REQ-TUR-013). Cancelamento pelo aluno segue a política (010): dentro → devolve crédito/uso ou estorna; fora → consome (REQ-TUR-014).

## R5. Check-in

- **Decisão**: janela de 30 min antes a 15 min depois do início (REQ-TUR-020):
  - **QR do aluno** (token assinado por inscrição, curta duração, mostrado no app) lido pelo app do instrutor;
  - **QR do estúdio** (por aula, rotativo a cada 30 s, exibido no tablet/tela) lido pelo aluno — opção do negócio;
  - **manual** pelo instrutor na lista.
  
  Presença consome crédito ou uso (REQ-TUR-021). Fim da aula: inscritos sem presença → `no_show` com a consequência da política (REQ-TUR-022). "Aluno de última hora": inscrição + pagamento + presença numa operação se houver vaga (REQ-TUR-023). Sem rede: o app do instrutor guarda os check-ins com horário e envia ao reconectar; idempotência por `(enrollment_id)` e validação da janela pelo horário registrado (REQ-TUR-024).

## R6. Pacotes de aulas

- **Decisão**: definição no catálogo (aulas 2–100, modalidades, preço, validade 7–365 dias, regra de devolução ≥ REQ-CAT-044) (REQ-TUR-030). Compra cria conta no livro de saldos da 012 (`product_kind = class_package`), nunca negativa (REQ-TUR-031). Tela de saldo: disponível, reservado, usado, validade; aviso 7 dias antes do vencimento (REQ-TUR-032).

## R7. Planos de aulas (assinatura do aluno)

- **Decisão**: definição no catálogo (nome, modalidades, limite por semana / por mês / ilimitado, preço mensal, fidelidade mínima opcional — padrão sem) (REQ-TUR-040). `memberships_subscription` no `payments`: cobrança no ato e todo mês no mesmo dia, no cartão salvo (consentimento de cobrança recorrente), pelo `PaymentProvider` com split, nota a cada cobrança (017) (REQ-TUR-041). Limite contado por semana (segunda a domingo, data local) ou ciclo; acima → recusa com opção avulsa (REQ-TUR-042). Régua: novas tentativas nos dias 1, 3, 5; dia 7 `suspended` (sem novas inscrições pelo plano; já feitas continuam) até pagar (REQ-TUR-043). Cancelamento a qualquer momento com efeito no fim do ciclo; fidelidade só se exibida e aceita (REQ-TUR-044). Preço novo para assinantes só no ciclo seguinte a 30 dias de aviso (REQ-TUR-045). Tenant suspenso (019) → cobranças pausadas com aviso aos alunos (REQ-TUR-046).

## R8. Comissão do instrutor

- **Decisão**: por turma, `fixed_per_class_given` ou `percent_per_attendance` com base: preço avulso; preço por aula do pacote (preço ÷ aulas); ou plano ÷ aulas usadas no ciclo pelo aluno (calculado no fechamento do ciclo do aluno). Cálculo pelo contrato da 007, versão congelada na aula (REQ-TUR-050); entra no fechamento da 018.

## R9. Vertical e integração

- **Decisão**: vertical bem-estar e fitness (spa, massoterapia, yoga, pilates, personal; personal é 1:1 pelo fluxo normal) (REQ-TUR-051). Inscrições publicadas como eventos para "Meus agendamentos" (009) (REQ-TUR-052).

## R10. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Turmas do estúdio (inscrição e QR) | A conferir (DF 9.10) |
| Web do consumidor | Turmas e planos | A conferir |
| Painel | Grade e capacidade · planos e pacotes | A conferir (DF 9.10) |
| App do colaborador | Check-in da turma | A conferir |
| A conferir/novas | Gestão da assinatura pelo aluno · saldo de créditos | Desenhar se não existirem |
