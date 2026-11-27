# Implementation Plan: Inteligência de mercado (benchmark para os tenants)

**Branch**: `037-inteligencia-mercado` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/037-inteligencia-mercado/spec.md`

## Summary

Criar o domínio `insights` (D39) dentro do componente `bi/`, em Python (D25), sobre a cópia analítica da 023.

- **Cálculo semanal** em dbt, com período móvel (90 dias por padrão) que termina 30 dias antes do cálculo e só com dados realizados (Lei 12.529/2011).
- **Métricas** por filial: preço do serviço típico (exceto saúde), ocupação, faltas, cancelamentos tardios, tíquete médio, antecedência, recompra em 90 dias e nota pública. Cada uma mostra mediana e P25/P75 por recorte de região e categoria, com a região subindo de bairro para zona e para cidade.
- **Verificador de publicação**:
  - mínimo de 5 estabelecimentos, configurável e nunca abaixo de 5;
  - dominância de 30%;
  - supressão complementar entre níveis e categorias;
  - estabilidade temporal;
  - arredondamento;
  - quantidade de estabelecimentos só em faixa;
  - teste automatizado de reidentificação por diferença.
- **Mapa de procura** relativo (0 a 100) com oportunidades e atalhos para a escala (007) e os horários ociosos (014).
- **Acesso** pelo plano (019), para Proprietário e Gerente da filial, pelo `bi-api` atrás do gateway, sem exportação além do PDF da própria comparação.
- **Participação** ligada por padrão, com saída e reciprocidade.
- **Back-office**: configuração versionada com aprovação dupla e acompanhamento no Dash.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: Python 3.13 (`bi/`, D25); TypeScript 5.9 no `core` e `admin-web` para configuração e participação.

**Primary Dependencies**:
- ClickHouse, dbt-core + dbt-clickhouse, FastAPI (`bi-api`), Dash (acompanhamento), pytest + Hypothesis (reidentificação e propriedades) e `uv`.
- `packages/platform/documents` (PDF, 035).
- Contratos de 004, 005, 007, 014, 016, 019, 023 e 024.

**Storage**:
- ClickHouse: schema `insights` (contribuintes internos, recortes, valores publicados, posições, procura, execuções).
- `koovela_platform`: `insights_config_version` e `insights_participation`.
- RabbitMQ `insights.events`.

**Testing**:
- Regras de publicação (mínimo, dominância, complementar, temporal).
- Reidentificação por atacante simulado.
- Ausência de PII.
- Rotas sem saída de dados.
- Isolamento do `bi-api`; saúde sem preço; níveis de região; participação; axe AA no painel.

**Target Platform**: `bi/` (`dbt`, `insights.publish`, `bi-api`, Dash), `core` (configuração e participação), `tenant-web` (painel) e `admin-web`.

**Project Type**: pipeline analítico com verificação de privacidade, API de leitura e telas.

**Performance Goals**:
- Cálculo semanal ≤ 30 min com 10× o volume.
- Painel ≤ 3 s p95, como os dashboards da 023.
- PDF ≤ 10 s, em segundo plano.

**Constraints**:
- Nenhum número abaixo do mínimo ou com dominância.
- Sem venda, API ou exportação de dados.
- Só histórico, com 30 dias de defasagem.
- Sem recomendação de preço.
- Só a cópia analítica.
- Sem dados pessoais.

**Scale/Scope**: até 10 mil filiais; cerca de 5 mil recortes por métrica por semana.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Não se aplica | ✅ N/A |
| G-II | Isolamento | Só a cópia analítica e projeções (CONST 4.1); recorte mínimo por região antes de qualquer número (D39); valores individuais nunca saem do ClickHouse | ✅ |
| G-III | Dinheiro | Valores em centavos na base, exibidos arredondados; não há cobrança | ✅ |
| G-IV | Dados pessoais | Sem PII (pseudônimos da 023); teste de PII cobre `insights` | ✅ |
| G-V | Permissões e auditoria | Proprietário e Gerente da filial; participação só pelo Proprietário; configuração com aprovação dupla; acessos da Gestão auditados | ✅ |
| G-VI | Rastreabilidade | D39 e mínimo de 5 decididos; PEN-06, PEN-19 e PEN-26 herdados | ✅ |
| G-VII | Contratos | [insights.openapi.yaml](./contracts/insights.openapi.yaml), [insights-events.asyncapi.yaml](./contracts/insights-events.asyncapi.yaml); definições de métrica versionadas | ✅ |
| G-VIII | Testes antes | Regras de publicação e reidentificação antes dos modelos | ✅ |
| G-IX | Outbox e idempotência | Publicação atômica por `run_id`; reexecução idempotente | ✅ |
| G-X | Observabilidade | Cobertura, bloqueios, uso, duração do cálculo, alerta de falha | ✅ |
| G-XI | Figma e a11y | Tela da DF 9.11 a conferir; mapa de procura e saída a conferir; mapa de calor com tabela alternativa (WCAG AA) | ✅ com pendência de protótipo |
| G-XII | Complexidade | Reusa a 023; sem serviço novo | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/037-inteligencia-mercado/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── insights.openapi.yaml
    └── insights-events.asyncapi.yaml
```

### Source Code (repository root)

```text
bi/models/insights/                    # dbt: valores por filial, recortes, quantis, procura, posições
bi/metrics/insights/*.yml              # definições versionadas
bi/insights/{publish.py,rules/,rounding.py,levels.py}
bi/api/routes/insights.py              # bi-api (atrás do gateway)
bi/web/pages/insights_coverage.py      # Dash (Gestão de Dados)
bi/tests/insights/{test_publication_rules.py,test_reidentification.py}
services/insights-config/              # core TS: configuração e participação (koovela_platform)
apps/tenant-web/src/routes/inteligencia
apps/admin-web/src/routes/insights
```

**Structure Decision**: o `insights` fica no `bi/` porque só lê a cópia analítica. A configuração e a participação ficam no `core` porque são dados operacionais da plataforma, com aprovação e auditoria da 004.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Referência na spec**: o mapa de procura cita os horários ociosos como "spec 017", mas a função é da **014** (`fila-espera-horario-ocioso`). Convém corrigir a spec no próximo ajuste.
- **Recortes pequenos**: com mínimo de 5 e arredondamento, a mediana de poucos estabelecimentos ainda fica perto de um valor real, embora sem dizer de quem é. A privacidade diferencial está registrada como evolução, caso o teste de reidentificação aponte risco com dados reais.
- **Cobertura no início**: com poucos negócios por bairro, a maior parte das métricas vai subir para a cidade ou aparecer como "dados insuficientes". O acompanhamento de cobertura orienta a abertura de regiões (024).
- **Telas**: "Inteligência de mercado" (DF 9.11) a conferir. O mapa de procura, a opção de saída e o back-office não estão no protótipo.
- **Termos de uso**: a participação por padrão exige cláusula nos termos da assinatura (005/019). Isso precisa ser revisado pelo jurídico antes de ligar.
