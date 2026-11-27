# Koovela — Documento Fundamental de Negócio e Produto

| | |
|---|---|
| **Versão** | 0.6 |
| **Data** | 24/11/2026 |
| **Autor** | Roberto Apolinário Sobrinho |
| **Status** | 46 decisões incorporadas (D44–D46 novas nesta versão). 7 conflitos abertos. 33 decisões pendentes (seção 18) |
| **Constituição** | `.specify/memory/constitution.md` v1.1.0 (Spec Kit) |
| **Repositório** | `https://github.com/robertoapolinario/koovela` (privado) |
| **Registro de decisões** | `koovela-escopo-mvp-e-decisoes.md` v0.2 · decisões D26–D46 registradas nas seções 17.1 a 17.3 deste documento, a transcrever no registro |
| **Domínio** | `koovela.com` (assumido para esta plataforma; ver `[PEN-02]`) |
| **Protótipo** | Figma "Koovela — Protótipo v1.0" (`https://www.figma.com/design/uHnkbY8CjhyvGU31WrpKN0`) |

**O que mudou na v0.4 (23/11/2026, revisão do protótipo).** A vitrine com busca e verticais sai da fase 3 e entra na fase 2 `[D26]`. O consumidor ganha versão web com agendamento pelo navegador `[D27]`. As regras da fase 2 foram decididas para atendido, pet, turmas, colaborador em vários negócios, CRM, vale-presente e combo com troca `[D28]`–`[D34]`. Recurso compartilhado foi adiado `[PEN-23]`.

**O que mudou na v0.5 (23/11/2026, fase 3).** Definido o escopo da fase 3 `[D36]`: destaque pago na vitrine, antecipação de recebíveis, benchmark para os tenants, verticais automotivo, casa, educação e eventos, parceiros indicadores e favoritos. Ficam fora por ora: produtos financeiros, veterinário, corporativo B2B2C, white label e API, portabilidade do colaborador. As regras de cada frente estão em `[D37]`–`[D43]`.

**O que mudou na v0.6 (24/11/2026, imagens).** Cria-se a **fase 4**, dedicada a imagens dos tenants `[D44]`: logo e capa, galeria do espaço, foto por serviço, antes e depois e vídeo `[D45]`, com moderação automática e revisão da Gestão só sob denúncia `[D46]`. Até a fase 4, nenhuma superfície exibe imagem enviada pelo tenant; o protótipo mostra placeholders. Novo conflito `[C7]` com o portfólio do colaborador (v1.0) e as fotos de orçamento (fase 3). Novas pendências `[PEN-32]` a `[PEN-34]`.

---

## 0. Como usar este documento

Documento-raiz do projeto. Toda especificação posterior deve ser rastreável a um item daqui, no formato `REQ-AG-012 (origem: 2.2.3)`.

- **Seções 1 a 5** definem para quem, por quê e como se ganha dinheiro.
- **Seções 6 a 10** definem o que o produto faz. São o insumo direto do protótipo.
- **Seções 11 a 13** definem como se sustenta tecnicamente.
- **Seções 14 a 17** definem medição, ordem de entrega e riscos.
- **Seção 18** lista tudo que ainda falta decidir. É a seção a ler primeiro para validação.

**Marcações.** `[D##]` remete a uma decisão já tomada, registrada em `koovela-escopo-mvp-e-decisoes.md`. `[PEN-##]` remete a uma decisão pendente da seção 18. `[C#]` remete a um dos sete conflitos abertos, descritos na seção 18.2. As decisões D26 a D35 estão na seção 17.1, D36 a D43 na seção 17.2 e D44 a D46 na seção 17.3.

**Escopo declarado.** O que foi decidido descreve a **versão 1.0** do produto, não um MVP enxuto. Este documento especifica a v1.0. A seção 15 propõe um recorte de validação dentro dela.

---

## 1. Visão e identidade

### 1.1 Posicionamento

Plataforma de agendamento, pagamento e fidelização para estabelecimentos de **beleza e saúde**, vendida como ferramenta ao estabelecimento `[D01]`, operando no **Brasil, com foco inicial em São Paulo** `[D11]`.

Na v1.0 o consumidor chega pelo link e pelo QR code do próprio estabelecimento, não por busca na Koovela. A vitrine com busca e segmentação por vertical entra na **fase 2** `[D26]` (antes prevista para a fase 3). Os demais itens de marketplace (visibilidade paga, impulsionamento) continuam na fase 3. O modelo de dados já nasce preparado com slug público, categoria e geolocalização.

### 1.2 Identidade visual `[D12]`

A marca Koovela já definida é reaproveitada: conceito **"Elo"**, dois anéis entrelaçados no lugar do "oo", que descreve literalmente a ligação entre consumidor e profissional.

| Cor | Hex | Uso proposto |
|---|---|---|
| Terracota | `#B5532F` | Ação primária, botões, destaques |
| Oliveira | `#3F4A2E` | Texto, superfícies escuras, cabeçalhos |
| Creme | `#F7EEDC` | Fundo claro, superfícies de cartão |

Uma paleta de três cores não sustenta uma interface. O protótipo propõe um conjunto funcional e uma escala de neutros quentes, com tipografia DM Sans, aguardando validação `[PEN-01]`:

| Papel | Hex | Fundo |
|---|---|---|
| Sucesso | `#2F7A4B` | `#E3F1E7` |
| Alerta | `#9A6412` | `#FBF0D9` |
| Erro | `#A8201A` | `#F9E1DE` |
| Informação | `#2C6A8A` | `#E1EEF5` |
| Neutros | `#FFFFFF` · `#FAF7F2` · `#F2EDE4` · `#E5DED2` · `#CFC6B7` · `#8C8476` · `#4F4A41` · `#22201B` | |

O erro é mais fechado que a terracota para não ser confundido com a ação primária. Ainda faltam os estados de componente (hover, foco, desabilitado, carregando).

Risco registrado: a mesma marca atende hoje dois negócios sem relação, uma loja de dropshipping sediada em Portugal e esta plataforma. Enquanto ambos existirem, há diluição de marca, disputa de domínio e confusão de SEO. `[PEN-02]`

---

## 2. Personas

> **Nomenclatura.** Em negócio, "Cliente" é o estabelecimento e "Usuário" é o consumidor final. Em código isso é ambíguo. Vocabulário técnico canônico na seção 19: estabelecimento = `tenant`, consumidor final = `consumer`.

### 2.1 Usuário (consumidor final)

Cliente do nosso cliente. Acessa por **app nativo** `[D03]` ou pela **versão web** no navegador `[D27]`, chegando por link, QR code ou deep link do estabelecimento e, a partir da fase 2, pela vitrine com busca `[D26]`.

- **Cadastro etapa 1:** nome e celular com verificação OTP.
- **Cadastro etapa 2:** e-mail, CPF, data de nascimento e meio de pagamento. Obrigatório para pagar, acumular fidelidade e receber nota fiscal.
- **Subtipo:** agendador por terceiro (filho ou menor, idoso ou adulto dependente, pet). Entra na fase 2 `[D21]` com as regras da `[D28]`: o titular paga e acumula os pontos de todos os atendidos. Ver `[C2]`.

### 2.2 Cliente (estabelecimento)

Profissional ou empresa que divulga serviços e agendas, com **operação multi-filial** `[D05]`. Perfis internos:

- **Proprietário/Admin:** acesso total à rede, inclusive financeiro e contratos.
- **Gerente de filial:** opera uma unidade, com acesso financeiro restrito à própria filial. `[PEN-03]`
- **Recepção:** cria, remarca e cancela agendamentos e recebe pagamento presencial. Sem acesso a faturamento, comissões e anotações de atendimento.

### 2.3 Colaborador

Profissional que executa o serviço. Vínculo CLT, PJ, comissionado ou arrendatário de estação, e o vínculo altera a regra de comissão.

Na v1.0 o colaborador é criado dentro do tenant. O colaborador que atende em **dois tenants diferentes** fica para a fase 2, com **agendas separadas por negócio** `[D31]`: elas se juntam só na visão do colaborador, cada negócio vê apenas os próprios agendamentos e não há bloqueio automático de conflito entre negócios (ver `[C6]`). O modelo separa `pessoa` de `vínculo` desde já para evitar migração. Se o mesmo colaborador pode atender em **mais de uma filial do mesmo negócio** ainda não está definido. `[PEN-04]`

### 2.4 Prestador autônomo (persona composta)

Cliente e Colaborador na mesma pessoa: manicure, personal trainer, psicólogo, nutricionista, fotógrafo. É o maior volume de cadastros e a menor disposição a pagar assinatura.

