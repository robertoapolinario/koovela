# Feature Specification: Negócio, filiais e onboarding

**Feature Branch**: `005-negocio-filiais-onboarding`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "005 negocio-filiais-onboarding — seguir a sequência da constituição (seção 10): J3 (autônomo) e J4 (rede), slug, link e QR. Depende de 002 e 003. Pendências PEN-11 e PEN-06. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: painel do cliente (onboarding, filiais, configurações, link e QR) · web do consumidor (página pública `koovela.com/{slug}` e `koovela.com/{slug}/{slug-da-filial}`) · app do consumidor (página do estabelecimento via link universal) · back-office (troca de slug publicado, pelo Suporte)

**Depende de**: 002 `tenancy-provisionamento` · 003 `identidade-acesso`

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, V, VI, XI, seções 2, 3, 5, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 1.1, 2.2, 2.4, 3.2, 3.4.4, 4, 6, 7, 8 (J3, J4), 9.1 a 9.3, 9.8, 12, 14 e 18. Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O consumidor chega à Koovela pelo **link e pelo QR do próprio estabelecimento** (DF 1.1). Para isso existir, o estabelecimento precisa se cadastrar sozinho, rápido, e sair com um endereço `koovela.com/{slug}` que nunca quebra, porque vai ser impresso em cartões, vitrines e balcões.

Há dois perfis de entrada muito diferentes:

- o **prestador autônomo** (DF 2.4), maior volume de cadastros e menor paciência: não pode ser obrigado a configurar filial, colaborador ou comissão antes do primeiro agendamento (J3);
- a **rede** (DF 2.2, `[D05]`), com várias filiais, que precisa abrir filial nova com o padrão das demais (J4, DF 3.2.11).

Regra estrutural (DF 4): **o cadastro é por negócio, não por filial**. Um Cliente (tenant) pode ter um ou mais negócios; cada negócio tem uma vertical e de 1 a N filiais; uma filial não atende duas categorias.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.4.4 | Onboardar tenant (KYC, recebedor, contrato) | Tempo de ativação |
| 3.2.11 | Operar várias filiais com padrão | Tempo para abrir filial |
| 3.2.13 | Não depender do WhatsApp pessoal | % fora do canal manual |
| 3.2.2 | Aumentar volume de clientes | Novos consumidores únicos/mês (origem link e QR) |
| DF 14 | Ativação | % de tenants com primeiro agendamento em 7 dias |

Personas: prestador autônomo; Proprietário de rede; Gerente de filial; consumidor que abre o link ou o QR; Suporte (troca de slug publicado).

---

## Clarifications

### Session 2026-11-25

- Q: O que o negócio precisa ter para publicar a página e aceitar agendamentos? → A: Catálogo e agenda: termos aceitos, 1 serviço e 1 profissional com horário. Sem KYC aprovado, só aceita pagamento no local; sem assinatura ativa, entra no período de teste.
- Q: Como tratar preço e publicidade nas verticais de saúde? (PEN-06) → A: O preço nunca aparece, em nenhum lugar (vitrine, página, app, confirmações). Contra a falta, existe uma taxa de agendamento fixa (por exemplo R$ 20 ou R$ 30), parametrizável pelo back-office e pelo cliente: paga no agendamento, abatida do valor cobrado no atendimento, devolvida no cancelamento dentro do prazo gratuito e retida na falta ou no cancelamento tardio. Fica restrito só o que mostra preço: sem promoção de preço, horário ocioso com desconto, vale-presente com valor nem benchmark de preço; avaliações privadas; fidelidade sem desconto em dinheiro; destaque pago permitido sem preço.
- Q: O recebedor do split é por negócio ou por filial? (PEN-11) → A: Por negócio: uma conta e um KYC por negócio, usados por todas as filiais; o modelo fica pronto para recebedor por filial no futuro.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autônomo pronto para receber agendamento em minutos (Priority: P1)

Como prestador autônomo (manicure, psicólogo, barbeiro), quero criar minha conta e meu negócio, escolher a vertical, cadastrar meus serviços e meu horário e sair com meu link e meu QR, sem configurar filial, equipe ou comissão (J3).

**Why this priority**: é o maior volume de cadastros (DF 2.4) e o caminho mais curto até o primeiro agendamento.

