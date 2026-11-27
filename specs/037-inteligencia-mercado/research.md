# Research: Inteligência de mercado (037)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas:

- **D36**: fase 3.
- **D39**: benchmark só para tenants, só no painel, sem venda; recorte mínimo por região.
- **D25**: BI em Python.
- **Clarify**: mínimo de 5 estabelecimentos por recorte (configurável, nunca abaixo de 5), dominância de 30%, sem benchmark de preço em saúde (PEN-06).
- **PEN-19**: a nota só entra se for pública.
- **PEN-26**: mesmo cadastro de regiões da 024.

Base: 004 (auditoria, aprovação), 005 (geolocalização da filial e vertical), 007 (escala), 014 (horários ociosos), 016 (médias públicas), 019 (funções por plano), 023 (ClickHouse, ingestão sem PII, pseudônimos, dbt, `bi-api`, supressão < 5), 024 (`discovery_region`, taxonomia e sinônimos, buscas agregadas), 035 (`packages/platform/documents` para PDF).

Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e execução

- **Decisão**: o domínio `insights` (CONST 4.4) fica dentro do componente `bi/`, em Python (D25):
  - **modelos dbt** `bi/models/insights/*` sobre os marts da 023, que leem só a cópia analítica no ClickHouse (REQ-INT-014);
  - **verificador de publicação**: `bi/insights/publish.py`, em Python e testado;
  - **API de leitura**: as rotas `/insights/*` no `bi-api` (FastAPI), chamadas só pelo gateway com o `tenant_id` resolvido.
- **Configuração e participação** ficam em `koovela_platform` (TypeScript, `admin-web` e painel). O `bi` lê esses dados por extração periódica, no mesmo padrão dos insumos manuais da 023.
- **Cálculo**: semanal, segunda-feira às 03:00 America/Sao_Paulo, no `bi` (REQ-INT-022). O ciclo é: dbt build → verificação → publicação atômica (troca da versão publicada) → evento.

## R2. Período e defasagem (Lei 12.529/2011)

- **Decisão**: o período é móvel, de 90 dias por padrão (opções 30, 90 e 180), e termina **30 dias antes** da data do cálculo (REQ-INT-013).
  - Só entram dados históricos de atendimentos concluídos e pagamentos registrados. Não há preço de tabela futuro, plano de preço nem recomendação.
  - O texto do painel diz "dados de DD/MM a DD/MM".
- **Por quê**: a defasagem e o uso só de dados realizados reduzem o risco de o benchmark servir como sinal de coordenação de preços.

## R3. Regiões e recortes

- **Decisão**: a hierarquia é **bairro → zona → cidade**, sem nunca subir para o estado (REQ-INT-004).
  - Bairro e cidade vêm de `discovery_region` (024, polígonos IBGE). A zona é um agrupamento de bairros do back-office, o mesmo da vitrine.
  - A filial é posicionada pelo ponto real da 005, nunca pelo centróide público.
  - **Recorte** = (nível, região, categoria da taxonomia da 024, período e versão da métrica).
  - **Escolha do nível por filial e métrica**: o menor nível em que o recorte foi publicado. Se nenhum nível foi publicado, a métrica mostra "dados insuficientes na sua região".
- **Contribuintes**: negócios participantes (R8), com 30 dias ou mais de dados no período e da categoria, considerando só as filiais da região.

## R4. Métricas

- **Decisão**: cada métrica é um modelo dbt com arquivo de definição versionado (`bi/metrics/insights/*.yml`), exibido em "como é calculado" (REQ-INT-002/003). O cálculo tem dois passos:
  1. **valor por estabelecimento** (filial) no período;
  2. **distribuição** entre os contribuintes: mediana, P25 e P75 por interpolação linear (tipo 7).

| Métrica | Valor por filial | Peso para dominância |
|---|---|---|
| Preço praticado (serviço típico) | Mediana do preço pago no serviço canônico da categoria (serviço ligado pelos sinônimos da taxonomia da 024) | Nº de atendimentos do serviço |
| Ocupação | Minutos ocupados ÷ minutos de escala (007) | Minutos de escala |
| Faltas | No-show ÷ agendamentos | Agendamentos |
| Cancelamentos tardios | Tardios ÷ agendamentos | Agendamentos |
| Tíquete médio | Receita ÷ atendimentos concluídos | Atendimentos |
| Antecedência média | Média de (início − criação) em horas | Agendamentos |
| Recompra em 90 dias | Consumidores que voltaram ÷ consumidores atendidos (pseudônimos, 023) | Consumidores atendidos |
| Nota média | Média pública da 016 (só se pública) | Avaliações |

- **Saúde**: não há métrica de preço (PEN-06). As demais valem. A lista de verticais excluídas por métrica fica no back-office.
- **Negócio novo**: com menos de 30 dias de dados, não contribui e vê "posição em formação" (edge case).
- **Posição do negócio**: o valor próprio e o percentil aproximado dentro da distribuição publicada.

## R5. Proteção contra identificação (D39, CONST II)

