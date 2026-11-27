# Feature Specification: Privacidade e direitos do titular

**Feature Branch**: `022-privacidade-direitos-titular`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "022 privacidade-direitos-titular — seguir a sequência da constituição (seção 10): exportação, eliminação, consentimentos. Depende de 003 e 020. Pendência C4. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (com o modelo preparado para a Koovela como controladora na vitrine da fase 2, `[D26]`)

**Superfícies afetadas**: app do consumidor e web do consumidor ("Perfil": meus dados, meus consentimentos, pedidos de privacidade) · painel do cliente ("Pedidos de titulares"; exportação de dados do tenant) · back-office (fila do Encarregado de dados, registro de incidentes, tabela de retenção) · página pública de privacidade em `koovela.com`

**Depende de**: 003 `identidade-acesso` · 020 `anotacoes-atendimento-ficha` (e, por elas, todas as specs que guardam dados pessoais: 002 a 019)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípio IV (integral), Princípios II, V, VIII, seções 3 (`privacidade@koovela.com`), 5, 8 (`[C4]`) e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.1, 2.2, 10.8, 12, 16, 17 (`[D03]`, `[D23]`, `[D26]`) e 18 (`[C4]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A LGPD dá ao titular o direito de confirmar que seus dados são tratados, acessá-los, corrigi-los, levá-los a outro serviço (portabilidade), pedir a eliminação e revogar consentimentos (art. 18). A constituição exige que esses direitos sejam **executáveis de ponta a ponta**, inclusive a exclusão de conta dentro do app, exigida pelas lojas (CONST IV, `[D03]`).

Três fatos tornam isso difícil na Koovela:

- **Papéis diferentes para o mesmo dado** (CONST IV): o tenant é **controlador** dos dados dos próprios clientes e a Koovela é **operadora**; mas a conta global do consumidor (spec 003) é da Koovela, e na vitrine da fase 2 a Koovela passa a ser também controladora.
- **Guardas legais que impedem apagar**: notas fiscais e registros financeiros por 5 anos (CONST IV), trilha de auditoria (spec 004), anotações conforme `[PEN-05]` (spec 020).
- **O conflito `[C4]`**: a decisão `[D23]` diz que "a Koovela retém o dado do consumidor", o que colide com a portabilidade e com o fato de o tenant ser o controlador; isso "tende a travar a venda na entrada" (DF 18.2), porque o estabelecimento quer saber se leva a própria base de clientes se sair.

A regra da constituição para o `[C4]` (exportação e eliminação implementadas; retenção configurável por categoria de dado, CONST 8) foi detalhada pelas decisões do clarify de 2026-11-25: pedido do titular sempre cumprido; retenção vencida decidida pelo estabelecimento; na saída, o tenant leva tudo e a Koovela mantém só a conta global.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 12 | Direitos do titular | Pedidos atendidos no prazo |
| DF 16 | Retenção colidindo com LGPD; vazamento de dado de saúde | Conformidade da tabela de retenção; incidentes tratados |
| `[C4]` | Retenção × portabilidade × eliminação | Pedidos de tenant e de titular resolvidos sem bloqueio comercial |

Personas: consumidor (titular); Proprietário (controlador dos dados dos clientes); Encarregado de dados da Koovela (DPO, `privacidade@koovela.com`); SRE.

---

## Clarifications

### Session 2026-11-25

- Q: A regra provisória da constituição para o C4 ainda vale? → A: Foi substituída pelas decisões desta sessão; registrar no Documento Fundamental para fechar o `[C4]`.
- Q: Como ficam as anotações na retenção e na exportação do tenant? → A: Anotações (PEN-10 e PEN-05, decididos na spec 020): profissionais que atendem + Proprietário (Gerente se liberado); retenção de 5 anos. As anotações saem na exportação do tenant.
- Q: Quem decide a eliminação dos dados que o estabelecimento guarda? (C4) → A: Quando vence o prazo de retenção, o estabelecimento decide. Quando o consumidor pede eliminação, ela é obrigatória (LGPD): o estabelecimento só pode manter o que estiver sob obrigação legal, com justificativa registrada, e responde dentro de 15 dias.
- Q: Quando o estabelecimento sai, o que ele leva e o que a Koovela mantém? (C4 / D23) → A: O estabelecimento leva a base de clientes e o histórico completos, como controlador; depois do prazo de exportação os dados do tenant são apagados; a Koovela mantém só a conta global de cada consumidor.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor vê e leva os próprios dados (Priority: P1)

Como consumidor, quero ver quais estabelecimentos têm meus dados e baixar uma cópia completa de tudo o que a Koovela e esses estabelecimentos guardam sobre mim.

**Why this priority**: acesso e portabilidade (art. 18, II e V); exigência da CONST IV.

**Independent Test**: com um consumidor de teste com agendamentos em dois tenants, pagamentos, pontos, avaliações e anotações, pedir a exportação pelo app e conferir que o arquivo traz todas as categorias, de ambos os estabelecimentos, num formato legível por pessoas e por máquinas.

**Acceptance Scenarios**:

1. **Given** "Meus dados" no perfil, **When** o consumidor abre, **Then** vê, na hora, a confirmação de que seus dados são tratados, as categorias guardadas pela Koovela (conta, consentimentos, avisos) e a lista dos estabelecimentos que têm dados dele, com a data do último atendimento em cada um.
2. **Given** o pedido de exportação, **When** o consumidor confirma com OTP, **Then** recebe em até 7 dias (meta: 24 horas) um link seguro para baixar um arquivo com: conta e perfil; consentimentos; por estabelecimento, agendamentos, pagamentos, saldos de pacote, pontos, avaliações, anotações sobre ele (spec 020) e preferências da ficha; avisos recebidos nos últimos 90 dias.
3. **Given** o arquivo, **When** gerado, **Then** tem uma versão legível (documento) e uma estruturada (formato aberto, para levar a outro serviço), e o link expira em 7 dias e só pode ser baixado após novo OTP.
4. **Given** dados que só o estabelecimento guarda, **When** entram na exportação, **Then** o estabelecimento é informado do pedido (sem ver o conteúdo exportado).
5. **Given** a lista de compartilhamento, **When** o consumidor quer saber com quem os dados são compartilhados, **Then** vê os estabelecimentos e as categorias de operadores usados pela Koovela (pagamento, mensagens, nota fiscal), com link para a política de privacidade.

---

### User Story 2 - Consumidor pede a eliminação dos dados (Priority: P1)

Como consumidor, quero excluir minha conta e pedir a eliminação dos meus dados, sabendo o que será apagado, o que precisa ser guardado por lei e até quando.

**Why this priority**: eliminação (art. 18, VI) e exclusão de conta exigida pelas lojas (`[D03]`, REQ-IDN-070); a spec 003 já desativa a conta e registra o pedido, e esta spec executa.

**Independent Test**: pedir a exclusão de um consumidor de teste e conferir, ao fim do prazo: conta desativada, dados sem guarda legal apagados ou anonimizados em todos os domínios, dados com guarda legal bloqueados (sem uso) com data de expiração, e o comprovante enviado.

**Acceptance Scenarios**:

1. **Given** o pedido de exclusão (spec 003), **When** confirmado com OTP, **Then** o consumidor vê, antes de confirmar, o que será apagado, o que será guardado por obrigação legal (por exemplo, notas fiscais por 5 anos) e o que acontece com agendamentos futuros (spec 009).
2. **Given** o pedido confirmado, **When** processado, **Then** em até 15 dias: a conta é eliminada; em cada domínio, os dados sem guarda legal são apagados ou anonimizados; os dados com guarda legal ficam bloqueados (sem uso para nenhuma finalidade além da obrigação) até o fim do prazo, quando são eliminados automaticamente.
3. **Given** dados mantidos por cada estabelecimento como controlador, **When** o pedido chega, **Then** a eliminação é obrigatória: cada estabelecimento recebe o pedido e DEVE eliminar os dados do titular em até 15 dias; só pode manter o que estiver sob obrigação legal (por exemplo, nota fiscal), com a base legal registrada e informada ao titular; sem resposta no prazo, a plataforma elimina automaticamente e registra. Quando vence o prazo de retenção sem pedido do titular, o estabelecimento decide (eliminar ou justificar a guarda).
4. **Given** avaliações públicas do consumidor (spec 016), **When** eliminadas, **Then** são removidas; se o consumidor preferir, podem ficar anonimizadas como "cliente Koovela".
5. **Given** a trilha de auditoria (spec 004), **When** o pedido é processado, **Then** os dados de exibição do consumidor são apagados e os registros guardam só o pseudônimo, sem quebrar a cadeia (REQ-AUD-014).
6. **Given** o processamento concluído, **When** termina, **Then** o consumidor recebe um comprovante (por e-mail ou SMS, conforme o que restar) com o que foi apagado, o que ficou bloqueado e até quando.
7. **Given** referências do consumidor em provedores externos (cartão salvo no PSP, destinos de envio), **When** o pedido é processado, **Then** são removidas nesses provedores.

---

### User Story 3 - Consumidor corrige dados e gere consentimentos (Priority: P2)

Como consumidor, quero corrigir dados errados e ver e revogar, num só lugar, todos os consentimentos que dei.

**Why this priority**: correção e revogação (art. 18, III e IX); hoje os consentimentos estão espalhados por várias specs (011, 012, 014, 020).

**Independent Test**: abrir "Meus consentimentos" de um consumidor de teste com consentimentos em várias specs, revogar um de cada tipo e conferir o efeito em cada domínio.

**Acceptance Scenarios**:

1. **Given** "Meus consentimentos", **When** aberto, **Then** lista todos os consentimentos do consumidor, com estabelecimento, data e versão do texto: ofertas de horário ocioso por canal (spec 014), anotações de atendimento por estabelecimento (spec 020), uso do cartão salvo para multa (spec 012), cartões salvos (spec 012), notificação do navegador (spec 011) e, na fase 2, campanhas (spec 028).
2. **Given** um consentimento, **When** revogado, **Then** o efeito acontece em até 1 minuto no domínio dono, e o consumidor vê a confirmação.
3. **Given** dados da conta global (nome, e-mail, data de nascimento), **When** o consumidor corrige no perfil (spec 003), **Then** a correção vale para todos os estabelecimentos.
4. **Given** um dado que só o estabelecimento guarda (por exemplo, a observação da ficha), **When** o consumidor pede correção, **Then** o pedido vai ao estabelecimento, que tem 15 dias para corrigir ou justificar.

---

### User Story 4 - Estabelecimento responde aos pedidos e cumpre a retenção (Priority: P2)

Como Proprietário, quero receber os pedidos dos titulares que envolvem dados do meu estabelecimento, responder dentro do prazo e saber que a plataforma aplica a retenção certa por categoria.

**Why this priority**: o tenant é controlador (CONST IV); sem uma fila e prazos, os pedidos ficam sem resposta e a responsabilidade é dele.

**Independent Test**: com pedidos de teste (correção, eliminação com base legal para guardar), abrir "Pedidos de titulares", responder, e conferir prazos e registros.

**Acceptance Scenarios**:

1. **Given** "Pedidos de titulares", **When** o Proprietário abre, **Then** vê os pedidos que envolvem o estabelecimento, com tipo, data, prazo e estado.
2. **Given** um pedido de eliminação, **When** o estabelecimento tem base legal para guardar algum dado (exemplo: prontuário exigido por conselho), **Then** informa a base e o prazo dentro de 5 dias úteis (configurável); sem resposta nesse prazo, a eliminação segue; o pedido inteiro conclui em até 15 dias corridos; o dado guardado fica bloqueado até o fim do prazo e a justificativa é registrada.
3. **Given** um pedido com prazo a 3 dias de vencer, **When** sem resposta, **Then** o Proprietário é avisado; vencido, o Encarregado da Koovela é avisado.
4. **Given** a tabela de retenção da plataforma, **When** o Proprietário a consulta, **Then** vê cada categoria de dado com o prazo e a base, e pode aumentar o prazo apenas das categorias que a tabela permitir (por exemplo, anotações, spec 020), nunca diminuir abaixo da guarda legal.

---

### User Story 5 - O estabelecimento leva a própria base se sair (Priority: P2)

Como Proprietário, quero poder exportar os dados do meu negócio e dos meus clientes a qualquer momento, inclusive se eu cancelar a assinatura, para não ficar preso à plataforma.

**Why this priority**: é o centro do `[C4]` ("tende a travar a venda na entrada"); o estabelecimento precisa ter certeza disso antes de assinar.

**Independent Test**: num tenant de teste, pedir a exportação completa pelo painel e, depois, cancelar a assinatura e conferir que a exportação continua disponível durante o período previsto.

**Acceptance Scenarios**:

1. **Given** o painel, **When** o Proprietário pede a exportação completa do tenant, **Then** recebe, com reautenticação por segundo fator, um arquivo com: negócios, filiais, serviços, equipe, agendamentos, pagamentos, notas, e a base de clientes e o histórico completos, inclusive anotações (spec 020), porque o estabelecimento é o controlador; depois do prazo de exportação (até `reactivable_until` da spec 019), os dados do tenant são apagados pelo comando `purge` da spec 002, e a Koovela mantém só a conta global de cada consumidor (revisa a `[D23]`).
2. **Given** a exportação, **When** feita, **Then** gera registro na trilha de auditoria (spec 004).
3. **Given** um tenant cancelado, suspenso ou arquivado (specs 002 e 019), **When** o Proprietário entra, **Then** ainda pode pedir a exportação até `reactivable_until` da spec 019 (encerramento + 90 dias).
4. **Given** um tenant arquivado (spec 002), **When** `reactivable_until` chega, **Then** os dados do tenant são eliminados pelo `purge` da spec 002, com aviso ao Proprietário 30 dias antes; dados fiscais e de pagamento ficam bloqueados por 5 anos conforme a tabela de retenção.

---

### User Story 6 - Encarregado de dados e incidentes (Priority: P3)

Como Encarregado de dados da Koovela, quero uma fila com todos os pedidos de titulares e uma forma de registrar e comunicar incidentes de segurança com dados pessoais.

**Why this priority**: o canal `privacidade@koovela.com` (CONST 3) e a obrigação de comunicar incidentes à ANPD e aos titulares (LGPD art. 48).

**Independent Test**: abrir a fila com pedidos de teste em vários estados; registrar um incidente sintético, classificar o risco e gerar a lista de titulares afetados e o rascunho de comunicação.

**Acceptance Scenarios**:

1. **Given** a fila do Encarregado no back-office, **When** aberta, **Then** mostra todos os pedidos (de todos os tenants e da Koovela), com tipo, prazo, estado e responsável, e os vencidos em destaque.
2. **Given** pedidos que chegam por `privacidade@koovela.com`, **When** registrados pelo Encarregado, **Then** entram no mesmo fluxo, com verificação da identidade do titular antes de qualquer ação.
3. **Given** um incidente, **When** registrado, **Then** guarda data da descoberta, natureza, categorias e quantidade de dados e titulares afetados, medidas tomadas e avaliação de risco.
4. **Given** um incidente com risco relevante, **When** classificado, **Then** o sistema gera a lista dos titulares e tenants afetados e o rascunho das comunicações à ANPD, aos tenants (controladores) e aos titulares, com o prazo regulatório em destaque.
5. **Given** o Encarregado, **When** acessa dados para atender um pedido, **Then** usa acesso temporário registrado (REQ-AUD-023), nunca acesso permanente.

---

### Edge Cases

- **Pedido de eliminação com agendamento futuro confirmado e pago**: os agendamentos são cancelados conforme a política de cada estabelecimento (já informado na confirmação, REQ-IDN-070); os valores seguem a política e o estorno (spec 012).
- **Pedido de eliminação com saldo de pacote ou pontos**: o consumidor é avisado de que os saldos serão perdidos (pontos) ou de que pode pedir reembolso do pacote conforme a regra de devolução (spec 006) antes de confirmar.
- **Consumidor com chargeback aberto**: os dados ligados ao chargeback ficam bloqueados até a conclusão (exercício regular de direitos).
- **Pré-cadastro feito pela Recepção** (spec 009) e nunca verificado: o titular pode pedir a eliminação pelo link de um aviso, com OTP no celular.
- **Pedido feito por terceiro** (familiar, advogado): só pelo Encarregado, com documento de representação.
- **Menor de idade** (fase 2, `[D28]`): pedidos sobre dados do menor são feitos pelo responsável.
- **Eliminação parcial** (por exemplo, só de um estabelecimento): permitida; o consumidor escolhe os estabelecimentos.
- **Dados em backup**: a eliminação não reescreve backups; os dados eliminados saem dos backups pela rotação (35 dias e 12 meses, REQ-FND-053), e uma restauração reaplica as eliminações registradas.
- **Repetição de pedido de exportação**: no máximo 1 por mês sem custo; pedidos adicionais no mesmo mês são atendidos com o mesmo arquivo se não houver mudança.

---

## Requirements *(mandatory)*

Formato: `REQ-PRI-NNN (origem: …)`.

### Functional Requirements

**Acesso e portabilidade**

- **REQ-PRI-001** (origem: LGPD art. 18, I e II | CONST IV): O consumidor DEVE ver, na hora, a confirmação do tratamento, as categorias guardadas pela Koovela e a lista de estabelecimentos que têm dados dele.
- **REQ-PRI-002** (origem: LGPD art. 18, V | art. 19 | CONST IV): A exportação DEVE ser entregue em até 7 dias (meta de 24 horas), com versão legível e versão estruturada em formato aberto, cobrindo conta, consentimentos e, por estabelecimento, agendamentos, pagamentos, saldos, pontos, avaliações, anotações sobre o titular e preferências da ficha.
- **REQ-PRI-003** (origem: CONST 5): Pedido e download DEVEM exigir OTP; o link DEVE expirar em 7 dias.
- **REQ-PRI-004** (origem: LGPD art. 18, VII): O consumidor DEVE ver com quem os dados são compartilhados (estabelecimentos e categorias de operadores), com link para a política de privacidade.
- **REQ-PRI-005** (origem: CONST VII): Cada domínio que guarda dados pessoais (specs 003 a 020) DEVE fornecer contratos de exportação e de eliminação ou anonimização por titular, usados por esta spec; domínio sem esses contratos falha o CI.

**Eliminação**

- **REQ-PRI-010** (origem: LGPD art. 18, VI | D03 | REQ-IDN-070): O pedido de eliminação DEVE mostrar antes o que será apagado, o que será guardado por lei e até quando, e o efeito sobre agendamentos e saldos; confirmação com OTP.
- **REQ-PRI-011** (origem: LGPD art. 16 | CONST IV): O pedido DEVE ser concluído em até 15 dias: conta eliminada; dados sem guarda legal apagados ou anonimizados; dados com guarda legal bloqueados (sem uso além da obrigação) até o fim do prazo, com eliminação automática ao vencer.
- **REQ-PRI-012** (origem: C4 | CONST 8): Pedido de eliminação do titular DEVE ser cumprido por todos os estabelecimentos em até 15 dias, salvo dado sob obrigação legal, com base legal registrada e informada ao titular; sem resposta no prazo, a plataforma elimina e registra. Ao vencer o prazo de retenção sem pedido, o estabelecimento DEVE decidir entre eliminar e justificar a guarda, com aviso 30 dias antes.
- **REQ-PRI-013** (origem: REQ-AUD-014): A eliminação DEVE apagar os dados de exibição do titular no cadastro da trilha de auditoria, mantendo os pseudônimos e a cadeia.
- **REQ-PRI-014** (origem: CONST IV): A eliminação DEVE remover as referências do titular nos provedores externos (PSP, envio de mensagens) e registrar a confirmação.
- **REQ-PRI-015** (origem: CONST X): Restaurações de backup DEVEM reaplicar as eliminações registradas depois da data do backup.
- **REQ-PRI-016** (origem: LGPD art. 18): O titular DEVE poder pedir eliminação parcial, por estabelecimento.
- **REQ-PRI-017** (origem: CONST IV): Ao concluir, o titular DEVE receber comprovante com o que foi apagado, o que ficou bloqueado e até quando.

**Correção e consentimentos**

- **REQ-PRI-020** (origem: LGPD art. 18, III): Correções de dados da conta global DEVEM valer para todos os estabelecimentos; correções de dados do estabelecimento DEVEM ir a ele, com prazo de 15 dias.
- **REQ-PRI-021** (origem: LGPD art. 8, §5 | art. 18, IX): "Meus consentimentos" DEVE listar todos os consentimentos do titular (specs 011, 012, 014, 020 e, na fase 2, 028), com estabelecimento, data e versão, e permitir revogar cada um, com efeito em até 1 minuto no domínio dono.
- **REQ-PRI-022** (origem: CONST VII): Cada domínio que coleta consentimento DEVE registrá-lo num registro central de consentimentos (tipo, titular, estabelecimento, versão, data, revogação), sem perder a posse do próprio dado.

**Retenção por categoria**

- **REQ-PRI-030** (origem: CONST 8 `[C4]` | CONST IV): DEVE existir uma tabela de retenção por categoria de dado, mantida pelo Encarregado no back-office (versionada), com prazo, base legal e ação ao vencer (eliminar ou anonimizar); a tabela inicial está em "Regras e estados".
- **REQ-PRI-031** (origem: CONST IV | CONST 8): A retenção DEVE ser aplicada automaticamente, ao menos uma vez por dia, em todos os domínios, pela operação `applyRetention` do port de cada domínio, com os prazos lidos da tabela; nenhum domínio DEVE ter prazo de retenção no código.
- **REQ-PRI-032** (origem: REQ-ANO-010): O Proprietário DEVE poder aumentar o prazo só das categorias que a tabela permitir, nunca abaixo da guarda legal, com registro.

**Pedidos ao estabelecimento**

- **REQ-PRI-040** (origem: CONST IV papéis): O painel DEVE ter "Pedidos de titulares", com os pedidos que envolvem o estabelecimento, prazos e estado; aviso 3 dias antes do vencimento ao Proprietário e, vencido, ao Encarregado.
- **REQ-PRI-041** (origem: C4): A justificativa de guarda informada pelo estabelecimento DEVE ser registrada, com base e prazo; o dado fica bloqueado até lá.

**Exportação do tenant**

- **REQ-PRI-050** (origem: C4 | D23): A exportação completa do tenant (negócios, filiais, serviços, equipe, agendamentos, pagamentos, notas e base de clientes) DEVE estar disponível ao Proprietário com reautenticação por segundo fator; a base de clientes e o histórico vão completos, inclusive anotações; depois do prazo de exportação (até `reactivable_until` da spec 019) os dados do tenant DEVEM ser apagados pelo comando `purge` da spec 002, e a Koovela mantém só a conta global dos consumidores.
- **REQ-PRI-051** (origem: REQ-ASS-014): Tenants cancelados, suspensos ou arquivados DEVEM poder exportar até `reactivable_until` da spec 019 (encerramento + 90 dias); nessa data, os dados são eliminados pelo `purge` da spec 002, com aviso 30 dias antes, e os dados fiscais e de pagamento ficam bloqueados por 5 anos.
- **REQ-PRI-052** (origem: CONST V): Toda exportação DEVE gerar registro na trilha de auditoria.

**Encarregado e incidentes**

- **REQ-PRI-060** (origem: CONST 3 `privacidade@koovela.com`): DEVE existir a fila do Encarregado no back-office, com todos os pedidos, prazos e responsáveis; pedidos recebidos por e-mail entram no mesmo fluxo após verificação de identidade.
- **REQ-PRI-061** (origem: LGPD art. 48): DEVE existir registro de incidentes (data, natureza, dados e titulares afetados, medidas, risco) e, para incidentes com risco relevante, geração da lista de afetados e dos rascunhos de comunicação à ANPD, aos tenants e aos titulares, com o prazo regulatório.
- **REQ-PRI-062** (origem: REQ-AUD-023): O Encarregado DEVE atuar com acesso temporário registrado.
- **REQ-PRI-063** (origem: CONST 5): A política de privacidade publicada DEVE ter versões e data, e uma nova versão relevante exige aviso aos titulares; a revisão para a vitrine da fase 2 (`[D26]`) DEVE estar publicada antes da fase 2 (CONST IV).

**Prazos e testes**

- **REQ-PRI-070** (origem: CONST VIII): O CI DEVE ter testes de ponta a ponta de exportação e de eliminação cobrindo todos os domínios com dados pessoais, incluindo a verificação de que nenhum dado sem guarda legal sobra depois da eliminação.
- **REQ-PRI-071** (origem: LGPD art. 19): Todo pedido DEVE ter prazo visível e alerta antes do vencimento.

### Key Entities

- **Pedido de titular**: titular, tipo (acesso, exportação, correção, eliminação, revogação, informação), alcance (Koovela, estabelecimentos), canal, verificação de identidade, prazo, estado, responsável, resultado, comprovante.
- **Item do pedido por domínio**: pedido, domínio, ação (exportar, eliminar, anonimizar, bloquear), estado, data.
- **Justificativa de guarda**: pedido, estabelecimento, categoria, base legal, prazo.
- **Tabela de retenção** (versionada): categoria, prazo, base legal, ação ao vencer, se o tenant pode aumentar.
- **Bloqueio de dado**: titular, categoria, domínio, motivo, data de fim.
- **Registro central de consentimentos**: titular, tipo, estabelecimento, versão do texto, data, revogação.
- **Exportação do tenant**: tenant, pedido, conteúdo, link, validade.
- **Incidente**: descoberta, natureza, dados e titulares afetados, risco, medidas, comunicações e datas.

---

## Telas do protótipo cobertas

| Superfície | Tela | Código |
|---|---|---|
| App e web do consumidor | Perfil: meus dados, meus consentimentos, pedidos de privacidade, excluir conta (parte da spec 003) | Registrados no plano |
| Painel do cliente | Pedidos de titulares · exportação completa do tenant | Registrados no plano |
| Back-office | Fila do Encarregado · tabela de retenção · registro de incidentes | Registrados no plano |
| Site público | Política de privacidade (com versões) | Registrado no plano |

Nenhuma dessas telas aparece no protótipo (DF 9); todas são novas, exceto a exclusão de conta no perfil.

---

## Regras e estados

**Pedido**: `recebido` → `verificado` (identidade) → `em_processamento` → `aguardando_estabelecimento` (quando aplicável) → `concluído` | `parcialmente_concluído` (com bloqueios) | `recusado` (com motivo, por exemplo identidade não verificada).

**Tabela de retenção inicial** (configurável, sujeita ao `[C4]`):

| Categoria | Prazo | Base | Ação ao vencer | Tenant pode aumentar |
|---|---|---|---|---|
| Conta global do consumidor | Até a eliminação | Execução de contrato | Eliminar | — |
| Agendamentos e histórico no estabelecimento | 5 anos após o atendimento | Obrigação legal e exercício de direitos | Anonimizar | Não |
| Pagamentos, notas fiscais, comissões | 5 anos | Obrigação legal (fiscal) | Eliminar | Não |
| Anotações e alertas de cuidado (spec 020) | 5 anos após o último atendimento (`[PEN-05]` decidido) | Consentimento destacado; obrigação do profissional | Eliminar | Sim (com base legal) |
| Avaliações | Até a remoção pelo autor | Consentimento | Eliminar | Não |
| Consentimentos (prova) | Enquanto houver o dado + 5 anos | Obrigação de comprovar | Eliminar | Não |
| Trilha de auditoria (pseudônimos) | 5 anos (spec 004) | Segurança | Eliminar em bloco | Não |
| Conteúdo de avisos | 90 dias (spec 011) | Execução de contrato | Eliminar | Não |
| Logs de aplicação e de segurança | 30 e 90 dias (spec 001) | Segurança | Eliminar | Não |
| Tokens de push inválidos (spec 011) | 30 dias | Execução de contrato | Eliminar | Não |
| Entregas de aviso (spec 011) | 12 meses | Execução de contrato | Eliminar | Não |
| Pedidos de eliminação e retenção de identidade (spec 003) | Conforme a spec 003 | Obrigação legal | Eliminar | Não |
| Fechamentos, repasses e contestações (spec 018) | 5 anos | Obrigação legal (fiscal e trabalhista) | Anonimizar | Não |
| Faturas e uso tarifado da Koovela (spec 019) | 5 anos; token do cartão até a troca ou o fim do contrato | Obrigação legal | Eliminar | Não |
| Consentimento para anotações (spec 020) | Enquanto houver anotação ou alerta + 5 anos | Obrigação de comprovar | Eliminar | Não |
| Ficha do consumidor no negócio (spec 020) | Enquanto houver relação com o negócio | Execução de contrato | Eliminar | Não |
| Alertas, evidências, ações e bloqueios do antifraude (spec 021) | 5 anos após o encerramento | Prevenção à fraude | Eliminar | Não |
| Observações internas da Gestão (spec 021) | Relação + 2 anos | Legítimo interesse | Eliminar | Não |
| Revelações de dado pessoal (spec 021) | 5 anos | Segurança | Eliminar | Não |

Cada domínio registra as próprias categorias; o CI falha se uma categoria usada por um domínio não estiver na tabela ou se houver prazo escrito no código (CONST 8).

**Fim do tenant** (linha do tempo única com as specs 002 e 019): do cancelamento ou da suspensão até `reactivable_until` da spec 019 (encerramento + 90 dias, cerca de 180 dias depois do cancelamento), o tenant pode exportar e reativar; 30 dias antes do fim, o Proprietário é avisado; no fim, a 022 pede à spec 002 o comando `purge` (aprovação dupla e auditoria), que apaga o espaço de dados do tenant; dados fiscais e de pagamento ficam bloqueados por 5 anos; a Koovela mantém só a conta global de cada consumidor.

**Eliminação**: dado sem guarda → eliminado ou anonimizado; dado com guarda → bloqueado até o fim do prazo → eliminado.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Pedidos de titulares e comprovantes | Pessoal | Obrigação legal (art. 18) | 5 anos após a conclusão | O próprio titular; Encarregado; Proprietário (os do estabelecimento) |
| Arquivos de exportação | Pessoal; pode conter dado sensível | Obrigação legal | 7 dias (link) | Só o titular (ou o Proprietário, na exportação do tenant) |
| Registro central de consentimentos | Pessoal | Obrigação de comprovar (art. 8) | Enquanto houver o dado + 5 anos | O próprio titular; Encarregado |
| Justificativas de guarda | Pessoal | Obrigação legal | 5 anos | Encarregado; Proprietário |
| Incidentes | Pessoal (agregado e listas de afetados) | Obrigação legal (art. 48) | 5 anos | Encarregado; SRE |

Regras: os arquivos de exportação são cifrados e apagados ao fim do prazo do link; a fila do Encarregado mostra dados mascarados por padrão; nenhum conteúdo de anotação aparece na fila.

---

## Permissões

| Ação | Usuário | Proprietário | Gerente | Encarregado (DPO) | SRE | Suporte |
|---|---|---|---|---|---|---|
| Ver os próprios dados; exportar; eliminar; corrigir; gerir consentimentos | ✔ | — | — | — | — | — |
| Ver e responder pedidos do estabelecimento | — | ✔ | — | — | — | — |
| Exportar o tenant completo | — | ✔ | — | — | — | — |
| Gerir a fila de pedidos e a tabela de retenção | — | — | — | ✔ (acesso temporário registrado) | — | — |
| Registrar incidentes e gerar comunicações | — | — | — | ✔ | ✔ | — |
| Encaminhar ao Encarregado um pedido recebido em atendimento | — | — | — | — | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `identity.privacy_request.received.v1` / `.verified.v1` / `.completed.v1` / `.rejected.v1` | Ciclo do pedido |
| `identity.erasure.requested.v1` | Pedido de eliminação (consumido por todos os domínios com dados pessoais) |
| `identity.export.requested.v1` | Pedido de exportação (consumido pelos domínios) |
| `identity.consent.revoked.v1` | Revogação (consumido pelo domínio dono) |
| `identity.retention.applied.v1` | Aplicação diária da retenção |
| `identity.data_incident.recorded.v1` | Incidente registrado |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Pedidos concluídos no prazo, por tipo | LGPD art. 19 | 100% |
| Tempo médio de exportação | REQ-PRI-002 | Até 24 horas |
| Tempo médio de eliminação | REQ-PRI-011 | Até 15 dias |
| Pedidos sem resposta do estabelecimento no prazo | REQ-PRI-040 | 0 |
| Dados remanescentes após eliminação (teste periódico) | REQ-PRI-070 | 0 |
| Incidentes com comunicação dentro do prazo | LGPD art. 48 | 100% |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O consumidor pede a exportação ou a eliminação dos dados em até 3 toques a partir do perfil.
- **SC-002**: 100% das exportações chegam em até 7 dias, e a maioria em até 24 horas.
- **SC-003**: 100% das eliminações são concluídas em até 15 dias, e nenhum dado sem guarda legal sobra em nenhum domínio, verificado por teste de ponta a ponta.
- **SC-004**: Nenhum dado bloqueado por guarda legal é usado para outra finalidade, verificado por teste.
- **SC-005**: 100% das revogações de consentimento têm efeito em até 1 minuto.
- **SC-006**: O Proprietário obtém a exportação completa do próprio tenant em um único pedido, inclusive até 90 dias depois do cancelamento.
- **SC-007**: O Encarregado vê todos os pedidos abertos, com prazos, numa única fila.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **C4** — quem decide a eliminação dos dados guardados pelo estabelecimento | Fluxo de eliminação; responsabilidade do controlador | **Decidido (clarify 2026-11-25)**: pedido do titular sempre cumprido; retenção vencida, o estabelecimento decide. Registrar no Documento Fundamental para fechar o `[C4]` |
| **C4 / D23** — o que o estabelecimento leva e o que a Koovela mantém quando ele sai | Exportação do tenant; argumento comercial; política de privacidade | **Decidido (clarify 2026-11-25)**: tenant leva tudo; Koovela só conta global. Registrar a revisão da `[D23]` |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-05** — retenção de anotações | Spec 020 | A tabela usa o prazo decidido lá |
| **PEN-10** — acesso a anotações | Spec 003 / 020 | Decidido; anotações saem na exportação do tenant |
| **D26** — Koovela controladora na vitrine | Spec 024 | A política revista deve estar publicada antes da fase 2 |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Prazos | ASSUMIDO: exportação em até 7 dias (meta 24 horas); eliminação em até 15 dias; resposta do estabelecimento em 15 dias; justificativa de guarda em 5 dias úteis |
| Tabela de retenção | ASSUMIDO: a tabela inicial de "Regras e estados", configurável pelo Encarregado |
| Backups | ASSUMIDO: eliminação não reescreve backups; sai pela rotação e é reaplicada em restauração |
| Exportações | ASSUMIDO: 1 por mês sem custo para o titular |

---

## Fora do escopo desta especificação

- Política de privacidade e termos de uso como textos jurídicos (redigidos fora da plataforma; aqui só a publicação com versões).
- Avaliação de impacto à proteção de dados (relatório), feita fora da plataforma.
- Pedidos de autoridades e ordens judiciais, tratados pelo Encarregado fora do fluxo automático.
- Atendidos menores e dependentes (spec 025), que usam este fluxo pelo responsável.
- Controle de cookies do site público (tratado na spec de vitrine, 024, se houver rastreamento além do estritamente necessário).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: exportação em 7 dias (meta 24 horas); eliminação em 15 dias; link de exportação por 7 dias; resposta do estabelecimento em 15 dias; justificativa de guarda em 5 dias úteis; aviso de prazo 3 dias antes; exportação do tenant por 90 dias após o cancelamento; aviso de eliminação do tenant arquivado 30 dias antes.
- O Encarregado de dados usa o perfil SRE ou acesso temporário registrado (premissa da spec 004); não há perfil próprio na v1.0.
- O prazo regulatório de comunicação de incidentes é o vigente na regulamentação da ANPD na data do incidente.
- O domínio dono desta spec é `identity` (CONST 4.4: "consentimentos"), orquestrando os contratos de exportação e eliminação dos demais domínios.
