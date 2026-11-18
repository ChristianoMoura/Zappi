# Zappi — Contexto do Projeto

> Ponto de partida para o desenvolvimento do Zappi com o Claude Code.
> Consolida tudo o que foi definido nas atividades do Projeto Integrador (PI) e da disciplina de Empreendedorismo.
> Este arquivo é a fonte da verdade sobre escopo, requisitos, arquitetura e modelo de dados.

---

## 0. Como usar este arquivo (instruções para o Claude Code)

- Leia este arquivo inteiro antes de propor qualquer plano.
- Trabalhe por **planos**: um plano por entrega (sugestões na seção 15). Cada plano é revisado e aprovado pela equipe antes de qualquer código.
- O escopo de implementação é a **entrega final** (seção 5), com o **Portal do Administrador** e o **Portal do Cliente**. Itens marcados como **Futuro** não devem ser implementados agora, mas o código não deve impedir a evolução para eles.
- **Rastreabilidade:** cite nos planos, commits e testes os identificadores de origem (US, RF, RN, controle ISO 27002, requisito NBR 17225, artigo legal).
- **Não invente regras de negócio.** Se algo não estiver definido aqui ou estiver em "Pontos em aberto" (seção 14), pergunte à equipe antes de decidir.
- **Alterações não previstas na documentação original:** toda funcionalidade, regra, coluna do banco ou mudança de decisão que não esteja nos documentos entregues em sala (atividades do PI) deve ser registrada na **`ZAP-83`** para ser formalizada, com o que era antes, o que ficou agora e o motivo. Registre também neste arquivo (seção 17) e nos tickets afetados.
- **Idioma:** interface, mensagens ao cliente e textos do sistema em português do Brasil. Tabelas e colunas com os nomes exatos do modelo (seção 12): `snake_case`, tabelas no singular.
- Prazo final de todos os artefatos do PI: **22/11/2026**. Priorize o que é necessário para os dois portais funcionarem de ponta a ponta.
- **Jira e Git:** todo trabalho parte de uma subtarefa do Jira, e toda branch, commit e pull request leva a chave dessa subtarefa. Mantenha o status do ticket atualizado conforme o trabalho avança. Siga as regras da **seção 18** antes de criar qualquer branch ou commit.

---

## 1. Identificação

| Item | Definição |
|---|---|
| Sistema | **Zappi** — Cardápio Digital com Integração WhatsApp |
| Slogan | "Seu cardápio, direto no zap." |
| Curso | Tecnologia em Análise e Desenvolvimento de Sistemas — Senac SP |
| Disciplina principal | Projeto Integrador: Análise de Soluções de Tecnologia da Informação — Práticas Extensivas |
| Disciplina relacionada | Empreendedorismo, Inovação e Economia Criativa (mesma comunidade, ação extensionista) |
| Comunidade atendida | **Casa Belt** — confeitaria artesanal autônoma da Lídia |
| Equipe | Christiano Gomides Moura · Henrique José da Silva · Lucas G Beltrão dos Santos · Ryan Alexandrino da Silva |
| Gestão do projeto | Jira: https://zappi.atlassian.net, projeto **ZAP** (estrutura mantida pelo Christiano) |
| Repositório | GitHub: `ChristianoMoura/Zappi` (privado), integrado ao Jira; CI no GitHub Actions; deploy automático pelo Render |
| Prazo final dos artefatos | 22/11/2026 |

Observações sobre a equipe:
- Lucas é filho da Lídia e o principal contato com a comunidade.
- Henrique elaborou o DER, o dicionário de dados e o diagrama de arquitetura.
- Lucas e Ryan gravaram o vídeo de apresentação da Atividade #6.

---

## 2. Comunidade: Casa Belt

### 2.1 Contexto
- Negócio **informal**, sem CNPJ/MEI e sem loja física, conduzido na casa da Lídia.
- Produz **bolos e salgados sob encomenda**.
- A confeitaria é uma **atividade paralela**: a Lídia trabalha como cozinheira de uma família (trabalho principal).
- **100% dos novos clientes chegam por indicação** (boca a boca ou quem provou o produto em alguma festa), sempre pelo WhatsApp.
- Toda a comunicação acontece pelo **WhatsApp**: pedido, especificações, prazo e aviso de retirada.
- Pedidos controlados à mão, em **caderno**.
- **Não há delivery**: o cliente sempre retira o pedido.
- **Pagamento presencial, na retirada**, sem prazo definido.
- Ingredientes comprados **sob demanda**, a cada pedido (há algum estoque básico em casa).
- Já houve recusa de pedidos por falta de tempo ou capacidade, sobretudo em datas comemorativas.
- Descontos são pontuais, geralmente para pedidos grandes.
- Cancelamentos são raros e costumam ser feitos com antecedência.

### 2.2 Cardápio e preços
- Cardápio fixo de bolos. **Massa, recheio e cobertura** variam conforme o gosto do cliente. No Zappi, cada sabor é um produto próprio, com o **nome completo** (ex.: "Bolo de brigadeiro de chocolate") e a massa padrão na descrição, organizado nas **categorias** cadastradas pela Lídia (ex.: "Bolos", "Salgados"). Os bolos do cardápio vêm prontos, então o pedido **não tem campos de recheio e cobertura**: uma massa diferente ou outro detalhe vai na observação do item, e o bolo personalizado é cadastrado como mais um produto, com a descrição orientando o cliente (decisões da ZAP-64, item 14.4, e da ZAP-136, RN26).
- Preço definido por **quilo (KG)** e pelo **recheio/sabor**. Exemplos reais:
  - Bolo de brigadeiro de chocolate — **R$ 100,00/kg**
  - Bolo de Ninho com morango — **R$ 115,00/kg**
- Salgados também são vendidos, **por unidade (UN)**. O cento e outras quantidades fechadas são cadastrados como produtos próprios, com o seu preço. Ex.: "Cento de coxinha" a R$ 120,00 por unidade (1 un = 1 cento) e "Coxinha por unidade" a R$ 1,25 (decisão da ZAP-64, item 14.5).

### 2.3 Pessoas (personas)

**Lídia — 54 anos — Proprietária e confeiteira**
- Recebe os pedidos, negocia sabor, preço e prazo, produz os bolos e controla tudo em caderno.
- Concilia a confeitaria com o trabalho principal e com a casa.
- É a **única usuária do sistema**.
- Falas registradas nas entrevistas: *"Tenho dificuldade em organizar os pedidos"* e *"Tenho dificuldade em gerir meu tempo"*.

**Romilda — 63 anos — Auxiliar (irmã da Lídia)**
- Ajuda na compra de ingredientes e no preparo dos recheios.
- **Não usa o sistema e não tem login** (controle ISO 27002 5.15).
- Hoje só sabe o que comprar ou preparar quando a Lídia avisa verbalmente.

**Cliente**
- Na maioria, pessoas conhecidas ou indicadas.
- Faz o pedido pelo WhatsApp, retira e paga presencialmente.
- Faz o pedido pelo Portal do Cliente (cardápio público) ou pelo WhatsApp, e recebe as mensagens pelo WhatsApp. Não tem usuário nem login (RN02).

**Perfil geral:** trabalhadoras com várias responsabilidades ao mesmo tempo, que aprenderam o ofício na prática, sem formação em gestão e sem ferramentas digitais. Isso gera sobrecarga e risco de erro, sobretudo em períodos de mais demanda.

> **Diretriz de UX:** a usuária tem 54 anos e pouca familiaridade com ferramentas de gestão. A interface deve ser simples, com textos claros, poucos passos e botões grandes, e funcionar bem no celular.

---

## 3. Problema e demandas

### 3.1 Demanda prioritária
**Organização e gestão de pedidos.** Foi escolhida pela própria Lídia e é o foco do sistema e da ação extensionista.

### 3.2 Demandas levantadas (Atividade #2), por categoria

| Categoria | Demanda | Impactados |
|---|---|---|
| Gestão de pedidos e produção | Pedidos só em caderno, sem histórico digital | Lídia, Romilda |
| Gestão de pedidos e produção | Ingredientes comprados sob demanda, sem planejamento | Lídia, Romilda |
| Gestão de pedidos e produção | Recusa de pedidos por falta de tempo/capacidade | Lídia, Romilda |
| Gestão de pedidos e produção | Dificuldade em conciliar pedidos, datas comemorativas e trabalho principal | Lídia, Romilda |
| Atendimento e catálogo | Sem canal estruturado para consultar sabores, preços e disponibilidade | Lídia, Clientes |
| Atendimento e catálogo | Sem cardápio visual organizado | Lídia, Clientes |
| Atendimento e catálogo | Cancelamentos sem processo formal de confirmação | Lídia, Clientes |
| Financeiro | Dificuldade de precificação (custos, margens, lucro) | Lídia |
| Financeiro | Pagamento sem prazo definido | Lídia |
| Financeiro | Descontos informais e não padronizados | Lídia |
| Marca e divulgação | Dependência total de indicação, sem presença digital | Lídia |
| Pós-venda | Sem mecanismo de fidelização | Lídia, Clientes |

A entrega final ataca principalmente **Gestão de pedidos** e **Atendimento e catálogo** (cardápio visual, canal para consultar sabores e preços, confirmação formal e comunicação organizada). As demais demandas ficam como evolução futura.

---

## 4. Jornadas

### 4.1 Hoje, sem o sistema (ADO #2)
**Cliente:** descobre por indicação → manda mensagem no WhatsApp → pergunta sabores e preços → especifica o pedido → combina o prazo informalmente → espera sem confirmação formal → retira → paga na retirada.

**Lídia:** recebe o pedido misturado com conversas pessoais → negocia à mão → anota no caderno → avalia a capacidade de cabeça (às vezes recusa) → compra ingredientes com a Romilda → produz (Romilda faz os recheios) → espera a retirada → recebe o pagamento.

### 4.2 Com o Zappi, visão completa (ADO #4)
**Cliente:** descobre por indicação → acessa o link do cardápio → consulta sabores, preços/kg e fotos → monta o pedido → conclui informando a data e a hora de retirada → recebe confirmação ou recusa no WhatsApp → recebe o aviso de pedido pronto → retira e paga presencialmente.

**Lídia:** o pedido chega no quadro Kanban, com um aviso no sino de notificações quando vem do Portal do Cliente → avalia disponibilidade e capacidade → confirma, ou recusa informando o motivo → o sistema prepara a mensagem ao cliente → produz com a Romilda → move o card até "Concluído" → o sistema prepara o aviso de pronto → recebe o cliente e o pagamento.

> Os passos do cliente pelo cardápio público fazem parte da entrega final (Portal do Cliente). Os pedidos chegam por ele ou são cadastrados pela Lídia a partir do que ela recebe no WhatsApp (US7).

---

## 5. Escopo da entrega final

### 5.1 Decisão
A entrega final de **22/11/2026** é o sistema real, com o **Portal do Administrador** (Lídia) e o **Portal do Cliente** juntos. O projeto deixou de ser tratado como MVP em 08/11/2026 (registro na `ZAP-83`). Antes, o escopo cobria só o lado administrativo, ampliado depois da Atividade #5.

### 5.2 Dentro da entrega final

**Portal do Administrador**

1. Login da Lídia (e-mail e senha), com o **aceite dos Termos de uso e da Política de privacidade** na própria tela de login, e os links para os dois textos no rodapé da caixinha da conta (RN27).
2. Cadastro e edição das informações do estabelecimento (Casa Belt), incluindo as **formas de pagamento aceitas** (RN25) e a opção **"Mostrar promoções em destaque no cardápio"** (RN29).
3. Cadastro, edição e exclusão lógica de produtos (nome completo, categoria, unidade, preço, descrição, foto com texto alternativo e **alérgenos**: lista fixa, com o glúten, e texto livre para os demais, RN24), e cadastro das **categorias** do cardápio, com a ordem definida pela Lídia, arrastando ou pelo teclado (RN26). O produto também pode sair do cardápio por um tempo, sem ser excluído, com os botões **"Tirar do cardápio"** e **"Voltar ao cardápio"** e o selo "Fora do cardápio" (RN28). E pode entrar em **promoção**: o botão **"Aplicar desconto"** pede o preço antes da promoção e o preço com desconto, e **"Encerrar promoção"** volta o produto ao preço normal (RN29).
4. Upload da foto do produto para o Supabase Storage.
5. Quadro **Kanban** de pedidos com as colunas Novo, Confirmado, Em produção, Concluído, Entregue e Recusado, e um **filtro de status**: em "Todos", Entregue e Recusado ficam ocultos; escolhendo um status, só os pedidos dele aparecem (RN04).
6. Detalhes do pedido ao abrir um card, com a forma de pagamento combinada ("Não informada" nos pedidos antigos, RN25).
7. **Confirmar** um pedido.
8. **Recusar** um pedido com **motivo obrigatório**, e **cancelar** um pedido Confirmado ou Em produção pelo mesmo fluxo.
9. Mover o pedido para **Em produção**, **Concluído** e **Entregue** (quando o cliente retira), e voltar uma etapa para corrigir um clique errado.
10. Geração da mensagem ao cliente (confirmação, recusa e pronto para retirada) e botão **"Enviar no WhatsApp"** com link `wa.me`, que continua disponível para reenviar.
11. Registro de auditoria (logins e ações administrativas).
12. Infraestrutura: Docker Compose no ambiente local; em produção, Render e Supabase com HTTPS gerenciado, CI no GitHub Actions e deploy automático do Render a cada merge na `main`.
13. **Cadastrar e editar pedidos** (US7): a Lídia registra as encomendas que recebe pelo WhatsApp e corrige um pedido, com a edição limitada pelo status (RN21), a forma de pagamento entre as aceitas (RN25) e só os produtos que estão no cardápio nos itens novos (RN28), com o preço com desconto nos produtos em promoção (RN10, RN29).
14. **Anonimizar os dados de um cliente** a pedido do titular (RN17, LGPD), sem apagar o histórico de pedidos (decisão da ZAP-64).

15. **Resposta automática com o link do cardápio** pela mensagem de saudação do WhatsApp Business, configurada pela Lídia no aplicativo, sem código no Zappi (seção 14, item 12). O envio automático pela WhatsApp Cloud API não será feito (decisão de 15/11/2026, seção 5.4).
16. **Caixa de notificações** (US13): sino "Notificações" no menu lateral, acima de Pedidos (no celular, no topo da tela, ao lado do ícone de usuário), com o contador das não vistas ("9+" acima de 9), atualizado sozinho a cada 1 minuto, e uma caixinha com os avisos de **pedido novo** vindo do Portal do Cliente e de **retirada próxima**; clicar num aviso abre o pedido no quadro (RN30).

**Portal do Cliente** (épico `ZAP-2`; requisitos e regras definidos na `ZAP-18`, seção 14, item 11)

17. **Cardápio público** pelo link do estabelecimento (`slug`, ex.: casa-belt), sem login: só os produtos no cardápio, sem os excluídos (RN14) e os fora do cardápio (RN28), em seções pelas categorias, na ordem definida pela Lídia (RN26), com nome, descrição, preço, foto com texto alternativo, os **selos de alérgenos** com o aviso "Tem alergia? Fale com a loja pelo WhatsApp antes de encomendar." (RN24), as **formas de pagamento** que a loja aceita, sempre com "Pagamento na retirada" (RN25), e o contato da Lídia. Os produtos em **promoção** mostram o preço com desconto em destaque, o preço normal riscado e o percentual de desconto (ex.: "-13%"), e, com o destaque ligado, aparecem também na seção **"Promoções"**, no topo do cardápio (RN29). No topo, **busca** pelos produtos, **modo escuro** e o botão **Compartilhar** (ZAP-100, ZAP-105). No rodapé, os links para os **Termos de uso** e a **Política de privacidade**, que abrem sem login (RN27).
18. **Montagem do pedido** pelo cliente: produtos, quantidade, observação de cada item (sem recheio e cobertura, RN26), observações do pedido, data e hora de retirada, com pelo menos 7 dias de antecedência na data (RN22) e a hora das 8h às 20h, de 30 em 30 minutos (RN23), e a **forma de pagamento**, obrigatória, entre as aceitas (RN25). Subtotal e total usam o preço com desconto dos produtos em promoção (RN29).
19. **Identificação e envio:** nome e WhatsApp, gravados só com consentimento LGPD, numa caixa só com o aceite dos Termos de uso e da Política de privacidade (RN16, RN27). O pedido entra no Kanban da Lídia como 1-Novo, com o número sequencial do estabelecimento.