- **Decisão**: o verificador aplica estas regras, em ordem, a cada recorte e métrica. Qualquer falha leva a `blocked` com motivo registrado e evento `cut_blocked` (REQ-INT-010/011/012, SC-001).
  1. **Mínimo**: contribuintes ≥ `min_establishments`. O padrão é 5, e a configuração rejeita qualquer valor abaixo de 5.
  2. **Dominância**: nenhum contribuinte com mais de `dominance_pct` (padrão 30%) do peso da métrica no recorte.
  3. **Supressão complementar**:
     - Se um recorte pai (zona ou cidade) e um recorte filho (bairro ou zona) estão publicados, o **complemento** (pai menos filho) também precisa passar nas regras 1 e 2. Se não passar, o filho é suprimido. O pai é mais útil a mais negócios.
     - A mesma regra vale entre a categoria e a união das categorias.
  4. **Estabilidade temporal**: se o conjunto de contribuintes mudou de 1 a `min − 1` negócios em relação à publicação anterior do mesmo recorte, e a mudança de algum quantil ultrapassa o arredondamento, o recorte fica bloqueado naquela semana. Isso evita isolar quem entrou ou saiu.
  5. **Arredondamento**: os quantis são publicados arredondados.
     - Preço: R$ 1. Com menos de 10 contribuintes: R$ 5.
     - Taxas: 1 ponto percentual. Com menos de 10 contribuintes: 5 pontos.
     - Horas: 1 h.
     - Nota: 0,1.
- **Quantidade de estabelecimentos**: sempre em faixa (5–9, 10–19, 20–49, 50–99, 100+), nunca o número exato (REQ-INT-003).
- **Teste de reidentificação** (SC-002): uma suíte em Python simula um atacante que conhece os recortes publicados de vários níveis, categorias e semanas.
  - O atacante tenta recuperar o valor de um estabelecimento por diferenças, interseções e variações ao longo do tempo.
  - A suíte falha se algum valor individual for recuperado dentro da tolerância do arredondamento.
  - Roda no CI com dados sintéticos e em toda mudança da configuração.
- **Alternativas**: privacidade diferencial com ruído calibrado. Ficou fora agora porque distorce bastante recortes pequenos, e o arredondamento com as regras 1 a 4 cumpre o requisito com explicação simples. Fica registrada como evolução possível.

## R6. Mapa de procura

- **Decisão**: a matriz é dia da semana × faixa de 1 h, no recorte de região e categoria (REQ-INT-005).
  - **Sinais**: agendamentos criados para cada faixa (009), mais buscas na vitrine com intenção de horário (024, agregadas e sem identificador), com peso configurável.
  - **Índice**: 0 a 100, normalizado pelo máximo da matriz e arredondado a 5. Nunca é absoluto.
  - As mesmas regras 1 e 2 se aplicam por recorte. Faixas com volume muito pequeno mostram "—".
  - **Ocupação da filial**: dos marts do próprio tenant (023).
  - **Oportunidade**: índice da região ≥ 70 e ocupação da filial ≤ 40%, ambos configuráveis. O painel mostra atalhos para a escala (007) e para os horários ociosos.
  - A spec cita os horários ociosos como "spec 017", mas a função é da **014**. O plano usa a 014 e a correção fica registrada nos Riscos.

## R7. Acesso, exportação e uso

- **Decisão**:
  - **Acesso pelo plano** (REQ-INT-006): função `insights.benchmark` nas funções incluídas da versão do plano (019, `getEntitlements`), configurável no back-office. Sem a função, o painel mostra o que o plano não inclui.
  - **Permissões**: Gerente da própria filial e Proprietário. O consolidado da rede compara cada filial com a sua região.
  - **Sem saída de dados** (REQ-INT-020, SC-005):
    - o `bi-api` só responde pelo gateway, com sessão do painel e o `tenant_id` resolvido;
    - não há chave de API, CSV nem endpoint de recortes de outras regiões;
    - as respostas só trazem os recortes aplicáveis às filiais do próprio tenant;
    - há limite de requisições;
    - um teste de rotas garante que nenhuma rota devolve dados brutos nem recortes fora das filiais do tenant.
  - **PDF da própria comparação**: renderizado por `packages/platform/documents` (035) no `workers`, com marca d'água "uso interno do estabelecimento", o nome do negócio e a data.
  - O teste de PII da 023 cobre os modelos `insights` (REQ-INT-015).

## R8. Participação e reciprocidade

- **Decisão**: `koovela_platform.insights_participation`, ligada por padrão conforme os termos de uso (REQ-INT-021).
  - Só o Proprietário desliga, com aviso de reciprocidade. Desligar tira o negócio dos cálculos seguintes e bloqueia o painel imediatamente.
  - Os números já publicados não são refeitos.
  - Ao religar, o negócio volta a contribuir e a ver o painel no próximo cálculo.
  - Evento `participation_changed`. A mudança vai para a auditoria da 004.

## R9. Back-office

- **Decisão**:
  - **Configuração** (`insights_config_version`, versionada, no `admin-web`) (REQ-INT-030):
    - mínimo (≥ 5), dominância, níveis de região e zonas;
    - métricas ativas e verticais excluídas por métrica;
    - limiares de oportunidade, planos com acesso e arredondamentos.
    - Mudanças passam pela aprovação dupla da 004 e disparam de novo o teste de reidentificação.
  - **Acompanhamento** (REQ-INT-031): página no Dash (`bi.koovela.com`, Gestão de Dados) com cobertura por categoria e cidade, recortes bloqueados por motivo e uso do painel.
  - **Auditoria** (REQ-INT-032): os acessos da Gestão de Dados aos recortes não publicados ficam registrados.

## R10. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel do cliente | Inteligência de mercado (métricas, posição, "como é calculado", procura na região, PDF) · opção "participar do benchmark" | Nova (DF 9.11) · mapa de procura e opção de saída a conferir |
| Back-office | Benchmark: configuração (`admin-web`) · cobertura, bloqueios e uso (Dash) | Novas (sem tela no protótipo) |
