# Zappi — Guia de Identidade Visual

Versão de 03/11/2026 · aprovada pelo grupo nas ZAP-34 e ZAP-37

## Visão geral

A identidade do Zappi foi aprovada pelo grupo em 02/11/2026, na subtarefa ZAP-34: **paleta "Ciano com creme", fonte Lexend e logo do balão de conversa**. Este guia é a referência para todas as telas do sistema.

**O que é o Zappi:** cardápio digital e organizador de pedidos da Casa Belt, confeitaria artesanal da Lídia. O slogan é *"Seu cardápio, direto no zap."*

**Conceito da marca:** o nome vem do "zap", como o WhatsApp é chamado no Brasil. A marca junta três ideias: a **conversa** (balão), a **organização dos pedidos** (lista com check) e a **confeitaria** (creme, cacau, mel e doces em 3D).

**Para quem:** a Lídia, 54 anos, única usuária do painel, com pouca familiaridade com ferramentas digitais e uso frequente do celular.

**Princípios visuais:**

- **Acolhedor:** tons quentes de creme e cacau na tela de login; dentro do app, fundo branco limpo com detalhes em ciano, para um visual profissional.
- **Claro:** poucos elementos por tela, letras grandes, um destaque de cada vez.
- **Acessível:** todo texto com contraste de 4,5:1 ou mais e foco sempre visível (ABNT NBR 17225).
- **Sem cara de IA:** ilustração 3D com tema de confeitaria e layout inspirado em sistemas de pedidos reais.

## Logo