### 5.3 Dados iniciais (seed)
- Estabelecimento: **Casa Belt**.
- Unidades de medida: 1-KG e 2-UN.
- Usuário: **Lídia**.
- **Pelo menos 2 pedidos de exemplo** com clientes de exemplo (com consentimento LGPD), para a demonstração: um será confirmado e o outro recusado com motivo.
- Use dados fictícios para os clientes, nunca dados reais.

### 5.4 Fora da entrega (Futuro / backlog)
- Pagamento online.
- Controle de estoque de ingredientes.
- Relatórios e gestão financeira (precificação, margens).
- Divulgação e fidelização.
- Acesso da Romilda ao sistema.
- Som ou notificação do navegador fora do painel (ZAP-172): os avisos aparecem só no sino, com o painel aberto.

**Não será feito:** envio automático das mensagens pela WhatsApp Cloud API (Meta). Decisão da equipe em 15/11/2026 (seção 14, item 12): os avisos continuam pelo `wa.me`.

### 5.5 Por que a entrega importa além do PI
A ação extensionista de Empreendedorismo é um **treinamento presencial de 2 horas** com a Lídia e a Romilda, que **só acontece depois que o sistema estiver funcional**. Nele, a Lídia opera o Kanban do Zappi (login, ver pedidos, confirmar um e recusar outro com motivo). O sistema precisa estar estável e utilizável por uma pessoa leiga.

---

## 6. ODS

**ODS 8 — Trabalho Decente e Crescimento Econômico, meta 8.3:** apoio a atividades produtivas, empreendedorismo e inovação, e incentivo à formalização e ao crescimento de micro e pequenos negócios. O Zappi organiza e profissionaliza um negócio informal unipessoal.

---

## 7. User stories e requisitos funcionais

| User story | Requisitos funcionais |
|---|---|
| **US1** — Como Lídia, quero fazer login, para acessar de forma segura minhas informações e pedidos. | **RF01** Login com e-mail e senha, com o aceite da versão vigente dos Termos de uso e da Política de privacidade (RN27). **RF02** Validar credenciais e bloquear acesso com dados incorretos. |
| **US2** — Como Lídia, quero cadastrar as informações do estabelecimento, para manter meus dados registrados. | **RF03** Cadastro de nome, descrição, contato e formas de pagamento aceitas do Casa Belt (RN25), e da opção de destacar as promoções no cardápio (RN29). **RF04** Edição posterior dessas informações. |
| **US3** — Como Lídia, quero cadastrar meus produtos, para manter o cardápio atualizado. | **RF05** Cadastro de produtos com nome completo, categoria, preço por kg, foto e alérgenos (RN24), e das categorias do cardápio, na ordem definida pela Lídia (RN26). **RF06** Edição e exclusão de produtos (exclusão lógica), e tirar o produto do cardápio por um tempo, sem excluir, e voltar com ele (RN28). Aplicar e encerrar a promoção do produto, com o preço com desconto (RN29). |
| **US4** — Como Lídia, quero ver os pedidos em um quadro Kanban, para acompanhar o status de cada um. | **RF07** Pedidos em Kanban por status (Novo, Confirmado, Em produção, Concluído, Entregue e Recusado), com filtro de status; em "Todos", Entregue e Recusado ficam ocultos (RN04). **RF08** Detalhes do pedido ao selecionar um card, com a forma de pagamento (RN25). |
| **US5** — Como Lídia, quero confirmar um pedido, para informar ao cliente que ele será atendido. | **RF09** Mover o pedido para "Confirmado". **RF10** Preparar a mensagem de confirmação ao cliente via WhatsApp. |
| **US6** — Como Lídia, quero recusar um pedido informando o motivo, para que o cliente entenda. | **RF11** Motivo obrigatório ao recusar. **RF12** Preparar a mensagem de recusa com o motivo via WhatsApp. |
| **US7** — Como Lídia, quero cadastrar e editar pedidos, para registrar as encomendas que recebo pelo WhatsApp e corrigir um pedido quando o cliente pede uma mudança. | **RF13** Cadastro de pedido com cliente (nome e WhatsApp), itens do cardápio com quantidade, data e hora de retirada, observações e forma de pagamento (RN25), com o preço com desconto nos produtos em promoção (RN29). **RF14** Edição do pedido conforme o status (RN21). |
| **US8** — Como Lídia, quero mover o pedido para Em produção e Concluído, para acompanhar o andamento e avisar o cliente que o pedido está pronto. | **RF15** Mover o pedido para "Em produção", "Concluído" e "Entregue", com a volta de uma etapa para corrigir um clique errado (RN03). **RF16** Preparar a mensagem de pronto para retirada via WhatsApp. |
| **US9** — Como cliente, quero ver o cardápio pelo link, para conhecer sabores e preços sem precisar de login. | **RF17** Cardápio público pelo `slug`, só com os produtos no cardápio (RN14, RN28), organizado pelas categorias na ordem da Lídia (RN26), com busca pelos produtos, modo escuro e botão de compartilhar o link (ZAP-100), as formas de pagamento aceitas (RN25) e as promoções, com o preço normal riscado e a seção "Promoções" no topo (RN29). **RF18** Exibir o contato da Lídia. |
| **US10** — Como cliente, quero montar meu pedido, para encomendar sem depender de troca de mensagens. | **RF19** Escolher produtos, quantidade, observação de cada item, observações e a forma de pagamento, entre as aceitas (RN25), com o total pelo preço com desconto dos produtos em promoção (RN29). **RF20** Escolher a data e a hora de retirada, com 7 dias de antecedência na data (RN22) e a hora das 8h às 20h, de 30 em 30 minutos (RN23). |
| **US11** — Como cliente, quero enviar meu pedido, para que a Lídia avalie se pode atender. | **RF21** Identificar com nome e WhatsApp, com consentimento, que inclui o aceite dos Termos de uso e da Política de privacidade (RN16, RN27). **RF22** Registrar o pedido como Novo e avisar que ainda não está confirmado. **RF23** Limitar os envios e descartar os automáticos. |
| **US12** — Como Lídia, quero anonimizar os dados de um cliente, para atender ao pedido de exclusão. | **RF24** Anonimizar o cliente sem apagar o histórico (RN17). |
| **US13** — Como Lídia, quero uma caixa de notificações no painel, para saber na hora quando chega um pedido novo e quando um pedido está perto da retirada. | **RF25** Gerar uma notificação quando um pedido chega pelo Portal do Cliente e os avisos de retirada próxima nos momentos da RN30, cada um uma vez só, sem dado pessoal do cliente (RN17). **RF26** Mostrar o sino com a quantidade de notificações não vistas, atualizada a cada 1 minuto sem recarregar a página, e a caixinha com as notificações dos últimos 30 dias; abrir a caixinha marca as notificações como vistas, e clicar numa delas abre o pedido (RN30). |

**Adições depois da documentação entregue em sala** (formalizadas na `ZAP-83`):
- **US9 a US11 e RF17 a RF23** são o Portal do Cliente (`ZAP-18`; histórias `ZAP-100` a `ZAP-103`).
- **US12 e RF24** são a anonimização de clientes (`ZAP-18`; história `ZAP-114`).
- **US13, RF25 e RF26** são a caixa de notificações do painel (história `ZAP-172`, 14/11/2026, RN30).
- **US7, RF13 e RF14** são novos (decisão da `ZAP-64`, item 14.9; história `ZAP-87`).
- **US8, RF15 e RF16** numeram o escopo ampliado que já tinha sido aprovado sem RF (história `ZAP-60`).
- **RF07 e RF15** passam a ter o status **Entregue** (`ZAP-60`, 14/11/2026), e o **RF07** ganha o filtro de status no lugar do filtro "Recusados" (`ZAP-28`, `ZAP-179`, 14/11/2026).
- **RF05 e RF17** passam a ter os **alérgenos** do produto: a Lídia marca a lista fixa no cadastro, e o cardápio público mostra os selos (história `ZAP-128`, correção do formato na `ZAP-197`, 17/11/2026). A equipe não criou um RF próprio.
- **RF03, RF04, RF08, RF13, RF17 e RF19** passam a ter as **formas de pagamento**: a Lídia escolhe as que aceita, o cardápio mostra só essas, e o pedido grava a forma combinada (história `ZAP-190`, 17/11/2026). Também sem RF próprio.
- **RF05, RF06, RF13, RF17 e RF19** passam a ter as **categorias** do cardápio, cadastradas e ordenadas pela Lídia, o **nome único** do produto, sem o campo sabor, e o **fim de recheio e cobertura** no pedido, com a personalização na observação do item (história `ZAP-136`, 14/11/2026, RN26). A equipe não criou um RF próprio.
- **RF01 e RF21** passam a ter o **aceite dos Termos de uso e da Política de privacidade**: a Lídia aceita no login, e o cliente, no envio do pedido, junto do consentimento (história `ZAP-143`, 14/11/2026, RN27). A equipe não criou um RF próprio.
- **RF06, RF13, RF17 e RF19** passam a ter o **produto fora do cardápio**: a Lídia tira o produto do cardápio por um tempo, sem excluir, e volta com ele depois; fora do cardápio, ele continua na tela de produtos, some do cardápio público e não entra em pedido novo (história `ZAP-151`, 14/11/2026, RN28). A equipe não criou um RF próprio.
- **RF03, RF06, RF13, RF17 e RF19** passam a ter o **preço promocional**: a Lídia aplica um desconto no produto, informando o preço antes da promoção e o preço com desconto, e encerra quando quiser; o cardápio mostra o preço com desconto, o normal riscado e o percentual, e a seção "Promoções" no topo, que ela pode desligar; o pedido novo usa o preço com desconto (história `ZAP-152`, 14/11/2026, RN29). A equipe não criou um RF próprio.
- **RF11 e RF12** passam a valer também para o **cancelamento** de pedidos Confirmados e Em produção (`ZAP-64`).
- **RF10, RF12 e RF16:** o botão "Enviar no WhatsApp" continua disponível para **reenviar** a mensagem, e o painel mostra só a mensagem da etapa atual, com as anteriores guardadas para consulta (`ZAP-64`, `ZAP-51`).

---

## 8. Regras de negócio (consolidadas)

