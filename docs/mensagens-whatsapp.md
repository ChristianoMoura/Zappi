# Zappi — Textos das mensagens do WhatsApp

Versão de 07/11/2026 · aprovada pela equipe na ZAP-63 (validação com a Lídia autorizada pelo Lucas)

Estes são os textos que o Zappi prepara para o cliente ao confirmar, recusar ou cancelar e concluir um pedido. O backend monta o texto com os campos variáveis e gera o link `wa.me` (ZAP-50); a Lídia clica em "Enviar no WhatsApp" e só aperta enviar.

## Regras para todas as mensagens

- **Linguagem simples (NBR 17225 5.12.12):** frases curtas, sem termos técnicos, sempre dizendo o que o cliente pode fazer.
- **Transparência (CDC):** toda mensagem termina com "Mensagem gerada pelo Zappi".
- **Sem delivery (RN19):** o pedido é sempre retirado, e o pagamento é feito na retirada.
- **Sem emojis:** leitores de tela leem cada emoji em voz alta, e a mensagem fica mais limpa.
- **Sem endereço:** a retirada é na casa da Lídia e os clientes já a conhecem; a mensagem não expõe esse dado pessoal.
- O texto entre `{chaves}` é trocado pelos dados do pedido; o resto é fixo. As quebras de linha fazem parte do texto.

## Campos variáveis

| Campo | De onde vem | Formato | Exemplo |
|---|---|---|---|
| `{nome}` | `cliente.nome` | Só o primeiro nome | Ana |
| `{numero}` | `pedido.numero` | Número, sem o `#` | 12 |
| `{estabelecimento}` | `estabelecimento.nome` | Como cadastrado | Casa Belt |
| `{itens}` | `item_pedido` | Um item por linha: `- {produto} de {sabor} ({quantidade})`, com a quantidade em kg ou un | - Bolo de brigadeiro de chocolate (2 kg) |
| `{valor_total}` | `pedido.valor_total` | Moeda brasileira | R$ 200,00 |
| `{data_retirada}` | `pedido.data_retirada` | Dia da semana por extenso e dia/mês; no próprio dia, começa com "hoje," | sábado, 14/11 · hoje, sábado, 07/11 |
| `{motivo}` | `pedido.motivo_recusa` | Texto digitado pela Lídia, sem alteração | Agenda cheia nesse dia. |

## 1. Confirmação (tipo 1)

Gerada ao confirmar um pedido Novo (ZAP-29).

```text
Olá, {nome}!

Seu pedido #{numero} na {estabelecimento} está confirmado.

{itens}
Total: {valor_total}
Retirada: {data_retirada}

O pagamento é feito na retirada. Qualquer dúvida, é só responder esta mensagem.

Mensagem gerada pelo Zappi
```

**Exemplo:**

```text
Olá, Ana!

Seu pedido #12 na Casa Belt está confirmado.

- Bolo de brigadeiro de chocolate (2 kg)
Total: R$ 200,00
Retirada: sábado, 14/11

O pagamento é feito na retirada. Qualquer dúvida, é só responder esta mensagem.

Mensagem gerada pelo Zappi
```

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

Infelizmente não vamos conseguir atender o seu pedido #11 para sábado, 14/11.

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

Retirada: hoje, sábado, 07/11
Total a pagar na retirada: R$ 230,00

Qualquer dúvida, é só responder esta mensagem.

Casa Belt
Mensagem gerada pelo Zappi
```

## Histórico

| Data | Decisão |
|---|---|
| 07/11/2026 | Textos aprovados pela equipe na ZAP-63, com autorização do Lucas para definir em nome da Lídia |
