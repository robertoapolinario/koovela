# Research: Privacidade e direitos do titular (022)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: C4 (eliminação a pedido é obrigatória para o estabelecimento, que só guarda o que tiver obrigação legal, com justificativa, e responde em 15 dias; ao vencer a retenção sem pedido, o estabelecimento decide; ao sair, leva base e histórico completos e a Koovela mantém só a conta global), PEN-05 e PEN-10 (anotações: 5 anos; saem na exportação do tenant). Base: contratos de titular de cada domínio (003–020), 004 (trilha com pseudônimos), 001 (backups com restic), 002 (arquivamento), 019 (cancelamento). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e orquestração

- **Decisão**: domínio `privacy` (CONST 4.4) em `koovela_platform`: pedidos, registro central de consentimentos, tabela de retenção, livro de eliminações, incidentes. Os dados continuam nos domínios donos: o `privacy` **orquestra** por contratos (padrão *saga* com passos idempotentes por domínio e tenant), nunca acessa tabelas alheias.

## R2. Contrato de titular obrigatório (portão de CI)

- **Decisão**: interface `HolderDataPort` por domínio: `describe(holder)` (categorias e contagem), `export(holder, scope)` (JSON por seção), `erase(holder, scope, mode: delete|anonymize|block)`, `restrictions(holder)` (o que tem guarda legal e até quando). Registro dos domínios em `packages/contracts/privacy/holder-ports.yaml`; o CI falha se uma tabela marcada com PII no catálogo de dados (anotação de coluna `x-pii` nas migrações) pertence a um domínio sem port, ou se o teste de ponta a ponta encontra dado do titular sobrando depois da eliminação (REQ-PRI-005/070).
- **Por quê**: garante que domínios novos (fase 2) não "esqueçam" o titular.

## R3. Acesso e exportação

- **Decisão**: confirmação, categorias e lista de estabelecimentos **na hora** a partir do índice global de vínculos consumidor ↔ tenant (003) + `describe` (REQ-PRI-001). Exportação: pedido com OTP → saga coleta `export` de todos os domínios e tenants → pacote `.zip` com JSON estruturado (formato aberto, esquema publicado) e PDF legível, cifrado no Object Storage, link de download com OTP, expira em 7 dias; meta 24 h, prazo 7 dias (REQ-PRI-002/003). Compartilhamentos: estabelecimentos + categorias de operadores (PSP, envio de mensagens, hospedagem) com link para a política (REQ-PRI-004).

## R4. Eliminação

- **Decisão**: antes de confirmar, mostra a prévia de `restrictions` + efeitos (agendamentos futuros cancelados sem multa, por ser exercício de direito do titular; saldos de pacote e pontos perdidos, com aviso explícito) e pede OTP (REQ-PRI-010). Em até 15 dias (REQ-PRI-011/012):
  1. conta global eliminada (003);
  2. por domínio: sem guarda → `delete`/`anonymize`; com guarda (pagamentos, notas, comissões) → `block` até o fim do prazo, depois eliminação automática;
  3. por estabelecimento: item em "Pedidos de titulares" com prazo de 15 dias; o estabelecimento só pode justificar guarda por obrigação legal (base e prazo registrados, dado bloqueado); **sem resposta no prazo, a plataforma elimina e registra** (C4);
  4. trilha (004): apaga dados de exibição do titular no cadastro de pseudônimos, mantém pseudônimos e a cadeia (REQ-PRI-013);
  5. provedores externos: remoção do cliente/token no PSP e dos contatos no provedor de mensagens, com confirmação registrada (REQ-PRI-014).
  
  Eliminação parcial por estabelecimento (REQ-PRI-016). Comprovante ao titular com apagado, bloqueado e até quando (REQ-PRI-017).
- **Anotações (020)**: eliminação por crypto-shredding, que também as torna ilegíveis nos backups.

## R5. Backups