Onboarding próprio, sem obrigar a configurar filial, colaborador ou comissão antes do primeiro agendamento.

### 2.5 Gestão (time Koovela)

| Perfil | Responsabilidade | Poder crítico |
|---|---|---|
| Suporte N1/N2 | Atendimento a tenants e consumidores | Impersonation auditada |
| Engenharia/SRE | Saúde técnica, provisionamento de schemas | Logs, feature flags, migrações |
| Financeiro/Ops | Cobrança, repasses, chargebacks | Estorno, bloqueio de repasse |
| Comercial/Growth | Aquisição e ativação de tenants | Desconto, trial, degustação |

Regra inegociável: nenhum perfil de Gestão tem acesso irrestrito e silencioso a dados de tenant. Todo acesso é logado, justificado e expira.

### 2.6 Parceiro / Indicador

Administradoras, franqueadoras, contadores e associações que trazem tenants em lote. Fase 3, com portal próprio e **valor fixo por tenant ativado** `[D43]`.

---

## 3. Problemas

### 3.1 Problemas do Usuário

| # | Problema | Indicador | Escopo |
|---|---|---|---|
| 3.1.1 | Encontrar prestadores de várias categorias | Busca com resultado relevante | Fase 2 `[D26]` |
| 3.1.2 | Agendar e controlar agendamentos | Tempo até confirmação | v1.0 |
| 3.1.3 | Receber benefícios por fidelidade | Usuários com saldo ativo; recompra 90d | v1.0 |
| 3.1.4 | Pagar de maneira prática e segura | % de pagamento in-app | v1.0 |
| 3.1.5 | Confiar em quem nunca atendeu | Cobertura de avaliações | v1.0 `[D16]` |
| 3.1.6 | Remarcar sem telefonema | % de remarcações no app | v1.0 |
| 3.1.7 | Não esquecer o compromisso | No-show com e sem lembrete | v1.0, ver `[C1]` |
| 3.1.8 | Voltar ao mesmo profissional | % com profissional escolhido | v1.0 |
| 3.1.9 | Agendar para dependentes | % de agendamentos para terceiros | Fase 2 `[D21]` |
| 3.1.10 | Previsibilidade de preço | % de serviços com preço publicado | v1.0 |
| 3.1.11 | Manter tratamento com sessões recorrentes | Aderência à série | v1.0 `[D18]` |

### 3.2 Problemas do Cliente

| # | Problema | Indicador | Escopo |
|---|---|---|---|
| 3.2.1 | Aumentar receita | Receita por filial/mês | v1.0 |
| 3.2.2 | Aumentar volume de clientes | Novos consumidores únicos/mês | v1.0 |
| 3.2.3 | Preencher horários vagos | Ocupação; receita de ocioso | v1.0 `[D15]` |
| 3.2.4 | Reter clientes | Recompra 30/60/90d | v1.0 |
| 3.2.5 | Gerir agenda e comissões | Tempo de fechamento | v1.0 |
| 3.2.6 | Benefícios sustentáveis financeiramente | Custo do benefício / receita incremental | v1.0 `[D09]` |
| 3.2.7 | Cobrar com agilidade e split | Prazo médio de recebimento | v1.0 `[D04]` |
| 3.2.8 | **Reduzir no-show** | Taxa de no-show; receita perdida | v1.0, ver `[C1]` |
| 3.2.9 | Reconquistar cliente sumido | Reativação por campanha | Fase 2 `[D32]` |
| 3.2.10 | Provar o que foi feito | % com check-in e registro | v1.0 |
| 3.2.11 | Operar várias filiais com padrão | Tempo para abrir filial | v1.0 `[D05]` |
| 3.2.12 | Cumprir obrigação fiscal | % com nota emitida | v1.0 `[D20]` |
| 3.2.13 | Não depender do WhatsApp pessoal | % fora do canal manual | v1.0 |

> O item 3.2.8 é a dor com maior disposição a pagar do segmento, por ter perda financeira direta e quantificável. É o principal gancho comercial e depende inteiramente da resolução de `[C1]`.

### 3.3 Problemas do Colaborador

| # | Problema | Indicador | Escopo |
|---|---|---|---|
| 3.3.1 | Aumentar volume de atendimento | Ocupação pessoal | v1.0 |
| 3.3.2 | Prever comissões com exatidão | Divergência previsto/pago | v1.0 |
| 3.3.3 | Antecipar recebíveis | Volume antecipado | Fase 3 `[D38]` |
| 3.3.4 | Agenda única atendendo em vários lugares | Colaboradores multi-tenant | Fase 2 |
| 3.3.5 | Pedir folga e trocar escala | Tempo de aprovação | v1.0 |
| 3.3.6 | Construir reputação própria | Avaliações por colaborador | v1.0 `[D16]` |

### 3.4 Problemas da Gestão

| # | Problema | Indicador | Escopo |
|---|---|---|---|
| 3.4.1 | Gestão técnica da plataforma e dos tenants | Cobertura de observabilidade; MTTD | v1.0 |
| 3.4.2 | Corrigir problemas técnicos | MTTR | v1.0 |
| 3.4.3 | Conceder desconto e degustação | Tempo de concessão; conversão | v1.0 |
| 3.4.4 | Onboardar tenant (KYC, recebedor, contrato) | Tempo de ativação | v1.0 `[D04]` |
| 3.4.5 | Conter fraude, chargeback e abuso | Perda por fraude / GMV | v1.0 |
| 3.4.6 | Liberar função por tenant | % de releases com flag | v1.0 |
| 3.4.7 | Cobrar assinatura e tratar inadimplência | Inadimplência; recuperação | v1.0 `[D13]` |
| 3.4.8 | Provisionar e migrar schema por tenant | Tempo de provisionamento; falhas de migração | v1.0 `[D06]` |

### 3.5 Fora de escopo (escopo negativo)

- Prontuário clínico eletrônico completo e laudos. Apenas anotação de atendimento. `[PEN-05]`
- Folha de pagamento, eSocial e contabilidade.
- ERP, estoque profundo e compras.
- Venda de produtos físicos com logística.
- Telemedicina e videoconsulta.
- Antecipação de recebíveis (fase 3, `[D38]`).
- Produtos financeiros (maquininha, crédito, seguro), veterinário, corporativo B2B2C, white label e API: fora do escopo até nova decisão `[D36]`.

---

## 4. Verticais atendidas

Regra estrutural: **o cadastro é por negócio, não por filial.** Um Cliente pode ter 1 filial de 1 negócio, N filiais do mesmo negócio, ou mais de um negócio. Uma filial não atende duas categorias diferentes. A vertical é atributo do negócio e define vocabulário, campos e regras padrão.

### 4.1 Verticais da v1.0 `[D02]`

**Cluster A — Beleza e estética.** Barbearia, salão, manicure e pedicure, sobrancelhas e cílios, maquiagem, depilação, bronzeamento, estética facial e corporal, micropigmentação, trancista, esmalteria.

**Cluster B — Saúde.** Odontologia, psicologia, nutrição, fisioterapia, fonoaudiologia, podologia, quiropraxia, terapia ocupacional.

Saúde traz três consequências que atravessam o documento inteiro: dado pessoal sensível (LGPD art. 11), restrição de publicidade e de divulgação de preço nos conselhos profissionais `[PEN-06]`, e recorrência por tratamento de N sessões em vez de serviço avulso.

**Limitação da v1.0 em saúde.** Com recurso compartilhado na fase 2 `[D08]` e sem a entidade do atendido `[D21]`, clínica com mais de um consultório não consegue representar a própria operação, e não é possível marcar consulta para dependente. Na prática, saúde na v1.0 atende profissional solo de sala única atendendo o próprio titular do cadastro. Ver `[C2]`.

### 4.2 Verticais de fases seguintes

| Fase | Clusters | O que exigem |
|---|---|---|
| Fase 2 | Pet (banho e tosa, adestramento) | Entidade do atendido, duração por porte + pelagem `[D29]`. Veterinário fica para depois |
| Fase 2 | Bem-estar e fitness (spa, massoterapia, yoga, pilates, personal) | Turma com N vagas, aula avulsa, pacote e plano mensal `[D30]` |
| Fase 3 | Automotivo (estética, lavagem, oficina) | Entidade veículo; local por serviço; orçamento opcional por serviço `[D40]` |
| Fase 3 | Casa e serviços técnicos (diarista, elétrica, dedetização) | Atendimento no endereço, rota do dia, raio `[PEN-27]`; deslocamento embutido no preço `[D40]` |
| Fase 3 | Educação e aulas | Aulas avulsas recorrentes, sem matrícula e sem reposição `[D41]` |
| Fase 3 | Eventos (fotógrafo, buffet, espaço) | Reserva por dia ou período com proposta, sinal do fornecedor, contrato aceito no app `[D42]` |
| Fora por ora | Corporativo B2B2C (medicina do trabalho, benefícios) | Contrato, elegibilidade, cota, faturamento por empresa `[D36]` |

