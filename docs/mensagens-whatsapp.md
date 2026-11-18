# Zappi — Textos das mensagens do WhatsApp

Versão de 07/11/2026 · aprovada pela equipe na ZAP-63 (validação com a Lídia autorizada pelo Lucas) · hora da retirada incluída em 10/11/2026 (ZAP-127) · forma de pagamento na confirmação em 17/11/2026 (ZAP-190) · item só com o nome completo do produto em 18/11/2026 (ZAP-136)

Estes são os textos que o Zappi prepara para o cliente ao confirmar, recusar ou cancelar e concluir um pedido. O backend monta o texto com os campos variáveis e gera o link `wa.me` (ZAP-50); a Lídia clica em "Enviar no WhatsApp" e só aperta enviar.

## Regras para todas as mensagens

- **Linguagem simples (NBR 17225 5.12.12):** frases curtas, sem termos técnicos, sempre dizendo o que o cliente pode fazer.
- **Transparência (CDC):** toda mensagem termina com "Mensagem gerada pelo Zappi".
- **Sem delivery (RN19):** o pedido é sempre retirado, e o pagamento é feito na retirada, pela forma combinada no pedido (RN25).
- **Sem emojis:** leitores de tela leem cada emoji em voz alta, e a mensagem fica mais limpa.
- **Sem endereço:** a mensagem não traz o endereço de retirada. Desde a ZAP-183, ele aparece no cardápio público, na tela "Informações da loja", com o botão "Abrir no Google Maps", sempre atualizado com o cadastro da loja (RN31). Assim, o texto fica curto e não guarda uma cópia do endereço que pode ficar velha.
- O texto entre `{chaves}` é trocado pelos dados do pedido; o resto é fixo. As quebras de linha fazem parte do texto.

## Campos variáveis

| Campo | De onde vem | Formato | Exemplo |
|---|---|---|---|
| `{nome}` | `cliente.nome` | Só o primeiro nome | Ana |
| `{numero}` | `pedido.numero` | Número, sem o `#` | 12 |
| `{estabelecimento}` | `estabelecimento.nome` | Como cadastrado | Casa Belt |
| `{itens}` | `item_pedido` e `produto.nome` | Um item por linha: `- {produto} ({quantidade})`, com o nome completo do produto e a quantidade em kg ou un. Sem sabor, recheio nem cobertura (ZAP-136) | - Bolo de brigadeiro de chocolate (2 kg) |
| `{valor_total}` | `pedido.valor_total` | Moeda brasileira | R$ 200,00 |
| `{data_retirada}` | `pedido.data_retirada` | Dia da semana por extenso, dia/mês e hora ("15h" ou "15h30"); no próprio dia, começa com "hoje," | sábado, 14/11, às 15h · hoje, sábado, 07/11, às 9h30 |
| `{motivo}` | `pedido.motivo_recusa` | Texto digitado pela Lídia, sem alteração | Agenda cheia nesse dia. |
| `{forma_pagamento}` | `pedido.forma_pagamento` | A forma com a preposição: "em dinheiro", "por Pix", "por cartão de crédito", "por cartão de débito" ou "por vale-refeição" (ZAP-190) | por Pix |

## 1. Confirmação (tipo 1)

Gerada ao confirmar um pedido Novo (ZAP-29). Se a Lídia edita um pedido Confirmado, o texto é refeito, inclusive com a forma de pagamento nova (ZAP-90, ZAP-190).

```text
Olá, {nome}!

Seu pedido #{numero} na {estabelecimento} está confirmado.

{itens}
Total: {valor_total}
Retirada: {data_retirada}

O pagamento é feito na retirada, {forma_pagamento}. Qualquer dúvida, é só responder esta mensagem.

Mensagem gerada pelo Zappi
```

**Pedido sem forma de pagamento** (os de antes da ZAP-190): a linha fica como antes, "O pagamento é feito na retirada. Qualquer dúvida, é só responder esta mensagem."

**Exemplo:**

```text
Olá, Ana!

Seu pedido #12 na Casa Belt está confirmado.

- Bolo de brigadeiro de chocolate (2 kg)
Total: R$ 200,00
Retirada: sábado, 14/11, às 15h

O pagamento é feito na retirada, por Pix. Qualquer dúvida, é só responder esta mensagem.

Mensagem gerada pelo Zappi
```

**Exemplo em dinheiro:** "O pagamento é feito na retirada, em dinheiro. Qualquer dúvida, é só responder esta mensagem."

## 2. Recusa e cancelamento (tipo 2)

Gerada ao recusar um pedido Novo ou ao cancelar um pedido Confirmado ou Em produção (ZAP-30). O mesmo texto serve para os dois casos, como decidido na ZAP-64.

```text
Olá, {nome}.

Infelizmente não vamos conseguir atender o seu pedido #{numero} para {data_retirada}.

Motivo: {motivo}

Se quiser combinar outra data ou outro pedido, é só responder esta mensagem.

{estabelecimento}
Mensagem gerada pelo Zappi
```

**Exemplo (cancelamento de um pedido confirmado):**

```text
Olá, João.

Infelizmente não vamos conseguir atender o seu pedido #11 para sábado, 14/11, às 15h.

Motivo: Tive um imprevisto de saúde e não vou conseguir produzir nesse dia.

Se quiser combinar outra data ou outro pedido, é só responder esta mensagem.

Casa Belt
Mensagem gerada pelo Zappi
```

## 3. Pronto para retirada (tipo 3)

Gerada ao marcar um pedido Em produção como pronto (ZAP-60).

```text
Olá, {nome}!

Seu pedido #{numero} está pronto para retirada.

Retirada: {data_retirada}
Total a pagar na retirada: {valor_total}

Qualquer dúvida, é só responder esta mensagem.

{estabelecimento}
Mensagem gerada pelo Zappi
```

**Exemplo:**

```text
Olá, Beatriz!

Seu pedido #9 está pronto para retirada.

Retirada: hoje, sábado, 07/11, às 9h30
Total a pagar na retirada: R$ 230,00

Qualquer dúvida, é só responder esta mensagem.

Casa Belt
Mensagem gerada pelo Zappi
```

## Histórico

| Data | Decisão |
|---|---|
| 07/11/2026 | Textos aprovados pela equipe na ZAP-63, com autorização do Lucas para definir em nome da Lídia |
| 10/11/2026 | Hora da retirada em `{data_retirada}` (ZAP-127) |
| 15/11/2026 | A confirmação passa a dizer a forma de pagamento combinada: "O pagamento é feito na retirada, por Pix." (decisão da equipe na ZAP-190). Dinheiro fica "em dinheiro", que soa natural. Pedido sem forma mantém a frase antiga. Implementado em 17/11/2026 (ZAP-192) |
| 15/11/2026 | O endereço da loja passa a aparecer no cardápio público (decisão do grupo na ZAP-183, RN31). As mensagens continuam sem o endereço, e a regra "Sem endereço" passa a explicar que ele está no cardápio. Registrado em 18/11/2026 (ZAP-188) |
