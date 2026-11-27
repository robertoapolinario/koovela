<!--
SYNC IMPACT REPORT
==================
Versão: (template) → 1.0.0
Tipo de mudança: ratificação inicial (MAJOR)
Fonte: koovela-inicioII-v0.5.md (Documento Fundamental v0.5, 23/11/2026) + protótipo Figma
       "Koovela — Protótipo v1.0" (129 telas, navegação revisada em 24/11/2026)

Princípios criados (12):
  I.    Agenda é verdade: zero reserva dupla
  II.   Isolamento de tenant por construção
  III.  Dinheiro exato, rastreável e idempotente
  IV.   Privacidade e dado sensível por padrão (LGPD)
  V.    Acesso privilegiado é auditado, justificado e expira
  VI.   Especificação rastreável ao Documento Fundamental
  VII.  Contratos primeiro e fronteiras de domínio rígidas
  VIII. Testes guiados por invariantes (test-first)
  IX.   Eventos confiáveis: outbox, idempotência e DLQ
  X.    Observável, reproduzível e ARM64 desde o primeiro commit
  XI.   Experiência coerente em todas as superfícies
  XII.  Simplicidade operacional proporcional à equipe

Seções adicionadas: Escopo e fases · Domínio koovela.com · Restrições técnicas ·
  Segurança e conformidade · Requisitos não funcionais · Métricas como requisito ·
  Conflitos e pendências · Fluxo de desenvolvimento · Encadeamento das especificações ·
  Glossário mínimo · Governança
Seções removidas: nenhuma (o template anterior não tinha conteúdo)

Mapeamento para o template do Spec Kit:
  Core Principles → seção 1 (12 princípios, em vez dos 5 do exemplo)
  [SECTION_2_NAME] / [SECTION_3_NAME] → seções 2 a 11
  Governance → seção 12