**Independent Test**: com uma pessoa sem conta, percorrer o onboarding do autônomo do zero até ver o próprio link publicado e o QR para baixar, medindo o tempo.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem conta, **When** escolhe "trabalho sozinho(a)", cria a conta de equipe (spec 003) e informa o nome do negócio, **Then** um tenant é provisionado (spec 002) e a pessoa vira Proprietária e Colaboradora do próprio negócio, sem precisar cadastrar filial.
2. **Given** o passo de vertical, **When** a pessoa escolhe a categoria (por exemplo, "manicure e pedicure" do cluster A, ou "psicologia" do cluster B), **Then** o negócio passa a usar o vocabulário e os campos padrão da vertical (por exemplo, "paciente" em saúde, "cliente" em beleza).
3. **Given** o autônomo, **When** informa onde atende, **Then** uma filial única é criada nos bastidores com esse endereço e o horário de trabalho informado, sem a palavra "filial" aparecer no fluxo.
4. **Given** os passos de serviços e horário (specs 006 e 007), **When** concluídos dentro do onboarding, **Then** o negócio atinge os requisitos de publicação (ver História 4) e o link e o QR ficam prontos.
5. **Given** um autônomo que atende em casa, **When** informa o endereço, **Then** pode escolher mostrar publicamente só o bairro, com o endereço completo enviado ao consumidor apenas após a confirmação do agendamento.
6. **Given** um onboarding interrompido, **When** a pessoa volta, **Then** continua do passo em que parou, com o que já preencheu.

---

### User Story 2 - Rede com várias filiais (Priority: P1)

Como Proprietário de rede, quero cadastrar meu negócio, criar várias filiais e convidar gerentes por filial, e depois abrir uma filial nova clonando a configuração de uma existente (J4, `[D05]`).

**Why this priority**: multi-filial é decisão da v1.0 (`[D05]`) e é a base do modelo de dados de agenda, financeiro e permissões.

**Independent Test**: criar um negócio com 3 filiais, cada uma com endereço e horário próprios; clonar uma delas e conferir que a nova herda a configuração e fica em rascunho até ser revisada.

**Acceptance Scenarios**:

1. **Given** uma pessoa que escolhe "tenho uma equipe ou mais de uma unidade", **When** conclui conta, negócio e vertical, **Then** o onboarding pede as filiais, cada uma com nome, endereço, telefone de contato e horário de funcionamento.
2. **Given** um negócio com filiais, **When** o Proprietário convida um Gerente com escopo de uma filial (spec 003), **Then** o Gerente vê e opera apenas aquela filial.
3. **Given** uma filial ativa, **When** o Proprietário escolhe "clonar filial", **Then** a nova filial nasce em `rascunho` com horário de funcionamento, exceções, configurações de exibição e, pelo contrato da spec 006, o catálogo disponível da original (as regras de comissão da spec 007 são do negócio e já valem para a filial nova); endereço, telefone e equipe NÃO são copiados.
4. **Given** uma filial em rascunho, **When** o Proprietário a ativa, **Then** ela passa a aparecer na página pública do negócio e a aceitar agendamentos, se cumprir os requisitos de publicação.
5. **Given** um Cliente com um segundo negócio de outra vertical (por exemplo, salão e clínica de estética), **When** cria o segundo negócio, **Then** ele tem slug, vertical e filiais próprios, dentro do mesmo tenant.
6. **Given** uma filial, **When** o Proprietário tenta fazê-la atender duas categorias diferentes, **Then** é recusado: a categoria é do negócio.

---

### User Story 3 - Slug, link e QR que nunca quebram (Priority: P1)

Como estabelecimento, quero um endereço `koovela.com/{slug}` único e estável, um link para compartilhar e um QR para imprimir, por negócio e por filial, e saber quantas pessoas chegaram por cada um.

**Why this priority**: o link e o QR são o canal de aquisição da v1.0 (DF 1.1); um QR impresso quebrado é um prejuízo físico.

**Independent Test**: criar um negócio, escolher o slug, publicar, baixar o QR, escanear com um celular sem o app e com o app; depois trocar o slug pelo suporte e verificar que o QR antigo continua funcionando.

**Acceptance Scenarios**:

1. **Given** o nome do negócio, **When** o onboarding sugere um slug, **Then** a sugestão é em minúsculas, sem acento, com hífen no lugar de espaço, única em toda a plataforma e fora da lista de nomes reservados; o Proprietário pode editar antes de publicar.
2. **Given** um slug já usado, reservado ou ofensivo, **When** escolhido, **Then** é recusado com alternativas sugeridas.
3. **Given** um negócio publicado, **When** o Proprietário tenta trocar o slug no painel, **Then** não consegue: depois de publicado, o slug só muda por pedido ao Suporte, com justificativa e registro na trilha de auditoria (spec 004).
4. **Given** um slug trocado pelo Suporte, **When** alguém abre o slug antigo, **Then** é redirecionado permanentemente (301) para o novo, para sempre; o slug antigo nunca é reutilizado por outro negócio.
5. **Given** a tela "Configurações, link e QR", **When** o Proprietário pede o QR, **Then** recebe um QR do negócio e um por filial, em formato para tela e para impressão (com a marca Koovela e o nome do negócio), que leva a `koovela.com/{slug}` ou `koovela.com/{slug}/{slug-da-filial}` marcado com origem "QR".
6. **Given** o link compartilhado e o QR, **When** um consumidor os abre, **Then** o app abre se estiver instalado e a web se não estiver (spec 001, links universais), e a visita fica contada por origem (link ou QR) e por filial.
7. **Given** um consumidor no Instagram ou no WhatsApp, **When** o link é colado, **Then** a pré-visualização mostra nome, foto e cidade do negócio.

