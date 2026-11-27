# Research: Anotações de atendimento e ficha do consumidor (020)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: PEN-05 (anotação na v1.0, ligada por padrão em saúde e desligada em beleza; retenção de 5 anos após o último atendimento no negócio; prontuário oficial fora da plataforma), PEN-10 (leem: autor, consumidor, profissionais que atendem o cliente e Proprietário; Gerente só se liberado; Recepção nunca; todo acesso registrado), PEN-03 (Gerente da própria filial; gasto conforme liberação). Base: 003 (matriz, step-up, sessão de suporte), 004 (auditoria), 007 (vínculo), 009 (estados), 011 (pedido de consentimento), 012/013/015/016 (dados da ficha), 022 (exportação e eliminação). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: submódulo `records` do domínio `engagement` (CRM e ficha) para ficha, base e preferências; anotações, alertas e consentimentos num submódulo isolado `care_notes` com tabelas próprias e acesso só pelo serviço dele (nenhuma consulta direta de outro módulo). Tudo no schema do tenant (REQ-ANO-052).
- **Por quê**: conteúdo sensível (possível dado de saúde) exige fronteira clara e auditoria em cada leitura.

## R2. "Profissionais que atendem o cliente"

- **Decisão**: um Colaborador "atende o cliente" quando tem, naquele negócio, **agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses** com aquele consumidor (consulta ao `scheduling`, cacheada por 5 min). Isso concilia REQ-ANO-030 ("outros Colaboradores não leem") com REQ-ANO-031: quem nunca atendeu ou não atende há 12 meses não lê. Colaborador com vínculo encerrado nunca lê (REQ-ANO-033).
- **Alternativas**: qualquer Colaborador da filial (amplo demais para dado sensível); só o autor (impede a continuidade do cuidado, contraria PEN-10). Confirmado na análise de 2026-11-27.

## R3. Consentimento destacado

- **Decisão**: `care_consent` por consumidor (titular) e negócio, com versão do texto, horário, aparelho e IP (REQ-ANO-001/002). Só o próprio consumidor consente: app/web (tela dedicada), link do aviso (011, token de uso único) ou OTP no balcão (o código vai ao celular do consumidor; o balcão só digita). Sem consentimento `granted`, a API recusa gravar anotação e alerta (`care.consent_required`) (REQ-ANO-003). Revogação bloqueia novas anotações, mantém as existentes pela retenção e avisa o estabelecimento.

## R4. Cifragem e ausência de busca

- **Decisão**: texto, fotos e alertas cifrados por envelope (AES-256-GCM com chave de dados por tenant, embrulhada pela chave mestra no OCI Vault, fora do banco) via `packages/platform/crypto` (REQ-ANO-012). Fotos no Object Storage já cifradas pelo cliente-servidor (não só cifragem do bucket), servidas por URL assinada de curta duração depois da checagem de permissão. **Nenhum índice de texto** nem envio a buscador (teste de schema).
- **Alternativas**: cifragem só em repouso do banco (não impede leitura por quem acessa o banco).

## R5. Escrita, edição e adendos

- **Decisão**: só o Colaborador do atendimento, de `EM_ATENDIMENTO` até 7 dias após `CONCLUIDO`; até 5.000 caracteres, modelo opcional da vertical (catálogo de modelos versionado no back-office), até 5 fotos (REQ-ANO-011). Editável por 24 h com versões; depois `closed` e só adendos com data e autor, preservando o original (REQ-ANO-013). Aviso fixo na tela: não substitui o prontuário do conselho e o consumidor pode ler (REQ-ANO-014). Liga ao **atendido** (v1.0 = consumidor) e o consentimento ao **titular** (REQ-ANO-050).

## R6. Alertas de cuidado

- **Decisão**: até 140 caracteres, cifrado, por consumidor e negócio (REQ-ANO-020). Profissionais com agendamento daquele consumidor veem o conteúdo; a Recepção vê só o indicativo "há alerta" (REQ-ANO-021). Desativação pelo autor ou Proprietário com histórico (REQ-ANO-022).

## R7. Permissões e auditoria

- **Decisão**: células próprias na matriz (`care_note.read_own`, `care_note.read_others`, `care_note.write`, `care_alert.read_content`, `care_alert.read_flag`, `care_note.export`), com teste gerado por célula **incluindo sessão de suporte** (Suporte e SRE nunca leem, mesmo em sessão) (REQ-ANO-030/034). Gerente: `read_others` só com a liberação `owner_grants.branch_manager_care_notes` (REQ-ANO-031). Toda leitura, criação, adendo e exportação → registro na trilha **sem conteúdo** (REQ-ANO-032).

## R8. Retenção

- **Decisão**: tarefa mensal elimina anotações, fotos, alertas e consentimentos de consumidores cujo último atendimento no negócio passou de 5 anos (REQ-ANO-010); eliminação por crypto-shredding da chave do registro + remoção do objeto. Pedido do titular (LGPD) atendido pela 022 por contrato (REQ-ANO-051).

## R9. Ficha e base

- **Decisão**: ficha montada por projeção de leitura (`records_consumer_summary` por consumidor e filial, alimentada por eventos de 009, 012, 013, 015, 016): histórico, faltas, séries, saldos de pacote, pontos e tier, avaliações, indicativo de alertas (REQ-ANO-040). Preferências não sensíveis (nome preferido, profissional preferido, observação operacional ≤ 500, etiquetas) com aviso para não registrar saúde (REQ-ANO-041). Base com filtros por último atendimento, número de atendimentos, gasto 12 meses, faltas, etiquetas; busca por nome (prefixo, índice) ou celular completo (hash) — nunca por texto de anotação; meta ≤ 2 s para 10 mil (REQ-ANO-043). Gerente: própria filial; gasto conforme PEN-03 (REQ-ANO-045). Exportação só do Proprietário com step-up, sem anotações nem alertas (REQ-ANO-044).

## R10. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel | Base de consumidores · ficha · anotações | P11 (Clientes) e telas de detalhe |
| App do colaborador | Detalhe com check-in e check-out (anotação e alerta) | K02 |
| Colaborador desktop | Atendimento com check-in e check-out | KD2 |
| App / web do consumidor | Pedido de consentimento · anotações no histórico | A conferir (provavelmente novas) |