Tokens entre colchetes como [D19], [PEN-02], [C6] e [NEEDS CLARIFICATION: PEN-##] são
  referências intencionais ao Documento Fundamental, não placeholders do template.

Correções aplicadas ao texto-fonte (consituition.md):
  - "Como ler": referência à emenda corrigida de "seção 10" para "seção 12" (Governança).

Templates que precisam de alinhamento:
  ⚠ .specify/templates/plan-template.md   → "Constitution Check" deve listar os 12 portões (seção 9.3)
  ⚠ .specify/templates/spec-template.md   → incluir "Rastreabilidade", "Fase", "Superfícies",
                                            "Pendências e conflitos" e "Dados pessoais" (seção 9.2)
  ⚠ .specify/templates/tasks-template.md  → categorias obrigatórias: invariantes, isolamento de tenant,
                                            contrato, migração multi-schema, auditoria, observabilidade, a11y
  ⚠ AGENTS.md / CLAUDE.md                 → apontar para esta constituição e para docs/fundamental/

TODOs adiados:
  TODO(DOC-PATH): os documentos-fonte citam docs/fundamental/koovela-inicioII.md, mas a
                estrutura 4.2 cita docs/fundamental/inicioII.md; hoje o arquivo está em
                ./inicioII.md. Escolher um nome e mover o arquivo.
  TODO(PEN-02): confirmar que koovela.com fica com esta plataforma (hoje a marca também nomeia
                a loja de dropshipping em Portugal). Esta constituição assume que sim.
  TODO(PEN-20 / C3): topologia de execução (orquestrador, número de hosts) — ver Princípio XII.
-->

# Constituição da Plataforma Koovela

> Agendamento, pagamento e fidelização para estabelecimentos de beleza, saúde e serviços,
> no Brasil, começando por São Paulo. Domínio: **koovela.com**.

Esta constituição define as regras que **nenhuma especificação, plano, tarefa ou linha de código pode violar**. Ela vale para a plataforma completa, ou seja, v1.0, fase 2 e fase 3, e não apenas para um MVP. Assim, decisões tomadas hoje não precisam ser desfeitas quando as fases seguintes chegarem.

**Como ler.** **DEVE** e **NÃO DEVE** são obrigatórios: violar exige uma emenda (seção 12) ou uma exceção registrada no plano (seção 9.4). **DEVERIA** é a regra padrão; para fugir dela é preciso justificar no plano. Cada princípio termina com a forma de verificá-lo.

**Documentos-fonte.** Na ordem de precedência:

1. Esta constituição.
2. `docs/fundamental/koovela-inicioII.md`, o Documento Fundamental, hoje na v0.5.
3. `docs/fundamental/decisoes.md`, o registro de decisões D01–D43.
4. O protótipo no Figma (`https://www.figma.com/design/uHnkbY8CjhyvGU31WrpKN0`).

Se houver conflito entre eles, prevalece o primeiro da lista, e o conflito é registrado como pendência.

---

## 1. Princípios centrais

### I. Agenda é verdade: zero reserva dupla

Reserva dupla é a falha mais cara do produto, porque quebra a confiança do consumidor e do estabelecimento ao mesmo tempo. Por isso ela é uma **invariante**, não uma meta.

- Toda criação ou alteração de janela de agendamento **DEVE** adquirir um lock distribuído (Redis) sobre `(professional_id, janela)` e, quando houver, sobre `(resource_id, janela)`. Isso vale também para cada etapa de combo `[D19]` `[D34]`, cada ocorrência de série `[D18]` `[D41]`, cada vaga de turma `[D30]` e cada data de evento pré-reservada `[D42]`.
- O banco **DEVE** ter uma constraint ou um mecanismo transacional equivalente como última linha de defesa. Lock sem constraint não basta, e constraint sem lock não basta.
- Consultar a disponibilidade **NÃO DEVE** ser tratado como garantia. A confirmação acontece somente na escrita.
- Um combo, com ou sem troca de profissional, **DEVE** ser reservado de forma atômica: ou todas as etapas são reservadas, ou nenhuma.
- O conflito entre negócios do mesmo colaborador `[D31]` `[C6]` **DEVE**, no mínimo, ser detectado e mostrado ao colaborador e aos dois tenants. Enquanto `[C6]` estiver aberto, nenhuma especificação pode dizer que esse conflito está "resolvido".
- Turma lotada recusa novas inscrições; não existe fila de espera de turma `[D30]`.
- Toda transição do ciclo de vida (`RASCUNHO → PENDENTE_PAGAMENTO → CONFIRMADO → EM_ATENDIMENTO → CONCLUIDO`, e os ramos `CANCELADO_USUARIO`, `CANCELADO_ESTABELECIMENTO`, `NO_SHOW`, `REAGENDADO`, `EXPIRADO`) **DEVE** ser uma máquina de estados explícita. Cada transição publica um evento e registra quem a fez e quando.
- Um agendamento concluído **NÃO DEVE** ser excluído. Ele só pode ser estornado ou cancelado, sempre com registro.
- Alterar uma ocorrência de uma série **NÃO DEVE** alterar as demais sem um comando explícito.

*Verificação:*
- Teste de concorrência no CI: N requisições simultâneas para a mesma janela produzem exatamente 1 sucesso.
- Teste de propriedade sobre a máquina de estados.
- Incidentes de reserva dupla em produção são acompanhados como métrica de qualidade, com meta 0.

### II. Isolamento de tenant por construção

Cada tenant tem **schema próprio** no MySQL `[D06]`. A identidade global (consumidor, pessoa, índice de agendamentos do consumidor entre tenants) vive **fora** dos schemas de tenant `[C5]`.

- O `tenant_id` **DEVE** ser resolvido uma única vez, na borda (gateway), a partir do token. Daí em diante, ele é propagado no contexto da requisição e dos eventos. Nenhum serviço aceita `tenant_id` vindo do corpo da requisição para decidir o escopo do acesso.
- A conexão com o banco **DEVE** ser obtida por um resolvedor de schema e nunca montada à mão. Consultas que atravessam schemas de tenant são proibidas no código de aplicação.
- Agregações entre tenants (o "Meus agendamentos" do consumidor, a vitrine `[D26]`, o benchmark `[D39]`, o BI `[D25]`) **DEVEM** ler projeções construídas a partir de eventos ou de réplica, nunca o schema transacional de outro tenant.
- O benchmark **DEVE** aplicar um recorte mínimo de estabelecimentos por região antes de mostrar qualquer número `[D39]`.
- Cache, chaves Redis, filas, nomes de objetos em storage e logs **DEVEM** ter o tenant como prefixo ou campo.
- Provisionar um tenant novo **DEVE** levar menos de 2 minutos, ser idempotente e poder ser repetido em caso de falha.

*Verificação:*
- Suíte de isolamento no CI: com dois tenants criados, todo endpoint autenticado como A falha (com 404, não 403) ao tentar acessar recursos de B.
- Teste da invariante 3 do Documento Fundamental: nenhuma consulta retorna dado de outro tenant.

### III. Dinheiro exato, rastreável e idempotente

- Valores monetários **DEVEM** ser inteiros em centavos (`BIGINT`), sempre acompanhados de código de moeda (`BRL`). `float` e `double` são proibidos em qualquer camada, inclusive nos clientes.
- A soma dos splits de um pagamento **DEVE** ser igual ao valor líquido da transação. A regra de arredondamento é explícita e determinística, e o resto vai para uma parte definida na especificação.
- Saldos de pontos, pacotes, vale-presente e créditos de aula **NUNCA** ficam negativos. Toda mudança de saldo é um lançamento num livro-razão, sem nenhum `UPDATE saldo = saldo - x` solto.
- Toda operação financeira, ou seja, cobrança, estorno, repasse, antecipação `[D38]`, emissão fiscal e cobrança de assinatura, **DEVE** aceitar uma chave de idempotência e ser segura para reprocessar.
- O provedor de pagamento (PSP) **DEVE** ficar isolado atrás da interface `PaymentProvider` `[D07]`. O SDK do provedor não pode aparecer fora do adaptador.
- A regra vigente (política de cancelamento e no-show, regra de comissão, regra de fidelidade, preço) **DEVE** ser versionada e congelada no agendamento no momento em que ele é criado.
- A comissão **DEVE** respeitar a escolha do tenant sobre como o desconto é absorvido `[D17]`. A tela que configura essa escolha explica a consequência.
- Conciliação diária com o PSP é obrigatória. Qualquer divergência gera um alerta.

*Verificação:*
- Testes de propriedade sobre o split (soma igual ao líquido, para qualquer combinação de partes e descontos).
- Teste de reprocessamento de webhook duplicado.
- Teste da invariante 4: saldo nunca negativo.
- Lint que proíbe `number` em tipos de dinheiro (o tipo `Money` é obrigatório).

### IV. Privacidade e dado sensível por padrão (LGPD)

- **Minimização.** A etapa 1 do cadastro coleta apenas nome e celular, verificado por OTP. CPF, e-mail, data de nascimento e meio de pagamento só são pedidos quando necessários (etapa 2).
- **Criptografia por campo.** Estes campos **DEVEM** ser cifrados por envelope, com a chave fora do banco: CPF, telefone, e-mail, data de nascimento, endereço, dados bancários, anotações de atendimento e dados de atendidos menores de idade. A busca usa HMAC determinístico. Campo cifrado nunca é pesquisado com `LIKE`.
- **Saúde (LGPD art. 11).** Exige base legal específica, consentimento destacado, acesso segregado e retenção própria `[PEN-05]` `[PEN-10]`.
- **Menores (art. 14) e dependentes** `[D28]`. Os dados ficam no cadastro do titular e exigem consentimento do responsável. O estabelecimento vê apenas o mínimo necessário para o atendimento.
- **Papéis.** O tenant é controlador dos dados dos próprios clientes e a Koovela é operadora. Com a vitrine `[D26]`, a Koovela passa a ser também controladora dos dados de quem chega pela busca. A política de privacidade revista **DEVE** estar publicada antes de a fase 2 ir ao ar.
- **Retenção** `[D23]`. Toda especificação que define retenção **DEVE** conciliar retenção, portabilidade e eliminação `[C4]`, respeitando a guarda fiscal de cinco anos.
- **Direitos do titular.** Acesso, correção, portabilidade e eliminação **DEVEM** ser executáveis de ponta a ponta, inclusive a exclusão de conta dentro do app, exigida pelas lojas `[D03]`.
- **Campanhas** `[D32]`. Só com opt-in por canal e descadastro em um clique.
- **Logs.** PII é proibida em logs, traces, métricas e mensagens de erro. O mascaramento é automático no logger.

*Verificação:*
- Cada especificação tem a seção "Dados pessoais", com campos, base legal, retenção e quem acessa.
- Teste automatizado que falha se um campo marcado `@pii` for persistido em claro.
- Varredura de logs no CI.

### V. Acesso privilegiado é auditado, justificado e expira

- Nenhum perfil da Gestão tem acesso irrestrito e silencioso a dados de tenant. A impersonation (`support_session`) **DEVE**:
  - exigir uma justificativa;
  - ter prazo de expiração;
  - ficar visível ao tenant;
  - registrar cada ação tomada durante a sessão.
- A matriz de permissões do Documento Fundamental (seção 7) é a fonte do RBAC. As permissões **DEVEM** ser declarativas, versionadas e testadas célula por célula. Pendências da matriz (`[PEN-03]`, `[PEN-10]`) ficam **negadas por padrão** até serem decididas.
- MFA é obrigatório para a Gestão e para o Proprietário. Ações financeiras e administrativas exigem reautenticação recente.
- 100% das ações da Gestão e das ações financeiras **DEVEM** ser registradas numa trilha de auditoria append-only, com ator, ação, alvo, justificativa, IP, `request_id` e data e hora.
- Feature flags e provisionamento de schema são exclusivos do perfil SRE.

*Verificação:*
- Teste da matriz RBAC gerado a partir de `docs/fundamental/permissoes.yaml`.
- Teste que falha se um endpoint administrativo não emitir evento de auditoria.

### VI. Especificação rastreável ao Documento Fundamental

- Toda especificação **DEVE** citar a origem de cada requisito, no formato `REQ-<DOMÍNIO>-<NNN> (origem: <seção do Documento Fundamental> | D## | tela 9.x.y)`.
- Toda especificação **DEVE** declarar:
  - a **fase** (v1.0, fase 2, fase 3);
  - as **superfícies** afetadas (app do consumidor, web do consumidor, painel do cliente, app do colaborador, colaborador desktop, back-office, BI, portal do parceiro);
  - as **pendências `[PEN-##]` e os conflitos `[C#]`** de que depende.
- Uma pendência ou conflito que bloqueia a feature **DEVE** aparecer na especificação como `[NEEDS CLARIFICATION: PEN-##]`. O plano **NÃO DEVE** passar do portão enquanto houver pendência bloqueante sem decisão. Pendências não bloqueantes podem seguir com um padrão explícito e reversível, marcado `ASSUMIDO`.
- Decisões novas tomadas durante uma especificação **DEVEM** voltar ao registro de decisões (`D44` em diante) e ao Documento Fundamental, que recebe nova versão. A especificação não é o lugar definitivo de uma decisão de negócio.
- Itens marcados como "fora por ora" `[D36]` **NÃO DEVEM** ser implementados, mas o modelo **NÃO DEVE** impedi-los. São eles: produtos financeiros, veterinário, corporativo B2B2C, white label e API pública, e portabilidade do colaborador.

*Verificação:* um lint de especificação no CI rejeita requisito sem origem, especificação sem fase ou superfícies, e PEN bloqueante sem decisão.

### VII. Contratos primeiro e fronteiras de domínio rígidas

- A arquitetura é de **microsserviços** `[D14]` organizados por domínio (seção 4.4). Cada serviço é **dono exclusivo** das próprias tabelas. Nenhum serviço lê ou escreve nas tabelas de outro, e não há join entre domínios.
- A comunicação entre serviços **DEVE** acontecer por contrato versionado:
  - HTTP descrito em OpenAPI 3.1;
  - eventos descritos em AsyncAPI e JSON Schema.
- Contratos ficam em `packages/contracts` e são gerados ou validados no CI. Uma mudança incompatível exige nova versão (`/v2`, `evento.v2`) e período de convivência.
- O contrato **DEVE** ser escrito e revisado **antes** da implementação, como parte do `/speckit-plan`.
- Os clientes (React, React Native) consomem SDKs gerados a partir dos contratos. Nenhum cliente monta URL ou payload à mão.
- A API pública e o white label estão "fora por ora" `[D36]`. Mesmo assim, toda rota externa **DEVE** nascer versionada (`api.koovela.com/v1/...`), para não fechar essa porta.

*Verificação:* teste de contrato (consumidor e provedor) por serviço, mais detecção automática de quebra de contrato no PR.

### VIII. Testes guiados por invariantes (test-first)

- Para regras de negócio, o ciclo é **vermelho → verde → refatora**. O teste é escrito a partir do critério de aceite da especificação e falha antes da implementação existir.
- São obrigatórios no CI, como portão de merge:
  1. As seis invariantes do domínio (Documento Fundamental, seção 6.1), mais as invariantes I a III desta constituição.
  2. A suíte de isolamento de tenant (Princípio II).
  3. Testes de contrato (Princípio VII).
  4. Testes de integração com MySQL, Redis e RabbitMQ reais, em contêiner. Esses componentes não são substituídos por mocks.
  5. A migração aplicada sobre N schemas de tenant, junto com o rollback dela.
  6. Testes E2E das jornadas J1 a J9 e das jornadas novas de cada fase, com os mesmos fluxos usados na demonstração do protótipo.
  7. Acessibilidade automatizada (axe) nas telas de agendamento e pagamento.
- Cobertura é consequência, não meta. Mesmo assim, código de dinheiro, agenda e permissões **NÃO DEVE** ter linhas sem cobertura.

*Verificação:* o pipeline bloqueia o merge se qualquer suíte obrigatória falhar.

### IX. Eventos confiáveis: outbox, idempotência e DLQ

- A publicação de eventos **DEVE** usar o padrão **transactional outbox**: o evento é gravado na mesma transação do estado.
- Todo consumidor **DEVE** ser idempotente (tabela de mensagens processadas, ou chave natural) e tolerar entrega fora de ordem.
- Toda fila **DEVE** ter DLQ, política de retentativa com backoff e alerta de crescimento.
- Os eventos carregam `event_id`, `event_type`, `version`, `tenant_id`, `occurred_at` (UTC), `actor` e `correlation_id`. Nunca carregam PII em claro.
- Os nomes seguem o formato `<domínio>.<entidade>.<fato-no-passado>.v<N>`, por exemplo `scheduling.appointment.confirmed.v1`.

*Verificação:* teste de reentrega (o mesmo evento 3 vezes produz um único efeito) e teste de outbox (rollback não publica).

### X. Observável, reproduzível e ARM64 desde o primeiro commit

- Imagens de produção **DEVEM** ser construídas no GitHub Actions para `linux/arm64`, publicadas no GHCR e implantadas por pull `[D22]`. **Nunca** se constrói imagem de produção na máquina de desenvolvimento (macOS Intel).
- Versões ficam fixadas: imagem base por digest, sem `latest`; runtime fixado (`.nvmrc`, `.python-version`); lockfiles versionados. Dependências nativas **DEVEM** ser validadas em ARM64 no CI.
- Todo ambiente é reproduzível com Docker Compose (desenvolvimento) e configuração como código (rede, security lists e NSG da OCI, DNS e WAF da Cloudflare).
- Observabilidade:
  - logs JSON estruturados com `tenant_id`, `request_id`, `correlation_id` e `service`;
  - métricas Prometheus com dashboards Grafana;
  - erros no Sentry;
  - healthchecks de liveness e readiness;
  - traces OpenTelemetry entre gateway, serviços e filas.
- Migrações são versionadas, reversíveis e aplicadas a **todos** os schemas sem indisponibilidade, no padrão expandir → migrar → contrair. Uma falha em um tenant não interrompe os demais e fica registrada para reprocessamento.
- Backup: dump diário, binlog para restauração a qualquer ponto no tempo, cópia fora da OCI e teste de restauração mensal com registro. RPO de 1 hora e RTO de 4 horas.
- O staging em ARM na OCI **DEVE** existir antes do primeiro cliente real.

*Verificação:* job `build-arm64` obrigatório, job de migração multi-schema obrigatório e checklist de observabilidade no template de tarefas.

### XI. Experiência coerente em todas as superfícies

- O protótipo do Figma é a referência visual e de navegação. Cada tela implementada **DEVE** citar o código da tela (por exemplo, `9.1.8`, `W07`, `F03`, `G04`).
- Design system único em `packages/design-tokens`, com:
  - as cores da marca: terracota `#B5532F`, oliveira `#3F4A2E`, creme `#F7EEDC`;
  - a paleta funcional e os neutros propostos, ainda em validação `[PEN-01]`;
  - a tipografia DM Sans.

  Os tokens são consumidos igualmente por React (web) e React Native (app). Cor ou fonte fixa no código é proibida.
- Uma funcionalidade decidida para "todas as plataformas" `[D35]` `[D36]` **DEVE** ser especificada para todas as superfícies na mesma especificação. A entrega pode ser escalonada, mas o comportamento é um só.
- Acessibilidade WCAG 2.1 AA nas telas de agendamento e pagamento, e como padrão nas demais.
- O app funciona em rede 3G. A agenda do colaborador **DEVE** ser legível offline.
- Idioma: pt-BR na interface. Os textos ficam externalizados em arquivos de i18n desde o início, embora só pt-BR seja implementado agora `[D11]`.
- Fuso horário: UTC no banco, conversão na borda, `America/Sao_Paulo` como padrão. Datas sempre em ISO-8601 com fuso.
- Toda ação do consumidor que gera compromisso (agendar, pagar, aceitar proposta ou contrato `[D42]`) **DEVE** terminar numa tela de confirmação com o resumo da ação e o próximo passo.

*Verificação:* revisão visual por tela contra o Figma, verificação de tokens no lint e axe no CI.

### XII. Simplicidade operacional proporcional à equipe

A equipe inicial é de um desenvolvedor, com dois hosts e sem orquestrador `[C3]` `[PEN-20]`. A arquitetura decidida (microsserviços e schema por tenant) **é mantida**, mas sob estas regras:

- Monorepo único (`pnpm` workspaces + Turborepo) com uma toolchain compartilhada. Um único comando sobe o ambiente inteiro.
- Os serviços compartilham bibliotecas internas para tenancy, auth, outbox, logging, `Money` e erros. É proibido reimplementar essas peças em cada serviço.
- Um serviço novo só nasce quando o domínio tem fronteira própria (seção 4.4). Funcionalidade nova entra, por padrão, num serviço existente do mesmo domínio.
- O executor de migrações é **um só** para todos os serviços e todos os schemas.
- Complexidade além do necessário **DEVE** ser justificada no plano, na tabela "Complexity Tracking", com a alternativa mais simples que foi rejeitada.

*Verificação:* revisão do plano no portão XII.

---

## 2. Escopo e fases

A plataforma é especificada **por inteiro**. A fase define a **ordem de entrega**, não o desenho. O modelo de dados e os contratos da v1.0 **DEVEM** acomodar as fases 2 e 3 sem migração destrutiva. Exemplos:

- `pessoa` separada de `vínculo`;
- slug público, categoria e geolocalização no negócio;
- `service_subject` previsto;
- `service_location_mode` previsto no serviço.

| Fase | Conteúdo |
|---|---|
| **v1.0** | Beleza (cluster A) e saúde (cluster B) · multi-filial · app do consumidor (iOS e Android) e web do consumidor `[D27]` · painel do cliente · app e versão desktop do colaborador · back-office · BI em Python · Pix e cartão com split · fidelidade com tiers · série recorrente · combo com o mesmo profissional · pacote de sessões `[PEN-07]` · fila de espera e horário ocioso · avaliações · NFS-e · assinatura Koovela com taxa por agendamento |
| **Fase 2** `[D35]` (todas as plataformas) | Vitrine com busca e verticais `[D26]` · atendidos: menor, adulto dependente e pet `[D28]` · pet com duração por porte e pelagem `[D29]` · turmas, pacotes e plano mensal `[D30]` · colaborador em vários negócios `[D31]` · CRM por push, e-mail e SMS `[D32]` · vale-presente e pacotes para presente `[D33]` · combo com troca de profissional `[D34]` |
| **Fase 3** `[D36]` (todas as plataformas) | Destaque pago `[D37]` · antecipação de recebíveis `[D38]` · inteligência de mercado `[D39]` · automotivo e casa, com atendimento no endereço e orçamento `[D40]` · educação com aulas recorrentes `[D41]` · eventos com proposta, sinal e contrato `[D42]` · parceiros indicadores `[D43]` · favoritos |
| **Fora por ora** | Produtos financeiros · veterinário · corporativo B2B2C · white label e API pública · portabilidade do colaborador · recurso compartilhado (adiado, `[PEN-23]`) |
| **Escopo negativo** | Prontuário clínico completo · folha de pagamento, eSocial e contabilidade · ERP e estoque · venda de produto físico com logística · telemedicina |

---

## 3. Domínio koovela.com

Todo endereço público da plataforma fica sob **koovela.com**. Os subdomínios abaixo são canônicos; mudar qualquer um deles exige emenda a esta constituição.

| Endereço | Superfície | Observações |
|---|---|---|
| `koovela.com` | Site institucional e, a partir da fase 2, a vitrine `[D26]` | `www.koovela.com` redireciona 301 para o apex |
| `koovela.com/{slug-do-negocio}` | Página pública do estabelecimento (link e QR) | O slug é único em toda a plataforma, imutável depois de publicado, com redirecionamento a partir de slugs antigos. É o destino dos QR codes e do deep link |
| `koovela.com/{slug}/{slug-da-filial}` | Página da filial | Opcional em operações com várias filiais |
| `app.koovela.com` | Web do consumidor (área logada, agendamento) | `[D27]` |
| `painel.koovela.com` | Painel do cliente (estabelecimento) e onboarding | Inclui o modo desktop do colaborador em `painel.koovela.com/pro` |
| `api.koovela.com` | Gateway de API (`/v1/...`) | Única entrada de tráfego de aplicação, atrás da Cloudflare (WAF e rate limit) |
| `admin.koovela.com` | Back-office da Gestão | Atrás do Cloudflare Access, com MFA e lista de IPs. Nunca indexado |
| `bi.koovela.com` | Painéis de BI `[D25]` | Atrás do Cloudflare Access. Lê réplica ou cópia analítica |
| `parceiros.koovela.com` | Portal do parceiro indicador `[D43]` | Fase 3 |
| `status.koovela.com` | Página de status | Hospedada fora da OCI |
| `cdn.koovela.com` | Mídia (fotos de portfólio, orçamentos `[D40]`, logos) | URLs assinadas para mídia privada |
| `staging.koovela.com` e `*.staging.koovela.com` | Staging em ARM na OCI | Mesma topologia de subdomínios, `noindex`, dados sintéticos |
| `dev.koovela.com` | Reservado | Ambientes de desenvolvimento usam `*.localhost` |

**Links universais do app.** Os arquivos `koovela.com/.well-known/apple-app-site-association` e `assetlinks.json` associam `koovela.com/{slug}` e `app.koovela.com/*` aos apps. Quem não tem o app instalado cai na web do consumidor `[D27]`, sem bloqueio pedindo instalação.

**Identificadores dos apps.** `com.koovela.app` para o consumidor e `com.koovela.pro` para o colaborador.

**E-mail.**

| Endereço | Uso |
|---|---|
| `notificacoes@mail.koovela.com` | Transacional |
| `ofertas@news.koovela.com` | Campanhas `[D32]`, em subdomínio separado para proteger a reputação do transacional |
| `suporte@koovela.com` | Suporte |
| `privacidade@koovela.com` | Encarregado LGPD (DPO) |
| `seguranca@koovela.com` | Segurança |

Todos os domínios de envio **DEVEM** ter SPF, DKIM e DMARC (`p=quarantine` evoluindo para `reject`). O arquivo `koovela.com/.well-known/security.txt` **DEVE** existir.

**Cookies e sessão.** Os cookies de sessão são escopados ao subdomínio, nunca a `.koovela.com`. Usam `Secure`, `HttpOnly` e `SameSite=Lax`. O CORS do gateway aceita apenas as origens listadas acima.

**TLS e cabeçalhos.** TLS via Cloudflare, HSTS com `preload`, CSP restritiva por superfície, e `X-Frame-Options: DENY`. A exceção ao `X-Frame-Options` são widgets de agendamento embutíveis, que dependem de decisão futura.

---

## 4. Restrições técnicas

### 4.1 Stack

| Camada | Tecnologia | Regra |
|---|---|---|
| Backend | TypeScript (strict) sobre Node.js LTS ativa | `strict: true`, sem `any` implícito, validação de entrada com schema (Zod), gerado a partir do OpenAPI |
| Banco | MySQL 8.4 LTS, InnoDB, `utf8mb4_0900_ai_ci`, UTC | Um schema por tenant `[D06]`, mais os schemas globais `koovela_identity`, `koovela_platform` e as projeções |
| Eventos | RabbitMQ | Outbox, DLQ e idempotência (Princípio IX) |
| Cache e lock | Redis | Lock de agenda com TTL e token de posse, cache de disponibilidade com invalidação por evento |
| Web | React + Vite + TanStack Query | SDK gerado, tokens compartilhados, SSR ou pré-renderização para páginas públicas (SEO da vitrine e das páginas de estabelecimento) |
| Mobile | React Native `[D03]` | iOS e Android, push nativo, deep links, armazenamento offline da agenda do colaborador |
| BI | Python `[D25]` | Somente leitura sobre réplica ou cópia analítica, nunca sobre o transacional |
| Borda | Cloudflare + Traefik (ou Nginx) | WAF, rate limit, TLS, Access para superfícies internas |
| Infra | OCI, Ubuntu 24.04, Ampere ARM64 | `db-worker-01` sem rota pública. A porta 3306 nunca sai da VCN. Acesso administrativo por bastion ou Cloudflare Tunnel |

### 4.2 Estrutura do repositório

```
koovela/
├── .specify/                 # Spec Kit: memory/constitution.md, templates, scripts
├── specs/                    # NNN-nome-da-feature/ (spec.md, plan.md, tasks.md, contracts/)
├── docs/fundamental/         # inicioII.md, decisoes.md, permissoes.yaml, glossario.md
├── apps/
│   ├── consumer-mobile/      # React Native — com.koovela.app
│   ├── pro-mobile/           # React Native — com.koovela.pro
│   ├── consumer-web/         # app.koovela.com + páginas públicas koovela.com
│   ├── tenant-web/           # painel.koovela.com (inclui /pro desktop)
│   ├── admin-web/            # admin.koovela.com
│   └── partner-web/          # parceiros.koovela.com (fase 3)
├── services/                 # um diretório por domínio (seção 4.4)
├── packages/
│   ├── contracts/            # OpenAPI, AsyncAPI, JSON Schema
│   ├── sdk/                  # clientes gerados
│   ├── design-tokens/
│   ├── ui-web/ ui-native/
│   ├── platform/             # tenancy, auth, outbox, logger, money, errors, audit
│   └── testing/              # fixtures multi-tenant, contêineres
├── bi/                       # Python
├── infra/                    # compose, OCI como código, Cloudflare, migrações
└── .github/workflows/
```

### 4.3 Convenções

- **Idioma.** Código, identificadores, nomes de tabelas e eventos ficam em inglês, usando o vocabulário canônico do glossário (seção 11). Especificações, interface e documentação de negócio ficam em pt-BR.
- **Identificadores.** UUIDv7 em todas as entidades. Nunca expor IDs sequenciais.
- **Erros.** RFC 9457 (Problem Details), com `code` estável e mensagem em pt-BR para o cliente.
- **Paginação.** Por cursor. Paginação por offset não é usada em listas que crescem.
- **Configuração.** `.env` por ambiente, ignorado pelo git, com `.env.example` completo e versionado. Em produção, usar Docker secrets ou OCI Vault. Nunca logar variável de ambiente. Rotacionar segredos quando qualquer pessoa sair do projeto.
- **Commits e branches.** Conventional Commits. Uma branch por especificação (`NNN-nome`), com PR obrigatório e CI verde.

### 4.4 Domínios (fronteiras de serviço)

Os 8 serviços previstos `[D14]` são estendidos para cobrir a plataforma completa. A coluna "Fase" indica quando cada domínio passa a existir. Antes disso, nenhum código desse domínio é escrito.

| Domínio | Responsabilidade | Fase |
|---|---|---|
| `gateway` | Borda, autenticação do token, resolução de tenant, rate limit | v1.0 |
| `identity` | Consumidor global, pessoa, staff, OTP, MFA, sessões, RBAC, consentimentos | v1.0 |
| `tenancy` | Tenant, negócio, filial, vertical, provisionamento e migração de schema | v1.0 |
| `catalog` | Serviços, preços, combos, pacotes de sessões, regras de duração `[D29]`, local do serviço `[D40]` | v1.0 (+2, +3) |
| `workforce` | Colaboradores, vínculos, escalas, folgas, trocas, regras de comissão | v1.0 (+2 multi-negócio) |
| `scheduling` | Disponibilidade, lock, agendamento, séries, fila de espera, horário ocioso, turmas `[D30]`, combos com troca `[D34]` | v1.0 (+2) |
| `payments` | PSP, checkout, sinal, split, repasse, estorno, chargeback, conciliação, livro-razão de saldos | v1.0 |
| `loyalty` | Pontos, tiers, catálogo, simulador, resgate | v1.0 |
| `engagement` | Avaliações e respostas, favoritos (fase 3) | v1.0 (+3) |
| `notification` | Push, e-mail e SMS transacionais e de campanha, preferências e opt-in, cotas `[D32]` | v1.0 (+2) |
| `fiscal` | NFS-e (São Paulo primeiro), certificados, histórico | v1.0 |
| `billing` | Assinatura Koovela, taxa por agendamento, faturas, inadimplência, excedentes, pacotes de destaque | v1.0 (+2, +3) |
| `backoffice` | Concessões, flags, antifraude, impersonation, auditoria consolidada | v1.0 |
| `discovery` | Vitrine, busca, ranking, geolocalização, faixa de destaques `[D37]` | Fase 2 (+3) |
| `household` | Atendidos, pets e consentimentos de responsável `[D28]` | Fase 2 |
| `commerce` | Vale-presente, pacotes vendidos, planos de aula recorrentes `[D30]` `[D33]` | Fase 2 |
| `campaigns` | Segmentos, campanhas, atribuição | Fase 2 |
| `quotes` | Orçamentos, propostas, contratos, pré-reserva de data `[D40]` `[D42]` | Fase 3 |
| `finance` | Antecipação de recebíveis via parceiro `[D38]` | Fase 3 |
| `insights` | Benchmark anonimizado para tenants `[D39]` | Fase 3 |
| `partners` | Parceiros indicadores, atribuição e pagamento por ativação `[D43]` | Fase 3 |

A tabela acima é a **fronteira lógica**. Domínios podem ser **implantados** juntos num mesmo processo, desde que mantenham schema, contrato e código separados (Princípio XII, `[PEN-20]`). Separar um domínio em processo próprio não exige emenda; mudar uma fronteira lógica exige.

---

## 5. Segurança e conformidade

- **Autenticação.**
  - Consumidor: OTP por SMS (WhatsApp proibido para campanhas `[D32]`), com rate limit por número e por IP e proteção contra enumeração de telefone.
  - Staff: e-mail com senha forte ou passkey, mais MFA.
  - Login social: se existir, Sign in with Apple é obrigatório no iOS.
- **Tokens.** Access token curto (no máximo 15 minutos) e refresh token rotativo, com detecção de reutilização. Sessões podem ser revogadas.
- **Menor privilégio no banco.** Um usuário por serviço, com permissão apenas sobre os próprios schemas e tabelas.
- **Antifraude.** Detectar agendamento em massa, teste de cartão no checkout, abuso de cupom e de pontos, conluio entre colaborador e consumidor, e chargeback. Toda regra de antifraude registra o motivo da decisão.
- **Dependências.** Dependabot e auditoria no CI, varredura de imagens (Trivy), SBOM por release e segredos verificados por gitleaks antes do push.
- **Termos.** A Koovela intermedeia e não executa o serviço, e isso consta nos termos de uso. Restrições de publicidade e de divulgação de preço em saúde `[PEN-06]` ficam desligadas por padrão nas verticais de saúde até serem decididas.
- **Lojas.** Política de privacidade publicada, declaração de coleta de dados e exclusão de conta dentro do app.
- **Aceites jurídicos.** Contratos de evento `[D42]` e termos guardam o hash do documento, a versão, o IP, o dispositivo e o horário do aceite. A suficiência jurídica do aceite está em `[PEN-29]`.

---

## 6. Requisitos não funcionais (metas mínimas)

| Dimensão | Alvo |
|---|---|
| Disponibilidade | 99,5% mensal, com janela de manutenção declarada em `status.koovela.com` |
| Latência | p95 abaixo de 500 ms na consulta de disponibilidade; p95 abaixo de 300 ms nas leituras do painel |
| Consistência de agenda | Zero reserva dupla (invariante) |
| Escala inicial | 500 tenants, 2.000 colaboradores, 50 mil agendamentos por mês. O desenho deve suportar 10× sem reescrita |
| Provisionamento | Tenant novo pronto em menos de 2 minutos |
| Migração | Aplicada a todos os schemas sem indisponibilidade |
| Mobile | Funciona em 3G; agenda do colaborador offline |
| Acessibilidade | WCAG 2.1 AA (agendamento e pagamento obrigatórios) |
| Auditoria | 100% das ações da Gestão e das ações financeiras |
| RPO / RTO | 1 hora / 4 horas |
| Desempenho web | LCP abaixo de 2,5 s em 4G nas páginas públicas (`koovela.com/{slug}` e vitrine) |

Uma especificação pode endurecer essas metas, mas não afrouxá-las.

---

## 7. Métricas como requisito

A North Star é **atendimentos concluídos e pagos por mês**.

Toda especificação **DEVE** declarar os eventos de produto que alimentam as métricas do Documento Fundamental (seção 14) e os indicadores dos problemas que resolve (seção 3). Uma funcionalidade sem instrumentação não está pronta.

As métricas a seguir são instrumentadas desde o primeiro tenant:

- taxa de instalação do app;
- parcela de agendamentos feitos pela web `[D27]`;
- no-show com e sem lembrete `[C1]`;
- incidentes de reserva dupla.

---

## 8. Conflitos e pendências: como tratá-los

Os seis conflitos `[C1]`–`[C6]` e as pendências `[PEN-01]`–`[PEN-31]` do Documento Fundamental são **restrições ativas**. Esta constituição **não os resolve**, mas define o comportamento de engenharia enquanto eles estiverem abertos.

| Item | Regra até a decisão |
|---|---|
| `[C1]` `[PEN-25]` Lembrete sem push | O `notification` nasce multicanal (push, e-mail, SMS), com escolha de canal por política. Nenhuma especificação de agendamento pode depender só de push |
| `[C2]` `[PEN-23]` Clínica sem recurso compartilhado | O modelo de agenda aceita `resource_id` opcional desde a v1.0, sem interface de usuário |
| `[C3]` `[PEN-20]` Topologia | Princípio XII. Domínios podem ser implantados juntos |
| `[C4]` Retenção × portabilidade | Exportação e eliminação implementadas; retenção configurável por categoria de dado |
| `[C5]` Identidade entre tenants | Schema global `koovela_identity` e projeção `consumer_appointments_index` alimentada por eventos |
| `[C6]` Colaborador em dois negócios | Detecção e aviso obrigatórios; bloqueio automático só por decisão |
| Pendências de RBAC (`[PEN-03]`, `[PEN-10]`) | Negado por padrão |
| Pendências de valores (`[PEN-08]`, `[PEN-30]`) | Tudo configurável no back-office, sem valor fixo no código |
| Demais pendências | `[NEEDS CLARIFICATION]` na especificação. Se a pendência for bloqueante, o plano não passa |

---

## 9. Fluxo de desenvolvimento (Spec Kit)

### 9.1 Ciclo

```
/speckit-constitution   →  este documento (alterado apenas por emenda)
/speckit-specify        →  specs/NNN-feature/spec.md   (o quê e por quê, sem tecnologia)
/speckit-clarify        →  resolve [NEEDS CLARIFICATION]; decisões novas viram D44+
/speckit-plan           →  plan.md + contracts/ + data-model.md + Constitution Check
/speckit-tasks          →  tasks.md (testes antes da implementação)
/speckit-analyze        →  consistência entre spec, plano, tarefas e constituição
/speckit-implement      →  código + testes; PR por tarefa ou grupo coeso
```

### 9.2 Seções obrigatórias em toda `spec.md`

1. Contexto e problema (com referência à seção 3 do Documento Fundamental).
2. **Fase** e **superfícies**.
3. Histórias de usuário com critérios de aceite testáveis (Dado / Quando / Então).
4. Requisitos `REQ-<DOM>-<NNN>` com origem.
5. Telas do protótipo cobertas, por código.
6. Regras de negócio e estados.
7. **Dados pessoais**: campos, classificação, base legal, retenção, quem acessa.
8. Permissões: recorte da matriz RBAC.
9. Eventos de domínio e de produto (métricas).
10. **Pendências e conflitos**, separados em bloqueantes e assumidos.
11. Fora do escopo desta especificação.

### 9.3 Constitution Check: portões do `/speckit-plan`

O plano só avança se responder **sim** a cada portão, ou se registrar a exceção (seção 9.4).

| # | Portão |
|---|---|
| G-I | A escrita de agenda usa lock e constraint, e há teste de concorrência? |
| G-II | Isolamento de tenant garantido e coberto pela suíte de isolamento? |
| G-III | Dinheiro em centavos, livro-razão, idempotência e versão da regra congelada? |
| G-IV | Dados pessoais mapeados, cifrados quando exigido, sem PII em log? |
| G-V | Permissões da matriz cobertas, ações privilegiadas auditadas? |
| G-VI | Todos os requisitos rastreáveis, sem pendência bloqueante aberta? |
| G-VII | Contratos (OpenAPI e AsyncAPI) escritos antes do código, sem acesso a tabela de outro domínio? |
| G-VIII | Testes definidos antes da implementação, invariantes incluídas? |
| G-IX | Eventos via outbox, consumidores idempotentes, DLQ? |
| G-X | Build ARM64, migração multi-schema reversível, observabilidade? |
| G-XI | Telas mapeadas no Figma, tokens, acessibilidade, todas as superfícies declaradas? |
| G-XII | Nenhuma complexidade nova sem justificativa? |

### 9.4 Exceções

Uma exceção pontual a um **DEVE** é registrada no `plan.md` (tabela "Complexity Tracking"). O registro traz o princípio afetado, o motivo, o risco, o prazo para remover a exceção e a tarefa de remoção.

Exceções aos Princípios I, II, III e IV **não são permitidas**. Para esses princípios, só uma emenda resolve.

### 9.5 Definição de pronto

Uma especificação está pronta quando todas as condições abaixo são verdadeiras:

- CI verde, com todas as suítes do Princípio VIII;
- contratos publicados;
- migração aplicada em staging sobre N tenants;
- telas conferidas com o Figma;
- métricas emitindo;
- documentação de operação atualizada (alertas, runbook);
- Documento Fundamental e registro de decisões atualizados, quando houver decisão nova.

---

## 10. Encadeamento das especificações

Ordem recomendada para o `/speckit-specify`. Cada especificação depende das anteriores indicadas. O número é o prefixo da branch e da pasta em `specs/`. As pendências listadas são as que precisam de resposta antes do `/speckit-plan` daquela especificação.

### Fundação (v1.0)

| # | Especificação | Depende de | Pendências a decidir |
|---|---|---|---|
| 001 | `fundacao-plataforma`: monorepo, CI ARM64, gateway, observabilidade, ambientes, DNS e borda do koovela.com | — | PEN-20, PEN-02 |
| 002 | `tenancy-provisionamento`: schema por tenant, executor de migração multi-schema | 001 | PEN-20 |
| 003 | `identidade-acesso`: consumidor global (C5), OTP, staff, MFA, RBAC, impersonation | 001, 002 | PEN-03, PEN-10 |
| 004 | `auditoria-flags`: trilha append-only, feature flags por tenant | 003 | — |
| 005 | `negocio-filiais-onboarding`: J3 (autônomo) e J4 (rede), slug, link e QR | 002, 003 | PEN-11, PEN-06 |
| 006 | `catalogo`: serviços, preços, combos (mesmo profissional), pacotes de sessões | 005 | PEN-07 |
| 007 | `equipe-escalas-comissao`: vínculos, escalas, folgas e trocas, regras de comissão `[D17]` | 005 | PEN-04, PEN-14 |
| 008 | `motor-agenda-disponibilidade`: slots, lock, cache, `resource_id` latente | 006, 007 | PEN-23 (latente) |
| 009 | `agendamento-ciclo-de-vida`: J1 completo, máquina de estados, remarcação, cancelamento | 008 | — |
| 010 | `politica-cancelamento-no-show`: versionamento e J6 | 009 | PEN-13, PEN-15 |
| 011 | `notificacoes-multicanal`: push, e-mail e SMS transacionais, lembretes | 009 | C1, PEN-25 |
| 012 | `pagamentos-split`: PSP, Pix e cartão, sinal, split, estorno, conciliação, livro-razão | 009, 010 | PEN-09, PEN-11, PEN-13, PEN-14 |
| 013 | `series-recorrentes`: J5 | 009 | PEN-12 |
| 014 | `fila-espera-horario-ocioso`: J2 | 009, 011, 012 | PEN-18 |
| 015 | `fidelidade`: J8, simulador, tiers | 012 | PEN-16, PEN-17 |
| 016 | `avaliacoes` | 009 | PEN-19 |
| 017 | `fiscal-nfse`: J7 (parte fiscal) | 012 | PEN-21 |
| 018 | `fechamento-financeiro-repasses`: J7 completo, comissões no app do colaborador | 007, 012, 017 | PEN-14 |
| 019 | `assinatura-koovela-cobranca`: planos, taxa por agendamento, inadimplência, suspensão | 012 | PEN-08, PEN-09 |
| 020 | `anotacoes-atendimento-ficha`: dado sensível | 003, 009 | PEN-05, PEN-10 |
| 021 | `backoffice-gestao`: tenants, KYC, concessões, antifraude, chargebacks | 003, 004, 012, 019 | — |
| 022 | `privacidade-direitos-titular`: exportação, eliminação, consentimentos | 003, 020 | C4 |
| 023 | `bi-paineis`: operacional, financeiro, coorte | 012 | — |

### Fase 2

| # | Especificação | Depende de | Pendências |
|---|---|---|---|
| 024 | `vitrine-busca` `[D26]` (Koovela como controladora LGPD) | 005, 006, 016, 022 | PEN-26 |
| 025 | `atendidos-dependentes-pets` `[D28]` `[D29]` | 009, 022 | C2 |
| 026 | `turmas-planos-checkin` `[D30]` | 008, 012 | — |
| 027 | `colaborador-multinegocio` `[D31]` | 007, 008 | C6 |
| 028 | `crm-campanhas` `[D32]` | 011, 019, 022 | — |
| 029 | `vale-presente-pacotes` `[D33]` | 012, 017 | PEN-24 |
| 030 | `combo-troca-profissional` `[D34]` | 006, 008 | — |

### Fase 3

| # | Especificação | Depende de | Pendências |
|---|---|---|---|
| 031 | `favoritos` | 024 | — |
| 032 | `destaque-pago` `[D37]` | 024, 019 | PEN-26, PEN-30 |
| 033 | `atendimento-no-endereco-orcamentos` `[D40]` | 006, 008, 012 | PEN-27, PEN-31 |
| 034 | `educacao-aulas-recorrentes` `[D41]` | 013 | — |
| 035 | `eventos-propostas-contratos` `[D42]` | 033 | PEN-29, PEN-31 |
| 036 | `antecipacao-recebiveis` `[D38]` | 012, 018 | PEN-28 |
| 037 | `inteligencia-mercado` `[D39]` | 023 | — |
| 038 | `parceiros-indicadores` `[D43]` | 019, 021 | PEN-30 |

Itens transversais, como design system e shells de app (navegação, autenticação na interface), entram na especificação 001 (tokens e shells) e são estendidos por cada especificação de funcionalidade. Nenhuma especificação de funcionalidade entrega "só backend": a superfície faz parte da definição de pronto.

---

## 11. Glossário mínimo (vocabulário canônico)

| Negócio | Código | | Negócio | Código |
|---|---|---|---|---|
| Cliente (estabelecimento) | `tenant` | | Turma | `class_session` |
| Usuário (consumidor) | `consumer` | | Plano de aulas | `class_plan` |
| Colaborador | `professional` | | Vale-presente | `gift_card` |
| Gestão | `platform_admin` | | Campanha | `campaign` |
| Negócio | `business` | | Destaque | `sponsored_slot` |
| Filial | `branch` | | Orçamento | `quote_request` |
| Atendido | `service_subject` | | Proposta | `proposal` |
| Recurso | `resource` | | Parceiro | `referral_partner` |
| Vitrine | `storefront` | | Slot | `time_slot` |
| Série | `recurring_series` | | Split | `payment_split` |
| Tier | `loyalty_tier` | | Degustação | `trial_grant` |
| Impersonation | `support_session` | | Vertical | `vertical` |

O glossário completo está no Documento Fundamental, seção 19. Um termo novo entra primeiro lá e depois no código.

---

## 12. Governança

- Esta constituição **prevalece** sobre qualquer outra prática, template ou instrução de agente de IA no repositório. Arquivos de agente (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`) **DEVEM** apontar para ela e não podem contradizê-la.
- **Emenda.**
  1. Abrir um PR que altere este arquivo.
  2. Atualizar o *Sync Impact Report* no topo.
  3. Propagar a mudança aos templates em `.specify/templates/`.
  4. Obter a aprovação do responsável pelo produto (Roberto Apolinário Sobrinho).
- **Versionamento semântico.**
  - MAJOR: remove ou redefine princípio, fronteira de domínio ou subdomínio canônico.
  - MINOR: adiciona princípio, seção ou portão.
  - PATCH: esclarecimento sem mudança de regra.
- **Revisão.** A cada mudança de versão do Documento Fundamental, e obrigatoriamente antes de iniciar cada fase, para verificar se os conflitos e pendências da seção 8 foram resolvidos e atualizar as regras.
- **Conformidade.** Todo PR declara os portões afetados. O `/speckit-analyze` é executado antes do `/speckit-implement` de cada especificação. Uma violação encontrada depois do merge vira tarefa de correção com prioridade máxima.

**Versão**: 1.0.0 | **Ratificada em**: 2026-11-24 | **Última emenda**: 2026-11-24