---

### User Story 4 - Página pública do estabelecimento e publicação (Priority: P2)

Como estabelecimento, quero uma página pública com nome, logo, foto de capa, descrição, categoria, endereço com mapa, horários e filiais, e quero saber o que falta para publicá-la.

**Why this priority**: é o destino do link e do QR, e a primeira tela da J1 depois do cadastro do consumidor.

**Independent Test**: preencher o perfil do negócio, ver a lista de pendências de publicação diminuir até zero, publicar e abrir a página no navegador e no app.

**Acceptance Scenarios**:

1. **Given** um negócio, **When** o Proprietário abre o painel, **Then** vê uma lista de passos com estado (feito, pendente, opcional), com o tempo estimado de cada um e o que falta para publicar.
2. **Given** os requisitos mínimos de publicação, **When** todos estão cumpridos, **Then** o Proprietário pode publicar: bastam aceite dos termos, 1 serviço com preço (em saúde, sem preço público) e 1 profissional com horário; sem recebedor com KYC aprovado (spec 012), o negócio só aceita pagamento no local; sem assinatura ativa (spec 019), entra no período de teste.
3. **Given** a página publicada, **When** um consumidor a abre, **Then** vê nome, logo, capa, descrição, categoria, endereço (ou só o bairro, se o autônomo escolheu), mapa, horário de cada filial e, a partir das specs 006 e 009, serviços e o botão de agendar.
4. **Given** um negócio numa vertical de saúde, **When** a página é exibida, **Then** nenhum preço aparece (nem na página, nem na vitrine, nem no app, nem nas confirmações); a página mostra que há taxa de agendamento fixa, abatida do valor do atendimento; não há conteúdo promocional com preço.
5. **Given** um negócio despublicado pelo Proprietário, **When** alguém abre o link, **Then** vê "este estabelecimento não está recebendo agendamentos pela Koovela no momento", com a identidade visual, e não um erro.
6. **Given** um tenant `suspenso` (spec 002), **When** alguém abre o link, **Then** vê a mesma mensagem, sem revelar o motivo.
7. **Given** a página pública, **When** medida em 4G, **Then** carrega com LCP abaixo de 2,5 s (CONST 6).

---

### User Story 5 - Horário de funcionamento e exceções (Priority: P2)

Como Proprietário ou Gerente, quero definir o horário de funcionamento de cada filial por dia da semana, com intervalos, feriados e datas excepcionais, para que a agenda (spec 008) só ofereça horários em que a filial está aberta.

**Why this priority**: é o limite externo de toda disponibilidade; sem ele, o motor de agenda não tem fronteira.

**Independent Test**: configurar uma filial com horário de segunda a sábado, intervalo de almoço e um feriado; consultar o calendário da filial e conferir que os períodos fechados estão corretos.

**Acceptance Scenarios**:

1. **Given** uma filial, **When** o horário é definido por dia da semana com um ou mais intervalos, **Then** fica salvo no fuso da filial (padrão `America/Sao_Paulo`).
2. **Given** os feriados nacionais do ano, **When** a filial é criada, **Then** eles aparecem como sugestão de fechamento, que o Proprietário confirma ou ignora; feriados municipais e estaduais podem ser adicionados.
3. **Given** uma data excepcional (fechado ou horário especial), **When** cadastrada, **Then** prevalece sobre o horário semanal naquela data.
4. **Given** uma mudança de horário que deixa agendamentos futuros fora do novo horário, **When** salva, **Then** o sistema mostra quantos agendamentos ficam fora e não os cancela automaticamente; a decisão é do estabelecimento (spec 009).
5. **Given** um Gerente com escopo da filial X, **When** edita o horário de X, **Then** consegue; para a filial Y, é negado.

---

### User Story 6 - Dados cadastrais do Cliente e aceite dos termos (Priority: P2)

Como Proprietário, quero informar os dados cadastrais do meu negócio (pessoa física com CPF ou jurídica com CNPJ, razão social, nome fantasia, endereço) e aceitar os termos de uso, para habilitar cobrança, recebimento e nota fiscal nas specs seguintes.

**Why this priority**: recebedor e KYC (012), NFS-e (017) e assinatura (019) dependem desses dados; o aceite dos termos deixa claro que a Koovela intermedeia e não executa o serviço (CONST 5).

**Independent Test**: cadastrar um negócio de pessoa física e outro de pessoa jurídica, aceitar os termos e conferir o registro do aceite com hash, versão, IP, aparelho e horário.

**Acceptance Scenarios**:

