# Quickstart de validação: Fiscal — NFS-e (017)

Pré-requisitos: specs 001–016 no ar; adaptador `fake` e, quando disponível, homologação de São Paulo; certificado A1 de teste. Contratos em [contracts/](./contracts/).

## 1. Configurar (O05, P09)

Negócio PJ em São Paulo: perfil fiscal completo, filial aponta o emitente, certificado A1 enviado (step-up) → validado e cifrado; senha não aparece em resposta nem em log:

```bash
pnpm test:security --filter fiscal-secrets   # senha e pfx nunca em log, resposta ou evento
```

Certificado de outro CNPJ → `fiscal.certificate_document_mismatch`. Serviço sem código → pendência e sem emissão automática. Tentar `issuer_mode=koovela` → `fiscal.koovela_issuer_disabled` (flag desligada). Emitente PF sem CNPJ → recibo não fiscal. Filial fora de São Paulo e sem adaptador → emissão indisponível com aviso.

## 2. Emissão automática (J7)

Concluir e pagar R$ 120 → nota autorizada com o valor pago e ISS; consumidor recebe a nota (011) e vê no agendamento concluído (C16/W18). Reenviar o evento 3× → uma nota só. "CPF na nota" desmarcado → sem CPF. Multa de falta, valor zero e sinal não convertido → sem nota. Pacote com o padrão `per_session` → nota por sessão concluída, pelo valor coberto; `on_sale` → nota na venda, sem nota nas sessões. Combo com dois códigos de serviço → duas notas, valor rateado. Sinal online + restante no local → uma nota só depois do total pago.

## 3. Falhas e cancelamento

Prefeitura fora do ar (fake) → `retrying` com intervalos crescentes até 72 h; > 24 h pendente → aviso ao Proprietário e Financeiro/Ops. Recusa → motivo em linguagem simples e o que corrigir. Estorno total dentro do prazo → nota cancelada; estorno parcial → pendência fiscal para o Proprietário.

## 4. Histórico e exportação (P23)

Listar por período, filial, emitente e estado com totais; detalhe com tentativas e link público. Exportar o mês em planilha e zip (XMLs e PDFs). Relatório de concluídos pagos sem nota. Certificado vencendo em 30 dias → aviso; vencido → emissão para com pendência.