### 4.3 Primitivas de agendamento

| Primitiva | Escopo | Verticais que exigem |
|---|---|---|
| Slot fixo 1:1 com profissional | **v1.0** | A, B |
| Combo sequencial, mesmo profissional | **v1.0** `[D19]` | A, B |
| Série recorrente completa | **v1.0** `[D18]` | A, B |
| Fila de espera e encaixe | **v1.0** `[D15]` | A, B |
| Pacote de N sessões com saldo | **v1.0** (exigido por saúde) `[PEN-07]` | B |
| Recurso compartilhado | Fase 2, **adiado** `[D08]` `[PEN-23]` | A, B, E |
| Combo com troca de profissional | Fase 2 `[D34]` | A |
| Duração variável por atributo | Fase 2 `[D29]` (pet: porte + pelagem) | Pet, automotivo |
| Turma com N vagas | Fase 2 `[D30]` | Bem-estar |
| Atendimento no endereço do cliente | Fase 3 `[D40]` | Automotivo, casa |
| Orçamento antes do agendamento | Fase 3, opcional por serviço `[D40]` | Automotivo, casa |
| Reserva por dia ou período com proposta | Fase 3 `[D42]` | Eventos |

---

## 5. Modelo de monetização

### 5.1 Precificação da v1.0 `[D13]`

**Assinatura mensal + taxa por agendamento**, cobradas desde o primeiro cliente. Isso exige, já na v1.0, cobrança recorrente, emissão de fatura, régua de inadimplência e suspensão por falta de pagamento.

Falta definir os valores, as faixas por número de colaboradores e filiais, a política para o prestador autônomo, e se a taxa por agendamento incide sobre todo agendamento ou apenas sobre o pago na plataforma. `[PEN-08]`

Falta definir também como a taxa é arrecadada: retida no split da transação ou cobrada à parte na fatura. São dois fluxos financeiros diferentes. `[PEN-09]`

### 5.2 Fontes de receita por fase

| Fonte | Mecânica | Fase |
|---|---|---|
| Assinatura SaaS | Plano por filial, faixas por colaborador | v1.0 `[D13]` |
| Taxa por agendamento | Valor fixo ou percentual por agendamento | v1.0 `[D13]` |
| Take rate no pagamento | Percentual sobre o transacionado no split | v1.0 `[D04]` |
| Taxa de horário ocioso | Cobrança sobre agendamento em slot que estava vago | v1.0 `[D15]` |
| Pacotes e vale-presente | Venda antecipada de serviço `[D33]` | Fase 2 |
| Plano mensal de aulas | Cobrança recorrente do aluno, com split `[D30]` | Fase 2 |
| Excedente de envios do CRM | Cota de e-mail e SMS no plano + cobrança por envio acima dela `[D32]` | Fase 2 |
| Antecipação de recebíveis | Taxa sobre o adiantamento, sob demanda, para estabelecimento e colaborador `[D38]` | Fase 3 |
| Visibilidade paga | Pacote fixo por período (ex.: 7 ou 30 dias) por bairro e categoria, em faixa separada `[D37]` | Fase 3 |
| Inteligência de mercado | Benchmark para os tenants no painel, não vendido a terceiros `[D39]` | Fase 3 |
| White label e API | Licença para redes e franquias | Fora por ora `[D36]` |
| Produtos financeiros | Maquininha, crédito, seguro | Fora por ora `[D36]` |

### 5.3 A tensão SaaS e marketplace

Resolvida pela `[D01]`: SaaS primeiro, o consumidor é do estabelecimento, vendemos ferramenta. Não há busca pública na v1.0 e a aquisição é B2B.

Revista pela `[D26]`: a vitrine com busca entra na fase 2, antes do resto do marketplace. Consequências: a Koovela passa a também atrair consumidor (aquisição B2B2C), a vitrine precisa de base mínima de estabelecimentos por região para não parecer vazia, e a mudança de papel LGPD descrita na seção 12 antecipa para a fase 2.

---

## 6. Modelo de domínio

```
IDENTIDADE GLOBAL  (fora do schema de tenant — ver [C5])
 ├── Consumidor (cadastro etapa 1 e 2, meio de pagamento)
 ├── Pessoa (colaborador como pessoa, independente de vínculo)
 └── Índice de agendamentos do consumidor entre tenants

POR TENANT  (schema próprio — [D06])
Tenant (Cliente / Negócio)
 ├── vertical (A ou B na v1.0)
 ├── Filial (1..N)  [D05]
 │    ├── HorarioFuncionamento
 │    ├── Colaborador↔Filial (vínculo, comissão, escala)
 │    └── Recurso  (fase 2 — [D08])
 ├── Servico / Procedimento (nome, duração, preço, vertical)
 ├── Combo (lista ordenada, mesmo profissional)
 ├── Pacote de sessões (N sessões, validade, saldo)
 ├── ProgramaFidelidade (pontos, tiers, catálogo, expiração)  [D09]
 ├── PoliticaNoShow (versionada por agendamento)
 ├── RegraHorarioOcioso (elegibilidade, desconto máximo)  [D15]
 └── Assinatura Koovela (plano, faturas, status)

Agendamento  ← entidade central
 ├── tenant, filial, serviço(s), colaborador
 ├── consumidor (referência à identidade global)
 ├── janela (início, fim, fuso)
 ├── série recorrente (quando aplicável)  [D18]
 ├── status (ver 10.1)
 ├── origem (link, QR, manual, recorrência, fila de espera)
 └── Pagamento → Split → Repasse → Comissao
                  ├── Estorno / Chargeback
                  └── NFS-e  [D20]

FilaEspera (consumidor, serviço, janela desejada)  [D15]
Avaliacao (vinculada a agendamento concluído)  [D16]
AnotacaoAtendimento (dado sensível, acesso restrito)  [D02]
Notificacao (push; ver [C1])
Auditoria (ator, ação, alvo, justificativa)

FASE 2
Atendido / service_subject (titular, tipo: menor | adulto dependente | pet)  [D28]
 └── Pet (espécie, raça, porte, pelagem, cuidados)  [D29]
RegraDuracao (serviço, base por porte, acréscimo por pelagem)  [D29]
Turma (sala, instrutor, capacidade N, horário)  [D30]
 ├── Inscrição (aluno, origem: avulsa | pacote | plano)
 └── CheckIn (QR | instrutor)
PlanoAulas (recorrente mensal) · PacoteAulas (saldo, validade)  [D30]
ValePresente (comprador, destinatário, filial, saldo, validade, reembolso)  [D33]
Campanha (segmento, canais push | e-mail | SMS, oferta) · CotaEnvio (tenant, mês)  [D32]
ComboEtapa (serviço, profissionais possíveis, intervalo até 15 min)  [D34]

FASE 4
MediaAsset (tenant, dono: negócio | filial | serviço | colaborador, tipo: logo | capa | galeria |
            foto_servico | antes_depois | video, status de moderação, ordem, texto alternativo)  [D44] [D45]
 ├── Variante (tamanho, formato, URL assinada quando privada)
 ├── ConsentimentoImagem (pessoa retratada, escopo, data, revogação)  [PEN-34]
 └── Denuncia (autor, motivo, decisão da Gestão)  [D46]
```

> Desde a v1.0, negócio, filial, serviço e colaborador já reservam a referência opcional à mídia (sem interface), para que a fase 4 não exija migração destrutiva.

### 6.1 Invariantes do domínio

Devem virar teste automatizado no CI:

1. Um colaborador não pode ter dois agendamentos sobrepostos na mesma filial.
2. A soma dos splits de um pagamento é igual ao valor líquido da transação.
3. Nenhuma consulta retorna dado de outro tenant.
4. Saldo de pontos e de pacote nunca fica negativo.
5. Agendamento concluído não é excluído, apenas estornado ou cancelado com registro.
6. Alteração de uma ocorrência de série não altera as demais, salvo comando explícito.

---