1. **Given** um Proprietário, **When** informa CPF ou CNPJ, **Then** o documento é validado pelo dígito verificador e fica cifrado.
2. **Given** um CNPJ, **When** informado, **Then** razão social e endereço podem ser preenchidos a partir de consulta pública, com confirmação do Proprietário.
3. **Given** os termos de uso e a política de privacidade em vigor, **When** o Proprietário os aceita, **Then** fica registrado o hash do documento, a versão, o IP, o aparelho e o horário (CONST 5).
4. **Given** uma nova versão dos termos, **When** publicada, **Then** o Proprietário precisa aceitá-la no próximo acesso para continuar operando; o histórico de aceites é mantido.
5. **Given** o passo "Recebedor, KYC e certificado de NFS-e" do onboarding, **When** o Proprietário chega a ele, **Then** a tela é fornecida pelas specs 012 e 017, com um recebedor por negócio, usado por todas as filiais (`[PEN-11]` resolvido).

---

### Edge Cases

- **Dois negócios pedindo o mesmo slug ao mesmo tempo**: só o primeiro a confirmar fica com ele; o segundo recebe alternativas.
- **Slug que coincide com rota da plataforma ou subdomínio** (`app`, `painel`, `api`, `admin`, `bi`, `parceiros`, `status`, `cdn`, `www`, `pro`, `ajuda`, `termos`, `privacidade`, `.well-known` e similares): está na lista de reservados.
- **Slug com marca de terceiro** (por exemplo, nome de rede conhecida por quem não é dono): denúncia ao Suporte, que pode trocar o slug com registro; o slug retirado fica bloqueado.
- **Filial com slug igual ao de outra filial do mesmo negócio**: recusado; slugs de filial são únicos dentro do negócio.
- **Encerrar uma filial com agendamentos futuros**: só é permitido depois que eles forem remarcados ou cancelados; o link da filial encerrada redireciona para a página do negócio.
- **Encerrar a última filial ativa de um negócio**: o negócio fica despublicado automaticamente.
- **Endereço sem número ou em área rural**: aceito com ponto no mapa definido manualmente.
- **Provisionamento do tenant demora ou falha** (spec 002): o onboarding mostra "preparando sua conta" e, depois de 2 minutos, avisa que vai continuar em segundo plano e manda e-mail quando estiver pronto.
- **Pessoa que já é Colaboradora em outro tenant e cria o próprio negócio**: usa a mesma conta de equipe (spec 003) e escolhe o tenant ativo.
- **Fuso diferente** (filial fora de São Paulo, por exemplo no Amazonas): o fuso é da filial e é usado em toda exibição de horário dela.
- **QR impresso de uma filial que mudou de endereço**: continua válido, porque aponta para o slug, não para o endereço.

---

## Requirements *(mandatory)*

Formato: `REQ-NEG-NNN (origem: …)`.

### Functional Requirements

**Estrutura: Cliente, negócio e filial**

- **REQ-NEG-001** (origem: DF 4 | DF 6 | DF 19): O Cliente (tenant) DEVE poder ter um ou mais negócios; cada negócio tem exatamente uma vertical (cluster e categoria) e de 1 a N filiais; cada filial pertence a um único negócio.
- **REQ-NEG-002** (origem: DF 4.1 | D02): Na v1.0, as verticais disponíveis DEVEM ser as do cluster A (beleza e estética) e do cluster B (saúde), com as categorias listadas na DF 4.1; o modelo DEVE aceitar as verticais das fases 2 e 3 sem migração destrutiva (CONST 2).
- **REQ-NEG-003** (origem: DF 4 | CONST 11 glossário): A vertical DEVE definir vocabulário e campos padrão por negócio (por exemplo, "paciente" ou "cliente"); a interface usa os termos da vertical, e o código, o vocabulário canônico.
- **REQ-NEG-004** (origem: CONST 2): O negócio DEVE ter slug público, categoria e geolocalização desde a v1.0, para a vitrine da fase 2 (`[D26]`).
- **REQ-NEG-005** (origem: DF 4): Uma filial NÃO DEVE atender categorias diferentes da do seu negócio.

**Onboarding**

