# Quickstart de validação: Privacidade e direitos do titular (022)

Pré-requisitos: specs 001–021 no ar; consumidora com dados em 2 estabelecimentos (um de saúde com anotações), cartão salvo, pontos, avaliações. Contratos em [contracts/](./contracts/).

## 1. Portão de CI

```bash
pnpm test:privacy --filter holder-ports   # todo domínio com coluna x-pii tem HolderDataPort
pnpm test:e2e --filter privacy            # exportar e eliminar; nada sem guarda legal sobra
```

## 2. Acesso e exportação

Perfil → Meus dados: categorias e lista dos 2 estabelecimentos na hora. Pedir exportação com OTP → pacote em ≤ 24 h (JSON + PDF); download com OTP; depois de 7 dias → `privacy.export_expired`.

## 3. Eliminação

Prévia mostra o que some, o que fica bloqueado (pagamentos e notas até 5 anos) e efeitos (agendamento futuro cancelado sem multa, pontos perdidos). Confirmar com OTP → conta eliminada; estabelecimentos recebem item com prazo de 15 dias; um justifica guarda de pagamentos (base e prazo); o outro não responde → plataforma elimina no dia 15 e registra. Trilha mantém pseudônimos sem nome. PSP e provedor de mensagens: remoção confirmada. Comprovante entregue. Eliminação parcial só de um estabelecimento também funciona.

## 4. Backup

Restaurar backup anterior à eliminação em homologação → `privacy replay-erasures --since <data>` → titular não reaparece; anotações ilegíveis (chave destruída).

## 5. Consentimentos e correção

Meus consentimentos lista comunicação, cartão, ofertas e anotações; revogar ofertas → domínio dono aplica em ≤ 1 min. Corrigir nome na conta global → vale em todos; corrigir observação de um estabelecimento → item para ele em 15 dias.

## 6. Retenção e estabelecimento

Tarefa diária aplica a tabela; aviso 30 dias antes ao estabelecimento para decidir. Proprietário tenta aumentar retenção de avaliações → `privacy.category_not_extendable`. Exportação completa do tenant (step-up) inclui base e histórico com anotações. Tenant cancelado exporta por 90 dias; arquivado → aviso 30 dias antes da eliminação; conta global dos consumidores mantida.

## 7. Encarregado e incidentes

Pedido por e-mail → verificação por OTP → mesma fila. Incidente com risco relevante → lista de afetados e rascunhos (ANPD, tenants, titulares) com prazo.