O logo oficial é um **balão de conversa com três linhas e um check**, sobre o nome **Zappi**, em DarkCyan (#008B8B). O balão lembra o zap; as linhas e o check, um pedido anotado e confirmado.

A arte foi gerada pelo grupo no Higgsfield e convertida em vetor (SVG), então fica nítida em qualquer tamanho. O nome "Zappi" está em curvas e não depende de fonte instalada.

| Versão | Arquivo | Quando usar |
| --- | --- | --- |
| Completo | [`zappi-logo.svg`](../frontend/src/assets/zappi-logo.svg) | Tela de login, documentos, apresentações, fundos claros |
| Completo branco | `zappi-logo-branco.svg` | Sobre o DarkCyan, o cacau ou fotos escuras |
| Só o símbolo | [`zappi-simbolo.svg`](../frontend/src/assets/zappi-simbolo.svg) | Ícone do site (favicon), avatar, espaços quadrados |
| Símbolo branco | `zappi-simbolo-branco.svg` | Ícone sobre fundos escuros |
| Só o nome | [`zappi-nome.svg`](../frontend/src/assets/zappi-nome.svg) | Cabeçalhos estreitos, ao lado do símbolo |
| Nome branco | `zappi-nome-branco.svg` | Cabeçalhos escuros |

**Cabeçalho do painel:** símbolo (42 px de altura) e nome (26 px) lado a lado, com 8 px entre eles.

**Tamanho mínimo:**

- Logo completo: 64 px de largura.
- Abaixo de 48 px, usar só o símbolo. As linhas e o check continuam legíveis até 24 px; em 16 px viram textura, mas o balão ainda identifica a marca.

**Área de proteção:** deixar livre, em volta do logo, um espaço igual à altura da letra "Z" do nome.

> Tamanho mínimo e área de proteção são propostas ainda não confirmadas pelo grupo.

**Fundos permitidos:** creme, branco e cacau claro com o logo em DarkCyan; DarkCyan, ciano profundo e cacau com o logo branco. Os furos do balão e das letras são transparentes, então a versão branca funciona em qualquer cor escura.

**Não fazer:**

- Mudar as cores, esticar, girar ou aplicar sombra, contorno ou degradê.
- Redesenhar o logo ou gerar uma versão nova por IA: sempre usar os arquivos SVG oficiais.
- Usar o verde, o telefone ou o formato do logo do WhatsApp, que é marca registrada da Meta.
- Colocar o logo em DarkCyan sobre fundos escuros ou sobre fotos com muito detalhe.

## Paleta de cores

A paleta "Ciano com creme" parte do **DarkCyan (#008B8B)** e usa tons quentes de confeitaria no fundo e no texto. Todo texto fica com contraste de **4,5:1 ou mais** (NBR 17225 5.11.2).

| Cor | Hex | Papel | Contraste |
| --- | --- | --- | --- |
| Ciano Zappi | #008B8B | Logo, ícones, títulos grandes | Branco sobre ele: 4,15:1 (só texto grande) |
| Ciano profundo | #006D6D | Botões, links, item ativo do menu | Branco sobre ele: 6,16:1; sobre o creme: 5,85:1 |
| Ciano escuro | #005A5A | Botão com o mouse em cima | Branco sobre ele: 7,64:1 |
| Ciano claro | #E6F4F4 | Fundo leve ao passar o mouse | — |
| Creme | #FFF8F0 | Fundos quentes de apoio, fora das telas internas | Cacau sobre ele: 12,75:1 |
| Creme do login | #FDF6EC | Lado do formulário na tela de login | Texto secundário sobre ele: 7,26:1 |
| Creme da ilustração | #F7E7CC | Fundo do lado da ilustração no login | — |
| Branco | #FFFFFF | Fundo das telas internas do app, campos e cartões | Cacau sobre ele: 13,43:1; texto secundário: 7,79:1 |
| Cacau | #3D2B1F | Texto principal e borda de foco | Sobre o creme: 12,75:1 |
| Texto secundário | #5C5048 | Textos de apoio e placeholder | Sobre o creme: 7,39:1 |
| Linha | #D9CBBE | Bordas de campos e divisões | — (não é texto) |
| Mel | #F2B134 | Destaques pontuais | Cacau sobre ele: 7,11:1 |
| Erro | #B42318 | Mensagens e bordas de erro | Sobre o creme: 6,24:1 |
| Fundo do erro | #FEF3F2 | Caixa de alerta de erro | Erro sobre ele: 6,05:1 |

**Regra do DarkCyan:** texto branco sobre #008B8B dá só 4,15:1, abaixo do mínimo para texto comum. Por isso ele fica para o logo, ícones e títulos grandes (a partir de 24 px, ou 19 px em negrito). Botões e links usam o ciano profundo #006D6D.

**Regra do mel:** sempre com texto cacau por cima, nunca como cor de texto sobre o creme.

**No código:** as cores estão em [`frontend/src/tema.js`](../frontend/src/tema.js). O ciano é a cor principal do Mantine (`zappi`), com o tom 7 (#006D6D) nos componentes e o tom 6 (#008B8B) na marca.

## Tipografia

O Zappi usa **uma fonte só: Lexend**, gratuita no Google Fonts, com acentos do português. Ela foi desenhada para reduzir o esforço de leitura, o que ajuda a Lídia a ler rápido no celular.

- **Pesos:** 400 (texto), 500 (mensagens de erro), 600 (rótulos e botões) e 700 (títulos).
- **Reserva:** se a Lexend não carregar, o sistema usa "Segoe UI" e depois a fonte padrão do aparelho.
- **Tamanho base:** 18 px, maior que o padrão da web (16 px).

| Uso | Celular | Computador |
| --- | --- | --- |
| Título da página | 28 px | 28 px |
| Slogan no login | 17 px | 18 px |
| Rótulos dos campos | 17 px, peso 600 | 18 px, peso 600 |
| Texto digitado nos campos | 18 px | 18 px |
| Botão principal | 19 px, peso 600 | 21 px, peso 600 |
| Mensagem de erro | 16 px, peso 500 | 16 px, peso 500 |
| Texto de apoio | 16 px | 16 px |

**No código:** fonte e escala ficam em [`frontend/src/tema.js`](../frontend/src/tema.js); a Lexend é carregada no [`frontend/index.html`](../frontend/index.html).

## Ilustração e imagens

O estilo de imagem do Zappi é **3D lúdico, com acabamento de massinha brilhante e tema de confeitaria**, sobre fundo creme liso.

**Ilustração da tela de login:** um celular inclinado mostra o app (logo do balão e três pedidos confirmados), cercado por doces flutuando: fatia de bolo de chocolate, brigadeiros, macarons, cupcake com cereja, donut e uma fatia de bolo de morango desfocada à frente.

- Gerada no Higgsfield (Nano Banana Pro, com o logo oficial como referência).
- Expandida com IA (FLUX.2 Pro Outpaint) para o formato do painel, quase quadrado (1960 × 2020 px), com o bolo completo e o fundo uniforme #F7E7CC.
- Usada em WebP de 1400 px (cerca de 68 KB): [`ilustracao-login.webp`](../frontend/src/assets/ilustracao-login.webp).
- Aparece só no computador; no celular, a tela mostra apenas o formulário.

**Regras para novas imagens:**

- Mesmo estilo 3D, mesma luz suave de estúdio e fundo creme liso, para combinar com a do login.
- Cores dominantes: ciano, creme, chocolate, mel e rosa morango.
- Sem texto legível, pessoas, mãos ou marcas d'água.
- Formato pensado para o espaço onde vai: se não couber, expandir a imagem (outpaint) em vez de cortar.
- Imagens decorativas ficam escondidas do leitor de tela (texto alternativo vazio); fotos de produtos sempre com texto alternativo (RN15).

## Interface e componentes

As telas usam os componentes do **Mantine**, já ajustados no tema para seguir este guia. Use sempre esses componentes, em vez de criar botões e campos do zero.

| Elemento | Padrão |
| --- | --- |
| Botão principal | Ciano profundo #006D6D, texto branco, 56–62 px de altura, largura total no formulário |
| Botão secundário | Contorno ciano profundo, fundo branco (ex.: "Sair", "Desfazer") |
| Campos | Fundo branco, borda #D9CBBE de 2 px, 56–60 px de altura, rótulo sempre visível acima |
| Campo com erro | Borda e mensagem em #B42318, logo abaixo do campo, com ícone |
| Alerta de erro | Caixa com borda #B42318 e fundo #FEF3F2, no topo do formulário |
| Foco pelo teclado | Borda cacau #3D2B1F de 3 px, afastada 3 px do elemento |
| Cantos | 8 px de raio em botões, campos e cartões |
| Ícones | Tabler Icons, de traço, 20–28 px, sempre com texto ao lado |
| Menu | Lateral no computador, com botão para recolher e deixar só os ícones (a escolha fica lembrada); barra fixa embaixo no celular; item ativo em ciano profundo |
| Carregando | Botão com três pontinhos animados, sem mudar de tamanho |

**Interatividade (ZAP-37):** botões sobem um pouco ao passar o mouse e mostram uma onda a partir do ponto do clique; cartões sobem e o ícone gira e fica ciano; as partes da tela entram em sequência, partindo de um estado já visível; a capa se aproxima devagar ao passar o mouse; campos preenchidos certos ganham um check verde ao lado do rótulo; o botão de salvar mostra "Salvo" com check. Tudo fica parado para quem pediu "reduzir movimento" no sistema.

**Mostrar senha:** botão com ícone de olho e a palavra "Mostrar" (ou "Esconder") dentro do campo de senha, à direita.

**No código:** tema em [`frontend/src/tema.js`](../frontend/src/tema.js), foco em [`frontend/src/estilos.css`](../frontend/src/estilos.css) e estilos da tela de login em [`frontend/src/paginas/PaginaLogin.module.css`](../frontend/src/paginas/PaginaLogin.module.css).

## Tela de login

O layout aprovado divide a tela em dois no computador: **ilustração 3D à esquerda e formulário à direita**. No celular, aparece só o formulário.

**Computador (a partir de 1024 px de largura):**

- Proporção 1,15 : 1 entre o lado da ilustração e o do formulário; o formulário tem no mínimo 420 px.
- Lado da ilustração: a imagem cobre o painel inteiro, sem texto, sobre o creme #F7E7CC.
- Lado do formulário: creme #FDF6EC, divisão reta, com uma linha fina e uma sombra suave sobre a ilustração, que dá a sensação de camada à frente.
- Ordem, de cima para baixo: logo completo (150 px), slogan "Seu cardápio, direto no zap.", campo E-mail, campo Senha com "Mostrar" e botão "Entrar".
- Formulário centralizado na altura, com até 460 px de largura.
- A tela inteira cabe sem rolagem num notebook de 1366 × 768.

**Celular:**

- Fundo creme #FDF6EC, sem a ilustração.
- Logo com 132 px, campos de 56 px e botão de 58 px.
- Sem rolagem lateral em telas de 375 px.

**Textos da tela:**

- O título "Entrar no painel" não aparece, mas existe para leitores de tela.
- Erros: "Digite seu e-mail.", "Digite sua senha.", "Confira o e-mail. Ele precisa ter "@" e um ponto, como lidia@casabelt.com.", "E-mail ou senha incorretos. Confira e tente de novo." e "Muitas tentativas sem sucesso. Espere 15 minutos e tente de novo."
- A mensagem de senha errada nunca diz se o erro está no e-mail ou na senha (critério da ZAP-16).

## Acessibilidade

A identidade foi montada para atender à **ABNT NBR 17225:2025** (equivalente à WCAG 2.2) desde o início; cada cor e componente acima foi conferido.

| Requisito NBR | Critério WCAG | Como a identidade atende |
| --- | --- | --- |
| 5.11.2 Contraste para texto | 1.4.3 (AA) | Todo texto com 4,5:1 ou mais; o DarkCyan fica fora de textos comuns |
| 5.1.1 Foco visível | 2.4.7 (AA) | Borda cacau de 3 px, afastada 3 px, em campos, botões e links |
| 5.3.1 Rótulos | 3.3.2 (A) | Rótulo visível acima de todo campo, nunca só placeholder |
| 5.9.1 Texto alternativo | 1.1.1 (A) | Logo com "Zappi" como texto alternativo; ilustração decorativa escondida do leitor de tela |
| 5.12.12 Linguagem simples | 3.1.5 (AAA) | Frases curtas, sem termos técnicos (seção Tom de voz) |
| 5.1.4 Ordem de foco | 2.4.3 (A) | Ordem do teclado igual à ordem visual: e-mail, senha, mostrar, entrar |

**Além da norma:** letras de 18 px, áreas de toque de 44 px ou mais, erros anunciados ao leitor de tela e um único destaque por tela, pensando na Lídia.

## Tom de voz

O Zappi fala como uma pessoa da família ajudando: **simples, direto e gentil**, em português do Brasil, tratando a Lídia por "você".

- **Frases curtas**, com o que fazer: "Digite seu e-mail.", e não "Campo obrigatório".
- **Sem termos técnicos:** nada de "token", "sessão inválida", "erro 401" ou "credenciais".
- **Erros dizem como resolver:** "Confira o e-mail. Ele precisa ter "@" e um ponto."
- **Botões dizem a ação:** "Entrar", "Sair", "Confirmar pedido", "Enviar no WhatsApp".
- **Sem culpar a usuária:** "Não foi possível entrar agora. Tente de novo em alguns minutos."
- **Mensagens ao cliente** (WhatsApp) seguem o mesmo tom e se identificam como geradas pelo Zappi (CDC; textos na ZAP-63).

## Arquivos e onde encontrar

| Item | Onde está |
| --- | --- |
| Logo completo, símbolo e nome | [`frontend/src/assets/`](../frontend/src/assets/): `zappi-logo.svg`, `zappi-simbolo.svg`, `zappi-nome.svg` |
| Ícone do site | [`frontend/public/favicon.svg`](../frontend/public/favicon.svg) |
| Ilustração do login | [`frontend/src/assets/ilustracao-login.webp`](../frontend/src/assets/ilustracao-login.webp) |
| Cores, fonte e tamanhos | [`frontend/src/tema.js`](../frontend/src/tema.js) |
| Foco visível | [`frontend/src/estilos.css`](../frontend/src/estilos.css) |
| Tela de login | [`frontend/src/paginas/PaginaLogin.jsx`](../frontend/src/paginas/PaginaLogin.jsx) e `PaginaLogin.module.css` |
| Versões brancas do logo e ilustração em alta (1960 × 2020) | Ainda só no computador do Lucas; entram no repositório quando alguma tela precisar |

**Páginas de referência** (privadas; peça acesso ao Lucas):

- [Propostas de paleta e fontes](https://claude.ai/artifact/LRKLoXeQdfkiBbiWwmK5Ni)
- [Logo oficial e versões](https://claude.ai/artifact/7KTPGtMrVDrM1arEWtwvzG)
- [Protótipo clicável do login](https://claude.ai/artifact/LXVtXF68mPpvUqsU7HVUJP)

**Ferramentas usadas:** Higgsfield (Recraft V4.1 para as rodadas de logo, Ideogram Vector para vetorizar o logo oficial, Nano Banana Pro para a ilustração e FLUX.2 Pro Outpaint para expandi-la), cerca de 77 créditos no total.

## Histórico de decisões

Todas as decisões foram tomadas pelo grupo em 02/11/2026, na ZAP-34, em rodadas de proposta e ajuste. Da mais recente para a mais antiga:

| Etapa | Decisão |
| --- | --- |
| Telas internas | Fundo branco com ciano dentro do app, menu lateral recolhível e efeitos de interatividade (ZAP-37, tela Meu estabelecimento, layout A com capa) |
| Implementação | Tela de login e identidade aplicadas em React no [PR #3](https://github.com/ChristianoMoura/Zappi/pull/3) |
| Protótipo aprovado | Título "Entrar no painel" escondido; elementos do login maiores; slogan de volta sob o logo; ilustração sem texto |
| Ilustração completa | Imagem expandida com IA para o formato do painel, com o bolo inteiro e sem emenda |
| Tom do login | Tom 2, creme #FDF6EC, escolhido entre quatro tons mais claros |
| Divisão do login | Divisão reta, sem cantos arredondados; alternativas ciano, cacau e cartão flutuante descartadas |
| Ilustração | Opção A (estilo massinha, logo na tela do celular) escolhida entre duas |
| Layout do login | Tela dividida, com formulário à direita e ilustração 3D à esquerda, inspirada em sistemas de pedidos, para ter menos cara de IA |
| Logo oficial | Logo do balão com lista e check, gerado pelo grupo no Higgsfield e vetorizado |
| Logos descartados | Duas rodadas, sete opções e uma combinação (Balão Z, Bolo-balão, Camadas de pedido, Z cursivo, Z mel, Cardápio, Fatia de bolo) |
| Paleta e fonte | Paleta A "Ciano com creme" e Lexend, escolhidas entre três paletas e três pares de fontes |
| Cor base | DarkCyan #008B8B, definido pelo grupo |
| Componentes | Biblioteca Mantine, decidida em conjunto (ZAP-62) |