- **REQ-NEG-010** (origem: DF 2.4 | J3): O onboarding DEVE ter dois caminhos: "trabalho sozinho(a)" (autônomo) e "tenho equipe ou mais de uma unidade" (rede); o autônomo NÃO DEVE ser obrigado a cadastrar filial, colaborador ou comissão.
- **REQ-NEG-011** (origem: J3 | DF 2.4): No caminho autônomo, uma filial única DEVE ser criada automaticamente, e a pessoa DEVE receber os papéis de Proprietária e Colaboradora (spec 003), com o registro de colaborador criado pelo contrato da spec 007.
- **REQ-NEG-012** (origem: DF 9.2): O onboarding DEVE ter os passos: conta e negócio com vertical; filiais (só no caminho rede); serviços e preços (tela da spec 006); horários e colaboradores (horário de funcionamento desta spec, equipe e escalas da spec 007); recebedor, KYC e certificado de NFS-e (telas das specs 012 e 017).
- **REQ-NEG-013** (origem: DF 3.4.4): O progresso do onboarding DEVE ser salvo a cada passo e retomado de onde parou, em qualquer aparelho.
- **REQ-NEG-014** (origem: REQ-TEN-023): A criação do Cliente DEVE acionar o provisionamento do tenant (spec 002) e tratar a espera e a falha conforme os casos de borda.
- **REQ-NEG-015** (origem: DF 3.4.4 | DF 9.3): O painel DEVE mostrar uma lista de passos de configuração com estado (feito, pendente, opcional) e o que falta para publicar.
- **REQ-NEG-016** (origem: DF 3.4.4 | PEN-30): Os requisitos para publicar a página e aceitar agendamentos DEVEM ser só aceite dos termos, 1 serviço e 1 profissional com horário; sem KYC aprovado, só pagamento no local; sem assinatura ativa, período de teste (spec 019).

**Filiais**

- **REQ-NEG-020** (origem: D05 | DF 6): A filial DEVE ter nome, endereço com geolocalização, telefone de contato, fuso (padrão `America/Sao_Paulo`), horário de funcionamento, slug de filial opcional e estado.
- **REQ-NEG-021** (origem: D05 | DF 3.2.11 | DF 9.3): O Proprietário DEVE poder criar, clonar, ativar, pausar e encerrar filiais. A clonagem copia horário, exceções e configurações de exibição, e aciona o contrato da spec 006 para copiar o catálogo disponível; NÃO copia endereço, telefone nem equipe. As regras de comissão (spec 007) valem por negócio e por isso já valem para a filial nova, sem cópia.
- **REQ-NEG-022** (origem: DF 3.2.11): Abrir uma filial por clonagem DEVE levar até 10 minutos de trabalho do Proprietário.
- **REQ-NEG-023** (origem: edge case): Encerrar filial DEVE exigir que não haja agendamentos futuros; o link da filial encerrada DEVE redirecionar para a página do negócio. Encerrar a última filial ativa despublica o negócio.

**Horário de funcionamento**

- **REQ-NEG-030** (origem: DF 6 `HorarioFuncionamento` | CONST XI): O horário DEVE ser definido por filial, por dia da semana, com um ou mais intervalos, no fuso da filial; o armazenamento segue UTC no banco e conversão na borda (CONST XI).
- **REQ-NEG-031** (origem: DF 6): Exceções por data (fechado ou horário especial) DEVEM prevalecer sobre o horário semanal; feriados nacionais DEVEM ser sugeridos automaticamente e confirmados pelo estabelecimento.
- **REQ-NEG-032** (origem: CONST I): Mudar o horário NÃO DEVE cancelar agendamentos existentes; o sistema DEVE informar quantos ficam fora do novo horário e publicar evento para a spec 009.
- **REQ-NEG-033** (origem: CONST VII): O horário de funcionamento DEVE ser publicado por contrato e por eventos, para ser o limite externo da disponibilidade calculada pela spec 008.

**Slug, link e QR**

- **REQ-NEG-040** (origem: CONST 3): O slug do negócio DEVE ser único em toda a plataforma, em minúsculas, sem acento, com letras, números e hífen, entre 3 e 50 caracteres, e fora da lista de reservados e da lista de termos ofensivos.
- **REQ-NEG-041** (origem: CONST 3): Antes da publicação, o Proprietário pode editar o slug; depois, só o Suporte pode trocá-lo, com justificativa e registro na trilha de auditoria.
- **REQ-NEG-042** (origem: CONST 3): Todo slug anterior DEVE redirecionar permanentemente (301) para o atual e NUNCA ser reutilizado por outro negócio.
- **REQ-NEG-043** (origem: CONST 3): O slug de filial é opcional, único dentro do negócio, e segue as mesmas regras de formato, edição e redirecionamento.
- **REQ-NEG-044** (origem: CONST 3 | DF 6 "origem"): O QR DEVE ser gerado por negócio e por filial, em formato para tela e para impressão, apontando para o slug com marcação de origem "QR"; o link de compartilhar DEVE levar marcação de origem "link".
- **REQ-NEG-045** (origem: DF 6 "origem" | DF 3.2.2): Visitas à página pública DEVEM ser contadas por origem (link, QR, direto), por negócio e por filial, e a origem DEVE ser repassada ao agendamento (spec 009).
- **REQ-NEG-046** (origem: REQ-FND-090): O link e o QR DEVEM abrir o app quando instalado e a web quando não, sem bloqueio pedindo instalação.
- **REQ-NEG-047** (origem: DF 1.1): A página pública DEVE fornecer pré-visualização para redes sociais e mensageiros (nome, foto, cidade).

**Página pública e publicação**

