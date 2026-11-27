# Quickstart de validação: Favoritos (031)

Pré-requisitos: specs 001–030 no ar; vitrine (024) com listagens sintéticas; consumidor com conta. Contratos em [contracts/](./contracts/).

## 1. Favoritar

Na vitrine, na página do estabelecimento e no perfil do profissional, favoritar → reflete em todas as telas em ≤ 1 s. 201º favorito → `favorite.limit_reached`.

## 2. Lista

Favoritos mostra foto, nome, categoria, nota (sem em saúde), próximo horário; distância só com localização permitida naquele momento. Agendar → fluxo com estabelecimento e profissional já escolhidos. Negócio sai da vitrine e despublica a página → "indisponível" sem link; volta → disponível. Profissional sai do negócio → indisponível.

## 3. Privacidade

```bash
pnpm test:isolation --filter favorites   # nada no schema do tenant; nenhum evento com consumer_id fora do discovery
pnpm test:privacy --filter favorites     # export e erase (022)
```

Painel do negócio: contagens por filial e profissional; abaixo de 5 → "menos de 5"; nenhuma identidade. Ser favoritado não habilita campanha (028 sem opt-in → nenhum envio).

## 4. Offline

Modo avião → última lista visível no app.
