# Research: Atendimento no endereço e orçamentos (033)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D36 (fase 3), D40 (local por serviço, deslocamento embutido no preço, orçamento opcional com fotos), PEN-27 (área por raio, padrão 10 km, ou por lista de bairros, à escolha da filial), PEN-31 (prazo de resposta e validade configuráveis: limites no back-office, valor no negócio; iniciais 48 h e 7 dias), PEN-06 (saúde segue a vertical), PEN-26 (filtro só em região aberta). Base: 005 (geocodificação BrasilAPI + Nominatim com cache; mapa MapLibre/OpenFreeMap), 006 (versão do serviço, `duration_rule` latente da D29), 008 (ocupação e células de 5 min como garantia), 009 (estados, check-in, preço e versões congelados, projeção "Meus agendamentos"), 010 (tolerância de atraso e no-show), 011 (avisos), 012 (pagamento antecipado), 020 (cifragem por envelope e fotos privadas por URL assinada), 022 (retenção e `HolderDataPort`), 024 (vitrine, moderação), 025 (atendidos e snapshot), 030 (combos). Restrição: custo zero, nenhum serviço pago. Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Donos

- **Decisão** (CONST 4.4):
  - `catalog`: atributos `location` e `quote_mode` na versão do serviço.
  - `scheduling`: área de atendimento, tempo de deslocamento, segmentos de deslocamento na ocupação, rota do dia e ações de campo.
  - `quotes` (novo domínio, schema do tenant): pedido, mensagens, fotos e orçamento. A entidade é `quote_request`, reaproveitada pela 035 (REQ-ORC-009).
  - `identity`: endereços do consumidor (conta global) e o veículo como novo `kind` de atendido (submódulo `subjects` da 025).
  - `discovery`: filtro "atende no meu endereço".

## R2. Local do serviço e modo de orçamento

- **Decisão**: `catalog_service_version` ganha `location` (`on_premises`, o padrão, ou `customer_address`) e `quote_mode` (`none`, o padrão, `accepts` ou `requires`). Os dois valores entram na versão (CONST III) (REQ-END-001, REQ-ORC-001).
  - Não existe campo de taxa de deslocamento. O preço é único dentro da área (REQ-END-002).
  - `requires` deixa o preço público ausente. `accepts` mantém o preço como referência.
  - Oferecer os dois locais exige dois serviços.
  - A validação do combo (006/030) rejeita etapas com `location` diferente, com o erro `catalog.combo_mixed_location` (REQ-END-014).
  - Evento `catalog.service.location_changed.v1`.

## R3. Área de atendimento e geocodificação (PEN-27)

- **Decisão**: `scheduling_service_area` versionada por filial, com dois modos (REQ-END-003):
  - `radius`: `radius_km` (padrão 10, de 1 a 100) a partir do ponto real da filial (005);
  - `neighborhoods`: lista de bairros normalizados (sem acento e caixa baixa) com o código IBGE do município.
- **Verificação**: usa o **CEP e o bairro** do endereço, nunca a coordenada exata da casa.
  - CEP → bairro, cidade e coordenada do **centróide do CEP** pela BrasilAPI. Sem coordenada, Nominatim pelo logradouro e CEP, no limite de 1 requisição por segundo. Tudo fica num cache global `geo_cep_cache`, que não é dado pessoal porque um CEP é uma área (REQ-END-005).
  - No modo raio, compara a distância de haversine entre o centróide do CEP e a filial com `radius_km`. No modo bairros, o bairro do CEP, ou o informado, tem de estar na lista do mesmo município.
  - CEP geral de cidade ou área rural: bairro e ponto de referência viram obrigatórios. A verificação usa o bairro; no modo raio, usa o centróide do bairro (base IBGE da 024).
- **Alternativas**: geocodificar a casa (guarda coordenada pessoal precisa sem necessidade); serviço pago de geocodificação (viola o custo zero).

## R4. Tempo de deslocamento na agenda (008)

- **Decisão**: `scheduling_service_area.travel_min` (padrão 30, de 0 a 180, múltiplo de 5) (REQ-END-004, REQ-END-011).
  - A ocupação de um atendimento no endereço ganha um **segmento de deslocamento**: uma ocupação filha `kind = travel` com `parent_occupancy_id`, que ocupa as células de `[início_protegido − travel_min, início_protegido)` do profissional. A PK `(professional_id, cell_start)` continua sendo a garantia (SC-001). O segmento aparece na agenda da equipe como "deslocamento" e nunca para o consumidor.
  - **Mesmo endereço**: cada atendimento leva uma `address_key`, um HMAC-SHA256 do endereço normalizado (CEP, número e complemento) com a chave do tenant. A chave não é reversível e só serve para comparar. O deslocamento é dispensado quando o atendimento anterior do mesmo profissional tem a mesma chave e termina no início protegido do novo.
  - **Inserção antes de um atendimento no mesmo endereço**: na mesma transação, o hold remove o segmento de deslocamento do atendimento seguinte, que deixa de ser necessário.
  - **Cancelamento do anterior**: a 009 dispara a recomposição. O sistema tenta recriar o segmento do seguinte. Se houver conflito de células, abre uma pendência para a Recepção ("deslocamento sem tempo"), sem desfazer nada sozinho.
  - O cálculo de disponibilidade recebe `address_ref` e soma `travel_min` à janela protegida, exceto no caso de mesmo endereço. Isso entra como novo parâmetro do contrato da 008, retrocompatível.