- **REQ-NEG-050** (origem: DF 9.1 "Página do estabelecimento" | DF 9.8): A página pública do negócio DEVE mostrar nome, logo, foto de capa, descrição, categoria, filiais com endereço (ou bairro), mapa e horário; serviços e botão de agendar são acrescentados pelas specs 006 e 009.
- **REQ-NEG-051** (origem: CONST IV | edge case): O autônomo DEVE poder ocultar o endereço exato publicamente, mostrando só o bairro; o endereço completo vai ao consumidor só após a confirmação do agendamento.
- **REQ-NEG-052** (origem: PEN-06 | CONST 5): Nas verticais de saúde, o preço NÃO DEVE aparecer em nenhuma superfície (página, vitrine, app, confirmações, campanhas); DEVE existir taxa de agendamento fixa, com valor padrão no back-office (por exemplo R$ 20 ou R$ 30) e ajuste pelo negócio dentro da faixa permitida, abatida do valor do atendimento, devolvida no cancelamento dentro do prazo gratuito e retida na falta ou no cancelamento tardio. Promoções de preço, horário ocioso com desconto, vale-presente com valor e benchmark de preço ficam desligados; avaliações são privadas; fidelidade não dá desconto em dinheiro; destaque pago é permitido sem preço.
- **REQ-NEG-053** (origem: edge case | REQ-TEN-045): Negócio despublicado, tenant suspenso ou filial encerrada DEVEM mostrar mensagem neutra com a identidade visual, sem revelar o motivo e sem erro técnico.
- **REQ-NEG-054** (origem: CONST 6): A página pública DEVE ter LCP abaixo de 2,5 s em 4G e ser indexável por buscadores (pré-renderizada).
- **REQ-NEG-055** (origem: CONST XI): A página pública DEVE cumprir WCAG 2.1 AA.
- **REQ-NEG-056** (origem: CONST 3 `cdn.koovela.com`): Logo, capa e fotos DEVEM ser enviadas pelo painel, com limite de tamanho, conversão para formatos leves e servidas por `cdn.koovela.com`.

**Dados cadastrais e termos**

- **REQ-NEG-060** (origem: DF 2.2 | D04 | D20): O Cliente DEVE ter tipo (pessoa física ou jurídica), documento (CPF ou CNPJ, validado e cifrado), razão social ou nome, nome fantasia e endereço fiscal.
- **REQ-NEG-061** (origem: CONST 5): O aceite dos termos de uso e da política de privacidade DEVE registrar hash do documento, versão, IP, aparelho e horário; nova versão exige novo aceite para continuar operando.
- **REQ-NEG-062** (origem: CONST 5): Os termos DEVEM deixar claro que a Koovela intermedeia e não executa o serviço.
- **REQ-NEG-063** (origem: PEN-11 | J4): O recebedor DEVE ser por negócio, usado por todas as filiais; o modelo DEVE permitir recebedor por filial no futuro sem migração. Esta spec não implementa o recebedor (spec 012).

**Permissões e auditoria**

- **REQ-NEG-070** (origem: DF 7 | DF 2.2): Só o Proprietário DEVE criar e encerrar negócios e filiais, editar dados cadastrais, aceitar termos, publicar e despublicar. O Gerente DEVE poder editar horário, exceções e dados de contato da própria filial. A Recepção só lê.
- **REQ-NEG-071** (origem: CONST V | REQ-AUD-001): Publicar, despublicar, trocar slug, encerrar filial, alterar dados cadastrais e aceitar termos DEVEM gerar registro na trilha de auditoria.
- **REQ-NEG-072** (origem: CONST II): Negócios, filiais, horários e configurações DEVEM ficar no espaço de dados do tenant; só o índice público de slugs (slug → tenant, negócio, filial) fica num espaço global, para o gateway resolver o tenant pelo slug (REQ-IDN-040).

### Key Entities

