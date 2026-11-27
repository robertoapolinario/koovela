# Research: Atendidos — dependentes e pets (025)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D28 (atendido ligado ao titular), D29 (pet com duração por porte e pelagem), PEN-07 (pacote de sessões usável pelos atendidos com saldo do titular), PEN-05/PEN-10 (anotações ligadas ao atendido; consentimento do responsável), adulto dependente por declaração do titular com aviso e recusa pelo próprio adulto. Base: 003 (identidade global, OTP), 006 (`RegraDuracao`, tipos aceitos por serviço), 008 (duração), 009 (agendamento), 012 (saldo do titular), 015 (pontos do titular pagante, REQ-FID-032), 020 (`subject_person_id`), 022 (`HolderDataPort`). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e localização

- **Decisão**: submódulo `subjects` do domínio `identity` (identidade global, `koovela_identity`) (REQ-ATD-001/050). O estabelecimento **não** recebe o cadastro: cada agendamento leva uma **cópia mínima congelada** do atendido (`appointment_subject_snapshot` no tenant) com só os campos permitidos por tipo (REQ-ATD-030/031) e, para pet, porte e pelagem da época (REQ-ATD-006).
- **Por quê**: o mesmo atendido é agendado em vários negócios; mudanças valem para o futuro sem reescrever o passado.

## R2. Modelo do atendido

- **Decisão**: `service_subject` com `kind` (`minor` \| `adult_dependent` \| `pet`), titular, corresponsáveis, estado (`active` \| `archived` \| `independent`). Pessoas: nome e data de nascimento **cifrados por envelope** para menores (CONST IV, REQ-ATD-002); pet: nome, espécie (`dog` \| `cat`), raça, porte (`P` \| `M` \| `G` \| `GG`), pelagem (`short` \| `medium` \| `long` \| `double`), nascimento aproximado (mês/ano), foto opcional e cuidados de manejo (texto curto) — **sem campos clínicos** (REQ-ATD-004). Limite de 10 pessoas e 10 pets por titular (REQ-ATD-005). O "próprio consumidor" é o sujeito implícito (`self`), sem linha nova, para manter a v1.0 intacta.

## R3. Consentimentos e vínculos

- **Decisão**:
  - **Menor**: declaração de responsabilidade legal + consentimento específico (LGPD art. 14), com versão, data, aparelho e IP, no registro central de consentimentos (022) (REQ-ATD-002).
  - **Adulto dependente**: declaração de autorização do titular; se o titular informar o celular do adulto, ele recebe SMS com link para **recusar** o vínculo; recusa desfaz o vínculo, arquiva o atendido e registra (REQ-ATD-003).
  - **Corresponsável**: convite por celular, aceite com OTP; o titular remove a qualquer momento (REQ-ATD-040).

## R4. Agendamento "para quem"

- **Decisão**: passo inicial "para quem" no fluxo da 009 (só para quem tem atendidos), com cadastro rápido sem sair do fluxo (REQ-ATD-010). O catálogo (006) ganha `accepted_subjects` por serviço (`self`, `minor` com faixa de idade opcional, `adult_dependent`, `pet` por espécie; padrão `self`) e o filtro de serviços usa o tipo e a idade (REQ-ATD-011/020). Saúde aceita menores e adultos dependentes (resolve a parte "consulta para dependente" do C2; recurso compartilhado segue adiado, PEN-23) (REQ-ATD-015). O agendamento grava `subject_id` + snapshot; "Meus agendamentos", avisos (011) e agenda mostram "para quem" (REQ-ATD-014). Quem agendou (titular ou corresponsável) paga e acumula pontos (REQ-ATD-013). Pacotes do titular podem ser consumidos por atendidos (PEN-07): a reserva de sessão (012) usa a conta do pagador e registra o `subject_id`.

## R5. Duração e preço do pet

- **Decisão**: `RegraDuracao` versionada no catálogo (006) para serviços de pet: base por porte + acréscimo por pelagem, arredondada para o múltiplo de 5 min acima; preço por porte opcional em centavos (REQ-ATD-012/021). A 008 recebe a duração calculada na criação do hold; o preço por porte é congelado no agendamento (CONST III). Vertical pet com categorias "banho e tosa" e "adestramento", sem veterinário, vocabulário "tutor" e "pet" (i18n por vertical) (REQ-ATD-022).

## R6. Maioridade e independência

- **Decisão**: tarefa diária: 30 dias antes dos 18 anos, aviso ao titular e (se houver celular) ao jovem; aos 18, `minor` → `adult_dependent` (REQ-ATD-041). O atendido pode criar conta própria (003) e **assumir o histórico**: os agendamentos passam a ter como sujeito a nova conta; o titular continua vendo só os agendamentos passados, **sem anotações** (REQ-ATD-042).

## R7. Ficha, anotações e privacidade

- **Decisão**: ficha do pet no painel com dados do cadastro, tutor e histórico no negócio (REQ-ATD-030). Para menores, o estabelecimento vê só nome, idade (data de nascimento só em saúde), responsável e contato do responsável; nunca documentos (REQ-ATD-031). Anotações e alertas (020) ligados ao `subject_person_id`, com consentimento do responsável (REQ-ATD-032). `HolderDataPort` (022) cobre atendidos: exercido pelo responsável (menor e pet) ou pelo próprio adulto (REQ-ATD-043).

## R8. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Para quem eu agendo · cadastro do pet · agendar para quem | A conferir no Figma (DF 9.10) |
| Web do consumidor | Gestão de atendidos e passo "para quem" | Sem tela própria (seguir o app) |
| Painel | Ficha do pet · tipos de atendido e regra de duração em Serviços | P11 (ficha) · P12 (catálogo) |
| Colaborador | Atendido no detalhe | K02 · KD2 |
| Novas | Convite a corresponsável · aviso de maioridade · recusa do vínculo pelo adulto | Desenhar |