- **Decisão**: `privacy_erasure_ledger` (só `holder_hash`, escopo, data, sem PII) guardado em `koovela_platform` **e** espelhado no R2 junto da selagem diária da trilha. O runbook de restauração (001) executa `privacy replay-erasures --since <data-do-backup>` antes de liberar o tráfego; teste de DR mensal inclui o replay (REQ-PRI-015).

## R6. Correção e consentimentos

- **Decisão**: correção da conta global aplica em todos os tenants (dados de identidade são globais, 003); correção de dado do estabelecimento vira item para ele com prazo de 15 dias (REQ-PRI-020). Registro central `privacy_consent_registry` alimentado por evento de cada domínio (011 comunicação, 012 cartão e multa, 014 ofertas, 020 anotações; 028 na fase 2), sem tirar a posse do dado do domínio (REQ-PRI-022). "Meus consentimentos" lista e revoga; a revogação é um comando ao domínio dono com efeito ≤ 1 min (REQ-PRI-021).

## R7. Retenção

- **Decisão**: `privacy_retention_rule` versionada, mantida pelo Encarregado (tabela inicial da spec). Tarefa diária no `workers` chama `erase` nos domínios para registros vencidos (REQ-PRI-030/031). Proprietário aumenta prazo só nas categorias permitidas (`tenant_can_extend`), nunca abaixo da guarda legal, com registro (REQ-PRI-032). Ao vencer sem pedido, o estabelecimento decide (eliminar ou justificar guarda), com aviso 30 dias antes (C4).

## R8. Estabelecimento: pedidos e saída

- **Decisão**: "Pedidos de titulares" no painel com prazos e estado; aviso 3 dias antes ao Proprietário e, vencido, ao Encarregado (REQ-PRI-040). Justificativa de guarda com base e prazo (REQ-PRI-041). **Exportação completa do tenant** (só Proprietário, step-up, auditada): negócios, filiais, serviços, equipe, agendamentos, pagamentos, notas e base de clientes **com histórico completo, inclusive anotações** (C4/D23), gerada pelos `export(scope=tenant)` dos domínios (REQ-PRI-050/052). Cancelados ou suspensos exportam por 90 dias; arquivados → eliminação conforme a tabela com aviso 30 dias antes; a Koovela mantém só a conta global (REQ-PRI-051).
- **Cuidado**: o pacote do tenant contém dados sensíveis; cifrado, link de uso único com OTP do Proprietário, expira em 7 dias.

## R9. Encarregado e incidentes

- **Decisão**: fila do Encarregado no back-office com todos os pedidos, prazos e responsáveis; pedidos por `privacidade@koovela.com` entram no mesmo fluxo depois de verificação de identidade (OTP no celular cadastrado) (REQ-PRI-060). Acesso do Encarregado é temporário e registrado (concessão da 004) (REQ-PRI-062). Registro de incidentes (data, natureza, dados e titulares afetados, medidas, risco); com risco relevante, gera lista de afetados (via `describe`) e rascunhos de comunicação à ANPD, aos tenants e aos titulares, com o prazo regulatório configurável na tabela (REQ-PRI-061).

## R10. Política de privacidade

- **Decisão**: versões publicadas no site (`koovela.com/privacidade/v{n}`) com data; versão relevante dispara aviso aos titulares (011) (REQ-PRI-063). A revisão para a vitrine (D26) é pré-requisito do lançamento da fase 2 (marcado no plano da 024).

## R11. Telas

| Superfície | Tela | Código |
|---|---|---|
| App / web do consumidor | Meus dados · meus consentimentos · pedidos de privacidade · excluir conta | Dentro de Perfil (C18 · W20); telas novas |
| Painel | Pedidos de titulares · exportação completa | Novas (em Configurações, P26) |
| Back-office | Fila do Encarregado · tabela de retenção · incidentes | Novas |
| Site público | Política de privacidade com versões | Nova |