## 7. Matriz de permissões

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte | Fin/Ops | SRE |
|---|---|---|---|---|---|---|---|---|
| Agendar | ✔ | — | ✔ | ✔ | ✔ | ✔* | — | — |
| Ver própria agenda | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* | — | — |
| Ver agenda de terceiros | — | — | ✔ filial | ✔ filial | ✔ rede | ✔* | — | — |
| Cancelar e remarcar | ✔ próprio | ✔ próprio | ✔ | ✔ | ✔ | ✔* | — | — |
| Ver anotação de atendimento | ✔ própria | ✔ própria | — | `[PEN-10]` | `[PEN-10]` | — | — | ✖ |
| Cadastrar serviço e preço | — | — | — | ✔ | ✔ | — | — | — |
| Ver faturamento da filial | — | — | — | ✔ | ✔ | — | ✔ | — |
| Ver faturamento da rede | — | — | — | — | ✔ | — | ✔ | — |
| Ver e alterar comissão | — | ✔ leitura própria | — | ✔ | ✔ | — | ✔ | — |
| Emitir NFS-e | — | — | ✔ | ✔ | ✔ | — | ✔ | — |
| Configurar fidelidade | — | — | — | `[PEN-03]` | ✔ | — | — | — |
| Conceder desconto | — | — | — | ✔ limite | ✔ | — | ✔ | — |
| Responder avaliação | — | ✔ própria | — | ✔ | ✔ | — | — | — |
| Impersonar tenant | — | — | — | — | — | ✔ auditado | — | ✔ auditado |
| Alterar feature flag | — | — | — | — | — | — | — | ✔ |
| Provisionar schema | — | — | — | — | — | — | — | ✔ |

`✔*` = apenas em sessão de impersonation registrada, justificada e com expiração.

---

## 8. Jornadas principais

**J1 — Primeiro agendamento.** Link ou QR do estabelecimento → instalação do app → cadastro etapa 1 com OTP → página do estabelecimento → serviço → profissional → horário → política de cancelamento → cadastro etapa 2 → pagamento ou sinal → confirmação → lembrete → atendimento → avaliação → pontos creditados.

**J2 — Horário ocioso vira receita.** Vaga detectada → regra de elegibilidade e desconto do tenant → oferta disparada para fila de espera e consumidores elegíveis → agendamento → cobrança da taxa de ocioso.

**J3 — Onboarding do autônomo.** Conta e negócio → vertical → serviços e preços → horário de trabalho → recebedor e KYC → link e QR prontos.

**J4 — Onboarding da rede.** Conta e negócio → filiais → serviços padronizados → colaboradores por filial → regras de comissão → recebedor por filial `[PEN-11]` → certificado para NFS-e.

**J5 — Série recorrente.** Definição da série → materialização de N ocorrências `[PEN-12]` → tratamento de feriado e bloqueio → alteração de uma ocorrência ou da série → encerramento.

**J6 — No-show.** Política vigente no momento do agendamento → falta ou cancelamento tardio → aplicação automática da multa `[PEN-13]` → comunicação → reposição do slot via J2.

**J7 — Fechamento financeiro.** Atendimentos concluídos → comissão conforme regra e conforme a opção de absorção de desconto do tenant `[D17]` → split → repasse `[PEN-14]` → NFS-e → conciliação.

**J8 — Fidelidade.** Regra, tiers e catálogo definidos pelo tenant → simulação de custo → acúmulo por atendimento pago → subida de tier → resgate no checkout → medição de custo contra receita incremental.

**J9 — Suporte com impersonation.** Chamado → solicitação com justificativa → sessão temporária e logada, visível ao tenant → correção → encerramento.

---

## 9. Mapa de telas

Enumeração completa da v1.0: **68 telas** (a seção 9.3 tinha 27 itens, e não 26; o total da v0.3 dizia 67). Com a versão desktop `[D27]` (seções 9.8 e 9.9) e a fase 2 (seção 9.10), o protótipo soma **110 telas**; com a fase 3 (seção 9.11), **129 telas**. Cada tela está no Figma com o código da seção (ex.: 9.1.8).

### 9.1 App do Consumidor, iOS e Android — 18 telas
Abertura e instalação · Login e cadastro etapa 1 com OTP · Meus agendamentos (home, sem busca) · Página do estabelecimento via deep link · Detalhe do serviço ou procedimento · Escolha de profissional · Data e horário · Resumo e política de cancelamento · Cadastro etapa 2 · Meio de pagamento · Checkout e sinal · Confirmação · Remarcar e cancelar · Minhas séries recorrentes · Fidelidade: pontos, tier e catálogo · Avaliação pós-atendimento · Fila de espera e aviso de vaga · Perfil e notificações

### 9.2 Onboarding do tenant — 5 telas
Conta e negócio com vertical · Filiais · Serviços e preços · Horários e colaboradores · Recebedor, KYC e certificado de NFS-e

### 9.3 Painel do Cliente — 27 telas
Dashboard da filial · Dashboard consolidado da rede · Agenda do dia · Agenda da semana por colaborador · Novo agendamento manual · Gestão de séries recorrentes · Fila de espera e encaixe · Regra de horário ocioso · Ficha do consumidor ou paciente · Anotações de atendimento · Base de consumidores · Serviços e preços · Combos · Pacotes de sessões · Colaboradores · Regras de comissão · Escalas, folgas e bloqueios · Horário de funcionamento · Política de no-show · Fidelidade: regra, tiers, catálogo e simulador · Financeiro: recebimentos e split · Repasses ao colaborador · NFS-e: emissão e histórico · Avaliações e respostas · Filiais: criar e clonar · Configurações, link e QR · Assinatura Koovela e faturas

### 9.4 App do Colaborador — 5 telas
Agenda do dia · Detalhe com check-in e check-out · Comissões · Folgas e trocas · Perfil e portfólio

### 9.5 Back-office da Gestão — 10 telas
Visão geral da plataforma · Tenants · Provisionamento e migração de schema · Onboarding e KYC · Impersonation · Concessões · Planos, cobrança e inadimplência · Antifraude, estornos e chargebacks · Feature flags · Trilha de auditoria

### 9.6 Painéis de BI em Python — 3 telas `[D25]`
Painel operacional · Painel financeiro · Painel de coorte e retenção

### 9.7 Fora da v1.0
Desenhados na fase 2 (seção 9.10): vitrine e busca · dependentes e pets · campanhas de CRM. Ainda sem tela: recursos e salas (adiado, `[PEN-23]`) · veículos (fase 3) · favoritos · antecipação de recebíveis · portabilidade entre tenants do colaborador.

### 9.8 Web do Consumidor (desktop) — 17 telas `[D27]`
Chegada pelo link ou QR · Entrar e cadastro etapa 1 (OTP) · Meus agendamentos · Página do estabelecimento · Detalhe do serviço (janela) · Escolha de profissional · Data e horário · Resumo e política · Cadastro etapa 2 · Meio de pagamento e checkout Pix (uma página só) · Confirmação · Remarcar e cancelar (janela) · Minhas séries · Fidelidade · Avaliação (janela) · Fila de espera · Perfil e notificações

### 9.9 Colaborador (desktop) — 5 telas
Agenda do dia · Atendimento com check-in e check-out · Comissões · Folgas e trocas · Perfil e portfólio

### 9.10 Fase 2 — 23 telas
- **Vitrine `[D26]`, 6 telas.** App: home vitrine (nova aba "Início") · resultados da busca · agendamento simplificado em uma tela. Desktop: home vitrine · resultados com filtros e mapa · agendamento simplificado.
- **App do consumidor, 6 telas.** Para quem eu agendo (dependentes e pets) · cadastro do pet · agendar para quem · turmas do estúdio · comprar vale-presente · combo com troca de profissional.
- **Web do consumidor, 2 telas.** Turmas e planos · vale-presente.
- **Painel do Cliente, 6 telas.** Turmas: grade e capacidade · planos e pacotes de aulas · campanhas (CRM) · vale-presente e pacotes vendidos · ficha do pet · configuração do combo com troca.
- **Colaborador, 2 telas.** Agendas de vários negócios · check-in da turma.
- **Back-office, 1 tela.** Cota de envios do CRM por tenant.

### 9.11 Fase 3 — 19 telas
- **App do consumidor, 7 telas.** Vitrine com faixa de destaques · favoritos · pedir orçamento · orçamento recebido e agendamento no endereço · evento: pedir proposta · evento: proposta, contrato e sinal · aulas avulsas recorrentes.
- **Web do consumidor, 2 telas.** Resultados com faixa de destaques · proposta de evento e contrato.
- **Painel do Cliente, 6 telas.** Destaque na vitrine · antecipação de recebíveis · inteligência de mercado · orçamentos recebidos · eventos (datas, propostas e contratos) · onde cada serviço é feito.
- **Colaborador, 2 telas.** Antecipar comissão · rota do dia no endereço.
- **Parceiro e back-office, 2 telas.** Portal do parceiro indicador · parceiros e inventário de destaques.