| ID | Regra | Origem |
|---|---|---|
| RN01 | Todo dado de negócio pertence a um estabelecimento (`estabelecimento_id`). O sistema é multi-estabelecimento; a Casa Belt é o primeiro. | DER |
| RN02 | Só a proprietária (usuário do estabelecimento) acessa o painel. A Romilda e os clientes não têm usuário. | ISO 5.15 |
| RN03 | Status do pedido: 1-Novo · 2-Confirmado · 3-Em produção · 4-Concluído · 5-Recusado · 6-Entregue. O Entregue entrou depois e ficou com o número 6, para nenhum pedido antigo mudar de status (ZAP-60). Transições permitidas: Novo → Confirmado ou Recusado; Confirmado → Em produção ou Recusado (cancelamento); Em produção → Concluído ou Recusado (cancelamento); Concluído → Entregue, quando o cliente retira; e as voltas Em produção → Confirmado, Concluído → Em produção e Entregue → Concluído. Nada volta para antes da confirmação, e Recusado não muda mais. Entregue não pode ser cancelado. A mudança é feita por botões nos detalhes do pedido, sem arrastar. | DER / RF07 / ZAP-64 / ZAP-60 |
| RN04 | O quadro tem um **filtro de status** ("Mostrar"), com a opção "Todos" e uma opção por status, cada uma com a quantidade de pedidos. Em "Todos" (o padrão), aparecem só os pedidos em andamento: **Entregue e Recusado ficam ocultos**. Escolhendo um status, aparecem só os pedidos dele. O filtro fica no endereço da página (`?status=3`) e continua valendo ao voltar do cadastro ou da edição de um pedido. É feito na tela, sem rota nova no backend. | Arquitetura / ZAP-179 / ZAP-60 |
| RN05 | Recusar ou cancelar exige `motivo_recusa` (obrigatório quando status = 5). O cancelamento usa o mesmo fluxo da recusa. | RF11 / ZAP-64 |
| RN06 | Confirmar grava `confirmado_em`; iniciar a produção grava `producao_em`; recusar ou cancelar grava `recusado_em`; concluir grava `concluido_em`; marcar como entregue grava `entregue_em`, com a data e a hora do clique. Voltar de Entregue para Concluído apaga `entregue_em`; voltar de Concluído para Em produção apaga `concluido_em`; voltar de Em produção para Confirmado apaga `producao_em`. | DER / ZAP-64 / ZAP-83 / ZAP-60 |
| RN07 | Confirmar, recusar, cancelar ou concluir **gera uma mensagem** (`mensagem_whatsapp`) dos tipos 1-Confirmação, 2-Recusa e 3-Pronto. Iniciar a produção e as voltas não geram mensagem. | RF10 / RF12 / ZAP-64 |
| RN08 | Mudar o status, gerar a mensagem e gravar o log acontecem **na mesma transação**. | Justificativa do banco |
| RN09 | O número do pedido é sequencial e único **por estabelecimento** e aparece no card (ex.: #1). É gerado com `MAX + 1` e bloqueio da linha do estabelecimento (`SELECT ... FOR UPDATE`), na mesma transação da criação do pedido. | DER / ZAP-64 |
| RN10 | O item do pedido **congela o preço** (`preco_unitario`). Mudar o cardápio não altera pedidos antigos. Na edição, os itens que já estavam no pedido mantêm o preço; só um item novo copia o preço atual. O preço copiado é o que vale no momento: o preço com desconto, se o produto estiver em promoção (RN29), ou o normal. Quem decide é o backend, e o preço que a tela manda é ignorado. Começar ou encerrar uma promoção não muda os pedidos que já existem. | DER / ZAP-64 / ZAP-152 |
| RN11 | `subtotal = quantidade × preco_unitario`; `valor_total = soma dos subtotais`. | DER |
| RN12 | Quantidade > 0. KG aceita fração (ex.: 1,5); UN não aceita. | DER |
| RN13 | Preço do produto > 0. O preço com desconto da promoção também é > 0 e menor que o preço normal (RN29). | DER / ZAP-152 |
| RN14 | Excluir um produto é **lógico** (`ativo = FALSE`): ele some do cardápio, mas o histórico continua. Excluir é diferente de **tirar do cardápio** (RN28): o produto excluído some também da tela de produtos do painel e não volta, e o fora do cardápio continua lá e pode voltar. | RF06 / ZAP-151 |
| RN15 | Toda foto de produto exige **texto alternativo**. | NBR 5.9.1 |
| RN16 | Um cliente só é gravado com `consentimento_lgpd = TRUE` e `consentimento_em` preenchido. O cliente novo também guarda em `consentimento_versao` a versão dos Termos de uso e da Política de privacidade vigente quando foi gravado (RN27); os clientes de antes dos termos ficam com a versão nula. | LGPD / ZAP-145 / ZAP-146 |
| RN17 | Excluir os dados de um cliente é feito por **anonimização** (`anonimizado_em`), sem apagar o histórico de pedidos. Faz parte da entrega final. O cliente pede pelo WhatsApp da Lídia, e ela anonimiza no painel, o que fica bloqueado se houver pedido em aberto (Novo, Confirmado ou Em produção); Concluído, Entregue e Recusado contam como encerrados. O nome vira "Cliente anonimizado", o telefone vira `0` + id do cliente completado com zeros, em 13 dígitos, e nome e telefone também saem de `mensagem_whatsapp`, de `log_auditoria.detalhes` e de `pedido.motivo_recusa`, que vai para a mensagem de recusa. As observações do pedido e do item não mudam. Depois de anonimizado, o cliente nunca volta a ter pedido em aberto: o pedido Concluído dele não pode voltar para Em produção. A Política de privacidade explica ao cliente como pedir a exclusão e por que ela espera o pedido em aberto terminar (RN27). As notificações do painel não guardam nome, telefone nem texto: o texto é montado na leitura, a partir do pedido, então a anonimização não deixa dados para trás nelas (RN30). | LGPD / ZAP-64 / ZAP-18 / ZAP-115 / ZAP-60 / ZAP-144 / ZAP-172 |
| RN18 | O telefone do cliente é único por estabelecimento. | DER |
| RN19 | Não há delivery: o pedido tem `data_retirada`, com a data e a hora da retirada (RN23), e o pagamento é presencial, na retirada. O sistema não processa nem confirma pagamento; guarda só a **forma combinada** (RN25). | Comunidade / ZAP-190 |
| RN20 | A mensagem copia o telefone do cliente no momento em que é gerada (`telefone_destino`). | DER |
| RN21 | **Edição de pedido por status.** 1-Novo: pode mudar tudo (cliente, itens, quantidades, data e hora de retirada e observações). 2-Confirmado e 3-Em produção: pode mudar itens, quantidades, data e hora de retirada e observações, mas não o cliente; a tela avisa que o cliente precisa ser avisado da mudança. 4-Concluído, 5-Recusado e 6-Entregue: não podem ser editados. Todo pedido cadastrado começa como 1-Novo, e os produtos são escolhidos do cardápio (só os que estão no cardápio, RN28; o item que já estava no pedido pode ficar, mesmo que o produto tenha saído do cardápio). | RF13 / RF14 / ZAP-64 / ZAP-60 / ZAP-151 |
| RN22 | **Antecedência mínima.** Pelo Portal do Cliente, a data de retirada deve ser de pelo menos 7 dias corridos após o envio do pedido, contados no horário de São Paulo e validados também no backend. No Portal do Administrador, a Lídia pode escolher hoje ou uma data futura, inclusive ao editar pedidos que vieram do portal. O horário segue a RN23. | RF20 / ZAP-18 |
| RN23 | **Horário de retirada.** A retirada tem data e hora: das 8h às 20h, de 30 em 30 minutos, no horário de São Paulo, nos dois portais. A data e hora não pode ser antes de agora; na edição, a que já estava no pedido pode ficar, se não foi mudada. Validado na tela, no backend e no banco. | ZAP-127 |
| RN24 | **Alérgenos do produto.** A Lídia marca, no cadastro e na edição, os alérgenos de uma lista fixa: glúten, leite e derivados, ovos, soja, amendoim, castanhas e nozes, e gergelim (`GLUTEN`, `LEITE`, `OVOS`, `SOJA`, `AMENDOIM`, `CASTANHAS`, `GERGELIM`). Os que não estão na lista vão num texto livre de até 300 caracteres. Nenhum é obrigatório: sem o glúten marcado, o produto não contém glúten. O detalhe do produto no cardápio público mostra um selo, com ícone e nome, para cada alérgeno marcado e para o texto livre, e sempre o aviso "Tem alergia? Fale com a loja pelo WhatsApp antes de encomendar.". Não há selo "Não contém glúten" nem "Pode conter traços de…": a cozinha usa farinha de trigo, e o aviso cobre a contaminação cruzada. Código fora da lista é recusado na API e no banco. A informação vale para pedidos novos; o pedido antigo não guarda cópia dela. | CDC / ZAP-128 / ZAP-129 / ZAP-197 |
| RN25 | **Formas de pagamento.** Lista fixa: Dinheiro, Pix, Cartão de crédito, Cartão de débito e Vale-refeição (VR) (`DINHEIRO`, `PIX`, `CREDITO`, `DEBITO`, `VR`). A loja aceita pelo menos uma; todas vêm marcadas no começo, e a Lídia muda na tela Estabelecimento. O cardápio público mostra só as aceitas. Todo pedido novo, do portal ou do painel, tem uma forma, entre as que a loja aceita no momento do pedido. Como o preço (RN10), a forma fica gravada no pedido: se a loja deixar de aceitá-la, os pedidos que já existem não mudam, e na edição a forma que já estava pode ficar. Pedidos de antes da regra ficam sem forma ("Não informada"). A mensagem de confirmação diz a forma: "O pagamento é feito na retirada, por Pix." ("em dinheiro" para Dinheiro); sem forma, a frase antiga. Validado na tela, no backend e no banco. | RF03 / RF13 / RF19 / ZAP-190 |
| RN26 | **Categorias do cardápio e nome único do produto.** Todo produto pertence a uma **categoria** da loja, obrigatória no cadastro e na edição. A Lídia cria, renomeia, ordena e exclui as categorias na tela "Categorias": o nome é obrigatório, tem até 60 caracteres e não se repete entre as categorias ativas da loja, sem diferenciar maiúsculas; a categoria nova entra no fim da lista. A **ordem** é a da Lídia, que arrasta as categorias ou usa o teclado, e vale em todas as listas: cardápio público (seções, abas e janela "Categorias"), lista de produtos do painel e escolha de produtos no formulário de pedido; dentro da categoria, a ordem é por nome. Categoria com produto não excluído, mesmo que fora do cardápio (RN28), **não pode ser excluída**: a tela explica que é preciso mover os produtos antes; a exclusão é lógica, como a do produto (RN14). No cardápio público, só aparecem as categorias com produto no cardápio. O produto tem um **nome completo** (ex.: "Bolo de brigadeiro de chocolate"), sem o campo sabor: cada sabor é um produto, com preço, foto e descrição próprios. O item do pedido **não tem recheio nem cobertura**: os bolos vêm prontos, e a personalização vai na observação do item, num produto personalizável (ex.: "Bolo personalizado"); se ela mudar o preço, a Lídia combina pelo WhatsApp antes de confirmar. Os recheios e coberturas dos pedidos antigos foram para a observação do item, sem perder nada. | RF05 / RF06 / RF13 / RF17 / RF19 / ZAP-136 |
| RN27 | **Termos de uso e Política de privacidade.** Os dois textos ficam versionados no repositório (`docs/termos-de-uso.md` e `docs/politica-de-privacidade.md`), com a versão e a data no topo, e abrem **sem login** nas páginas `/termos` e `/privacidade`. A versão vigente (número inteiro maior que 0) e a data ficam na configuração do backend (`zappi.termos.versao` e `zappi.termos.data`), lidas pelas telas na rota pública `GET /api/publico/termos`. **Painel:** a Lídia só entra depois de aceitar a versão vigente. A caixa "Li e concordo com os Termos de uso e a Política de privacidade" vai junto com o login, e o servidor grava o aceite em `aceite_termos` (versão, data, IP e navegador) e `TERMOS_ACEITOS` no log, na mesma transação do login. Sem o aceite da versão vigente, nem na requisição nem já gravado, o login responde `TERMOS_PENDENTES`, sem token; isso só acontece depois da senha certa, para não revelar se o e-mail existe. O navegador guarda só um lembrete da versão aceita (`localStorage`), para a caixa não aparecer em todo login no mesmo aparelho; a prova do aceite fica no servidor. Em outro aparelho, ou quando a versão sobe, a caixa volta. Cada aceite é um registro novo, como histórico. No rodapé da caixinha da conta, os links "Termos de uso · Política de privacidade" abrem os textos na mesma aba, com "Você aceitou a versão N em DD/MM/AAAA" e o botão "Voltar ao painel". **Portal do Cliente:** uma caixa só, junto do consentimento (RN16): o pedido só é enviado com ela marcada, e o cliente novo fica gravado com a versão vigente no servidor. O cliente que já existe mantém a versão do primeiro consentimento. Os textos foram escritos pela equipe em linguagem simples e não substituem uma revisão jurídica se o sistema for usado como negócio. | US1 / US11 / RF01 / RF21 / LGPD / CDC / ISO 5.34 / ISO 8.16 / ZAP-143 |
| RN28 | **Produto fora do cardápio.** Além de excluir (RN14), a Lídia pode **tirar um produto do cardápio** por um tempo (falta de ingrediente, fora de época) e **voltar com ele** depois, sem cadastrar de novo. O estado fica em `produto.no_cardapio`, separado de `ativo`, e o produto novo entra no cardápio. Na tela de produtos do painel, que mostra todos os produtos não excluídos, o produto fora do cardápio tem o selo **"Fora do cardápio"**, em texto, e o botão **"Voltar ao cardápio"**, que vale na hora; o produto no cardápio tem o botão **"Tirar do cardápio"**, com uma confirmação em linguagem simples que começa na opção segura, "Manter no cardápio". O produto fora do cardápio pode ser editado e excluído, e editar não o traz de volta. Ele **não aparece no cardápio público** nem na escolha de produtos do formulário de pedido, e **não entra em pedido novo**, pelo portal ou pelo painel: o backend recusa o pedido sem gravar nada, com "Este produto não está mais no cardápio." no item. Os pedidos que já existem não mudam: mantêm o produto e o preço da época (RN10), e na edição o item que já estava pode ficar. No pedido em montagem no navegador do cliente, o item de um produto que saiu do cardápio fica marcado como "Indisponível", fora do total e do envio, com o botão de remover, sem perder os outros itens. A categoria só com produtos fora do cardápio some do cardápio público, mas não pode ser excluída (RN26). Tirar e voltar ficam no log como `PRODUTO_EDITADO`, com o antes e o depois de `noCardapio`; repetir não muda nada nem grava log. | US3 / US9 / RF06 / RF17 / RN10 / RN14 / ISO 8.16 / ZAP-151 |
| RN29 | **Preço promocional.** A Lídia coloca um produto em **promoção** na tela do produto, pelo botão **"Aplicar desconto"**, que mostra dois campos com rótulo visível: **"Preço antes da promoção"**, já preenchido com o preço atual, e **"Preço com desconto"**. O preço antes da promoção **é o preço normal** do produto (`produto.preco`): mudar um muda o outro. O preço com desconto (`produto.preco_promocional`) é **maior que zero e menor que o preço normal**. Se não for, a tela mostra o erro junto do campo, e o backend recusa sem gravar nada, com "O preço com desconto precisa ser menor que o preço antes da promoção.". Com a promoção ativa, a edição comum do produto também não aceita um preço normal menor ou igual ao com desconto ("Para baixar mais, encerre a promoção."). Aplicar de novo troca os dois preços. A promoção **não tem data de fim**: fica ativa até a Lídia clicar em **"Encerrar promoção"**, com uma confirmação que começa na opção segura, "Manter a promoção". Encerrar apaga o preço com desconto, que é temporário, e o produto volta ao preço normal. Com a promoção ativa, o **pedido novo usa o preço com desconto**, pelo portal e pelo painel, e quem decide é o backend (RN10); os pedidos que já existem não mudam. **Percentual de desconto:** (preço normal − preço com desconto) ÷ preço normal × 100, **arredondado para baixo** até o inteiro, para nunca anunciar um desconto maior que o real (ex.: de R$ 115,00 por R$ 99,90 = 13,1%, mostra 13%). É calculado na tela, com os dois preços que vêm da API. **Como aparece:** o preço com desconto em destaque, o preço normal riscado e o percentual ao lado da unidade (ex.: "-13%"), na lista de produtos e na tela do produto do painel e, no cardápio público, no cartão, no detalhe do produto e no pedido em montagem; com menos de 1% de desconto, o percentual não aparece. O leitor de tela, que não anuncia o risco, ouve "De R$ 115,00 por R$ 99,90 por kg, 13% de desconto". No formulário de pedido do painel, o produto aparece com o preço com desconto e "(promoção)". Subtotal e total do pedido em montagem usam o preço com desconto. **Seção "Promoções":** no topo do cardápio público, antes das categorias, uma faixa que rola para o lado com todos os produtos em promoção que estão no cardápio, na ordem das categorias da Lídia (RN26); o produto continua também na sua categoria. A seção entra nas abas e na janela "Categorias" e sai durante a busca, para o produto não aparecer duas vezes. Sem produto em promoção, ou com a opção **"Mostrar promoções em destaque no cardápio"** desligada na tela Estabelecimento (`estabelecimento.destacar_promocoes`, ligada por padrão), a seção não aparece, e o preço riscado continua nos produtos. Aplicar e encerrar ficam no log como `PRODUTO_EDITADO`, com o antes e o depois de `preco` e `precoPromocional`; encerrar sem promoção não muda nada nem grava log. Ligar e desligar o destaque entram no `ESTABELECIMENTO_EDITADO`. Validado na tela, no backend e no banco. | US2 / US3 / US9 / US10 / RF03 / RF06 / RF17 / RF19 / RN10 / RN13 / CDC / ISO 8.16 / ZAP-152 |
| RN30 | **Notificações do painel.** O painel avisa a Lídia numa caixa de notificações do estabelecimento (RN01), com dois tipos de aviso sobre um pedido. **1-Novo pedido:** quando um pedido chega pelo Portal do Cliente, gravado na mesma transação do pedido (se o pedido falha, o aviso também não fica), ex.: "Novo pedido #12. Retirada: sáb, 22/11, 15h". O pedido cadastrado pela Lídia no painel não gera esse aviso. **2-Retirada próxima**, no horário de São Paulo e para qualquer pedido, do portal ou do painel: no pedido **Confirmado, Em produção ou Concluído**, um aviso **no dia da retirada, a partir das 8h** (`NO_DIA`, "Pedido #9 é retirado hoje às 15h") e outro **a partir de 2 horas antes** (`DUAS_HORAS`, "Pedido #9 é retirado às 15h, daqui a 2 horas"); no pedido **Novo**, ainda não confirmado, um aviso **na véspera, das 8h até a meia-noite** (`VESPERA`, "Pedido #12 ainda não foi confirmado e é retirado amanhã às 15h") e outro **no dia, a partir das 8h** (`NO_DIA`, "... ainda não foi confirmado e é retirado hoje às 15h"); o pedido **Entregue ou Recusado** não recebe aviso de retirada. Cada aviso é gerado **uma vez só por pedido e por momento**, garantido pelo banco. **Sem tarefa agendada:** o backend gratuito do Render dorme sem acesso (seção 12.4), então os avisos de retirada são criados quando o painel pergunta quantas notificações não vistas existem, só os que o momento já chegou e cuja retirada ainda não passou. Com o painel fechado, o aviso aparece na próxima vez que a Lídia abrir, se a retirada ainda não passou; a véspera que passou sem o painel aberto não gera mais aviso, e fica só o do dia. A notificação **não guarda texto nem dado pessoal**: o texto é montado na leitura, com o número do pedido, a data e o **status atual** (um pedido confirmado depois do aviso perde o "ainda não foi confirmado"), e "hoje" e "amanhã" são contados no dia em que a Lídia lê. **Sino e caixinha:** o contador mostra as não vistas dos últimos 30 dias ("9+" acima de 9; some quando é zero) e é atualizado a cada 1 minuto, só com a aba do painel aberta e visível. A caixinha mostra as notificações dos últimos 30 dias, mais recentes primeiro, com o texto, há quanto tempo chegaram ("há 5 min") e o destaque "Nova" nas não vistas, em texto. Abrir a caixinha marca as exibidas como vistas e zera o contador; as que eram novas continuam destacadas até fechar. Clicar numa notificação abre os detalhes do pedido no quadro. Sem notificações: "Nenhuma notificação por enquanto.". As notificações não entram no log de auditoria. Som e notificação do navegador fora do painel ficam fora do escopo. | US13 / RF25 / RF26 / RN01 / RN17 / ISO 5.15 / NBR 5.1.1 / ZAP-172 |

---

## 9. Requisitos legais (Atividade #9)

O foco é **CDC (Lei nº 8.078/1990)** e **LGPD (Lei nº 13.709/2018)**. Aspectos fiscais ficam de fora, porque o sistema não trata pagamentos.

| Lei | Requisito | Como o sistema atende |
|---|---|---|
| CDC | Informação clara sobre os produtos | Cardápio com o nome completo do produto, descrição, preço por kg e foto, sem informação enganosa |
| CDC | Transparência na comunicação automatizada | Mensagem termina com "Mensagem gerada pelo Zappi" (textos em `docs/mensagens-whatsapp.md`) |
| CDC | Canal de atendimento | Contato direto com a Lídia (`estabelecimento.telefone_whatsapp`) |
| LGPD | Consentimento | Consentimento registrado antes de gravar nome e telefone, numa caixa só com o aceite dos Termos de uso e da Política de privacidade, e a versão aceita guardada no cliente (`cliente.consentimento_versao`, RN16, RN27) |
| LGPD | Transparência sobre o tratamento | **Política de privacidade** (`docs/politica-de-privacidade.md`, página `/privacidade`, sem login, ZAP-144): quem cuida dos dados (a loja é a controladora dos dados do cliente, e o Zappi, o operador; o Zappi é o controlador dos dados de acesso da Lídia), quais dados são guardados e para quê, o que fica no navegador, onde ficam os servidores, os serviços de terceiros, por quanto tempo os dados ficam guardados, os direitos do titular e como pedir (RN27) |
| LGPD | Evidência do aceite | Aceite da Lídia gravado no servidor a cada login com a caixa marcada, com versão, data, IP e navegador (`aceite_termos`), e `TERMOS_ACEITOS` no log; a versão aceita pelo cliente fica no cadastro dele (RN27) |
| LGPD | Finalidade específica | Dados usados só para processar e acompanhar pedidos; o Zappi não vende os dados, não usa para propaganda e não passa de uma loja para outra. Os serviços externos listados na política (Google Maps, Google Fonts, ViaCEP e BrasilAPI) não recebem nome, WhatsApp nem pedido do cliente |
| LGPD | Localização dos dados | Render e Supabase, com servidores nos Estados Unidos: há transferência internacional, informada na política (seção 5 dela), com HTTPS e o banco acessível só pelo backend (seção 14, item 10, ZAP-144) |
| LGPD | Segurança no armazenamento | Acesso restrito e dados segregados por estabelecimento |
| LGPD | Direito de exclusão | Anonimização a pedido do titular, feito pelo WhatsApp da Lídia (RN17). A política explica como pedir e por que a exclusão espera o pedido em aberto terminar |
| CDC | Informação clara sobre os riscos do produto (alérgenos) | Selos de alérgenos no cardápio e o aviso para falar com a loja antes de encomendar (RN24). A Lei nº 10.674/2003 (glúten) e a RDC Anvisa nº 727/2022, que substituiu a RDC nº 26/2015 (alergênicos), tratam de alimentos industrializados e embalados; para a encomenda artesanal, a informação é boa prática do CDC, não obrigação de rotulagem (confirmado com a professora na ZAP-129) |
| CDC | Informação clara sobre o preço em promoção | O preço riscado é o preço normal real do produto, o percentual é arredondado para baixo e nunca é maior que o desconto de verdade, e o pedido novo grava o preço com desconto anunciado (RN29) |
| CDC | Informação clara sobre o pedido | O Portal do Cliente avisa, antes do envio e depois dele: "Seu pedido ainda não está confirmado. A Lídia vai avaliar e responder pelo WhatsApp." |
| CDC | Informação clara sobre as regras de uso | **Termos de uso** (`docs/termos-de-uso.md`, página `/termos`, sem login, ZAP-144): regras do painel e do portal, com o pedido valendo só depois da confirmação da loja, a retirada sem entrega, o pagamento na retirada e a antecedência mínima (RN22, RN27) |

---

## 10. Segurança da informação (Atividade #10 — ABNT NBR ISO/IEC 27002:2022)

| Controle | Requisito do sistema | Implementação prevista |
|---|---|---|
| 5.15 Controle de acesso | Painel administrativo acessível só pela Lídia, mediante login | Spring Security; rotas `/api` protegidas, exceto login; as notificações vêm só do estabelecimento do token, e marcar como vista ignora ids de outra loja (RN30) |
| 5.16 Gestão de identidade | E-mail único como identificador da conta | `usuario.email` UNIQUE |
| 5.17 Informações de autenticação | Senha com **mín. 8 caracteres, letras, números e ao menos 1 caractere especial** | Validação na aplicação |
| 8.24 Uso de criptografia | Senhas em hash (nunca em texto puro); comunicação via HTTPS | BCrypt; HTTPS/TLS gerenciado pelo Render; TLS com o Supabase |
| 5.34 Privacidade e dados pessoais | Dados de clientes segregados e com acesso restrito; transparência sobre o tratamento | `estabelecimento_id` em tudo; RLS no Supabase; acesso ao banco só pelo backend; Termos de uso e Política de privacidade aceitos nos dois portais (RN27) |
| 8.16 Monitoramento | Logs de login, do aceite dos termos e das ações administrativas | Tabelas `log_auditoria` e `aceite_termos` |

Autenticação por **token JWT** nas requisições depois do login. O token vale **8 horas**, sem refresh token: ao expirar, a Lídia faz login de novo. No navegador, ele fica no `sessionStorage`: continua ao recarregar a página e some ao fechar a aba. Ele vai no header `Authorization: Bearer`, e a chave de assinatura fica em variável de ambiente, nunca no código.

**Bloqueio de login (RF02):** 5 falhas seguidas para o mesmo e-mail bloqueiam novos logins por 15 minutos. A contagem usa os registros `LOGIN_FALHA` do `log_auditoria` desde o último `LOGIN_SUCESSO`, sem alterar o DER. A mensagem é em linguagem simples e não revela se o e-mail existe.

**Aceite dos termos (RN27):** depois da senha certa, o login só emite o token com o aceite da versão vigente, vindo na requisição ou já gravado; senão, responde `TERMOS_PENDENTES`. O aceite vai para `aceite_termos` e para o log na mesma transação do login: se algo falhar, nada fica gravado.

Ações a registrar em `log_auditoria.acao`: `LOGIN_SUCESSO`, `LOGIN_FALHA`, `TERMOS_ACEITOS` (com a versão aceita em `detalhes`, e o IP e o navegador como nos outros registros), `ESTABELECIMENTO_EDITADO`, `PRODUTO_CRIADO`, `PRODUTO_EDITADO`, `PRODUTO_EXCLUIDO`, `CATEGORIA_CRIADA`, `CATEGORIA_EDITADA` (o nome ou a ordem), `CATEGORIA_EXCLUIDA`, `PEDIDO_CRIADO`, `PEDIDO_EDITADO`, `PEDIDO_CONFIRMADO`, `PEDIDO_RECUSADO`, `PEDIDO_STATUS_ALTERADO`, `CLIENTE_ANONIMIZADO` (sem o nome e o telefone antigos). Em `PEDIDO_EDITADO`, o campo `detalhes` guarda o que mudou. Tirar o produto do cardápio e voltar com ele também gravam `PRODUTO_EDITADO`, com o antes e o depois de `noCardapio` (RN28, ZAP-151). Aplicar e encerrar a promoção também gravam `PRODUTO_EDITADO`, com o antes e o depois de `preco` e `precoPromocional` (nulo sem promoção), e ligar ou desligar o destaque das promoções entra no `ESTABELECIMENTO_EDITADO`, com `destacarPromocoes` (RN29, ZAP-152). Nas ações de categoria, `detalhes` guarda o antes e o depois (ZAP-136), e a categoria do produto entra no retrato de `PRODUTO_CRIADO` e `PRODUTO_EDITADO`. As notificações do painel (RN30) não gravam log: são avisos criados pelo sistema, e abrir a caixinha não é uma ação administrativa. Cada registro guarda data, hora, IP de origem e user agent.

---

## 11. Acessibilidade digital (Atividade #11 — ABNT NBR 17225:2025 / WCAG 2.2)

| Requisito NBR | Critério WCAG | Implementação no Zappi |
|---|---|---|
| 5.11.2 Contraste para texto | 1.4.3 (AA) | Contraste mínimo de 4,5:1, sobretudo em preços e descrições, inclusive no preço riscado e no percentual da promoção. A promoção não depende só da cor: o preço antigo é riscado, o percentual vem em texto, e o leitor de tela ouve "De R$ … por R$ …, 13% de desconto" (RN29). No sino de notificações, o contador e o destaque "Nova" também têm 4,5:1, e o destaque é em texto, não só por cor (RN30) |
| 5.1.1 Indicador de foco visível | 2.4.7 (AA) | Borda destacada nos campos ao receber foco pelo teclado (começando pelo login). No sino de notificações e nos itens da caixinha também; Esc fecha a caixinha e o foco volta ao sino. O sino tem nome acessível com a contagem ("Notificações, 3 não vistas"), e a chegada de notificação nova é anunciada uma vez ao leitor de tela, de forma discreta (`aria-live="polite"`), sem repetir a cada atualização (RN30) |
| 5.1.4 Ordem de foco previsível | 2.4.3 (A) | Cadastro de produto: nome → categoria → vendido por → preço → descrição → alérgenos → foto → "Salvar" (ZAP-139). Categorias: a ordem muda arrastando ou pelo teclado, na mesma alça (Espaço pega, setas movem, Espaço solta, Esc desfaz), com o foco na categoria movida e cada passo anunciado para leitores de tela (ZAP-136). Cadastro de pedido: cliente → itens → data de retirada → hora de retirada → observações → "Salvar" |
| 5.9.1 Texto alternativo | 1.1.1 (A) | Toda foto de produto com texto alternativo (`foto_texto_alternativo`) |
| 5.12.12 Nível de linguagem | 3.1.5 (AAA) | Mensagens do WhatsApp, Termos de uso, Política de privacidade e textos das notificações em linguagem simples, sem termos técnicos (RN27, RN30) |
| 5.3.1 Rótulos ou instruções | 3.3.2 (A) | Todo campo de formulário com rótulo visível, inclusive a caixa de aceite dos termos no login e no pedido, que explica o motivo e recebe o foco quando falta marcar (RN27), e os campos "Preço antes da promoção" e "Preço com desconto", com o erro junto do campo (RN29) |

---

## 12. Arquitetura da solução (Atividade #13)

### 12.1 Componentes

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Acesso | Navegador (computador ou celular) | Sistema web, sem instalar aplicativo |
| Hospedagem | **Render** (plano gratuito) | Frontend como Static Site e backend como Web Service (Docker); deploy automático a cada merge na `main`. O Docker Compose fica só no ambiente local |
| Endereço e HTTPS | Render | Subdomínio gratuito `*.onrender.com`; HTTPS/TLS gerenciado, com HTTP redirecionando para HTTPS; regra de reescrita (`/*` → `/index.html`) para as rotas do React |
| Frontend | **React 19 + Vite** | Painel da Lídia: login, estabelecimento, produtos e categorias, Kanban com filtro de status, cadastro e edição de pedidos, botão "Enviar no WhatsApp", sino de notificações com a consulta do contador a cada 1 minuto, só com a aba visível (RN30). Portal do Cliente: cardápio público e montagem do pedido. Nos dois: páginas públicas dos Termos de uso e da Política de privacidade (`/termos` e `/privacidade`, RN27) |
| Backend | **Java 21 + Spring Boot 4** (build com **Maven**, com Maven Wrapper) | API REST (JSON); regras de negócio; upload de fotos; geração das mensagens e links `wa.me`; geração das notificações do painel quando ele consulta o contador, sem tarefa agendada (RN30); isolamento por estabelecimento; CORS liberado só para o endereço do frontend |
| Persistência | **Spring Data JPA** + **Flyway** | Acesso ao banco; migrações em SQL puro em `backend/src/main/resources/db/migration`, só para frente |
| Segurança | **Spring Security** | Login, BCrypt, JWT, política de senha |
| Auditoria | Backend + `log_auditoria` | Logins e ações administrativas |
| Banco | **PostgreSQL (Supabase)** | Banco relacional gerenciado; TLS; criptografia em repouso; RLS em todas as tabelas; o backend e o Flyway conectam pelo session pooler (IPv4, porta 5432) |
| Arquivos | **Supabase Storage** | Bucket `produtos` (fotos dos produtos) e bucket `estabelecimentos` (logo e capa da loja, ZAP-119); o banco guarda só o caminho; upload só pelo backend; leitura pública |
| Mensagens | Link **wa.me** | O backend gera o texto e o link; a Lídia clica e envia |
| Endereço pelo CEP | **ViaCEP**, com a **BrasilAPI** como alternativa | No "Estabelecimento", o navegador consulta o CEP digitado e preenche rua, bairro, cidade e UF, que continuam editáveis (ZAP-121). Só o CEP do estabelecimento sai do sistema, sem dado de cliente; sem as APIs, a Lídia preenche à mão |
| Testes (backend) | **JUnit 5, Mockito e Testcontainers** (PostgreSQL) | Testes automatizados, incluindo as migrações e as restrições do banco |
| Testes (frontend) | **Vitest e React Testing Library** (jsdom, user-event e jest-dom) | Testes das telas e das regras do painel, escritos ao lado do código (`*.test.jsx`), com o backend simulado |
| CI/CD | **GitHub Actions** + deploy automático do **Render** | Build e testes em cada pull request; o Render publica a cada merge na `main`, depois que o CI passar |
| Gestão | GitHub, Jira | Versionamento e backlog |

### 12.2 Fluxo geral
1. A Lídia acessa o painel pelo navegador via HTTPS.
2. O Render entrega o React (Static Site), e o React chama a API do backend (REST/JSON) no Web Service.
3. O backend valida e-mail e senha (BCrypt), registra o login no log e devolve o JWT.
4. O backend lê e grava no PostgreSQL via TLS, em transações (status + mensagem + log juntos).
5. A foto do produto vai para o Storage, e o caminho é salvo no banco.
6. Ao confirmar, recusar ou concluir um pedido, o backend gera a mensagem e o link `wa.me`.
7. A Lídia envia, e o cliente recebe no WhatsApp.
8. O GitHub Actions testa cada pull request, e o Render publica cada alteração aprovada na `main`.
9. Com o painel aberto e a aba visível, o React pergunta ao backend a cada 1 minuto quantas notificações não vistas existem (`GET /api/notificacoes/nao-vistas`). Nessa consulta, o backend cria os avisos de retirada próxima que já chegaram, porque o plano gratuito do Render não permite tarefa agendada (seção 12.4). O pedido que chega pelo portal cria o aviso de pedido novo na própria transação (RN30).

### 12.3 Como funciona a mensagem
- O backend monta o texto e um link no formato `https://wa.me/<telefone_destino>?text=<texto codificado em URL>`.
- A Lídia clica em "Enviar no WhatsApp". O WhatsApp abre com a mensagem pronta e ela só aperta enviar.
- O clique marca a mensagem como 2-Enviada e grava `enviado_em`, porque o sistema não tem como saber se ela apertou enviar dentro do WhatsApp. O botão continua disponível para reenviar, e o reenvio mantém o primeiro `enviado_em` (ZAP-64).
- O envio é **semiautomático**: o sistema prepara, a Lídia envia. Este é o funcionamento do sistema (seção 14, item 12). O envio automático pela **Cloud API** não será feito (decisão de 15/11/2026); o campo `id_externo` e o status 3-Falha ficaram no banco, sem uso.

### 12.4 Limitações aceitas da hospedagem gratuita
- O backend no Render (plano gratuito) **dorme após 15 minutos sem acesso**, e o primeiro acesso leva cerca de 1 minuto. Antes do ensaio, do vídeo e do treinamento, acordar o backend. Por dormir, ele não roda tarefa agendada: os avisos de retirada próxima (RN30) são criados quando o painel consulta as notificações, então só aparecem com o painel aberto.
- O Supabase (plano gratuito) **pausa o projeto após 1 semana sem uso** e **não faz backups automáticos**. Conferir antes da demonstração.
- O Render não tem região em São Paulo. O projeto Supabase deve ficar na região mais próxima do Render (Virginia).
- O workspace gratuito do Render tem 1 membro: uma pessoa da equipe é dona da conta.
- A viabilidade do plano gratuito (0,1 CPU, 512 MB) é validada na ZAP-86: subir o backend, conectar ao Supabase pelo session pooler e rodar o Flyway.

---

## 13. Modelo de dados (Atividade #14)

**SGBD:** PostgreSQL (Supabase), relacional. **Acesso:** Spring Data JPA.

**Convenções:**
- `snake_case` e tabelas no singular.
- IDs `BIGINT` gerados automaticamente (IDENTITY), exceto `unidade_medida.id` (`SMALLINT` com valores fixos).
- Datas e horas em `TIMESTAMPTZ`; valores monetários em `NUMERIC(10,2)`.
- `criado_em` com padrão `now()`; `atualizado_em` atualizado pela aplicação a cada edição.
- Obrigatório = `NOT NULL`.

### 13.1 Relacionamentos

| Relacionamento | Cardinalidade | Regra |
|---|---|---|
| estabelecimento — usuario | 1 : N | Cada usuário pertence a um estabelecimento |
| estabelecimento — produto | 1 : N | O cardápio pertence a um estabelecimento |
| estabelecimento — categoria | 1 : N | Categorias do cardápio, separadas por estabelecimento (ZAP-136) |
| categoria — produto | 1 : N | Todo produto pertence a uma categoria (RN26, ZAP-136) |
| estabelecimento — cliente | 1 : N | Clientes segregados por estabelecimento |
| estabelecimento — pedido | 1 : N | Número sequencial por estabelecimento |
| unidade_medida — produto | 1 : N | Produto vendido em KG ou UN |
| cliente — pedido | 1 : N | Um cliente faz vários pedidos |
| pedido — item_pedido | 1 : 1..N | Todo pedido tem ao menos um item |
| produto — item_pedido | 1 : N | Um produto aparece em vários pedidos |
| pedido — mensagem_whatsapp | 1 : N | Cada decisão gera uma mensagem |
| estabelecimento / usuario — log_auditoria | 0..1 : N | Pode ser nulo em falha de login |
| usuario — aceite_termos | 1 : N | Cada aceite dos termos é um registro novo, como histórico (RN27, ZAP-145) |
| estabelecimento — notificacao | 1 : N | Notificações do painel, separadas por estabelecimento (RN30, ZAP-173) |
| pedido — notificacao | 1 : N | Cada aviso uma vez só por pedido, tipo e momento (RN30, ZAP-173) |

### 13.2 Tabelas

Legenda: **Obr.** = obrigatório (NOT NULL).

#### estabelecimento
Confeitaria cadastrada (tenant). Exemplo: Casa Belt.

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| nome | VARCHAR(100) | Sim | | Nome fantasia. Ex.: Casa Belt |
| slug | VARCHAR(60) | Sim | UK | Minúsculas, números e hífen. Ex.: casa-belt (link do cardápio público) |
| descricao | VARCHAR(500) | Não | | RF03 |
| telefone_whatsapp | VARCHAR(13) | Sim | | Só dígitos com DDI e DDD. Ex.: 5511900000000. Canal direto (CDC) |
| email_contato | VARCHAR(150) | Não | | |
| cep | CHAR(8) | Não | | 8 dígitos, sem hífen |
| logradouro | VARCHAR(150) | Não | | |
| numero | VARCHAR(10) | Não | | Texto, para aceitar "s/n" |
| complemento | VARCHAR(60) | Não | | |
| bairro | VARCHAR(80) | Não | | |
| cidade | VARCHAR(80) | Não | | |
| uf | CHAR(2) | Não | | Ex.: SP |
| logo_caminho | VARCHAR(255) | Não | | Caminho do logo no bucket `estabelecimentos`. Ex.: 1/logo-a1b2c3d4.webp. O texto alternativo vem do nome ("Logo de Casa Belt"). **Coluna nova**, fora do dicionário da Atividade #14 (ZAP-119, ZAP-83) |
| capa_caminho | VARCHAR(255) | Não | | Caminho da foto de capa no bucket `estabelecimentos`. Decorativa (texto alternativo vazio). **Coluna nova**, fora do dicionário da Atividade #14 (ZAP-119, ZAP-83) |
| formas_pagamento | VARCHAR(10)[] | Sim | | Formas aceitas (RN25), sem repetir e na ordem da lista. Padrão {DINHEIRO,PIX,CREDITO,DEBITO,VR}. Pelo menos uma, só da lista (`ck_estabelecimento_formas_pagamento`). **Coluna nova** (V13, ZAP-191) |
| destacar_promocoes | BOOLEAN | Sim | | Mostrar a seção "Promoções" no topo do cardápio público (RN29). Padrão TRUE; as lojas que já existiam ficaram com o destaque ligado. **Coluna nova** (V9, ZAP-159), fora do dicionário da Atividade #14 (ZAP-152, ZAP-83) |
| ativo | BOOLEAN | Sim | | Padrão TRUE |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now() |
| atualizado_em | TIMESTAMPTZ | Sim | | |

#### usuario
Acesso ao painel (Lídia). A Romilda e os clientes não têm usuário.

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| estabelecimento_id | BIGINT | Sim | FK | → estabelecimento.id |
| nome | VARCHAR(100) | Sim | | Ex.: Lídia |
| email | VARCHAR(150) | Sim | UK | Único no sistema (ISO 5.16). RF01 |
| senha_hash | VARCHAR(60) | Sim | | BCrypt (ISO 8.24). Política de senha validada na aplicação (5.17) |
| ativo | BOOLEAN | Sim | | Padrão TRUE |
| ultimo_login_em | TIMESTAMPTZ | Não | | Último login bem-sucedido |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now() |
| atualizado_em | TIMESTAMPTZ | Sim | | |

#### aceite_termos
Aceite dos Termos de uso e da Política de privacidade pela Lídia, gravado junto com o login (RN27, ISO 5.34 e 8.16). Cada aceite é um registro novo: marcar a caixa de novo, em outro aparelho ou numa versão nova, guarda mais uma prova, sem apagar as anteriores. **Tabela nova**, fora do dicionário da Atividade #14 (V7, ZAP-145, ZAP-83).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| usuario_id | BIGINT | Sim | FK | → usuario.id |
| versao | INTEGER | Sim | | Versão aceita (`zappi.termos.versao` no momento do login). Maior que 0 (`ck_aceite_termos_versao`) |
| aceito_em | TIMESTAMPTZ | Sim | | Padrão now() |
| ip_origem | VARCHAR(45) | Não | | IPv4 e IPv6 |
| user_agent | VARCHAR(255) | Não | | Navegador |

#### unidade_medida
Tabela de domínio. Valores fixos: 1-KG (Quilograma, aceita fração) e 2-UN (Unidade, não aceita fração).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | SMALLINT | Sim | PK | 1-KG, 2-UN |
| sigla | VARCHAR(5) | Sim | UK | KG, UN |
| descricao | VARCHAR(30) | Sim | | Quilograma, Unidade |
| permite_fracao | BOOLEAN | Sim | | KG = TRUE; UN = FALSE |

#### categoria
Categoria do cardápio, cadastrada e ordenada pela Lídia (RN26). **Tabela nova** (V6, ZAP-137), fora do dicionário da Atividade #14 (ZAP-136, ZAP-83).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| estabelecimento_id | BIGINT | Sim | FK | → estabelecimento.id (RN01) |
| nome | VARCHAR(60) | Sim | UK* | Ex.: Bolos. *Único entre as categorias ativas da loja, sem diferenciar maiúsculas (`uk_categoria_nome_ativa`) |
| ordem | INTEGER | Sim | | Posição definida pela Lídia (1 = primeira). A categoria nova entra no fim |
| ativo | BOOLEAN | Sim | | Exclusão lógica, como no produto (RN14). Padrão TRUE |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now() |
| atualizado_em | TIMESTAMPTZ | Sim | | |

#### produto
Item do cardápio (RF05/RF06).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| estabelecimento_id | BIGINT | Sim | FK | → estabelecimento.id |
| unidade_medida_id | SMALLINT | Sim | FK | → unidade_medida.id |
| categoria_id | BIGINT | Sim | FK | → categoria.id, da mesma loja (RN26). **Coluna nova** (V6, ZAP-137) |
| nome | VARCHAR(150) | Sim | | Nome completo. Ex.: Bolo de brigadeiro de chocolate. Era VARCHAR(100) com o tipo ("Bolo") e a coluna `sabor` ("Brigadeiro de chocolate"), que saiu na V6 (ZAP-136) |
| descricao | VARCHAR(500) | Não | | Informação clara e não enganosa (CDC) |
| preco | NUMERIC(10,2) | Sim | | Por unidade de medida. Ex.: 100,00 por KG. > 0. É o preço normal; na promoção, aparece riscado (RN29) |
| preco_promocional | NUMERIC(10,2) | Não | | Preço com desconto da promoção (RN29). Nulo = sem promoção; com valor, o pedido novo usa este preço, e o cardápio mostra o `preco` riscado. > 0 e < `preco` (`ck_produto_preco_promocional`). Os produtos que já existiam ficaram sem promoção. **Coluna nova** (V9, ZAP-159), fora do dicionário da Atividade #14 (ZAP-152, ZAP-83) |
| foto_caminho | VARCHAR(255) | Não | | Caminho no bucket `produtos`. Ex.: 1/bolo-chocolate.jpg |
| foto_texto_alternativo | VARCHAR(150) | Não | | Obrigatório quando há foto (NBR 5.9.1) |
| alergenos | VARCHAR(20)[] | Sim | | Coluna nova (V12, ZAP-197). Códigos da lista fixa, sem repetir e na ordem dela; vazia por padrão. Ex.: {GLUTEN,LEITE,OVOS}. Só aceita os códigos da RN24 (`ck_produto_alergenos`) |
| outros_alergenos | VARCHAR(300) | Não | | Coluna nova (V5, ZAP-130). Texto livre com os alérgenos que não estão na lista. Ex.: canela |
| ativo | BOOLEAN | Sim | | Exclusão lógica (RF06) |
| no_cardapio | BOOLEAN | Sim | | Fora do cardápio por um tempo, sem excluir (RN28): FALSE tira o produto do cardápio público e dos pedidos novos, e ele continua na tela de produtos. Padrão TRUE; os produtos que já existiam ficaram no cardápio. **Coluna nova** (V8, ZAP-153), fora do dicionário da Atividade #14 (ZAP-151, ZAP-83) |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now() |
| atualizado_em | TIMESTAMPTZ | Sim | | |

#### cliente
Consumidor. Dados pessoais protegidos pela LGPD.

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| estabelecimento_id | BIGINT | Sim | FK | → estabelecimento.id (ISO 5.34) |
| nome | VARCHAR(100) | Sim | | |
| telefone_whatsapp | VARCHAR(13) | Sim | UK* | *Único por estabelecimento (estabelecimento_id + telefone_whatsapp) |
| consentimento_lgpd | BOOLEAN | Sim | | Deve ser TRUE |
| consentimento_em | TIMESTAMPTZ | Sim | | Evidência do aceite |
| consentimento_versao | INTEGER | Não | | Versão dos Termos de uso e da Política de privacidade vigente quando o cliente foi gravado (RN16, RN27). Nula nos clientes de antes dos termos. Maior que 0 (`ck_cliente_consentimento_versao`). **Coluna nova** (V7, ZAP-145) |
| anonimizado_em | TIMESTAMPTZ | Não | | Direito de exclusão (LGPD) |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now() |
| atualizado_em | TIMESTAMPTZ | Sim | | |

#### pedido
Encomenda. Cada pedido é um card do Kanban (RF07–RF16).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| estabelecimento_id | BIGINT | Sim | FK | → estabelecimento.id |
| cliente_id | BIGINT | Sim | FK | → cliente.id |
| numero | INTEGER | Sim | UK* | *Único por estabelecimento. Exibido no card (#1) |
| status | SMALLINT | Sim | | 1-Novo · 2-Confirmado · 3-Em produção · 4-Concluído · 5-Recusado · 6-Entregue. O 6 entrou depois (ZAP-60, migração na ZAP-167) |
| data_retirada | TIMESTAMP | Sim | | Data e hora da retirada, no horário de São Paulo, sem fuso (RN23, ZAP-127). Não há delivery |
| observacao | VARCHAR(500) | Não | | Ocasião, tema da festa |
| motivo_recusa | VARCHAR(500) | Não | | Obrigatório quando status = 5 (RF11) |
| valor_total | NUMERIC(10,2) | Sim | | Soma dos subtotais. Pago na retirada |
| forma_pagamento | VARCHAR(10) | Não | | Forma combinada (RN25): DINHEIRO, PIX, CREDITO, DEBITO ou VR (`ck_pedido_forma_pagamento`). Nula nos pedidos de antes da regra; a API exige nos novos. **Coluna nova** (V13, ZAP-191) |
| criado_em | TIMESTAMPTZ | Sim | | Pedido recebido. Padrão now() |
| confirmado_em | TIMESTAMPTZ | Não | | RF09 |
| producao_em | TIMESTAMPTZ | Não | | RF15. Entrada em Em produção. **Coluna nova**, fora do dicionário da Atividade #14 (ZAP-83) |
| recusado_em | TIMESTAMPTZ | Não | | RF11 |
| concluido_em | TIMESTAMPTZ | Não | | Dispara a mensagem de "pronto" |
| entregue_em | TIMESTAMPTZ | Não | | RF15. Data e hora em que a Lídia marcou o pedido como entregue (RN06). **Coluna nova**, fora do dicionário da Atividade #14 (ZAP-60, ZAP-167) |
| atualizado_em | TIMESTAMPTZ | Sim | | |

#### item_pedido
Produto do pedido, com quantidade e personalização.

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| pedido_id | BIGINT | Sim | FK | → pedido.id, ON DELETE CASCADE |
| produto_id | BIGINT | Sim | FK | → produto.id |
| quantidade | NUMERIC(8,3) | Sim | | Ex.: 1,500 (KG) ou 10 (UN). > 0 |
| preco_unitario | NUMERIC(10,2) | Sim | | Preço congelado quando o item entra no pedido (RN10): o com desconto, se o produto estava em promoção (RN29) |
| subtotal | NUMERIC(10,2) | Sim | | quantidade × preco_unitario |
| observacao | VARCHAR(600) | Não | | Detalhes do item (ex.: tema da festa, frase no bolo, outra massa). A tela e a API aceitam até 300 nos itens novos; os 600 do banco guardam o recheio e a cobertura dos pedidos antigos, copiados para o começo da observação quando as colunas `recheio` e `cobertura` saíram (V6, ZAP-136) |

#### mensagem_whatsapp
Mensagem gerada a cada decisão sobre o pedido (RF10/RF12). A Lídia envia pelo `wa.me`.

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| pedido_id | BIGINT | Sim | FK | → pedido.id, ON DELETE CASCADE |
| tipo | SMALLINT | Sim | | 1-Confirmação · 2-Recusa · 3-Pronto para retirada |
| telefone_destino | VARCHAR(13) | Sim | | Cópia do telefone do cliente na geração |
| conteudo | TEXT | Sim | | Linguagem simples (NBR 5.12.12) + identificação do Zappi (CDC) |
| status | SMALLINT | Sim | | 1-Pendente · 2-Enviada · 3-Falha (sem uso, como `id_externo`) |
| id_externo | VARCHAR(100) | Não | | Sem uso: era para o envio pela Cloud API, que não será feito (seção 14, item 12) |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now() |
| enviado_em | TIMESTAMPTZ | Não | | |

#### notificacao
Aviso do painel para a Lídia sobre um pedido: pedido novo vindo do portal ou retirada próxima (RN30). Sem texto e sem dado pessoal do cliente: o texto é montado na leitura, a partir do pedido (RN17). **Tabela nova**, fora do dicionário da Atividade #14 (V10, ZAP-173, ZAP-83).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| estabelecimento_id | BIGINT | Sim | FK | → estabelecimento.id (RN01) |
| pedido_id | BIGINT | Sim | FK | → pedido.id, ON DELETE CASCADE |
| tipo | SMALLINT | Sim | | 1-Novo pedido · 2-Retirada próxima (`ck_notificacao_tipo`) |
| momento | VARCHAR(20) | Não | | Nulo no tipo 1. No tipo 2, obrigatório: VESPERA (pedido Novo, na véspera, a partir das 8h), NO_DIA (no dia da retirada, a partir das 8h) ou DUAS_HORAS (2 horas antes, pedidos Confirmado, Em produção ou Concluído) (`ck_notificacao_momento`) |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now(). Conta os 30 dias da caixinha e o "há 5 min" |
| vista_em | TIMESTAMPTZ | Não | | Nula enquanto não vista; preenchida quando a Lídia abre a caixinha |

#### log_auditoria
Trilha de auditoria (ISO 8.16).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| estabelecimento_id | BIGINT | Não | FK | Nulo em falha de login com e-mail inexistente |
| usuario_id | BIGINT | Não | FK | Nulo em falha de login com e-mail inexistente |
| acao | VARCHAR(40) | Sim | | Valores na seção 10 |
| entidade | VARCHAR(40) | Não | | Ex.: produto, pedido |
| entidade_id | BIGINT | Não | | |
| email_informado | VARCHAR(150) | Não | | E-mail digitado no login |
| ip_origem | VARCHAR(45) | Não | | IPv4 e IPv6 |
| user_agent | VARCHAR(255) | Não | | |
| detalhes | JSONB | Não | | Ex.: valores antes e depois da edição |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now() |

### 13.3 Restrições a implementar no banco
- `UNIQUE (estabelecimento_id, telefone_whatsapp)` em `cliente`.
- `UNIQUE (estabelecimento_id, numero)` em `pedido`.
- `UNIQUE (email)` em `usuario`; `UNIQUE (slug)` em `estabelecimento`; `UNIQUE (sigla)` em `unidade_medida`.
- `CHECK (preco > 0)` em `produto`; `CHECK (quantidade > 0)` em `item_pedido`.
- `CHECK (status <> 5 OR motivo_recusa IS NOT NULL)` em `pedido`.
- `CHECK (status BETWEEN 1 AND 6)` em `pedido` (o 6-Entregue entrou na ZAP-167; antes, de 1 a 5); `tipo` e `status` de `mensagem_whatsapp` entre 1 e 3.
- `CHECK (consentimento_lgpd = TRUE)` em `cliente`.
- `CHECK` do horário de retirada em `pedido`: das 8h às 20h, em hora cheia ou meia hora (RN23, ZAP-127).
- `CHECK (foto_caminho IS NULL OR foto_texto_alternativo IS NOT NULL)` em `produto`.
- `CHECK` dos alérgenos em `produto` (`ck_produto_alergenos`): a lista `alergenos` só aceita GLUTEN, LEITE, OVOS, SOJA, AMENDOIM, CASTANHAS e GERGELIM (ZAP-197).
- `CHECK (preco_promocional IS NULL OR (preco_promocional > 0 AND preco_promocional < preco))` em `produto` (`ck_produto_preco_promocional`, V9, ZAP-159): o preço com desconto é maior que zero e menor que o preço normal (RN29).
- `CHECK` das formas de pagamento (ZAP-191): em `estabelecimento`, pelo menos uma e só DINHEIRO, PIX, CREDITO, DEBITO e VR (`ck_estabelecimento_formas_pagamento`); em `pedido`, nula ou uma delas (`ck_pedido_forma_pagamento`).
- `ON DELETE CASCADE` em `item_pedido.pedido_id`, `mensagem_whatsapp.pedido_id` e `notificacao.pedido_id`.
- Notificações (ZAP-173, V10): `CHECK (tipo BETWEEN 1 AND 2)` (`ck_notificacao_tipo`); `momento` nulo no tipo 1 e, no tipo 2, obrigatório e só VESPERA, NO_DIA ou DUAS_HORAS (`ck_notificacao_momento`); `UNIQUE NULLS NOT DISTINCT (pedido_id, tipo, momento)` (`uk_notificacao_pedido_tipo_momento`), para o mesmo aviso não ser criado duas vezes, tratando como igual o momento nulo do tipo 1 (exige PostgreSQL 15 ou mais novo); e o índice `idx_notificacao_estabelecimento (estabelecimento_id, vista_em, criado_em)`, para contar as não vistas e listar as recentes (RN30).
- Categorias (ZAP-136, V6): índice único `uk_categoria_nome_ativa` em `categoria (estabelecimento_id, lower(nome)) WHERE ativo`, e `produto.categoria_id NOT NULL` com FK para `categoria`.
- Termos (ZAP-145, V7): `CHECK (versao > 0)` em `aceite_termos` (`ck_aceite_termos_versao`), com o índice `idx_aceite_termos_usuario (usuario_id, aceito_em)` para achar o último aceite, e `CHECK (consentimento_versao IS NULL OR consentimento_versao > 0)` em `cliente` (`ck_cliente_consentimento_versao`).
- Consistência de tenant (decisão da ZAP-64): `UNIQUE (id, estabelecimento_id)` em `cliente` e FK composta `(cliente_id, estabelecimento_id)` em `pedido`, referenciando `cliente (id, estabelecimento_id)`. O banco recusa um pedido com cliente de outro estabelecimento.
- RLS habilitado em todas as tabelas (somente o backend acessa).

---

## 14. Pontos em aberto (decidir com a equipe antes de implementar)

1. **Texto da mensagem ao cliente.** **Decidido (ZAP-63):** os textos de confirmação, recusa (também usado no cancelamento) e pronto para retirada estão em [`docs/mensagens-whatsapp.md`](mensagens-whatsapp.md). Todos terminam com **"Mensagem gerada pelo Zappi"**.
2. **Quando a mensagem vira "Enviada".** **Decidido (ZAP-64):** ao clicar em "Enviar no WhatsApp". Detalhes na seção 12.3.
3. **Transições de status permitidas.** **Decidido (ZAP-64):**
   - mudar de coluna por **botões** nos detalhes do pedido, mostrando só o próximo passo possível, **sem arrastar**;
   - **cancelar** pedidos Confirmados e Em produção pelo fluxo de recusa: o pedido vai para Recusado, com motivo obrigatório; um status próprio "Cancelado" fica como melhoria futura;
   - **voltar** só para desfazer o último passo da produção: Concluído → Em produção e Em produção → Confirmado, com confirmação; ao voltar de Concluído, se o aviso de pronto já foi enviado, a tela lembra a Lídia de avisar o cliente;
   - **Entregue** (ZAP-60, 14/11/2026): no pedido Concluído, "Marcar como entregue" leva o pedido para Entregue; "Voltar para concluído", com confirmação, corrige um clique errado. Nenhum dos dois gera mensagem;
   - nada volta para antes da confirmação, e um pedido Recusado não volta para o quadro.
4. **Massa do bolo.** **Decidido (ZAP-64):** sem campo próprio, e o DER não muda. A massa padrão de cada bolo vai na **descrição do produto** (ex.: "Massa de chocolate, recheio de brigadeiro…"). Quando o cliente pede outra massa, a Lídia anota na **observação do item** (`item_pedido.observacao`). No Portal do Cliente, a massa também vai na observação do item (`ZAP-18`, seção 14, item 11). **Atualizado na ZAP-136 (14/11/2026):** recheio e cobertura também saem do pedido e vão para a observação do item, e a dica "Quer outra massa?" deu lugar a uma dica só, em todos os produtos ("Algum detalhe? Ex.: tema da festa ou frase no bolo.").
5. **Salgados.** **Decidido (ZAP-64):** vendidos por **unidade (UN)**, sem unidade de medida nova. O cento, o meio cento e pacotes viram produtos próprios no cardápio (ex.: "Cento de coxinha"), o que também dá o desconto do cento. O sistema não obriga um mínimo de unidades: a Lídia combina com o cliente. No cadastro, o nome é o nome completo ("Coxinha de frango", "Cento de coxinha"), e a categoria é a dos salgados ("Salgados"). Antes da ZAP-136, o nome era o tipo ("Salgado") e o sabor era o item.
6. **Consistência de tenant.** **Decidido (ZAP-64):** as duas proteções. No banco, a FK composta da seção 13.3 garante que o pedido e o cliente pertencem ao mesmo estabelecimento; no backend, a criação e a edição de pedidos conferem isso antes de gravar, para devolver uma mensagem clara.
7. **Geração do número do pedido** por estabelecimento. **Decidido (ZAP-64):** `MAX + 1` com bloqueio da linha do estabelecimento, na mesma transação da criação do pedido (RN09).
8. **Decisões técnicas** (registradas na ZAP-62; histórico na seção 17):
   - build do backend: **Maven**, com Maven Wrapper;
   - ferramenta de migração: **Flyway**, com SQL puro;
   - biblioteca de UI e componentes do React: **Mantine 9** (ZAP-70);
   - frameworks de teste do backend: **JUnit 5, Mockito e Testcontainers**; frameworks de teste do frontend: **Vitest e React Testing Library**;
   - hospedagem e domínio: **Render + Supabase**, com subdomínio gratuito `*.onrender.com`;
   - expiração do JWT: **8 horas**, sem refresh token; onde guardar o JWT no frontend: **`sessionStorage`** (ZAP-34);
   - bloqueio após falhas de login (RF02): **5 falhas seguidas bloqueiam por 15 minutos**;
   - ainda em aberto: quem será dono das contas do Render e do Supabase, e a validação do plano gratuito do Render (ZAP-86).
9. **Criar e editar pedidos.** **Decidido (ZAP-64):** a Lídia pode **criar** pedidos (botão "Novo pedido" no quadro) e **editar** pedidos, com a edição limitada pelo status (RN21). Os produtos vêm do cardápio, o total é calculado pelo sistema, os itens antigos mantêm o preço (RN10) e toda criação e edição vai para o log. Virou a US7 (história `ZAP-87`).
10. **Região dos servidores e LGPD.** **Decidido (ZAP-144, Política de privacidade):** o Render não tem região em São Paulo, e os dados ficam no Render e no Supabase, com servidores nos Estados Unidos. A política informa a transferência internacional (seção 5 dela), e a seção 9 tem a linha "Localização dos dados".
11. **Portal do Cliente.** **Decidido (ZAP-18):**
    - **antecedência mínima:** 7 dias corridos pelo portal (RN22), confirmado pela Lídia. Abaixo do calendário, o portal mostra "Precisa para antes de 7 dias? Fale com a Lídia pelo WhatsApp", com link para o WhatsApp dela;
    - **limite de pedidos por data:** sem limite automático; a Lídia recusa o que não couber, pelo fluxo de recusa com motivo. **Confirmado** (`ZAP-57`);
    - **massa:** na observação do item (item 4). A dica "Quer outra massa? Escreva aqui" dos produtos vendidos por KG saiu na ZAP-136: todos os produtos têm a dica "Algum detalhe? Ex.: tema da festa ou frase no bolo.";
    - ~~**recheio e cobertura:** texto livre e opcional, com os campos aparecendo só em produtos vendidos por KG.~~ **Mudou na ZAP-136 (14/11/2026):** os bolos vêm prontos, e recheio e cobertura saem do sistema. A personalização vai na observação do item, num produto personalizável (ex.: "Bolo personalizado"), e uma mudança de preço é combinada pelo WhatsApp antes da confirmação (RN26);
    - **validade do pedido:** aviso de que o pedido só vale depois da confirmação da Lídia (seção 9);
    - **proteção do envio sem login:** 5 envios por hora por IP e 3 por dia por telefone, com o excesso recusado sem gravar nada e registrado no log, e um campo invisível que descarta envios automáticos. Sem captcha no início. **Implementado na ZAP-112:** o "dia" do telefone é uma janela de 24 horas, como no bloqueio de login, e só os pedidos aceitos pelo portal contam (os da Lídia pelo painel, não). O excesso recebe `429 LIMITE_DE_ENVIOS` e o log `PEDIDO_PUBLICO_RECUSADO`, sem o telefone. O campo invisível se chama `site`: preenchido, o envio recebe a mesma resposta de um aceito, sem número e sem gravar nada;
    - **exclusão de dados:** pedido pelo WhatsApp da Lídia, que anonimiza no painel (RN17, história `ZAP-114`).
12. **WhatsApp Cloud API.** **Decidido (10/11/2026): fica fora da entrega, e os avisos ao cliente continuam pelo `wa.me`. Em 15/11/2026, a equipe decidiu que o envio automático não será feito** (ZAP-83). O fluxo do sistema é:
    1. **o cliente manda mensagem para a Lídia** no WhatsApp dela, como já acontece hoje;
    2. **resposta automática com o link do cardápio**, pela **mensagem de saudação do WhatsApp Business**: recurso nativo e gratuito do aplicativo, sem código no Zappi. Ela é enviada no primeiro contato e quando o cliente volta a escrever depois de 14 dias sem conversa. A Lídia configura no aplicativo (Ferramentas comerciais › Mensagem de saudação);
    3. **o cliente faz o pedido no Portal do Cliente**, e o pedido aparece no quadro da Lídia como Novo. O cardápio público já existe (ZAP-105); faltam a montagem e o envio do pedido (ZAP-107 e ZAP-110 no front, ZAP-109 no backend);
    4. **a Lídia envia a confirmação, a recusa ou o aviso de pronto pelo botão "Enviar no WhatsApp"** (`wa.me`), como hoje. Não é automático, mas tudo fica na conversa dela, e as respostas do cliente chegam a ela.
    - **Motivo:** para os avisos saírem sozinhos do número da Lídia sem ela perder o aplicativo, a Meta exige uma empresa parceira (recurso de coexistência, para Solution Partners e Tech Providers). Com um número separado só para os avisos, o cliente receberia de outro número, e as respostas dele não chegariam à Lídia. A resposta automática do passo 2 pela Cloud API também exigiria o número dela na API e uma caixa de entrada no Zappi.
    - **Condições da Meta levantadas na avaliação** (documentação oficial, 10/11/2026), mantidas só como registro:
      - mensagens iniciadas pela empresa (depois de 24 h da última mensagem do cliente) só saem por **modelos aprovados**. Os avisos do pedido são da categoria **utility**, em `pt_BR`, com até 1.024 caracteres no corpo, e a análise leva até 24 h;
      - cobrança **por mensagem entregue**, com meio de pagamento cadastrado na Meta. Desde 01/10/2026, os modelos utility enviados dentro das 24 h também são cobrados, e as respostas de atendimento têm 1.000 grátis por mês por número. O valor para o Brasil não foi conferido na tabela oficial (cerca de R$ 0,035 por mensagem utility, segundo fontes de terceiros);
      - sem a verificação da empresa, o limite é de **250 clientes diferentes a cada 24 h** fora da janela de atendimento, o que basta para a Casa Belt. Não foi confirmado se a verificação exige CNPJ;
      - a Meta informa o status de cada mensagem pelo webhook (`sent`, `delivered`, `read` ou `failed`), e cada aviso vem assinado (`X-Hub-Signature-256`, com o App Secret do app);
      - o servidor usa o token de um usuário do sistema, guardado em variável de ambiente (ISO 27002 8.24).
    - **Pontos que a avaliação deixou em aberto**, sem decisão a tomar, porque a Cloud API não será feita:
      - **número**: o da própria Lídia ligado à API pela coexistência, que mantém o aplicativo e deixa saudação, avisos e respostas na mesma conversa (exige empresa parceira da Meta e WhatsApp Business 2.24.17 ou mais novo); ou um número separado só para os avisos (chip novo, que recebe o código de ativação e não usa o aplicativo), com o texto orientando o cliente a falar com a Lídia no WhatsApp dela. Para testes, a Meta oferece um número de teste, sem chip, que só envia para os números cadastrados no painel;
      - quem cadastra o meio de pagamento e paga as mensagens;
      - LGPD: o telefone e o texto passam pela Meta, então a seção 9 ("nada de compartilhar com terceiros") e o texto do consentimento precisam ser revistos;
      - quebra de linha nos campos variáveis: há relatos de que a Meta recusa quebra de linha dentro de um campo, o que deixaria a lista de itens da confirmação em uma linha só. Testar com o número de teste e, se confirmado, ajustar `docs/mensagens-whatsapp.md` (ZAP-63) com a equipe.

---

## 15. Sugestão de planos de implementação

Sugestão inicial de ordem. Cada item é um plano a ser detalhado e aprovado no Claude Code.

| # | Plano | Entrega | Rastreabilidade |
|---|---|---|---|
| 1 | Estrutura do repositório | Monorepo (`backend/`, `frontend/`, `infra/`), Docker Compose local, README | Arquitetura |
| 2 | Banco de dados | Migrações com as 9 tabelas, restrições da seção 13.3 e seed (seção 5.3) | Ativ. #14 |
| 3 | Autenticação | Login, BCrypt, JWT, política de senha, log de login, tela de login acessível | US1, RF01–RF02, ISO 5.15–5.17, 8.24, 8.16 |
| 4 | Estabelecimento | API e tela de cadastro/edição, log de edição | US2, RF03–RF04 |
| 5 | Produtos | CRUD com exclusão lógica, upload para o Storage, texto alternativo, ordem de foco; depois, categorias com a ordem da Lídia e nome único (ZAP-136) o produto fora do cardápio (ZAP-151) e o preço promocional (ZAP-152) | US3, RF05–RF06, RN26, RN28, RN29, NBR 5.9.1, 5.1.4 |
| 6 | Kanban de pedidos | Colunas por status, filtro de status, detalhes do pedido; depois, a caixa de notificações do painel (ZAP-172) | US4, RF07–RF08, RN04, US13, RF25–RF26, RN30 |
| 7 | Decisões sobre pedidos | Confirmar, recusar ou cancelar com motivo, em produção, concluir, marcar como entregue e voltar uma etapa; transação status + mensagem + log | US5, US6, US8, RF09–RF12, RF15–RF16, RN03, RN05–RN08 |
| 8 | Mensagens WhatsApp | Textos, geração do link `wa.me`, botão "Enviar no WhatsApp", status da mensagem | RF10, RF12, CDC, NBR 5.12.12 |
| 9 | Acessibilidade e UX | Revisão de contraste, foco, rótulos e uso no celular | Ativ. #11 |
| 10 | Infra e deploy | Render (Static Site e Web Service) com HTTPS, Supabase, GitHub Actions (build e testes) e deploy automático do Render | Arquitetura |
| 11 | Preparação da demonstração | Roteiro e dados para o vídeo e para o treinamento da Lídia | Entregas finais |
| 12 | Cadastro e edição de pedidos | Botão "Novo pedido", formulário com produtos do cardápio, edição conforme o status, número por `MAX + 1`, logs de criação e edição | US7, RF13–RF14, RN09, RN10, RN21 |
| 13 | Portal do Cliente | Requisitos (ZAP-18), cardápio público pelo `slug`, montagem e envio do pedido, consentimento LGPD e proteção do acesso sem login | Épico ZAP-2, RN02, RN09–RN12, RN16–RN19, LGPD, CDC, NBR 17225 |

---

## 16. Outras entregas que dependem do sistema

- **Vídeo narrado** com a demonstração do sistema, e o roteiro do vídeo.
- **Relatório técnico** do projeto.
- **Material de apoio** para a apresentação final.
- Demais atividades do PI até a #17 (Propostas de divulgação do sistema).
- **Treinamento da ação extensionista** (Empreendedorismo): encontro de 2 horas, depois do sistema pronto:
  - conversa sobre Kanban (25 min);
  - construção dos critérios de aceite e recusa (35 min);
  - treinamento prático no Zappi (35 min).

---

## 17. Histórico de decisões

| Decisão | Antes | Agora |
|---|---|---|
| Stack do backend | Node.js (Atividade #3, hipótese inicial) | **Java 21 + Spring Boot 4** |
| Escopo do MVP | Login, estabelecimento, produtos, confirmar/recusar 2 pedidos (Atividade #5) | **Escopo ampliado** (seção 5.2): Em produção, Concluído, mensagem de pronto, fotos, auditoria, CI/CD; depois, cancelamento, voltar uma etapa e cadastro e edição de pedidos |
| Envio ao WhatsApp | "Resposta automática" (Atividades #5, #6 e #9) | **Semiautomático com `wa.me`**; a Cloud API foi avaliada e não será feita (seção 14, item 12) |
| Demanda prioritária | Várias demandas (Etapa 1 de Empreendedorismo) | **Organização e gestão de pedidos**, escolhida pela Lídia |
| Usuários do sistema | — | Só a Lídia; a Romilda fica sem acesso |
| Hospedagem em produção | VM Linux em nuvem com Docker Compose e Nginx (Atividade #13) | **Render + Supabase** (ZAP-62): Static Site e Web Service Docker, sem VM e sem Nginx. Motivo: custo zero, sem servidor para administrar e HTTPS automático |
| Deploy | GitHub Actions publicando na VM | **Render** publica a cada merge na `main`; o GitHub Actions faz build e testes |
| Endereço e HTTPS | Domínio próprio com Let's Encrypt no Nginx | Subdomínio gratuito `*.onrender.com`, com HTTPS gerenciado pelo Render |
| Docker Compose | Ambiente de produção | **Só ambiente local** (`infra/docker-compose.yml`) |
| Build do backend | Em aberto (Maven ou Gradle) | **Maven**, com Maven Wrapper. Motivo: padrão do Spring Boot e mesma versão para toda a equipe e para o CI |
| Migração do banco | Em aberto (Flyway ou Liquibase) | **Flyway**, com SQL puro. Motivo: integração nativa com o Spring Boot, e as restrições da seção 13.3 já estão em SQL |
| Biblioteca de UI | Em aberto | **Mantine 9** (ZAP-70). Motivo: componentes acessíveis de fábrica, tema centralizado com contraste de 4,5:1 e bom uso no celular |
| Testes do backend | Em aberto | **JUnit 5, Mockito e Testcontainers** (PostgreSQL). Motivo: ferramentas padrão do Spring, e o Testcontainers valida as regras do banco contra um Postgres real |
| Testes do frontend | Em aberto | **Vitest e React Testing Library** (ZAP-62). Motivo: usam a configuração do Vite que o projeto já tem, e os testes usam as telas pelos rótulos e botões, como a Lídia, o que também ajuda a verificar a acessibilidade |
| Expiração do JWT | Em aberto | **8 horas**, sem refresh token. Motivo: cobre um dia de uso sem pedir login várias vezes e expira no dia seguinte |
| Onde guardar o JWT no frontend | Em aberto | **`sessionStorage`** (ZAP-34). Motivo: a Lídia continua logada ao recarregar a página, e o token some ao fechar a aba, ficando menos tempo no aparelho que no `localStorage` |
| Bloqueio de login (RF02) | Em aberto | **5 falhas seguidas bloqueiam por 15 minutos**, contadas pelo `log_auditoria`. Motivo: dificulta adivinhar a senha (ISO 27002 5.17) sem trancar a Lídia para sempre |
| Mudar o pedido de coluna | Em aberto (botões ou arrastar) | **Botões** nos detalhes do pedido, só com o próximo passo possível (ZAP-64). Motivo: arrastar é difícil no celular e para a persona, e um botão com nome diz o que vai acontecer |
| Recusar depois de confirmado | Em aberto | **"Cancelar pedido"** em Confirmado e Em produção, pelo fluxo de recusa (ZAP-64, proposta A). Motivo: não muda o banco nem os tipos de mensagem e cabe no prazo; o status "Cancelado" fica como melhoria futura |
| Voltar uma coluna | Em aberto | **Só Concluído → Em produção e Em produção → Confirmado**, com confirmação (ZAP-64). Motivo: corrige os cliques errados mais prováveis; confirmar e recusar já avisaram o cliente |
| Envio pela WhatsApp Cloud API | Futuro (seção 5.4) | **Faz parte da entrega** (08/11/2026, ZAP-83), com as condições a validar na seção 14, item 12. Motivo: decisão da equipe de enviar as mensagens de forma automática |
| Escopo da entrega | MVP só com o Portal do Administrador; Portal do Cliente como Futuro (seções 5.1 e 5.4) | **Entrega final em 22/11/2026 com o Portal do Administrador e o Portal do Cliente juntos** (08/11/2026, ZAP-83). Motivo: decisão da equipe de entregar o sistema real, e não um MVP. Pagamento online, estoque, relatórios financeiros, fidelização e acesso da Romilda continuam como Futuro |
| Mensagem "Enviada" | Em aberto (clique ou confirmação manual) | **Ao clicar em "Enviar no WhatsApp"** (ZAP-64). Motivo: o sistema não sabe se ela apertou enviar, e não acrescenta um passo extra para a Lídia |
| Unidade de venda dos salgados | Em aberto (unidade ou cento) | **Por unidade (UN)**; o cento e os pacotes viram produtos próprios (ZAP-64). Motivo: não muda o banco nem as telas, e o desconto do cento sai do preço de cada produto |
| Massa do bolo | Em aberto (campo próprio no item ou não) | **Sem campo próprio** (ZAP-64): massa padrão na descrição do produto e massa pedida pelo cliente na observação do item. Motivo: não muda o banco, e no MVP quem registra o pedido é a Lídia |
| Número do pedido | Em aberto (sequência ou `MAX + 1`) | **`MAX + 1` com bloqueio** da linha do estabelecimento (ZAP-64). Motivo: não muda o banco e não deixa buracos na numeração |
| Textos das mensagens do WhatsApp | Não redigidos | **Três textos** em `docs/mensagens-whatsapp.md` (ZAP-63), validados com autorização do Lucas. Motivo: linguagem simples (NBR 17225 5.12.12), identificação do Zappi (CDC), sem emojis e sem expor o endereço da Lídia |
| Andamento da produção | Escopo ampliado sem US nem RF numerado | **US8, RF15 e RF16** (ZAP-83, história ZAP-60). Motivo: formalizar o que já tinha sido aprovado, para ter rastreabilidade como as demais funcionalidades |
| Reenviar a mensagem | Não previsto (RF10 e RF12 só preparam a mensagem) | **Botão continua disponível para reenviar**, e o painel mostra só a mensagem da etapa atual, com as anteriores guardadas (ZAP-64, ZAP-51). Motivo: a Lídia pode fechar o WhatsApp sem mandar, e uma mensagem de outra etapa não deve ser enviada por engano |
| Criar e editar pedidos | Pedidos só pelo seed (seção 5.3) | **US7, RF13, RF14 e RN21** (ZAP-64, história ZAP-87): cadastro pelo botão "Novo pedido" e edição limitada pelo status. Motivo: sem isso, a Lídia não consegue usar o Zappi com pedidos de verdade |
| Data de entrada em produção | Sem coluna no dicionário de dados (Atividade #14) | **Coluna nova `producao_em`** em `pedido` (ZAP-83). Motivo: o histórico do pedido na tela mostra quando ele entrou em produção, e uma coluna é mais simples de consultar do que o log |
| Consistência de tenant entre pedido e cliente | Em aberto (validação no backend ou FK composta) | **As duas** (ZAP-64): FK composta `(cliente_id, estabelecimento_id)` em `pedido` e validação no backend. Motivo: o banco é a garantia final contra dados de outro estabelecimento (RN01, ISO 27002 5.34), e o backend dá uma mensagem clara. Restrição nova, fora da lista da Atividade #14 (ZAP-83) |
| Anonimização de clientes | Regra prevista (RN17, Atividade #9), fora da lista do MVP | **Entra no MVP** (ZAP-64). Motivo: atender ao direito de exclusão da LGPD; o banco não muda, porque `anonimizado_em` já existe. A tela, o valor do telefone anonimizado e a ação do log foram definidos na ZAP-18 (RN17, história ZAP-114) |
| Motivo da recusa e volta para produção do cliente anonimizado | RN17 tirava nome e telefone só de `cliente`, `mensagem_whatsapp` e `log_auditoria`; a volta de Concluído para Em produção não olhava o cliente | **O motivo da recusa também perde o nome e o telefone**, cortado em 500 caracteres; **o pedido Concluído de cliente anonimizado não volta para Em produção** (ZAP-115, ZAP-83). Motivo: o motivo é copiado para a mensagem que já era limpa e ficava visível no pedido; e um pedido reaberto sem nome nem WhatsApp geraria um aviso de pronto impossível de enviar. As observações continuam como estão, porque descrevem a encomenda |
| Antecedência mínima para encomendar | Em aberto | **7 dias corridos pelo Portal do Cliente; no painel, hoje ou uma data futura** (RN22, ZAP-18). Motivo: regra confirmada pela Lídia; o pedido pelo portal chega sem avaliação prévia dela. Quem precisa antes é orientado a falar com ela pelo WhatsApp |
| Limite de pedidos por data | Em aberto | **Sem limite automático** (ZAP-18): a Lídia recusa o que não couber. Motivo: não muda o banco nem cria tela, e a capacidade varia com o tamanho do pedido. Confirmado (ZAP-57) |
| Massa, recheio e cobertura no portal | Em aberto | **Massa na observação do item, com dica; recheio e cobertura opcionais e só em produtos por KG** (ZAP-18). Motivo: não muda o banco, e recheio e cobertura não fazem sentido em salgados |
| Validade do pedido feito no portal | Não previsto | **Aviso de que o pedido só vale após a confirmação da Lídia** (ZAP-18). Motivo: informação clara ao cliente (CDC), já que não há limite por data |
| Proteção do envio sem login | Em aberto | **5 envios por hora por IP, 3 por dia por telefone e campo invisível, sem captcha no início** (ZAP-18). Motivo: protege o quadro da Lídia sem atrito para o cliente e sem depender de serviço externo |
| Numeração do Portal do Cliente e da anonimização | Sem US nem RF | **US9 a US12 e RF17 a RF24** (ZAP-18). Motivo: mesma rastreabilidade das demais funcionalidades |
| Alterações fora da documentação original | Sem registro definido | **Toda alteração é registrada na `ZAP-83`** e nesta seção, com antes, agora e motivo (seção 0). Motivo: manter os documentos entregues em sala coerentes com o sistema entregue |
| Logo e capa do estabelecimento | Sem campos no dicionário da Atividade #14; a tela "Meu estabelecimento" (ZAP-37) guardava as fotos só no navegador | **Colunas novas `logo_caminho` e `capa_caminho`** em `estabelecimento`, com as fotos no bucket `estabelecimentos` do Supabase Storage, nas mesmas regras da foto do produto (ZAP-119, ZAP-83). O texto alternativo do logo é "Logo de" + nome da loja, sem coluna própria; a capa é decorativa. Motivo: a tela e o topo do painel mostram a marca da loja, e a foto guardada só no navegador some em outro aparelho |
| Endereço do estabelecimento | Digitado campo a campo (ZAP-37) | **Preenchido pelo CEP** (ZAP-121, ZAP-83): ao completar os 8 números, o navegador consulta a ViaCEP e, se ela falhar, a BrasilAPI, e preenche rua, bairro, cidade e UF, que continuam editáveis. CEP não encontrado ou APIs fora do ar não impedem de preencher à mão e salvar. Motivo: menos digitação e menos erro para a Lídia (diretriz de UX, seção 2.3). Só o CEP do estabelecimento vai para o serviço externo |
| Envio pela WhatsApp Cloud API | Faz parte da entrega, com as condições a validar (08/11/2026, ZAP-83) | **Fora da entrega; os avisos continuam pelo `wa.me`, e o link do cardápio vai pela mensagem de saudação do WhatsApp Business** (10/11/2026, ZAP-83). Motivo: para os avisos saírem sozinhos do número da Lídia sem ela perder o aplicativo, a Meta exige uma empresa parceira; com outro número, as respostas do cliente não chegariam a ela. Com o `wa.me`, tudo fica na conversa dela, e a saudação envia o link sem código e sem custo |
| Envio pela WhatsApp Cloud API | Fora da entrega, como Futuro (10/11/2026, ZAP-83) | **Não será feito** (15/11/2026, ZAP-83). Motivo: a avaliação de 10/11 mostrou que o envio automático exige uma empresa parceira da Meta para usar o número da Lídia, cobrança por mensagem e modelos aprovados. Os avisos continuam pelo `wa.me`, e a história ZAP-93 saiu do Jira |
| Retirada do pedido | Só a data (`data_retirada DATE`, Atividade #14) | **Data e hora** (`data_retirada TIMESTAMP`, no horário de São Paulo), das 8h às 20h, de 30 em 30 minutos (RN23), nos dois portais e nas mensagens ao cliente ("sábado, 14/11, às 15h"). Os pedidos que já existiam ficaram com 12:00 (10/11/2026, ZAP-127, ZAP-83). Motivo: a Lídia precisa saber a que horas o cliente vai buscar a encomenda |
| Busca no cardápio público | Não prevista | **Lupa no topo do cardápio** que filtra os produtos pelo nome, sabor e descrição (desde a ZAP-136, pelo nome, descrição e categoria) enquanto o cliente digita, com "Nenhum produto encontrado." quando nada combina (09/11/2026, ZAP-100, ZAP-105, ZAP-83). Feita na tela, sem rota nova no backend. Motivo: aprovada no protótipo do cardápio (layout H), para o cliente achar o produto quando o cardápio crescer |
| Modo escuro | Só o tema claro | **Lua e sol no topo do cardápio público** alternam entre claro e escuro (09/11/2026, ZAP-100, ZAP-105, ZAP-83). Começa pela preferência do aparelho e guarda a escolha só no navegador (`localStorage`), sem dado pessoal, com contraste de 4,5:1 nos dois temas. O painel da Lídia continua só com o tema claro. Motivo: aprovado no mesmo protótipo, para o conforto de leitura à noite |
| Compartilhar o cardápio | Não previsto | **Botão "Compartilhar"** no topo do cardápio e no detalhe do produto (ZAP-105, ZAP-83, testes na ZAP-189). No celular, abre o compartilhar do aparelho com o link da página; no computador, copia o link e avisa ("Link do cardápio copiado."). Motivo: aprovado no protótipo do cardápio (layout H), para o cliente mandar o cardápio ou um produto para outra pessoa |
| Pedidos ocultos no quadro | Recusados ocultos por padrão, com o interruptor "Mostrar recusados" (RN04, ZAP-46); as outras colunas sempre à vista | **Filtro de status** ("Mostrar"), com "Todos" e uma opção por status, com a quantidade de pedidos (14/11/2026, ZAP-28, ZAP-179, ZAP-83). Em "Todos", Entregue e Recusado ficam ocultos; escolhendo um status, só os pedidos dele aparecem, em grade no computador e em lista no celular. O filtro fica no endereço (`?status=3`), e o backend não muda. Motivo: pedido da equipe, para a Lídia ver só os pedidos de uma etapa quando precisar |
| Fim do pedido | Concluído era o último status (RN03, cinco status), e o sistema não registrava a retirada | **Status 6-Entregue** e coluna "Entregue" no quadro (14/11/2026, ZAP-60, ZAP-83). "Marcar como entregue" no pedido Concluído grava `entregue_em`, e "Voltar para concluído" corrige um engano. Entregue não pode ser editado nem cancelado e conta como encerrado na anonimização (RN17). No banco, `ck_pedido_status` aceita de 1 a 6 e entra a coluna `pedido.entregue_em` (ZAP-167); o Recusado continua 5. Motivo: a Lídia precisa controlar quais pedidos foram de fato retirados e quando |
| Alérgenos do produto | Sem campos no dicionário da Atividade #14; a ZAP-131 criou `contem_gluten` (sim, não ou nulo = "não informado", obrigatório na API) e o texto livre `outros_alergenos`, enquanto a tela (ZAP-132) marcava uma lista fixa. Com os dois formatos diferentes, nenhum produto podia ser salvo | **Lista fixa `alergenos`** em `produto` (`VARCHAR(20)[]`, vazia por padrão), com GLUTEN, LEITE, OVOS, SOJA, AMENDOIM, CASTANHAS e GERGELIM, mais o texto livre `outros_alergenos` para os demais (RN24; 17/11/2026, ZAP-197, ZAP-83). A API recebe e devolve `alergenos` na ordem da lista, recusa código fora dela e o cardápio público passa a mostrar os selos. A coluna `contem_gluten` saiu: quem tinha glúten passou a ter GLUTEN. Lista vazia é "nenhum alérgeno da lista", e a tela só mostra selos do que está marcado, sem dizer "não contém glúten". Motivo: o formato da tela cobre os alérgenos mais comuns da confeitaria, e o glúten fica como um deles |
| Formas de pagamento | Fixas na tela do cardápio (Pix, crédito e débito), sem a Lídia poder mudar; o pedido não guardava como o cliente ia pagar, e a confirmação dizia só "O pagamento é feito na retirada." (RN19) | **A Lídia escolhe as formas aceitas** (Dinheiro, Pix, Cartão de crédito, Cartão de débito e VR; todas no começo, pelo menos uma), o cardápio mostra só essas, e **todo pedido novo grava a forma combinada**, entre as aceitas, que aparece nos detalhes e na confirmação ("O pagamento é feito na retirada, por Pix.") (RN25; 15/11/2026, ZAP-190, ZAP-83; implementado em 17/11/2026). Colunas novas `estabelecimento.formas_pagamento` e `pedido.forma_pagamento` (V13). O pagamento continua na retirada, sem processamento pelo sistema. Motivo: o cliente sabe antes como pode pagar, e a Lídia sabe o que esperar na retirada |
| Categorias do cardápio | Sem categoria no dicionário da Atividade #14: o cardápio público usava o nome do produto como seção ("Bolo" virava "Bolos"), e as listas eram por nome, sabor e id | **Cadastro de categorias** pela Lídia, com a ordem definida por ela, valendo no cardápio público, na lista de produtos e no formulário de pedido; categoria obrigatória no produto e exclusão só da categoria sem produto (RN26; 14/11/2026, ZAP-136, ZAP-83). Tabela nova `categoria` e coluna `produto.categoria_id` (V6, ZAP-137); as categorias dos produtos que já existiam foram criadas a partir do nome deles. Motivo: pedido da equipe, para o cardápio ficar organizado do jeito da Lídia, e não pela ordem alfabética |
| Nome do produto | Dois campos: nome, com o tipo ("Bolo"), e sabor ("Brigadeiro de chocolate"), juntados pela tela | **Nome único e completo** (ex.: "Bolo de brigadeiro de chocolate"), com até 150 caracteres, sem a coluna `sabor` (RN26; 14/11/2026, ZAP-136, ZAP-83). Os nomes que já existiam foram montados pela mesma regra da tela. Motivo: tira a informação repetida e os nomes estranhos em produtos que não são bolos ("Salgado de cento de coxinha"); cada sabor continua sendo um produto, porque o preço varia por sabor |
| Recheio e cobertura | Campos próprios no item do pedido: no portal, só em produtos por KG; no painel, em todos os itens (ZAP-18, seção 14, item 11) | **Saem do sistema** (RN26; 14/11/2026, ZAP-136, ZAP-83): a personalização vai na observação do item, num produto personalizável ("Bolo personalizado"), com uma dica só em todos os produtos. As colunas `item_pedido.recheio` e `item_pedido.cobertura` saíram, e os valores antigos foram para o começo da observação, que passou a 600 caracteres no banco (V6). Motivo: os bolos do cardápio vêm prontos, e os campos não faziam sentido para o cliente nem em salgados |
| Ordem das categorias | Os pedidos mudam de coluna só por botões, sem arrastar (ZAP-64); o protótipo das categorias tinha "Subir" e "Descer" | **Arrastar**, com alternativa completa pelo teclado e cada passo anunciado para leitores de tela, **só na tela Categorias** (14/11/2026, validação do protótipo da ZAP-139, ZAP-136). Os pedidos continuam com botões. Motivo: na lista curta de categorias, arrastar é mais rápido que vários cliques em "Subir" e "Descer", e o teclado garante o acesso (NBR 17225 5.1.1 e 5.1.4) |
| Termos de uso e política de privacidade | Não existiam: só o cliente dava o consentimento LGPD (RN16), sem um texto para consultar, e a Lídia entrava só com e-mail e senha | **Termos de uso e Política de privacidade** escritos pela equipe, versionados no repositório e abertos sem login em `/termos` e `/privacidade` (RN27; 14/11/2026, ZAP-143, ZAP-83). A Lídia aceita na tela de login, e o aceite fica no servidor, com versão, data, IP e navegador; o cliente aceita na mesma caixa do consentimento, e a versão fica no cadastro dele. Tabela nova `aceite_termos` e coluna nova `cliente.consentimento_versao` (V7, ZAP-145); ação nova `TERMOS_ACEITOS` no log. Motivo: exigência nova do projeto, para dar transparência sobre o uso dos dados nos dois portais (LGPD) e informar as regras do pedido (CDC) |
| Consultar os termos no painel | Item "Termos e privacidade" acima de "Sair", no menu da conta (proposta inicial da ZAP-143) | **Dois links pequenos no rodapé da caixinha da conta**, "Termos de uso · Política de privacidade", no modelo do menu da conta do Google (ajuste de 14/11/2026, ZAP-147). Cada link abre o texto com a versão aceita e a data. Motivo: ajuste do grupo na ZAP-143, seguindo o modelo do menu da conta do Google |
| Localização dos dados (LGPD) | Em aberto (seção 14, item 10): avaliar uma nota sobre a região dos servidores | **Informada na Política de privacidade** (ZAP-144): Render e Supabase, com servidores nos Estados Unidos, e transferência internacional com as proteções da LGPD. Motivo: o Render não tem região no Brasil, e o titular precisa saber onde ficam os dados |
| Tirar um produto do cardápio | Só existia excluir (RN14, `ativo = FALSE`): o produto sumia do cardápio e também da tela de produtos, sem volta, e para oferecer de novo era preciso cadastrar outra vez | **Fora do cardápio, sem excluir** (RN28; 14/11/2026, ZAP-151, ZAP-83): "Tirar do cardápio" e "Voltar ao cardápio" na tela de produtos e na tela do produto, com o selo "Fora do cardápio". Fora do cardápio, o produto continua no painel, some do cardápio público e não entra em pedido novo, pelo portal ou pelo painel; os pedidos que já existem não mudam (RN10). Coluna nova `produto.no_cardapio` (V8, ZAP-153), rotas novas `POST /api/produtos/{id}/tirar-do-cardapio` e `/voltar-ao-cardapio` (ZAP-154), e o item indisponível no pedido em montagem do cliente (ZAP-156). Os nomes evitam a palavra "inativar", que pode ser confundida com "excluir". Motivo: exigência nova do projeto, para a Lídia parar de receber um produto por um tempo (falta de ingrediente, fora de época) e voltar a oferecer depois sem cadastrar de novo |
| Preço promocional | O produto tinha um preço só (`produto.preco`, RN13), copiado para o pedido (RN10). Os descontos eram combinados à mão, pelo WhatsApp | **Promoção no produto** (RN29; 14/11/2026, ZAP-152, ZAP-83): "Aplicar desconto" na tela do produto, com o preço antes da promoção, que é o preço normal, e o preço com desconto, menor que ele, sem data de fim, até a Lídia clicar em "Encerrar promoção". O cardápio mostra o preço com desconto, o normal riscado e o percentual, arredondado para baixo, e o pedido novo grava o preço com desconto, decidido pelo backend; os pedidos que já existem não mudam (RN10). Seção automática **"Promoções"** no topo do cardápio, com a opção de desligar na tela Estabelecimento. Colunas novas `produto.preco_promocional` e `estabelecimento.destacar_promocoes` (V9, ZAP-159) e rotas novas `POST` e `DELETE /api/produtos/{id}/promocao` (ZAP-160). Decisões de 15/11/2026: o preço antes da promoção é o preço normal, a promoção não tem data de fim, e o percentual aparece. No ajuste visual de 15/11/2026 (ZAP-161, ZAP-162), o selo "Promoção · 13% de desconto" previsto na história deu lugar ao percentual curto ao lado da unidade ("-13%"), e a seção "Promoções" virou uma faixa que rola para o lado. Motivo: exigência nova do projeto, para a Lídia atrair clientes e mostrar no cardápio que o produto está mais barato, com o preço anterior real e o desconto nunca maior que o de verdade (CDC) |
| Caixa de notificações no painel | O painel não avisava nada: a Lídia só via um pedido novo ao abrir ou recarregar o quadro, e nada lembrava das retiradas próximas | **Sino "Notificações"** no menu lateral, acima de Pedidos, e no celular no topo da tela, ao lado do ícone de usuário, com o contador das não vistas e a caixinha com os avisos de pedido novo vindo do portal e de retirada próxima; clicar num aviso abre o pedido (US13, RF25, RF26, RN30; 14/11/2026, ZAP-172, ZAP-83). Decisões de 14/11/2026: aviso no dia da retirada, a partir das 8h, e 2 horas antes, para os pedidos Confirmado, Em produção e Concluído; o pedido ainda Novo recebe aviso na véspera e no dia, com "ainda não foi confirmado"; o sino do celular fica ao lado do ícone de usuário. Tabela nova `notificacao` (V10, ZAP-173), sem texto nem dado pessoal (RN17), e rotas novas `GET /api/notificacoes`, `GET /api/notificacoes/nao-vistas` e `POST /api/notificacoes/vistas` (ZAP-174). Sem tarefa agendada: os avisos de retirada são criados quando o painel consulta o contador, a cada 1 minuto. Som e notificação do navegador fora do painel ficaram fora do escopo. Motivo: decisão coletiva da equipe, para a Lídia não perder pedidos novos nem retiradas; o backend gratuito do Render dorme sem acesso e não permite tarefa agendada |

### Alternativas avaliadas (Atividades #3 e #4)
- **Hipóteses descartadas:**
  - sistema de gestão interna sem foco no cliente;
  - catálogo pronto (Linktree ou catálogo do WhatsApp Business).
- **Benchmarking:**
  - **Anota AI:** completo, mas caro e voltado a restaurantes de maior porte.
  - **Catálogo do WhatsApp Business:** gratuito, mas não organiza os pedidos.
- **Posição do Zappi:** solução intermediária, sob medida para o porte e a operação da Casa Belt.

---

## 18. Jira e Git: como trabalhar e comitar

O repositório `ChristianoMoura/Zappi` está integrado ao Jira pelo app **GitHub for Jira**. Toda branch, commit e pull request que cita a **chave de um item do Jira** (ex.: `ZAP-34`) aparece sozinha no painel **Desenvolvimento** daquele card. Sem a chave, o trabalho não é contabilizado no Jira.

### 18.1 Estrutura do backlog

- **Épicos:** `ZAP-1` Portal do Administrador · `ZAP-2` Portal do Cliente · `ZAP-3` Entregas em Sala.
- **Histórias:** uma funcionalidade com valor para a Lídia (ex.: `ZAP-29` Confirmação de Pedido). Os **critérios de aceitação ficam na história**.
- **Subtarefas:** a unidade de trabalho do dia a dia, com um único responsável, prefixo `[Backend]`, `[Frontend]`, `[Infra]` ou `[Testes]` e rótulo correspondente. É nela que o código é registrado.
- **Tarefas:** trabalho que não é código de uma história (decisões, textos, revisão, demonstração).

### 18.2 Regras para branches, commits e pull requests

Use sempre a chave da **subtarefa** que está sendo feita.

| Onde | Padrão | Exemplo |
|---|---|---|
| Branch | `ZAP-<número>-descricao-curta` (minúsculas, hífens) | `ZAP-34-tela-login` |
| Commit | `ZAP-<número> descrição no presente, em português` | `ZAP-34 cria tela de login com foco visível` |
| Pull request | `ZAP-<número> Título` | `ZAP-34 Tela de login` |

- A chave vai **no início** da mensagem do commit e do título do PR, em maiúsculas (`ZAP`, não `zap`).
- **Uma branch por subtarefa**, criada a partir da `main` e de vida curta. Correções da mesma subtarefa continuam na mesma branch.
- **Nunca comitar direto na `main`.** Todo código entra por pull request revisado por outra pessoa e com o GitHub Actions passando.
- Um commit pode citar **mais de uma chave** (`ZAP-39 ZAP-40 ...`) quando realmente mexer em mais de uma subtarefa; o commit aparece em todos os cards citados. Prefira commits separados por subtarefa.
- Use a chave da **história** só no título de um PR que reúna várias subtarefas dela, ou em um commit que não pertença a nenhuma subtarefa específica.
- Depois da rastreabilidade do Jira, cite no corpo do commit os identificadores de origem quando fizer sentido (US, RF, RN, ISO 27002, NBR 17225), conforme a seção 0.

Exemplo de commit completo:

```
ZAP-49 cria endpoint de confirmação de pedido

Muda o status para Confirmado, gera a mensagem tipo Confirmação e grava
PEDIDO_CONFIRMADO na mesma transação.

Refs: US5, RF09, RN06, RN07, RN08, ISO 27002 8.16
```

### 18.3 Instruções para o Claude Code

- **Antes de começar**, confirme com a equipe qual subtarefa do Jira está sendo feita. Se não houver subtarefa para o trabalho pedido, avise e sugira criar uma antes de escrever código.
- **Ao criar uma branch**, use o padrão `ZAP-<número>-descricao-curta` com a chave dessa subtarefa.
- **Ao comitar**, comece toda mensagem com a chave da subtarefa. Quando gerar várias funcionalidades de uma vez, **separe os commits por subtarefa**, cada um com a sua chave, em vez de um commit único com tudo.
- **Ao abrir um pull request**, coloque a chave no início do título e liste no corpo as subtarefas atendidas.
- **Não comite na `main`** e não faça merge sem revisão.
- **Mantenha o status dos tickets atualizado**, seguindo a seção 18.4.
- Se o trabalho revelar algo que não está no Jira (bug, regra faltando, ponto em aberto), registre na resposta para a equipe criar o item, em vez de resolver por conta própria.
- **Se o trabalho criar algo que não está na documentação entregue em sala** (funcionalidade, regra, coluna ou mudança de decisão), avise e registre na **`ZAP-83`**, com antes, agora e motivo, além da seção 17 deste arquivo (regra da seção 0).

### 18.4 Atualização de status no Jira

O projeto **ZAP** usa quatro status: **A fazer → Em andamento → Em análise → Concluído**. Ao trabalhar numa subtarefa, o Claude Code atualiza o status dela no Jira pelo conector da Atlassian (site `zappi.atlassian.net`).

| Momento | Ação no Jira |
|---|---|
| Começou a escrever código da subtarefa | Subtarefa: **A fazer → Em andamento**. Se for a primeira subtarefa da história a começar, a história também vai para **Em andamento**. |
| Abriu o pull request | Subtarefa: **Em andamento → Em análise**. Comentar no ticket o link do PR e um resumo curto do que foi feito. |
| Pull request aprovado e com merge na `main` | Subtarefa: **Em análise → Concluído**. |
| A revisão pediu mudanças | Subtarefa volta para **Em andamento** até o PR ser atualizado; depois, **Em análise** de novo. |
| Trabalho interrompido ou bloqueado | Manter o status atual e comentar no ticket o que falta e o que está bloqueando (ex.: depende da `ZAP-62`). |

Regras:

- **Mude só o status dos tickets em que está trabalhando.** Não altere tickets de outras pessoas, responsáveis, prazos, descrições ou critérios de aceitação sem pedido explícito.
- **Confira o responsável antes de começar.** Se a subtarefa estiver sem responsável ou com outra pessoa, pergunte a quem está pedindo o trabalho antes de mover o status.
- **Só marque Concluído depois do merge confirmado.** Se não tiver como confirmar o merge, deixe em Em análise e avise a pessoa.
- **Histórias não são concluídas pelo Claude Code.** A história só vai para Concluído quando todas as subtarefas estiverem concluídas e o QA (Christiano) conferir os critérios de aceitação. O Claude Code pode avisar que todas as subtarefas terminaram e sugerir a conclusão.
- **Subtarefas de testes (`[Testes]`)** são do QA. Mova o status delas só quando o QA pedir.
- **Sem acesso ao Jira** (conector não configurado ou erro de permissão), não pule a etapa em silêncio: diga na resposta qual ticket e para qual status ele deve ir, para a pessoa atualizar manualmente.
- Ao terminar cada etapa, informe na resposta quais tickets tiveram o status alterado.

### 18.5 Ordem sugerida de execução

1. `ZAP-62` Definir decisões técnicas pendentes.
2. `ZAP-58` Estrutura inicial do projeto.
3. `ZAP-59` Banco de dados e dados iniciais.
4. `ZAP-16` Login (destrava todas as telas).
5. `ZAP-26` Estabelecimento e `ZAP-27` Produtos.
6. `ZAP-28` Kanban de pedidos.
7. `ZAP-29` Confirmação, `ZAP-30` Recusa e `ZAP-60` Em produção/Concluído.
8. `ZAP-87` Cadastro e edição de pedidos.
9. `ZAP-61` Infraestrutura e deploy (pode começar em paralelo assim que a `ZAP-58` estiver pronta).
10. `ZAP-65` Revisão de acessibilidade e `ZAP-66` Demonstração e treinamento.

Em paralelo, desde o início: `ZAP-63` (textos das mensagens) e `ZAP-64` (regras em aberto), que dependem de conversas com a Lídia.
