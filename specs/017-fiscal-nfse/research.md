# Research: Fiscal — NFS-e (017)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: PEN-21 (emitente configurável: emissão própria — padrão — ou nota pela Koovela, esta **desligada por flag** até parecer de contador, CONST 5 v1.1.0), PEN-24 (pacote: na venda ou a cada sessão), D20 (São Paulo primeiro). Base: 005 (dados cadastrais), 006 (serviços), 009 (conclusão), 011 (envio), 012 (pagamento e estorno), 004 (flags e auditoria). Restrição do projeto: serviços externos só gratuitos. Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: domínio `fiscal` (CONST 4.4), schema do tenant para perfil fiscal, certificados e notas (REQ-FIS-043). Emissão no `workers` (fila com novas tentativas); APIs no `core`.

## R2. Integração direta com a prefeitura, atrás de `FiscalProvider`

- **Decisão**: interface `FiscalProvider` em `packages/platform/fiscal` (`emit`, `query`, `cancel`, `downloadPdf`, `validateCertificate`), com adaptadores:
  1. **São Paulo (NFS-e Paulistana)**: web service da prefeitura, XML assinado com o certificado A1 do emitente (v1.0, REQ-FIS-040);
  2. **Padrão nacional (Emissor Nacional / ADN)**: necessário para **MEI**, que emite pelo padrão nacional; a cobertura e o calendário de adesão dos municípios são confirmados na implementação (tarefa de verificação, não suposição);
  3. **fake/homologação** para CI.
  
  Mudanças de leiaute ficam só no adaptador. Municípios sem adaptador → emissão indisponível com aviso e pendência no relatório (REQ-FIS-041).
- **Por quê**: integração direta com as prefeituras é gratuita; o certificado é do emitente.
- **Alternativas**: agregadores de NFS-e (cobrança por nota; violam a restrição de custo zero). Ficam como opção futura atrás do mesmo adaptador, se a cobertura de municípios virar gargalo.
- **Pendência não bloqueante**: confirmar, na implementação, o leiaute vigente de São Paulo e a situação da adesão de São Paulo ao padrão nacional (reforma tributária). O adaptador isola essa mudança.

## R3. Certificado A1

- **Decisão**: upload do `.pfx` com senha; validação no envio (abre o arquivo, confere CNPJ/CPF do perfil, validade). Guardado cifrado por envelope: chave de dados por tenant cifrada pela chave mestra do KMS/OCI Vault (fora do banco), com a senha cifrada à parte. Senha nunca exibida nem em log (redação no logger, teste). Troca e remoção com step-up e auditoria (REQ-FIS-003/042). Aviso 30 dias antes do vencimento; vencido → emissão para com pendência (REQ-FIS-007). Assinatura do XML feita só no processo do `workers`, com o certificado decifrado em memória pelo tempo da operação.

## R4. Emitente e perfil fiscal

- **Decisão**: `fiscal_issuer` por CNPJ/CPF (tipo PJ, MEI, PF sem CNPJ; inscrição municipal; regime; município; endereço — vindos da 005) e cada filial aponta seu emitente (REQ-FIS-002/004). Modo do negócio `own` (padrão) \| `koovela`; `koovela` só aparece com a flag `fiscal.koovela_issuer` ligada (spec 004), que nasce desligada (REQ-FIS-001). PF sem CNPJ → nenhuma NFS-e; recibo não fiscal do atendimento em PDF, com orientação (REQ-FIS-006).

## R5. Dados fiscais do serviço

- **Decisão**: campos no catálogo (006) mantidos pelo `fiscal`: código de serviço (municipal e, quando houver, nacional), alíquota do ISS em pontos-base, retenção. Sugestão por categoria da vertical (tabela versionada no back-office). Serviço sem dados → sem emissão automática e pendência na tela (REQ-FIS-005).

## R6. Gatilho e regras de emissão

- **Decisão**: consumidor de `scheduling.appointment.completed.v1` + `payments.payment.approved.v1`/`on_site_recorded.v1`: com emissão automática ligada (padrão quando o perfil está completo), cria `fiscal_invoice_request` com o **valor efetivamente pago pelo serviço** (REQ-FIS-010). Não gera nota para: valor zero, multas (010) e sinal não convertido (REQ-FIS-012). Pacote: `per_session` (padrão, PEN-24 decidido em 2026-11-25: nota no uso, venda como adiantamento) ou `on_sale` (REQ-FIS-013); o vale-presente sempre emite no uso (029, REQ-VAL-030). CPF na nota só se o consumidor tiver CPF e escolher (padrão sim) (REQ-FIS-011). Idempotência: UNIQUE `(source_kind, source_id, source_part)` para nota válida (`source_part` separa as notas de um combo com códigos diferentes) e número de RPS sequencial por emitente atribuído uma única vez (REQ-FIS-014). Emissão manual individual ou em lote com registro do ator (REQ-FIS-016).

## R7. Falhas, recusas e cancelamento

- **Decisão**: falha de comunicação → novas tentativas com intervalos crescentes (1 min, 5 min, 30 min, 2 h, depois a cada 6 h) por até 72 h; depois `failed_permanent` (REQ-FIS-020). Recusa da prefeitura → tradução do código para linguagem simples com "o que corrigir" (tabela por adaptador) e aviso ao Proprietário (REQ-FIS-021). Estorno total (012) dentro do prazo da prefeitura → cancelamento; fora do prazo ou estorno parcial → `fiscal_pending` para decisão do Proprietário (REQ-FIS-022). Pendentes > 24 h → aviso ao Proprietário e Financeiro/Ops; falhas acumuladas por município → alerta ao SRE (REQ-FIS-023).

## R8. Guarda e exportação

- **Decisão**: XML autorizado e PDF guardados em Object Storage com retenção de 5 anos (bloqueio de remoção por política do bucket), referenciados na nota (REQ-FIS-033). Exportação mensal: planilha (`exceljs`) e `.zip` com XMLs e PDFs autorizados e cancelados (REQ-FIS-031). Relatório de concluídos e pagos sem nota no período (REQ-FIS-032).

## R9. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel (onboarding) | Recebedor, KYC e certificado de NFS-e | O05 |
| Painel | NFS-e: emissão e histórico · dados fiscais em Serviços e preços | P23 · P09 |
| App / web do consumidor | Nota no agendamento concluído · "CPF na nota" no Resumo | C16 · C08 · W18 · W11 |
| Back-office | Falhas por município e certificados a vencer | Sem código (nova) |