- **Alternativas**: tempo de rota real (fora do escopo e com custo); somar o deslocamento à duração do serviço (quebra a exceção de mesmo endereço e polui a duração do serviço).

## R5. Endereços do consumidor

- **Decisão**: `identity_consumer_address` na conta global (`koovela_identity`), com CEP, rua, número, complemento, bairro, cidade, UF e ponto de referência **cifrados por envelope** (CONST 3). Em claro ficam só o CEP, o código IBGE e o bairro normalizado, necessários para verificar a área sem decifrar. São até 10 endereços por consumidor.
  - Na criação do agendamento, um snapshot cifrado com a chave do tenant (`appointment_address_snapshot`) é copiado para o tenant (REQ-END-010).
  - A retenção do snapshot segue a do agendamento (022). O endereço da conta fica até o consumidor remover. O `HolderDataPort` (022) cobre os dois.
  - **Mudança após a confirmação**: verifica a área de novo e recompõe o deslocamento (R4). Fora da área ou com conflito de agenda, a mudança é rejeitada. Se aceita, a Recepção é avisada pela 011 (REQ-END-013).

## R6. Rota do dia

- **Decisão**: `GET /v1/pro/route/today` no `pro-mobile` e no `/pro` do `tenant-web` (REQ-END-020, REQ-END-023).
  - Devolve só os atendimentos atribuídos ao colaborador, no dia local da filial, com `location = customer_address` e estado `CONFIRMADO` ou `EM_ATENDIMENTO`, em ordem de horário.
  - O servidor decifra o endereço a cada requisição e registra o acesso na auditoria.
  - Atendimentos concluídos, cancelados ou de outros dias voltam sem endereço, e a API recusa a consulta (`scheduling.address_not_accessible`). Recepção, Gerente e Proprietário veem o endereço pela filial, pelo detalhe do agendamento.
  - "Abrir no mapa" monta a URL do sistema (`geo:` no Android, `maps:` no iOS e Google Maps na web) com o endereço em texto. Nenhuma coordenada é guardada. O mapa abre em 2 toques (SC-005).
  - **Offline** (REQ-END-024): no início do dia, a rota vai para o SQLite cifrado, com a chave no `expo-secure-store`. Ela é apagada na virada do dia local, no logout ou quando o vínculo termina. Ações feitas offline entram numa fila idempotente.

## R7. Ações de campo

- **Decisão**:
  - **"Cheguei"** faz o check-in da 009 (`CONFIRMADO` → `EM_ATENDIMENTO`), com o evento `scheduling.appointment.arrived_at_address.v1` e aviso ao consumidor pela 011 (REQ-END-021).
  - **"Cliente ausente"** só fica disponível depois da tolerância de atraso da política congelada (010). A ação chama a marcação de `NO_SHOW` com as regras de multa da 010.
  - **"Vou atrasar"** recebe a estimativa (de 5 a 120 min) e gera `scheduling.appointment.running_late.v1`. A 011 avisa só o consumidor do próximo atendimento da rota (REQ-END-022), e o aviso não altera a agenda.
  - As permissões seguem a tabela da spec, e a Recepção, o Gerente e o Proprietário podem agir pela filial.

## R8. Orçamentos