### 9.12 Fase 4 — telas a desenhar `[D44]`
Ainda não estão no protótipo. Previstas:
- **Painel do Cliente.** Biblioteca de mídia do negócio · logo e capa (negócio e filial) · galeria do espaço por filial · fotos do serviço (no cadastro do serviço) · antes e depois com consentimento · status de moderação.
- **Consumidor (app e web).** Página do estabelecimento com capa e galeria · detalhe do serviço com fotos · vitrine com imagem nos cartões · denunciar imagem.
- **Colaborador.** Portfólio com antes e depois.
- **Back-office.** Fila de denúncias e moderação · limites de armazenamento por plano.

---

## 10. Regras de negócio críticas

### 10.1 Ciclo de vida do agendamento
`RASCUNHO → PENDENTE_PAGAMENTO → CONFIRMADO → EM_ATENDIMENTO → CONCLUIDO`
Ramos: `CANCELADO_USUARIO`, `CANCELADO_ESTABELECIMENTO`, `NO_SHOW`, `REAGENDADO`, `EXPIRADO`.
Toda transição é evento publicado e registrado com ator e horário.

### 10.2 Prevenção de reserva dupla
Verificação de disponibilidade não é garantia. A reserva exige lock distribuído por `(colaborador, janela)` e constraint no banco como última linha de defesa. Na v1.0 não há lock por recurso, já que recurso é fase 2 `[D08]`. É a falha mais cara do produto: quebra a confiança dos dois lados de uma vez.

### 10.3 Política de cancelamento e no-show
Configurável por tenant: janela de cancelamento gratuito, percentual de multa, exigência de sinal e exceções. A regra vigente é a do momento do agendamento, por isso é versionada. Falta definir se o sinal é obrigatório, opcional por serviço, ou exigido apenas de consumidor novo `[PEN-15]`, e como a multa é efetivada `[PEN-13]`.

### 10.4 Comissão
Base de cálculo configurável, percentual por serviço ou por colaborador, piso e teto. Pela `[D17]`, cada tenant escolhe se a comissão incide sobre o valor cheio ou sobre o valor com desconto, o que exige que a tela de regra explique a consequência: comissão sobre valor com desconto cria incentivo do colaborador contra a promoção do próprio estabelecimento.

### 10.5 Fidelidade com pontos e tiers `[D09]`
Regra de acúmulo, níveis com critério de subida e de queda, catálogo de recompensas, expiração de pontos e teto de custo mensal. O simulador é obrigatório antes de ativar, e o painel compara custo do benefício com receita incremental atribuída. Falta definir a mecânica concreta `[PEN-16]` e se o saldo é por filial ou por negócio na operação multi-filial `[PEN-17]`.

### 10.6 Horário ocioso `[D15]`
Critério de elegibilidade do consumidor, desconto máximo permitido, antecedência mínima e limite de ofertas por consumidor. Falta definir esses parâmetros `[PEN-18]`.

### 10.7 Avaliações `[D16]`
Só de agendamento concluído. Falta definir se são públicas na página do estabelecimento ou privadas para o tenant, quem modera e qual o prazo de direito de resposta `[PEN-19]`.

### 10.8 Propriedade do dado do consumidor
Pela `[D23]`, a Koovela retém. Ver `[C4]`: colide com portabilidade sob LGPD e com o fato de o tenant ser controlador dos dados dos próprios clientes e pacientes.

---

## 11. Plataforma e arquitetura

### 11.1 Infraestrutura

**Dev.** macOS Intel (x86_64), Docker e Docker Compose, GitHub Spec Kit, repositório privado.

**Produção.** OCI, Ubuntu 24.04, Ampere ARM64:

| Host | IP privado | IP público | Papel |
|---|---|---|---|
| `db-worker-01` | 10.0.1.127 | — | MySQL, RabbitMQ, Redis, workers, BI |
| `app-prod-01` | 10.0.0.3 | 163.176.212.65 | Reverse proxy, gateway, serviços de aplicação |

**Build** `[D22]`. GitHub Actions compilando para `linux/arm64`, publicação no GHCR, deploy por pull. Nunca construir imagem de produção no Mac. Exige staging em ARM na OCI antes do primeiro cliente real, e versões fixas de imagem base, sem `latest`. Dependências nativas de Node e Python precisam ser verificadas em ARM64 no começo do projeto.

**Rede.** `db-worker-01` sem rota pública, porta 3306 nunca sai da VCN, acesso administrativo por bastion ou Cloudflare Tunnel. Security lists e NSG tratados como código.

**Capacidade.** Dois hosts, sem réplica e sem orquestrador, para `[D14]` microsserviços e `[D06]` schema por tenant mais réplica de leitura para BI. Ver `[C3]` e `[PEN-20]`.

### 11.2 Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Banco | MySQL 8 | InnoDB, `utf8mb4`, UTC, um schema por tenant `[D06]` |
| Backend | TypeScript sobre Node.js | Tipagem é controle de risco em domínio financeiro e de agenda |
| Arquitetura | Microsserviços `[D14]` | Gateway, contratos versionados, deploy independente |
| Frontend | React | Vite, TanStack Query, tokens compartilhados |
| Mobile | React Native `[D03]` | iOS e Android, push nativo, publicação em duas lojas |
| Eventos | RabbitMQ | Outbox, DLQ obrigatória, idempotência em todo consumidor |
| Cache e lock | Redis | Lock distribuído contra reserva dupla, cache de disponibilidade |
| BI | Python `[D25]` | Réplica de leitura ou cópia analítica, nunca o transacional |
| Proxy e TLS | Traefik ou Nginx + Cloudflare | Certificados Cloudflare, HSTS, WAF, rate limit |

### 11.3 Serviços previstos `[D14]`

Identidade e autenticação · Catálogo (serviços, combos, pacotes) · Agenda e agendamento · Pagamento e split · Fidelidade · Notificação · Fiscal (NFS-e) · Gateway. Mais o provisionador de schemas e os pipelines de BI.

Fronteira de dados: cada serviço é dono exclusivo das próprias tabelas, nenhum outro lê ou escreve diretamente nelas, e não há join entre domínios. `[PEN-20]` trata do custo operacional dessa topologia na infraestrutura declarada.

### 11.4 Dados e criptografia

Criptografia por campo, não por tabela: CPF, telefone, e-mail, data de nascimento, endereço, dados bancários, anotações de atendimento. Envelope com chave fora do banco e busca por hash determinístico (HMAC) quando houver necessidade de lookup. Dado criptografado não é indexável por `LIKE`.

**Fuso.** UTC no banco, conversão na borda, `America/Sao_Paulo` como padrão. Fronteiras de internacionalização preservadas, sem implementação `[D11]`.

### 11.5 Configuração e segredos

`.env` por ambiente, abstraído no `.gitignore`, com `.env.example` versionado contendo todas as chaves vazias. Em produção, migrar para Docker secrets ou OCI Vault. Nunca logar variável de ambiente. Rotação de segredos na saída de qualquer pessoa.

### 11.6 Integrações externas

PSP com split e KYC `[D07]` · Push iOS e Android · NFS-e municipal, começando por São Paulo `[D20]`, com a questão de quem é o emitente `[PEN-21]` · Cobrança da própria assinatura `[PEN-09]`.

### 11.7 Operação

Logs estruturados em JSON com `tenant_id` e `request_id` · Prometheus e Grafana · Sentry · Healthchecks e alerta de fila crescendo · CI/CD no GitHub Actions com migrações versionadas e reversíveis, aplicadas a todos os schemas · Backup com dump diário, binlog para PITR, cópia fora da OCI e teste de restauração mensal registrado.

---

## 12. Segurança, privacidade e conformidade

