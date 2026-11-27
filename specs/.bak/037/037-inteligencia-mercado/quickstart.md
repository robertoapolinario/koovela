# Quickstart de validação: Inteligência de mercado (037)

Pré-requisitos:

- Specs 001 a 036 no ar.
- ClickHouse com dados sintéticos de 30 salões numa cidade, distribuídos por bairros e zonas, incluindo:
  - um bairro com 4 salões;
  - um bairro com um salão dominante;
  - uma clínica de saúde.
- Configuração de insights de teste aprovada.
- Plano de teste com a função `insights.benchmark`.

Os contratos estão em [contracts/](./contracts/) e o modelo em [data-model.md](./data-model.md).

## 1. Cálculo e verificação

```bash
cd bi && uv run dbt build --select insights && uv run python -m insights.publish --run-date 2026-12-07
```

Esperado:

- bairro com 4 salões: `blocked` por `below_minimum`;
- bairro com dominante: `blocked` por `dominance`;
- pai e filho com complemento abaixo do mínimo: filho `blocked` por `complementary`;
- `period_end` 30 dias antes da data do cálculo;
- evento `insights.benchmark.calculated.v1`.

```bash
uv run pytest bi/tests/insights/test_publication_rules.py   # nada publicado abaixo do mínimo ou com dominância (SC-001)
uv run pytest bi/tests/insights/test_reidentification.py    # diferenças entre níveis, categorias e semanas não isolam ninguém (SC-002)
uv run pytest bi/tests/test_no_pii.py -k insights           # nenhum dado pessoal
```

## 2. Painel

1. Como Proprietário, abra "Inteligência de mercado", escolha a filial, a categoria "cabelo" e 90 dias. Esperado para cada métrica: valor próprio, mediana, P25 e P75 e a posição, em até 3 toques (SC-003).
2. Toque em "como é calculado". Esperado: definição, versão, nível usado e faixa de estabelecimentos, como "entre 20 e 49" (SC-004).
3. Abra uma filial no bairro de 4 salões. Esperado: o nível sobe para a zona e o painel diz que usou a zona.
4. Abra uma categoria rara. Esperado: "dados insuficientes na sua região", sem número.
5. Abra um negócio com menos de 30 dias. Esperado: "posição em formação".
6. Abra a clínica de saúde. Esperado: preço `not_applicable` e as demais métricas normais.
7. Abra "Procura na região". Esperado: índice de 0 a 100 ao lado da ocupação da filial; oportunidades destacadas, com atalhos para a escala (007) e os horários ociosos (014).
8. Entre como Gerente. Esperado: vê só a própria filial. Recepção: sem acesso. Plano sem a função: `insights.not_in_plan`.

## 3. Saída de dados

```bash
pnpm test:routes --filter insights   # nenhuma rota devolve dados brutos, CSV ou recortes fora das filiais do tenant (SC-005)
```

Baixe o PDF. Esperado: só a própria comparação, com marca d'água.

## 4. Participação

Desligue "participar do benchmark", aceitando o aviso de reciprocidade. Esperado:

- painel bloqueado na hora;
- no próximo cálculo, o negócio não contribui;
- os números já publicados não mudam.

Religue. Esperado: volta a contribuir e a ver o painel no cálculo seguinte.

## 5. Back-office

1. Proponha um mínimo de 4. Esperado: `insights.min_below_floor`.
2. Aprove uma mudança de dominância. Esperado: o teste de reidentificação roda de novo antes de valer.
3. No Dash, confira a cobertura por categoria e cidade, os bloqueios por motivo e o uso do painel. Os acessos ficam auditados.