- **Decisão**: domínio `quotes` no schema do tenant. Um `quote_request` é sempre de um consumidor para uma filial e um serviço, sem leilão.
  - **Pedido** (REQ-ORC-002): descrição de até 1.000 caracteres cifrada, até 5 fotos, endereço (snapshot, se o serviço for no endereço), veículo (snapshot, se automotivo) e preferência de datas (até 3 faixas).
  - **Estados** (REQ-ORC-003/006):
    - pedido: `sent` → `answered` | `declined` | `info_requested` (→ `sent`) | `expired`;
    - orçamento: `valid` → `accepted` | `rejected_by_consumer` | `expired`.
    - Cabe uma rodada de mensagens no estado `info_requested` (até 3 mensagens de cada lado, 1.000 caracteres cada). A resposta do consumidor volta o pedido para `sent` e reinicia o prazo.
  - **Prazos (PEN-31)** (REQ-ORC-004):
    - `quotes_limits` global, configurado no back-office, define o mínimo e o máximo do prazo de resposta e da validade;
    - `quotes_settings` do negócio escolhe o valor dentro desses limites, com 48 h e 7 dias como valores iniciais do seed de configuração;
    - o pedido e o orçamento congelam o prazo vigente quando são criados;
    - uma tarefa do `workers` expira pedidos e orçamentos, e a 011 avisa o consumidor.
  - **Aceite** (REQ-ORC-005/008):
    - o consumidor só aceita orçamento em `valid`;
    - o aceite abre a escolha de horário da 008 com a duração do orçamento;
    - a 009 cria o agendamento com `price_snapshot_cents` igual ao preço do orçamento, `frozen.quote_id` e `quote_version` (SC-004);
    - a validade vale para o aceite, não para a data do atendimento;
    - pagamento antecipado, se o serviço exigir, segue a 012 com o preço do orçamento.
  - **Leitura do consumidor entre tenants**: mesmo padrão de "Meus agendamentos" (009 R5), com a projeção `koovela_projections.consumer_quotes_index` (estado, negócio e serviço, sem descrição nem fotos).
- **Alternativas**: orçamento com vários itens (fora do escopo); pedido para vários negócios de uma vez (a spec exclui o leilão).

## R9. Fotos do orçamento

- **Decisão** (REQ-ORC-007): mesmo esquema da 020.
  - Upload por URL assinada de curta duração (PUT, 10 min) para o bucket privado do Object Storage, depois de checar o pedido. Aceita JPEG, PNG, HEIC e WebP, até 10 MB.
  - O `workers` remove o **EXIF**, incluindo a localização, converte para WebP, gera miniatura e cifra por envelope com a chave do tenant. O original não tratado é apagado.
  - Leitura por URL assinada de 5 min em `cdn.koovela.com`, só para o consumidor dono e para Recepção, Gerente e Proprietário da filial.
  - Aviso na tela: sem pessoas e sem documentos.
  - **Retenção**: 90 dias depois do estado final do pedido, salvo se ele virou agendamento, caso em que segue o prazo do agendamento. A limpeza é uma tarefa diária, com registro.
  - **Denúncia** de foto inadequada vai para a fila de moderação da 024/021, que recebe só a referência e um acesso temporário para a Gestão.

## R10. Veículo como atendido

- **Decisão**: `service_subject.kind` ganha `vehicle` (REQ-END-030).
  - `service_subject_vehicle` guarda tipo (`car`, `motorcycle` ou `utility`), marca, modelo, cor, porte (`S`, `M` ou `L`) e placa opcional cifrada, com até 10 veículos por titular.
  - O catálogo aceita `accepted_subjects: vehicle{types}`.
  - A `duration_rule` da 006 ganha `base_by_vehicle_size` e `price_by_vehicle_size_cents` (REQ-END-031), com o mesmo arredondamento de 5 min da 025.
  - O snapshot no tenant (`appointment_subject_snapshot`) leva tipo, marca, modelo, cor, porte e placa.
  - O histórico do veículo no negócio é uma consulta às próprias ocorrências por `subject_id`, nunca à conta global (REQ-END-032).
  - A placa entra no `HolderDataPort`.

## R11. Vitrine: "atende no meu endereço"

- **Decisão**: a listagem da 024 ganha `home_service` (já reservado) e `service_area` público (modo, raio e centro da filial, ou lista de bairros), projetados por `scheduling.branch.service_area_changed.v1` (REQ-END-012).
  - Ao aplicar o filtro, o endereço informado é geocodificado pelo CEP (R3), sem ser guardado nem registrado em log (como a localização na 024).
  - O Meilisearch recupera os candidatos com `home_service = true` e `_geoRadius` de até 100 km. O `discovery` filtra cada um pelo raio ou pelos bairros.
  - O filtro só aparece em regiões abertas (PEN-26).

## R12. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel do cliente | Onde cada serviço é feito (local, orçamento, área, deslocamento) | Nova (DF 9.11), a conferir no Figma |
| Painel do cliente | Orçamentos recebidos (lista, responder, recusar, pedir informação) | Nova (DF 9.11) |
| App do consumidor | Pedir orçamento · Orçamento recebido e agendamento no endereço · Meus endereços · veículo em Meus atendidos | Novas (DF 9.11); veículo a conferir |
| Web do consumidor | Mesmos fluxos | Sem tela própria (seguir o app) |
| App do colaborador e `/pro` | Rota do dia no endereço (+ "vou atrasar") | Nova (DF 9.11); "vou atrasar" a conferir |