- **Papéis LGPD.** O Cliente é controlador dos dados dos seus consumidores e pacientes; a Koovela é operadora. Com a vitrine na fase 2 `[D26]`, a Koovela passa a ser também controladora dos dados de quem chega pela busca, o que muda a base legal e exige política de privacidade revista **antes da fase 2**.
- **Dependentes e pets** `[D28]`. Dados de menores e de adultos dependentes ficam no cadastro do titular; o estabelecimento vê só o necessário para o atendimento. Dado de menor pede consentimento do responsável (LGPD art. 14).
- **Campanhas** `[D32]`. E-mail e SMS só com opt-in e descadastro em um clique.
- **Dado sensível** `[D02]`. Saúde exige base legal específica, consentimento destacado, criptografia, segregação de acesso e retenção própria. A retenção de anotação de atendimento ainda não está definida `[PEN-05]`.
- **Minimização.** O cadastro etapa 1 existe para não coletar o que não é necessário para agendar.
- **Direitos do titular.** Acesso, correção, portabilidade e eliminação, com o conflito conhecido entre eliminação e guarda fiscal de cinco anos. A `[D23]` precisa ser compatibilizada com portabilidade, ver `[C4]`.
- **Segurança aplicada.** MFA para Gestão e Proprietário, rate limit no OTP, proteção contra enumeração de telefone, menor privilégio no banco, sem PII em log.
- **Antifraude.** Agendamento em massa, cartão testado no checkout, abuso de cupom e de pontos, conluio entre colaborador e consumidor, chargeback.
- **Regulação setorial.** Publicidade e divulgação de preço nos conselhos de saúde `[PEN-06]`. A Koovela intermedeia e não executa o serviço, e isso precisa estar claro nos termos de uso.
- **Lojas de aplicativo** `[D03]`. Política de privacidade publicada, declaração de coleta de dados, exclusão de conta dentro do app e, se houver login social, Sign in with Apple obrigatório.

---

## 13. Requisitos não funcionais

| Dimensão | Alvo |
|---|---|
| Disponibilidade | 99,5% mensal, com janela de manutenção declarada |
| Latência | p95 abaixo de 500 ms na consulta de disponibilidade |
| Consistência de agenda | Zero reserva dupla. É invariante, não meta |
| Mobile | Funciona em 3G; agenda do colaborador legível offline |
| Escala inicial | 500 tenants, 2.000 colaboradores, 50 mil agendamentos/mês |
| Provisionamento | Novo tenant com schema pronto em menos de 2 minutos |
| Migração | Migração aplicada a todos os schemas sem indisponibilidade |
| Acessibilidade | WCAG 2.1 AA nas telas de agendamento |
| Auditoria | 100% das ações de Gestão e financeiras registradas |
| RPO / RTO | RPO 1 hora, RTO 4 horas |

---

## 14. Métricas

**North Star:** atendimentos concluídos e pagos por mês.

| Camada | Métrica |
|---|---|
| Aquisição | Tenants ativados/mês; CAC por canal |
| Ativação | % de tenants com primeiro agendamento em 7 dias; taxa de instalação do app pelo consumidor |
| Engajamento | Ocupação da agenda; agendamentos por tenant ativo |
| Qualidade | No-show; avaliação média; incidentes de reserva dupla |
| Retenção | Recompra do consumidor em 90 dias; churn de tenant; NRR |
| Monetização | GMV; take rate efetivo; ARPA; margem por tenant |
| Operação | MTTR; custo de infra por tenant; falhas de migração por release |

A taxa de instalação do app é a métrica mais crítica da v1.0, porque dela dependem o lembrete, o no-show e a jornada inteira do consumidor `[D03]`, `[C1]`. Com a web do consumidor `[D27]`, medir também a parcela de agendamentos feitos pelo navegador e quantos desses consumidores instalam o app depois.

Fase 2: ocupação das turmas, conversão de plano mensal, uso do saldo de vale-presente e pacotes, reagendamentos atribuídos a campanhas e conversão da vitrine (busca → agendamento).

---

## 15. Fases de entrega

**v1.0 (o que está decidido).** Tudo o que este documento especifica: beleza e saúde, multi-filial, app nativo e web do consumidor `[D27]`, Pix e cartão com split, fidelidade com tiers, série recorrente, fila de espera e horário ocioso, avaliações, NFS-e, BI, microsserviços e schema por tenant. 68 telas de app e painel + 22 telas desktop (consumidor e colaborador), 4 builds de cliente, 8 serviços. A web do consumidor aumenta a estimativa de 12 a 18 meses para um desenvolvedor; recalcular.

**Fatia zero sugerida, dentro da v1.0.** Para validar com cliente real em 8 a 12 semanas sem abrir mão de nenhuma decisão: beleza apenas, autônomo e filial única, agenda com combo, cadastro em duas etapas, Pix como sinal, push com e-mail de apoio e três indicadores. Tudo o mais permanece decidido e documentado, aguardando sua vez. `[PEN-22]`

**Fase 2.** Sai em todas as plataformas `[D35]`: app e web do consumidor, Painel do Cliente, colaborador e back-office.
- Vitrine com busca e verticais `[D26]`.
- Entidade do atendido: menor, adulto dependente e pet; o titular paga e pontua `[D28]`.
- Pet: banho, tosa e adestramento, com duração por porte + pelagem `[D29]`.
- Bem-estar com turma: avulsa, pacote e plano mensal; sem fila; check-in por QR e por lista `[D30]`.
- Colaborador em vários negócios, com agendas separadas `[D31]`.
- CRM e campanhas por push, e-mail e SMS, com cota no plano + excedente `[D32]`.
- Pacotes e vale-presente `[D33]`.
- Combo com troca de profissional `[D34]`.
- Recurso compartilhado: adiado, sem fase definida `[PEN-23]`.

**Fase 3** `[D36]`.
- Destaque pago na vitrine: pacote fixo por período, em faixa separada `[D37]`.
- Antecipação de recebíveis sob demanda, para estabelecimento e colaborador `[D38]`.
- Inteligência de mercado: benchmark para os tenants no painel `[D39]`.
- Automotivo e casa: local por serviço, deslocamento embutido, orçamento opcional `[D40]`.
- Educação: aulas avulsas recorrentes, sem reposição `[D41]`.
- Eventos: proposta, sinal do fornecedor e contrato aceito no app `[D42]`.
- Parceiros indicadores, com valor fixo por tenant ativado `[D43]`.
- Favoritos.

**Fase 4** `[D44]`. Imagens dos tenants em todas as plataformas:
- Logo e capa do negócio e da filial, galeria do espaço, foto por serviço `[D45]`.
- Antes e depois e vídeo, com consentimento da pessoa retratada `[D45]` `[PEN-32]` `[PEN-34]`.
- Moderação automática na publicação, revisão da Gestão sob denúncia `[D46]`.
- Limites de armazenamento por plano `[PEN-33]`.

**Fora por ora.** Produtos financeiros, veterinário, corporativo B2B2C, white label e API, portabilidade do colaborador. Recurso compartilhado segue adiado `[PEN-23]`.

---

## 16. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| Escopo de 12 a 18 meses sem validação de mercado | **Crítica** | Fatia zero da seção 15 |
| Microsserviços e schema por tenant em dois hosts com um desenvolvedor | **Crítica** | Ver `[C3]` e `[PEN-20]` |
| Consumidor não instalar o app, derrubando a jornada inteira | Alta | Medir taxa de instalação desde o primeiro tenant; ver `[C1]` |
| Lembrete só por push não alcançar consumidor novo | Alta | Ver `[C1]` |
| Retenção de dados colidindo com LGPD | Alta | Ver `[C4]` |
| Vazamento de dado de saúde | Alta | Criptografia por campo, segregação, auditoria |
| Dependência do PSP | Alta | Interface `PaymentProvider` com SDK isolado em adaptador |
| Reserva dupla | Alta | Lock, constraint e teste de invariante no CI |
| Saúde na v1.0 sem recurso e sem dependente, excluindo clínica | Média | Ver `[C2]` |
| Dois hosts sem redundância | Média | Backup testado, janela declarada, réplica na fase 2 |
| Fraude e abuso de pontos | Média | Teto de custo, expiração, auditoria de resgate |
| Colaborador marcado em dois negócios no mesmo horário | Média | Aviso de choque no app do colaborador; ver `[C6]` |
| Vitrine vazia em regiões com poucos estabelecimentos | Média | Abrir a vitrine por bairro só com base mínima de tenants |
| Vitrine e página do estabelecimento sem imagem até a fase 4, reduzindo conversão | Alta | Cartões e páginas desenhados para funcionar sem foto (iniciais, cor da vertical); medir conversão para rever a fase `[D44]` |
| Imagem imprópria, de terceiro sem autorização ou de paciente exposto | Alta | Moderação automática, consentimento registrado, denúncia com prazo `[D46]` `[PEN-34]` |
| Custo de armazenamento e banda de imagem e vídeo | Média | Limite por plano, compressão e variantes, CDN `[PEN-33]` |
| Custo de SMS e e-mail acima da cota | Baixa | Cota por plano, excedente faturado, alerta de consumo `[D32]` |
| Concorrência estabelecida (Fresha, Booksy, Trinks, Belle, Doctoralia) | Média | Vertical e região específicas; competir por no-show e split |