- **Cliente** (`tenant`): tipo (PF ou PJ), documento cifrado, razão social ou nome, nome fantasia, endereço fiscal, aceites de termos, caminho escolhido (autônomo ou rede).
- **Negócio** (`business`): nome, vertical (cluster e categoria), slug, descrição, logo, capa, geolocalização principal, estado (rascunho, publicado, despublicado), nível do recebedor (negócio ou filial, conforme PEN-11).
- **Filial** (`branch`): negócio, nome, endereço, geolocalização, ocultar endereço exato (sim ou não), telefone, fuso, slug de filial, estado (rascunho, ativa, pausada, encerrada).
- **Horário de funcionamento**: filial, dia da semana, intervalos.
- **Exceção de horário**: filial, data, tipo (fechado ou horário especial), intervalos, origem (feriado sugerido ou manual).
- **Vertical** (`vertical`): cluster, categoria, vocabulário, campos padrão, regras padrão (inclusive o tratamento de preço em saúde).
- **Índice público de slugs** (global): slug, tenant, negócio, filial, estado, slug atual (para redirecionamento).
- **Slug reservado ou bloqueado**: termo, motivo.
- **Progresso do onboarding**: Cliente, caminho, passos e estado de cada um.
- **Aceite de termos**: Cliente, pessoa, documento, versão, hash, IP, aparelho, horário.
- **Visita à página pública** (agregada): negócio, filial, origem, data, contagem.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| Painel (onboarding, DF 9.2) | Conta e negócio com vertical · Filiais · Horários (parte de funcionamento) | Códigos do Figma registrados no plano |
| Painel (onboarding, DF 9.2) | Serviços e preços · Colaboradores · Recebedor, KYC e NFS-e | Moldura e navegação desta spec; conteúdo das specs 006, 007, 012 e 017 |
| Painel (DF 9.3) | Filiais: criar e clonar · Horário de funcionamento · Configurações, link e QR | Códigos do Figma registrados no plano |
| App do consumidor (DF 9.1) | Página do estabelecimento via deep link (parte de perfil) | `9.1.x` registrado no plano |
| Web do consumidor (DF 9.8) | Chegada pelo link ou QR · Página do estabelecimento (parte de perfil) | `W..` registrado no plano |
| Back-office | Troca de slug publicado (dentro de "Tenants", spec 021; nesta spec, ação mínima) | Registrado no plano |

---

## Regras e estados

**Negócio**: `rascunho` → `publicado` (requisitos cumpridos) ↔ `despublicado`. Tenant `suspenso` (spec 002) esconde a página sem mudar o estado do negócio.

**Filial**: `rascunho` → `ativa` ↔ `pausada` → `encerrada`. `encerrada` não volta; reabrir é criar ou clonar outra.

**Slug**: `sugerido` → `reservado` (escolhido, antes de publicar) → `publicado` → `substituído` (redireciona para o atual, para sempre). Um slug `substituído` ou bloqueado nunca é reutilizado.

**Onboarding**: cada passo `pendente` → `feito` (ou `opcional`); o onboarding termina quando o negócio é publicado, mas a lista de passos continua no painel enquanto houver pendências.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| CPF do autônomo (Cliente PF) | Pessoal, cifrado | Execução de contrato; obrigação legal fiscal (art. 7, II e V) | Contrato + 5 anos (guarda fiscal) | Proprietário; Financeiro/Ops; Suporte em sessão (mascarado) |
| CNPJ, razão social | Dado de empresa | Execução de contrato | Contrato + 5 anos | Idem |
| Endereço do autônomo que atende em casa | Pessoal, cifrado | Execução de contrato | Enquanto a filial existir; depois, conforme spec 022 | Proprietário; consumidor com agendamento confirmado (endereço completo); público (só bairro, se escolhido) |
| Telefone de contato da filial | Pessoal quando for celular do autônomo | Execução de contrato | Enquanto a filial existir | Público (se o estabelecimento quiser exibir) |
| Aceite de termos (IP, aparelho) | Pessoal | Obrigação legal e exercício de direitos (art. 7, II e VI) | Contrato + 5 anos | SRE; jurídico pelo SRE |
| Visitas à página pública | Agregadas, sem identificação | — | 2 anos | Proprietário; Gestão |

Regras: o slug não pode conter CPF nem número de telefone (validação de formato); fotos enviadas passam por remoção de metadados (localização do aparelho).

---

## Permissões

Recorte da matriz RBAC (DF 7), ações novas:

| Ação | Colaborador | Recepção | Gerente | Proprietário | Suporte | SRE |
|---|---|---|---|---|---|---|
| Criar negócio e filial; clonar; encerrar filial | — | — | — | ✔ | — | — |
| Editar dados cadastrais e aceitar termos | — | — | — | ✔ | — | — |
| Publicar e despublicar negócio | — | — | — | ✔ | — | — |
| Editar horário e exceções | — | — | ✔ filial | ✔ | ✔* | — |
| Editar perfil público (logo, capa, descrição) | — | — | — | ✔ | ✔* | — |
| Baixar link e QR | ✔ | ✔ | ✔ filial | ✔ | ✔* | — |
| Trocar slug publicado | — | — | — | — (pede ao Suporte) | ✔ auditado | ✔ auditado |

`✔*` = apenas em sessão de suporte (spec 003), registrada e com expiração.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `tenancy.client.created.v1` | Cliente criado (dispara o provisionamento) |
| `tenancy.business.created.v1` / `.published.v1` / `.unpublished.v1` | Ciclo do negócio |
| `tenancy.business.slug_changed.v1` | Troca de slug (com o anterior) |
| `tenancy.branch.created.v1` / `.cloned.v1` / `.activated.v1` / `.paused.v1` / `.closed.v1` | Ciclo da filial |
| `tenancy.branch.opening_hours_changed.v1` | Mudança de horário ou exceção (consumido pela spec 008) |
| `tenancy.client.terms_accepted.v1` | Aceite de termos |

