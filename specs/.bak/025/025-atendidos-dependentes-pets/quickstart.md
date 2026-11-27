# Quickstart de validação: Atendidos — dependentes e pets (025)

Pré-requisitos: specs 001–024 no ar; negócio de pet (banho e tosa), salão infantil e clínica; consumidor titular. Contratos em [contracts/](./contracts/).

## 1. Cadastro

Cadastrar menor sem declaração → `subject.declaration_required`; com declaração → consentimento no registro central (022), nome e nascimento cifrados no banco. Adulto dependente com celular → SMS com "recusar"; adulto recusa → vínculo desfeito, titular avisado. Pet com campo "vacinas" → `subject.clinical_fields_not_allowed`. 11º pet → `subject.limit_reached`.

## 2. Agendar para quem

Titular com atendidos vê primeiro "para quem"; cadastra pet novo sem sair. Escolher o pet → só serviços que aceitam cão; "Banho" para porte G e pelagem dupla → duração base(G) + acréscimo(dupla) arredondada a 5 min; horários livres respeitam a duração; preço por porte aplicado e congelado. Agendamento mostra "para quem" em Meus agendamentos, avisos e agenda do negócio. Titular paga e acumula pontos; pacote do titular usado pelo pet.

## 3. O que o estabelecimento vê

Ficha do pet completa (sem dado clínico). Menor: só nome, idade, responsável e contato; na clínica, também a data de nascimento. Mudar o porte do pet depois → agendamentos passados mantêm o porte antigo.

## 4. Corresponsáveis e maioridade

Convidar corresponsável → aceite com OTP; ele agenda e paga; titular remove. Menor faz 18 anos em 30 dias → aviso; aos 18 vira adulto dependente; cria conta e assume o histórico → titular vê só passados, sem anotações.

## 5. Privacidade

```bash
pnpm test:privacy --filter subjects   # export e erase cobrem atendidos (responsável para menor e pet; o próprio adulto)
pnpm test:contract --filter subjects-events   # nenhum evento com nome ou nascimento de menor
```