---

## 17. Decisões tomadas

As 25 decisões estão registradas, com justificativa e consequência, em `koovela-escopo-mvp-e-decisoes.md` v0.2, seção 1: `[D01]` SaaS primeiro · `[D02]` beleza e saúde · `[D03]` app nativo · `[D04]` Pix e cartão com split · `[D05]` multi-filial · `[D06]` schema por tenant · `[D07]` PSP a comparar · `[D08]` recurso na fase 2 · `[D09]` pontos e tiers · `[D10]` só push · `[D11]` Brasil e São Paulo · `[D12]` marca Koovela · `[D13]` assinatura e taxa por agendamento · `[D14]` microsserviços · `[D15]` horário ocioso na v1.0 · `[D16]` avaliações na v1.0 · `[D17]` absorção configurável · `[D18]` série recorrente · `[D19]` combo mesmo profissional · `[D20]` NFS-e na v1.0 · `[D21]` atendido na fase 2 · `[D22]` build no GitHub Actions · `[D23]` Koovela retém o dado · `[D24]` marca única · `[D25]` BI em Python.

Revistas em 23/11/2026: `[D01]` passa a ter a vitrine na fase 2 (ver D26) · `[D03]` deixa de ser só app nativo (ver D27) · `[D10]` continua valendo para notificações transacionais, mas campanhas usam também e-mail e SMS (ver D32) · `[D19]` ganha a variante com troca de profissional na fase 2 (ver D34).

### 17.1 Decisões de 23/11/2026 (revisão do protótipo)

| # | Decisão | Consequência |
|---|---|---|
| **D26** | Vitrine com busca e segmentação por vertical entra na **fase 2** (antes fase 3) | Aquisição passa a ser também B2C; Koovela vira controladora LGPD na fase 2; exige ranking, geolocalização e base mínima por região |
| **D27** | Consumidor ganha **versão web** com agendamento pelo navegador, além do app | 4º build de cliente; no navegador não há push, o que agrava `[C1]` para quem agenda pela web |
| **D28** | Atendidos: filho ou menor, idoso ou adulto dependente e pet. O **titular paga e acumula os pontos** de todos | Dados de menores sob LGPD art. 14; fluxo de agendamento ganha o passo "para quem" |
| **D29** | Vertical pet na fase 2 = **banho, tosa e adestramento**, sem veterinário. Duração varia por **porte + pelagem** | Regra de duração por serviço: base por porte + acréscimo por pelagem; sem dado clínico animal |
| **D30** | Turmas: venda **avulsa, pacote e plano mensal recorrente**; turma lotada **sem fila**; check-in por **QR e lista do instrutor** | Cobrança recorrente do aluno com split; presença desconta do plano ou do pacote |
| **D31** | Colaborador em vários negócios: **agendas separadas** por negócio, juntas só na visão dele, **sem bloqueio automático** de conflito | Risco de marcação dupla entre negócios, ver `[C6]`; app avisa sobreposição |
| **D32** | Campanhas de CRM por **push, e-mail e SMS** (WhatsApp fora). Custo: **cota no plano + excedente** por envio | Revê a `[D10]` para campanhas; precisa de provedor de e-mail e SMS, opt-in e descadastro |
| **D33** | Vale-presente e pacotes: **qualquer pessoa compra para presentear**; vale **só na filial da compra**; **reembolso em 7 dias sem uso** | Saldo por filial; momento da NFS-e a definir `[PEN-24]` |
| **D34** | Combo com troca de profissional: o **sistema sugere a sequência e o cliente ajusta**; **intervalo até 15 min** definido no combo | Lock simultâneo em todos os profissionais da sequência |
| **D35** | Fase 2 sai em **todas as plataformas**: app e web do consumidor, Painel do Cliente, colaborador e back-office | Escopo da fase 2 cresce; avaliar entrega por plataforma |

### 17.2 Decisões de 23/11/2026 (fase 3)

| # | Decisão | Consequência |
|---|---|---|
| **D36** | Escopo da fase 3: destaque pago, antecipação, benchmark, automotivo, casa, educação, eventos, parceiros indicadores e favoritos, em todas as plataformas. **Fora por ora:** produtos financeiros, veterinário, corporativo B2B2C, white label e API, portabilidade do colaborador | Reduz a fase 3; itens fora ficam sem fase até nova decisão |
| **D37** | Destaque pago na vitrine por **pacote fixo de período**, mostrado numa **faixa separada** e identificada como patrocinada | Inventário limitado por bairro e categoria; a lista orgânica não muda de ordem |
| **D38** | Antecipação de recebíveis **sob demanda**, para o **estabelecimento e o colaborador** (sobre a própria comissão) | Depende de parceiro financeiro e de enquadramento regulatório `[PEN-28]` |
| **D39** | Inteligência de mercado: benchmark **só para os tenants, no painel**, não vendido a terceiros | Recorte mínimo de estabelecimentos por região para anonimizar |
| **D40** | Automotivo e casa: cada serviço define se é **no endereço do cliente ou no estabelecimento**; **deslocamento embutido no preço**; **orçamento opcional por serviço** (com fotos) | Raio de atendimento `[PEN-27]`; rota do dia para o colaborador |
| **D41** | Educação: **aulas avulsas recorrentes** (série, sem matrícula), **sem reposição** — falta segue a política de no-show | Reaproveita a série recorrente `[D18]` |
| **D42** | Eventos: reserva por dia ou período **com proposta**; **sinal definido por cada fornecedor**; **contrato aceito no app** | Pré-reserva da data; validade jurídica do aceite `[PEN-29]` |
| **D43** | Parceiros indicadores recebem **valor fixo por tenant ativado** | Definir valor e critério de "ativado" `[PEN-30]` |

---

## 18. Decisões pendentes

### 17.3 Decisões de 24/11/2026 (imagens)

| # | Decisão | Consequência |
|---|---|---|
| **D44** | Imagens enviadas pelos tenants entram **todas na fase 4**. Até lá, nenhuma superfície exibe imagem do tenant | Vitrine (fase 2) e página do estabelecimento (v1.0) sem foto; layouts precisam funcionar sem imagem. Ver `[C7]` |
| **D45** | Tipos suportados: **logo e capa**, **galeria do espaço**, **foto por serviço**, **antes e depois e vídeo** | Antes e depois em saúde é dado sensível e sujeito aos conselhos `[PEN-06]` `[PEN-32]`; pessoa retratada exige consentimento `[PEN-34]` |
| **D46** | Moderação **automática** na publicação; a Gestão revisa **só o que for denunciado** | Provedor de moderação automática; fila de denúncias no back-office; prazo de resposta a definir |

### 18.1 Pendências abertas