### Eventos de produto e métricas

| Métrica | Origem | Meta |
|---|---|---|
| Tempo de ativação (conta criada → negócio publicado), autônomo e rede | DF 3.4.4 | Autônomo: mediana até 15 min; rede: acompanhada |
| Funil do onboarding (conclusão de cada passo) | DF 3.4.4 | Acompanhada por passo |
| Tempo para abrir filial por clonagem | DF 3.2.11 | Até 10 min |
| % de tenants com primeiro agendamento em 7 dias | DF 14 | Acompanhada (completa com a spec 009) |
| Visitas à página por origem (link, QR, direto) | DF 3.2.2 · DF 6 | Acompanhada |
| Conversão visita → agendamento por origem | DF 3.2.13 | Acompanhada (completa com a spec 009) |
| LCP da página pública (p75, 4G) | CONST 6 | Abaixo de 2,5 s |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Metade dos autônomos sai do "criar conta" até o link publicado em até 15 minutos, sem precisar ver as palavras "filial", "colaborador" ou "comissão".
- **SC-002**: Um Proprietário abre uma filial nova por clonagem em até 10 minutos de trabalho.
- **SC-003**: 100% dos slugs antigos continuam levando ao negócio certo depois de qualquer troca, e nenhum slug é reutilizado por outro negócio.
- **SC-004**: O QR baixado, impresso e escaneado abre a página do negócio (no app ou na web) em 100% dos testes com aparelhos Android e na web.
- **SC-005**: A página pública carrega com LCP abaixo de 2,5 s em 4G para 75% das visitas.
- **SC-006**: 100% das visitas à página pública têm origem registrada (link, QR ou direto).
- **SC-007**: 100% dos aceites de termos têm hash, versão, IP, aparelho e horário registrados.
- **SC-008**: Nenhuma mudança de horário de funcionamento cancela agendamento existente sem decisão do estabelecimento.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-11** — recebedor por negócio ou por filial | Modelo do negócio e da filial; passo de recebedor no onboarding; spec 012 | **Resolvido (clarify 2026-11-25)**: por negócio |
| **PEN-06** — preço e publicidade em saúde | Página pública e catálogo nas verticais de saúde | **Resolvido (clarify 2026-11-25)**: preço nunca aparece; taxa de agendamento fixa abatida |
| Requisitos de publicação (REQ-NEG-016) | Tempo de ativação; dependência das specs 012 e 019 | **Resolvido (clarify 2026-11-25)**: catálogo + agenda |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **C2** | Saúde na v1.0 atende profissional solo de sala única (DF 4.1); nenhuma estrutura de recurso nesta spec (o `resource_id` latente é da spec 008) |
| **PEN-02** | ASSUMIDO (spec 001): koovela.com pertence a esta plataforma |
| **PEN-04** | Não afeta esta spec; a ligação colaborador × filial é da spec 007 |
| **PEN-30** | O critério de "tenant ativado" para parceiros (fase 3) usa os eventos desta spec; a definição fica para a spec 038 |
| Troca de slug publicado | ASSUMIDO: só pelo Suporte, com redirecionamento permanente (CONST 3: "imutável depois de publicado, com redirecionamento a partir de slugs antigos") |

---

## Fora do escopo desta especificação

- Cadastro de serviços, preços, combos e pacotes (spec 006).
- Colaboradores, vínculos, escalas, folgas e comissão (spec 007); aqui só a criação do registro do autônomo como colaborador, via contrato.
- Recebedor, KYC e split (spec 012) e certificado e emissão de NFS-e (spec 017); aqui só a moldura do passo e o nível do recebedor.
- Assinatura Koovela, planos e cobrança (spec 019).
- Botão de agendar e fluxo de agendamento (spec 009).
- Vitrine, busca e ranking (spec 024).
- Tela "Tenants" completa e KYC no back-office (spec 021).
- Widget de agendamento embutível em site de terceiros (CONST 3, decisão futura).
- Domínio próprio do estabelecimento (white label, fora por ora, `[D36]`).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: autônomo publicado em até 15 minutos (mediana); filial por clonagem em até 10 minutos; slug de 3 a 50 caracteres; visitas agregadas guardadas por 2 anos.
- A sugestão de feriados usa o calendário nacional; feriados estaduais e municipais são cadastrados pelo estabelecimento na v1.0.
- O preenchimento automático por CNPJ usa fonte pública gratuita, respeitando o custo zero da spec 001 quando possível; sem ela, o preenchimento é manual.
- O Gerente não cria filiais nem altera dados cadastrais; edita só horário, exceções e contato da própria filial.
- No caminho autônomo, a filial criada automaticamente pode ser convertida em rede depois (criar a segunda filial), sem perder dados.
- A lista de slugs reservados é mantida pelo SRE no back-office e inclui todas as rotas e subdomínios da CONST 3.
