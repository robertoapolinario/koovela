# Research: BI e painéis (023)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D25 (BI em Python, somente leitura sobre cópia analítica), PEN-03 (Gerente vê receita só da própria filial), PEN-09 (taxa no split ou na fatura), "tenant ativado" no BI = primeiro atendimento concluído e pago. Restrições: custo zero, self-hosted nas VMs ARM, nada de PII na cópia analítica. Base: eventos de todas as specs 002–022; conciliação (012), faturas (019), contrato de titular (022). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Armazenamento analítico

- **Decisão**: **ClickHouse** (open source, imagem oficial `linux/arm64`) num container próprio, com volume separado, **fora** do MySQL transacional (REQ-BI-001). Tabelas `raw_events` (MergeTree particionada por mês, ordenada por `(tenant_pseudo, event_type, occurred_at)`), camadas `staging` e `marts` (tabelas agregadas por dia e mês, MVs para os dashboards do estabelecimento). Backup diário por `clickhouse-backup` para o Object Storage.
- **Por quê**: colunar, concorrência para os dashboards do painel (vários tenants ao mesmo tempo) e consultas de coorte em segundos com 10× o volume (REQ-BI-032); gratuito e roda bem em ARM com pouca memória.
- **Alternativas**: DuckDB (excelente para a Gestão, mas um escritor só e sem servidor para os dashboards concorrentes do painel); réplica MySQL (consultas analíticas lentas e expõe PII); serviços gerenciados (custo).

## R2. Ingestão por eventos, sem PII

- **Decisão**: serviço Python `bi-ingest` (consumidor RabbitMQ, `aio-pika`) assina os exchanges de todas as specs com fila própria e DLQ; cada evento passa por um **mapa de projeção** declarado por tipo (`bi/ingest/mappings/*.yaml`) que **só deixa passar campos permitidos** (ids, valores, estados, datas, dimensões como vertical, categoria, cidade); qualquer campo não mapeado é descartado (REQ-BI-002/003). Extrações periódicas só para projeções sem evento (ex.: escala da 007 para ocupação), pelos contratos internos. Inserção em lote (a cada 30 s ou 5 mil eventos) e idempotência por `event_id` (ReplacingMergeTree). Latência alvo: ≤ 5 min (marts do estabelecimento ≤ 15 min, Gestão ≤ 1 h).
- **Teste**: contrato de ingestão falha se um mapeamento incluir campo marcado `x-pii` no schema do evento.

## R3. Pseudônimos e eliminação

- **Decisão**: consumidores e colaboradores entram como **pseudônimo aleatório** (UUID v4) obtido do serviço `pseudonym` (tabela de mapeamento em `koovela_platform`, nunca no ClickHouse); tenants entram pelo id próprio (não é dado pessoal), mas o nome do negócio só aparece na Gestão via contrato do 002. Eliminação (022): o `HolderDataPort` do BI **apaga o mapeamento** do titular — o pseudônimo no ClickHouse continua só como contagem, sem caminho de volta (REQ-BI-004). Não há reidentificação dentro do BI.
- **Alternativas**: HMAC do id (reversível por força bruta com a chave; eliminação exigiria trocar a chave de todos).

## R4. Métricas versionadas

- **Decisão**: transformações e métricas em **dbt-core + dbt-clickhouse** (`bi/models/`), cada métrica com arquivo de definição (`bi/metrics/*.yml`: o que conta, o que não conta, origem, versão, data) exibido no painel (REQ-BI-005). Mudança de definição = nova versão, histórico preservado. Métricas da fase 2 e o benchmark da fase 3 entram como novos modelos sem mexer nos existentes; uma métrica só é publicada quando a flag/função correspondente existe (REQ-BI-040).
- **Definições-chave**: North Star (CONST 7, como definida na DF 14); tenant ativado = primeiro atendimento concluído e pago; GMV pela plataforma e no local; take rate efetivo = receita Koovela ÷ GMV pela plataforma; ARPA; NRR; CAC = gasto do canal ÷ tenants ativados do canal.

## R5. Painéis da Gestão (`bi.koovela.com`)

- **Decisão**: app Python **Dash (Plotly)** servido por Gunicorn atrás do Cloudflare Access com MFA (REQ-BI-017); perfis da Gestão vindos do token do Access mapeados para a matriz (003): cada painel com célula própria. Painéis: operacional, financeiro, coorte e retenção (REQ-BI-010/011/012), com filtros por período, vertical, categoria, cidade, plano, canal e coorte (REQ-BI-013). **Supressão de células pequenas**: qualquer célula com < 5 tenants ou consumidores mostra "—" (aplicada na camada de consulta, não no gráfico) (REQ-BI-014). Insumos manuais (gasto por canal pelo Comercial/Growth, custo de infra e envios pelo SRE) em tela própria, versionados e auditados (REQ-BI-015).
- **Alternativas**: Metabase/Superset (pesados para as VMs e com modelo de permissão próprio a manter); Streamlit (menos adequado a vários usuários simultâneos com permissões).

## R6. Dashboards do estabelecimento (P01/P02)

- **Decisão**: serviço Python **`bi-api` (FastAPI)**, chamado só pelo gateway com o `tenant_id` resolvido (nunca vindo do cliente), lê os marts do tenant com filtro obrigatório por tenant aplicado numa camada única (teste de isolamento) (REQ-BI-023). Indicadores da filial (REQ-BI-020): agendamentos de hoje e semana, ocupação por colaborador, receita, faltas e cancelamentos tardios, novos consumidores, recompra 30/60/90, avaliação média, serviços e profissionais mais agendados, origem. Consolidado da rede só para o Proprietário (REQ-BI-021). Gerente só da própria filial, receita só dela (PEN-03); Recepção e Colaborador sem acesso (REQ-BI-022). Autônomo (1 filial, 1 colaborador) sem comparações (REQ-BI-024). Agendamentos de **hoje** vêm do contrato operacional da 009 (tempo real), não do BI.

## R7. Fechamento e reconciliação

- **Decisão**: mês fechado congela os totais financeiros a partir do ledger da 012 e das faturas da 019 (extração no fechamento); estornos posteriores aparecem no mês em que aconteceram (REQ-BI-016). Verificação diária (`dbt test` + script) compara totais do BI com as fontes: > 0,5% ou qualquer diferença financeira de mês fechado → alerta (REQ-BI-031).

## R8. Frescor e desempenho

- **Decisão**: cada painel mostra a hora da última atualização (máx. `ingested_at` dos marts usados); atraso > 2 h (Gestão) ou > 30 min (estabelecimento) → aviso no painel e alerta ao SRE (métrica Prometheus) (REQ-BI-030). Metas: Gestão ≤ 5 s, dashboards ≤ 3 s p95; 10× → 15 s e 5 s (REQ-BI-032), validadas com carga sintética.

## R9. Telas

| Superfície | Tela | Código |
|---|---|---|
| BI | Painel operacional · financeiro · coorte e retenção | B01 · B02 · B03 |
| BI | Insumos manuais | Sem código (nova) |
| Painel | Dashboard da filial · consolidado da rede | P01 · P02 |
