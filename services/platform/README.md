# platform (domínio de exemplo)

Valida o caminho completo de evento (G-IX): `ping()` grava o registro e o evento
`platform.example.pinged.v1` na outbox na mesma transação; o relay do `workers` publica no
exchange `platform.example`; o consumidor idempotente registra o recebimento; falhas esgotadas
vão para `platform.example.dlq`.
