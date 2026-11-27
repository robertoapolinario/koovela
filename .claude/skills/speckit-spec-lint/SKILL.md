---
name: speckit-spec-lint
description: Roda o lint de spec (CONST VI) na feature atual antes do /speckit-plan e para em caso de erro.
---

Rode a partir da raiz do repositório:

```sh
DIR=$(python3 -c "import json;print(json.load(open('.specify/feature.json'))['feature_directory'])")
pnpm spec:lint --spec "$DIR" || tools/dev/kn pnpm spec:lint --spec "$DIR"
```

- Se o comando sair com código diferente de 0, **pare**: mostre os problemas (arquivo:linha, regra, mensagem) e
  não continue o `/speckit-plan` até que sejam corrigidos.
- Se sair com 0, informe "spec-lint ok" e siga.
