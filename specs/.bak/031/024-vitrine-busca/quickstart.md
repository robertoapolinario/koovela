# Quickstart de validação: Vitrine e busca (024)

Pré-requisitos: specs 001–023 no ar; Meilisearch no compose; 10 mil filiais sintéticas em 3 cidades (`pnpm koovela seed:discovery`); política de privacidade revista publicada (022). Contratos em [contracts/](./contracts/).

## 1. Busca (C00 e web)

Buscar "escova" e "escva" (erro) → mesmos resultados; sinônimo "progressiva" → "alisamento". "Perto de mim" pede a localização só ao tocar; conferir logs, traces e banco: coordenada ausente.

```bash
pnpm test:privacy --filter discovery-location   # nenhuma coordenada persistida ou logada
pnpm test:contract --filter discovery-health    # nenhuma resposta com preço ou avaliação de saúde
```

Cartão mostra nome, categoria, distância, nota (quando pública), preço "a partir de" (sem em saúde), próximo horário e foto. Sem resultados → alternativas (categoria parecida, raio maior).

## 2. Ordenação e filtros

Explicação dos critérios visível. Dois negócios empatados alternam por dia, estáveis no mesmo dia. Negócio novo sem avaliações não cai ao fundo nos primeiros 60 dias. Filtros (hoje, amanhã, preço, nota, distância, categoria, pagamento online, acessibilidade) atualizam lista e mapa em ≤ 1 s. Autônomo com endereço oculto → área aproximada no mapa.

```bash
pnpm test:load --filter discovery   # 100 buscas/s com 10 mil filiais: p95 ≤ 1 s
```

## 3. Agendamento em uma tela

Escolher serviço, profissional e horário → resumo → agendamento com `origin = discovery` pelo fluxo da 008/009/010/012; sem taxa extra ao tenant.

## 4. Participação (painel)

Proprietário entra na vitrine com requisitos faltando → `pending` com lista e prévia; completa → `active`. Sair → some do índice em ≤ 15 min; link e QR continuam. Suspensão (019) → `paused` automaticamente.

## 5. Regiões (back-office)

Região com 12 participantes → não atinge a base; com 15 em 3 km → `meets_minimum`; Gestão abre → convites. Fora de região aberta → resultados mais próximos + "avise-me".

## 6. SEO e páginas públicas

`koovela.com/sao-paulo/cabeleireiro` pré-renderizada e indexável; LCP < 2,5 s em 4G (Lighthouse CI); slug de negócio igual a cidade → bloqueado na 005. axe AA sem violações; em 3G, texto antes das imagens.

## 7. Privacidade e moderação

"Lembrar minhas buscas" desligado por padrão; ligado → histórico entra na exportação e na eliminação (022). Banner de medição com "Recusar" tão visível quanto "Aceitar". Denunciar um negócio → fila; Gestão retira com aviso e trilha. Busca com termo ofensivo → sem resultados nem sugestões.
