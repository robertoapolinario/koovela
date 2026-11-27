# Quickstart de validação: Negócio, filiais e onboarding (005)

Pré-requisitos: specs 001 a 004 no ar localmente. Para os passos de serviços e horários, usar os *stubs* de evento (`pnpm koovela fake-event catalog.service.published.v1 …`) até as specs 006 e 007 existirem. Contratos em [contracts/](./contracts/).

## 1. Autônomo do zero até o link (História 1)

1. `http://painel.koovela.localhost/comecar` → "trabalho sozinho(a)", criar conta de equipe (spec 003), nome do negócio, vertical "manicure e pedicure".
2. Tela "preparando sua conta" até o tenant ficar `active` (spec 002); fechar o navegador no meio e voltar → continua do passo salvo.
3. Informar CEP; rua e bairro preenchidos; ponto no mapa; marcar "mostrar só o bairro".
4. Simular serviço publicado e horário do profissional; aceitar os termos.
5. Painel P01: lista de passos com "pode publicar"; publicar; P26 mostra link e QR.

Esperado: nenhuma palavra "filial" no fluxo; a pessoa é Proprietária e Colaboradora; evento `tenancy.client.onboarded.v1` com `path=solo`; tempo total medido.

## 2. Rede com filiais e clonagem (História 2)

Caminho "tenho equipe", 3 filiais com horários diferentes; convidar Gerente da filial 1 (spec 003) → ele só vê a filial 1. Clonar a filial 2 (P25) → nova em `draft` com horário e exceções, sem endereço, telefone ou equipe; evento `tenancy.branch.cloned.v1`. Tentar dar à filial outra categoria → recusado.

## 3. Slug, link e QR (História 3)

- `GET /v1/slugs/availability?slug=app` → `reserved`; `slug=estudio-sintetico-1` (já usado) → `taken` com sugestões.
- Dois pedidos simultâneos do mesmo slug (`pnpm koovela race slug teste-corrida`) → um vence.
- Depois de publicado, editar o slug no painel → recusado. Troca pelo Suporte (`POST /v1/admin/slugs/{slug}/change`) com justificativa → slug antigo responde 301 para o novo e aparece na trilha (spec 004); tentar reservar o antigo para outro negócio → recusado.
- Baixar QR em SVG e PDF; escanear com Android com e sem o app (spec 001).
- Colar o link no WhatsApp Web → pré-visualização com nome, capa e cidade.

## 4. Página pública e publicação (História 4)

`http://koovela.localhost/<slug>`: nome, logo, capa, descrição, filiais, mapa (OpenFreeMap), horários. Negócio de saúde → nenhum preço e aviso da taxa de agendamento. Despublicar ou suspender o tenant → mensagem neutra. `pnpm test:lighthouse --url /<slug>` → LCP < 2,5 s (perfil 4G); `pnpm test:a11y` → zero violações AA. Visitas por `?src=qr` e `?src=link` aparecem em P26 no dia seguinte (ou após `pnpm koovela jobs run page-visits-flush`).

## 5. Horário de funcionamento (História 5)

P18: segunda a sábado com intervalo de almoço, confirmar feriados nacionais sugeridos, adicionar um feriado municipal, uma data com horário especial. `GET /v1/tenant/branches/{id}/opening-hours` reflete tudo no fuso da filial; filial em `America/Manaus` exibe horários no fuso dela. Gerente da filial X edita X (ok) e Y (404). Mudar horário com agendamentos futuros fora → contagem informada (ou "não disponível" antes da 009), nada cancelado.

## 6. Dados cadastrais e termos (História 6)

PF com CPF e PJ com CNPJ (consulta à BrasilAPI preenche razão social para confirmar); CPF inválido recusado; documento cifrado no banco (`pnpm test:pii`). Aceitar termos → registro com hash, versão, IP, aparelho e horário. Publicar nova versão dos termos (`pnpm koovela terms publish --version 2`) → painel bloqueia com `tenancy.terms_acceptance_required` até aceitar.