| # | Pendência | Bloqueia |
|---|---|---|
| **PEN-01** | Paleta funcional e neutros: **proposta no protótipo (seção 1.2), aguardando validação**. Faltam os estados de componente | Design system |
| **PEN-02** | Qual dos dois negócios fica com o nome Koovela | Domínio, SEO, mídia paga |
| **PEN-03** | O Gerente de filial vê faturamento e configura fidelidade da própria filial? | RBAC, telas 24 e 42 |
| **PEN-04** | O colaborador pode atender em mais de uma filial do mesmo negócio? | Modelo de vínculo, motor de agenda |
| **PEN-05** | Anotação de atendimento: existe na v1.0, quem acessa e por quanto tempo é retida? | LGPD, RBAC, tela de anotações |
| **PEN-06** | Como tratar divulgação de preço e publicidade nas verticais de saúde | Página do estabelecimento, termos de uso |
| **PEN-07** | Pacote de N sessões entra na v1.0? Saúde praticamente exige. (A venda para terceiros e as regras de reembolso ficaram na fase 2, `[D33]`) | Catálogo, fidelidade, financeiro |
| **PEN-08** | Valores da assinatura, faixas por porte e política para o autônomo | Monetização, tela de planos |
| **PEN-09** | A taxa por agendamento é retida no split ou cobrada na fatura? | Fluxo financeiro, conciliação |
| **PEN-10** | Quem acessa anotação de atendimento: Gerente, Proprietário, ambos? | RBAC |
| **PEN-11** | Recebedor do split é por negócio ou por filial? | Onboarding, KYC, repasse |
| **PEN-12** | Quantas ocorrências de série são materializadas à frente? | Motor de agenda, volume de dados |
| **PEN-13** | A multa de no-show é retida do sinal, cobrada no cartão salvo ou perdida? | Pagamento, política, suporte |
| **PEN-14** | Comissão na v1.0: só cálculo e prévia, ou repasse automático via split? | Financeiro, app do colaborador |
| **PEN-15** | Sinal é obrigatório, opcional por serviço ou exigido só de consumidor novo? | Checkout, conversão, no-show |
| **PEN-16** | Mecânica concreta de pontos: acúmulo, critério de tier, expiração, teto de custo | Motor de fidelidade, simulador |
| **PEN-17** | Saldo de pontos é por filial ou por negócio? | Fidelidade em rede multi-filial |
| **PEN-18** | Parâmetros do horário ocioso: elegibilidade, desconto máximo, antecedência, limite por consumidor | Motor de oferta |
| **PEN-19** | Avaliações são públicas ou privadas, quem modera, qual o prazo de resposta | Página do estabelecimento, moderação |
| **PEN-20** | Infraestrutura para microsserviços e schema por tenant: orquestrador e número de hosts | Custo fixo, deploy, operação |
| **PEN-21** | NFS-e: emitente é o tenant com certificado próprio ou a Koovela? | Integração fiscal, onboarding |
| **PEN-23** | Recurso compartilhado (sala, cadeira, equipamento): **adiado**. Falta decidir quais recursos existem, se o recurso é obrigatório em todo agendamento e em qual fase entra | Clínicas com mais de um consultório `[C2]`, motor de agenda |
| **PEN-24** | Vale-presente e pacotes: a NFS-e sai na venda ou no uso do serviço? (O protótipo assume no uso) | Fiscal, financeiro |
| **PEN-25** | Lembrete de quem agenda pela web: qual canal substitui o push no navegador? | `[C1]`, `[D27]`, no-show |
| **PEN-26** | Vitrine: critério de ordenação dos resultados e base mínima de estabelecimentos para abrir uma região | Vitrine `[D26]`, visibilidade paga (fase 3) |
| **PEN-27** | Atendimento no endereço: como o estabelecimento define até onde atende (raio em km, bairros, tempo de deslocamento)? | `[D40]`, busca, rota do dia |
| **PEN-28** | Antecipação: qual parceiro financeiro opera e qual o enquadramento regulatório (Bacen), inclusive para antecipar comissão de colaborador PJ e CLT | `[D38]`, jurídico, PSP |
| **PEN-29** | Eventos: o aceite do contrato no app tem validade jurídica suficiente ou precisa de assinatura eletrônica qualificada? | `[D42]`, jurídico |
| **PEN-30** | Valores: pacotes de destaque, valor por tenant ativado e critério de "ativado" (o protótipo usa KYC aprovado + assinatura paga + primeiro agendamento concluído) | `[D37]`, `[D43]`, monetização |
| **PEN-31** | Orçamentos: prazo de resposta do estabelecimento e validade da proposta | `[D40]`, `[D42]` |
| **PEN-32** | Antes e depois nas verticais de saúde: permitido, proibido ou só com regras do conselho de cada profissão? | `[D45]`, `[PEN-06]`, LGPD art. 11 |
| **PEN-33** | Limites de imagem e vídeo por plano (quantidade, tamanho, duração do vídeo) e se o excedente é cobrado | `[D44]`, monetização, custo de infra |
| **PEN-34** | Direito de imagem: como registrar o consentimento de cliente ou colaborador que aparece na foto, e o que acontece quando ele revoga | `[D45]`, LGPD, jurídico |

**Resolvida.** PEN-22: o protótipo cobre todas as telas da v1.0 (68), mais desktop e fase 2.

### 18.2 Conflitos entre decisões já tomadas

| # | Conflito | Decisões envolvidas |
|---|---|---|
| **C1** | Push só alcança quem instalou o app, e todo consumidor novo chega sem ele. Sem canal alternativo, não há como confirmar nem lembrar o primeiro agendamento, que é exatamente onde o no-show mais ocorre | `[D10]` com `[D03]` e 3.2.8 |
| **C2** | Saúde na v1.0 sem recurso compartilhado e sem entidade do atendido exclui clínica com mais de um consultório e consulta para dependente, que é a maior parte do volume em odontologia | `[D02]` com `[D08]` e `[D21]` |
| **C3** | Microsserviços e schema por tenant se multiplicam: cada migração roda em N tenants vezes M serviços, em dois hosts sem orquestrador, com um desenvolvedor | `[D14]` com `[D06]` e 11.1 |
| **C4** | Retenção do dado do consumidor colide com portabilidade sob LGPD, agravada por dado de saúde no escopo, e tende a travar a venda na entrada | `[D23]` com `[D02]` e 12 |
| **C5** | Com schema por tenant, a identidade do consumidor e a lista de "meus agendamentos" no app precisam atravessar schemas. Exige um schema global de identidade mais agregação entre tenants, que ainda não está desenhado | `[D06]` com `[D03]` e 6 |
| **C6** | Agendas separadas por negócio permitem marcar o mesmo colaborador em dois lugares no mesmo horário. A reserva dupla é a falha mais cara do produto (10.2) e o invariante 1 só protege dentro de uma filial | `[D31]` com 10.2 e 6.1 |
| **C7** | O protótipo da v1.0 tem "Perfil e portfólio" do colaborador (9.4, 9.9) e a fase 3 tem orçamento com fotos `[D40]`, mas as imagens só entram na fase 4. Até lá o perfil sai sem portfólio; as fotos do orçamento, enviadas pelo consumidor e não pelo tenant, ficam na fase 3 e criam antes a infraestrutura de upload, que a fase 4 reaproveita | `[D44]` com 9.4, 9.9 e `[D40]` |

Atualização de `[C1]`: a web do consumidor `[D27]` tira a obrigação de instalar o app para agendar, mas no navegador também não há push. Ver `[PEN-25]`. Atualização de `[C2]`: a entidade do atendido está decidida para a fase 2 `[D28]`; o recurso compartilhado continua em aberto `[PEN-23]`.

---

## 19. Glossário

| Negócio | Técnico | Definição |
|---|---|---|
| Cliente | `tenant` | Estabelecimento ou profissional-empresa que contrata a Koovela |
| Usuário | `consumer` | Consumidor final que agenda e é atendido |
| Colaborador | `professional` | Pessoa que executa o serviço |
| Gestão | `platform_admin` | Time Koovela |
| Negócio | `business` | Unidade de cadastro por vertical, com N filiais |
| Filial | `branch` | Unidade física de um negócio |
| Recurso | `resource` | Cadeira, sala ou consultório com disponibilidade própria (fase 2) |
| Atendido | `service_subject` | Sobre quem ou o que o serviço é executado: titular, menor, adulto dependente ou pet (fase 2) |
| Vitrine | `storefront` | Home pública com busca e verticais (fase 2) |
| Turma | `class_session` | Aula com N vagas, sala e instrutor (fase 2) |
| Plano de aulas | `class_plan` | Assinatura mensal recorrente de aulas (fase 2) |
| Vale-presente | `gift_card` | Crédito comprado por qualquer pessoa para presentear, válido na filial da compra (fase 2) |
| Campanha | `campaign` | Envio segmentado por push, e-mail ou SMS (fase 2) |
| Mídia | `media_asset` | Imagem ou vídeo enviado pelo tenant, com tipo, dono e status de moderação (fase 4) |
| Destaque | `sponsored_slot` | Posição paga na faixa de destaques da vitrine, por período, bairro e categoria (fase 3) |
| Orçamento | `quote_request` | Pedido do consumidor com descrição e fotos, respondido com proposta (fase 3) |
| Proposta | `proposal` | Preço, condições e contrato enviados pelo estabelecimento; aceita, vira agendamento com sinal (fase 3) |
| Parceiro | `referral_partner` | Contador, franqueadora ou associação que indica tenants e recebe por ativação (fase 3) |
| Slot | `time_slot` | Janela agendável de um colaborador |
| Série | `recurring_series` | Conjunto de agendamentos recorrentes |
| Split | `payment_split` | Divisão automática do pagamento entre tenant, colaborador e plataforma |
| Tier | `loyalty_tier` | Nível do programa de fidelidade |
| Degustação | `trial_grant` | Concessão comercial de uso gratuito |
| Impersonation | `support_session` | Acesso temporário e auditado da Gestão à visão de um tenant |
| Vertical | `vertical` | Cluster de atuação que define vocabulário e regras padrão |
