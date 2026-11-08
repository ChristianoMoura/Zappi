# Zappi — Contexto do Projeto

> Ponto de partida para o desenvolvimento do Zappi com o Claude Code.
> Consolida tudo o que foi definido nas atividades do Projeto Integrador (PI) e da disciplina de Empreendedorismo.
> Este arquivo é a fonte da verdade sobre escopo, requisitos, arquitetura e modelo de dados.

---

## 0. Como usar este arquivo (instruções para o Claude Code)

- Leia este arquivo inteiro antes de propor qualquer plano.
- Trabalhe por **planos**: um plano por entrega (sugestões na seção 15). Cada plano é revisado e aprovado pela equipe antes de qualquer código.
- O escopo de implementação é o **MVP** (seção 5). Itens marcados como **Futuro** não devem ser implementados agora, mas o código não deve impedir a evolução para eles.
- **Rastreabilidade:** cite nos planos, commits e testes os identificadores de origem (US, RF, RN, controle ISO 27002, requisito NBR 17225, artigo legal).
- **Não invente regras de negócio.** Se algo não estiver definido aqui ou estiver em "Pontos em aberto" (seção 14), pergunte à equipe antes de decidir.
- **Alterações não previstas na documentação original:** toda funcionalidade, regra, coluna do banco ou mudança de decisão que não esteja nos documentos entregues em sala (atividades do PI) deve ser registrada na **`ZAP-83`** para ser formalizada, com o que era antes, o que ficou agora e o motivo. Registre também neste arquivo (seção 17) e nos tickets afetados.
- **Idioma:** interface, mensagens ao cliente e textos do sistema em português do Brasil. Tabelas e colunas com os nomes exatos do modelo (seção 12): `snake_case`, tabelas no singular.
- Prazo final de todos os artefatos do PI: **22/11/2026**. Priorize o que é necessário para o MVP funcionar de ponta a ponta.
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
- Cardápio fixo de bolos. **Massa, recheio e cobertura** variam conforme o gosto do cliente. No Zappi, a massa padrão de cada bolo vai na descrição do produto; recheio e cobertura têm campo próprio no item do pedido, e uma massa diferente da padrão vai na observação do item (decisão da ZAP-64, item 14.4).
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
- No MVP, só recebe mensagens pelo WhatsApp. No futuro, fará o pedido pelo cardápio público.

**Perfil geral:** trabalhadoras com várias responsabilidades ao mesmo tempo, que aprenderam o ofício na prática, sem formação em gestão e sem ferramentas digitais. Isso gera sobrecarga e risco de erro, sobretudo em períodos de mais demanda.

> **Diretriz de UX:** a usuária tem 54 anos e pouca familiaridade com ferramentas de gestão. A interface deve ser simples, com textos claros, poucos passos e botões grandes, e funcionar bem no celular.

---

## 3. Problema e demandas

### 3.1 Demanda prioritária
**Organização e gestão de pedidos.** Foi escolhida pela própria Lídia e é o foco do MVP e da ação extensionista.

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

O MVP ataca principalmente **Gestão de pedidos** e parte de **Atendimento** (confirmação formal e comunicação organizada). As demais demandas ficam como evolução futura.

---

## 4. Jornadas

### 4.1 Hoje, sem o sistema (ADO #2)
**Cliente:** descobre por indicação → manda mensagem no WhatsApp → pergunta sabores e preços → especifica o pedido → combina o prazo informalmente → espera sem confirmação formal → retira → paga na retirada.

**Lídia:** recebe o pedido misturado com conversas pessoais → negocia à mão → anota no caderno → avalia a capacidade de cabeça (às vezes recusa) → compra ingredientes com a Romilda → produz (Romilda faz os recheios) → espera a retirada → recebe o pagamento.

### 4.2 Com o Zappi, visão completa (ADO #4)
**Cliente:** descobre por indicação → acessa o link do cardápio → consulta sabores, preços/kg e fotos → monta o pedido → conclui informando a data de retirada → recebe confirmação ou recusa no WhatsApp → recebe o aviso de pedido pronto → retira e paga presencialmente.

**Lídia:** o pedido chega no quadro Kanban → avalia disponibilidade e capacidade → confirma, ou recusa informando o motivo → o sistema prepara a mensagem ao cliente → produz com a Romilda → move o card até "Concluído" → o sistema prepara o aviso de pronto → recebe o cliente e o pagamento.

> Os passos do cliente pelo cardápio público são **Futuro**. No MVP, os pedidos vêm do seed (seção 5.3) ou são cadastrados pela Lídia a partir do que ela recebe no WhatsApp (US7).

---

## 5. Escopo do MVP

### 5.1 Decisão
O MVP cobre **somente o lado administrativo (Lídia)**, com o escopo ampliado aprovado pela equipe depois da Atividade #5.

### 5.2 Dentro do MVP
1. Login da Lídia (e-mail e senha).
2. Cadastro e edição das informações do estabelecimento (Casa Belt).
3. Cadastro, edição e exclusão lógica de produtos (nome, sabor, unidade, preço, descrição e foto com texto alternativo).
4. Upload da foto do produto para o Supabase Storage.
5. Quadro **Kanban** de pedidos com as colunas Novo, Confirmado, Em produção e Concluído, mais um filtro para exibir os **Recusados**.
6. Detalhes do pedido ao abrir um card.
7. **Confirmar** um pedido.
8. **Recusar** um pedido com **motivo obrigatório**, e **cancelar** um pedido Confirmado ou Em produção pelo mesmo fluxo.
9. Mover o pedido para **Em produção** e **Concluído**, e voltar uma etapa da produção para corrigir um clique errado.
10. Geração da mensagem ao cliente (confirmação, recusa e pronto para retirada) e botão **"Enviar no WhatsApp"** com link `wa.me`, que continua disponível para reenviar.
11. Registro de auditoria (logins e ações administrativas).
12. Infraestrutura: Docker Compose no ambiente local; em produção, Render e Supabase com HTTPS gerenciado, CI no GitHub Actions e deploy automático do Render a cada merge na `main`.
13. **Cadastrar e editar pedidos** (US7): a Lídia registra as encomendas que recebe pelo WhatsApp e corrige um pedido, com a edição limitada pelo status (RN21).

### 5.3 Dados iniciais (seed)
- Estabelecimento: **Casa Belt**.
- Unidades de medida: 1-KG e 2-UN.
- Usuário: **Lídia**.
- **Pelo menos 2 pedidos de exemplo** com clientes de exemplo (com consentimento LGPD), para a demonstração: um será confirmado e o outro recusado com motivo.
- Use dados fictícios para os clientes, nunca dados reais.

### 5.4 Fora do MVP (Futuro / backlog)
- Cardápio público, em que o cliente monta e envia o pedido (link pelo `slug`).
- Envio automático pela **WhatsApp Cloud API** (Meta).
- Pagamento online.
- Controle de estoque de ingredientes.
- Relatórios e gestão financeira (precificação, margens).
- Divulgação e fidelização.
- Acesso da Romilda ao sistema.

### 5.5 Por que o MVP importa além do PI
A ação extensionista de Empreendedorismo é um **treinamento presencial de 2 horas** com a Lídia e a Romilda, que **só acontece depois que o MVP estiver funcional**. Nele, a Lídia opera o Kanban do Zappi (login, ver pedidos, confirmar um e recusar outro com motivo). O MVP precisa estar estável e utilizável por uma pessoa leiga.

---

## 6. ODS

**ODS 8 — Trabalho Decente e Crescimento Econômico, meta 8.3:** apoio a atividades produtivas, empreendedorismo e inovação, e incentivo à formalização e ao crescimento de micro e pequenos negócios. O Zappi organiza e profissionaliza um negócio informal unipessoal.

---

## 7. User stories e requisitos funcionais

| User story | Requisitos funcionais |
|---|---|
| **US1** — Como Lídia, quero fazer login, para acessar de forma segura minhas informações e pedidos. | **RF01** Login com e-mail e senha. **RF02** Validar credenciais e bloquear acesso com dados incorretos. |
| **US2** — Como Lídia, quero cadastrar as informações do estabelecimento, para manter meus dados registrados. | **RF03** Cadastro de nome, descrição e contato do Casa Belt. **RF04** Edição posterior dessas informações. |
| **US3** — Como Lídia, quero cadastrar meus produtos, para manter o cardápio atualizado. | **RF05** Cadastro de produtos com nome, sabor, preço por kg e foto. **RF06** Edição e exclusão de produtos (exclusão lógica). |
| **US4** — Como Lídia, quero ver os pedidos em um quadro Kanban, para acompanhar o status de cada um. | **RF07** Pedidos em Kanban por status (Novo, Confirmado, Em produção, Concluído). **RF08** Detalhes do pedido ao selecionar um card. |
| **US5** — Como Lídia, quero confirmar um pedido, para informar ao cliente que ele será atendido. | **RF09** Mover o pedido para "Confirmado". **RF10** Preparar a mensagem de confirmação ao cliente via WhatsApp. |
| **US6** — Como Lídia, quero recusar um pedido informando o motivo, para que o cliente entenda. | **RF11** Motivo obrigatório ao recusar. **RF12** Preparar a mensagem de recusa com o motivo via WhatsApp. |
| **US7** — Como Lídia, quero cadastrar e editar pedidos, para registrar as encomendas que recebo pelo WhatsApp e corrigir um pedido quando o cliente pede uma mudança. | **RF13** Cadastro de pedido com cliente (nome e WhatsApp), itens do cardápio com quantidade, data de retirada e observações. **RF14** Edição do pedido conforme o status (RN21). |
| **US8** — Como Lídia, quero mover o pedido para Em produção e Concluído, para acompanhar o andamento e avisar o cliente que o pedido está pronto. | **RF15** Mover o pedido para "Em produção" e "Concluído", com a volta de uma etapa para corrigir um clique errado (RN03). **RF16** Preparar a mensagem de pronto para retirada via WhatsApp. |

**Adições depois da documentação entregue em sala** (formalizadas na `ZAP-83`):
- **US7, RF13 e RF14** são novos (decisão da `ZAP-64`, item 14.9; história `ZAP-87`).
- **US8, RF15 e RF16** numeram o escopo ampliado que já tinha sido aprovado sem RF (história `ZAP-60`).
- **RF11 e RF12** passam a valer também para o **cancelamento** de pedidos Confirmados e Em produção (`ZAP-64`).
- **RF10, RF12 e RF16:** o botão "Enviar no WhatsApp" continua disponível para **reenviar** a mensagem, e o painel mostra só a mensagem da etapa atual, com as anteriores guardadas para consulta (`ZAP-64`, `ZAP-51`).

---

## 8. Regras de negócio (consolidadas)

| ID | Regra | Origem |
|---|---|---|
| RN01 | Todo dado de negócio pertence a um estabelecimento (`estabelecimento_id`). O sistema é multi-estabelecimento; a Casa Belt é o primeiro. | DER |
| RN02 | Só a proprietária (usuário do estabelecimento) acessa o painel. A Romilda e os clientes não têm usuário. | ISO 5.15 |
| RN03 | Status do pedido: 1-Novo · 2-Confirmado · 3-Em produção · 4-Concluído · 5-Recusado. Transições permitidas: Novo → Confirmado ou Recusado; Confirmado → Em produção ou Recusado (cancelamento); Em produção → Concluído ou Recusado (cancelamento); e as voltas Em produção → Confirmado e Concluído → Em produção. Nada volta para antes da confirmação, e Recusado não muda mais. A mudança é feita por botões nos detalhes do pedido, sem arrastar. | DER / RF07 / ZAP-64 |
| RN04 | Recusados ficam ocultos no Kanban por padrão e aparecem pelo filtro "Recusados". | Arquitetura |
| RN05 | Recusar ou cancelar exige `motivo_recusa` (obrigatório quando status = 5). O cancelamento usa o mesmo fluxo da recusa. | RF11 / ZAP-64 |
| RN06 | Confirmar grava `confirmado_em`; iniciar a produção grava `producao_em`; recusar ou cancelar grava `recusado_em`; concluir grava `concluido_em`. Voltar de Concluído para Em produção apaga `concluido_em`; voltar de Em produção para Confirmado apaga `producao_em`. | DER / ZAP-64 / ZAP-83 |
| RN07 | Confirmar, recusar, cancelar ou concluir **gera uma mensagem** (`mensagem_whatsapp`) dos tipos 1-Confirmação, 2-Recusa e 3-Pronto. Iniciar a produção e as voltas não geram mensagem. | RF10 / RF12 / ZAP-64 |
| RN08 | Mudar o status, gerar a mensagem e gravar o log acontecem **na mesma transação**. | Justificativa do banco |
| RN09 | O número do pedido é sequencial e único **por estabelecimento** e aparece no card (ex.: #1). É gerado com `MAX + 1` e bloqueio da linha do estabelecimento (`SELECT ... FOR UPDATE`), na mesma transação da criação do pedido. | DER / ZAP-64 |
| RN10 | O item do pedido **congela o preço** (`preco_unitario`). Mudar o cardápio não altera pedidos antigos. Na edição, os itens que já estavam no pedido mantêm o preço; só um item novo copia o preço atual. | DER / ZAP-64 |
| RN11 | `subtotal = quantidade × preco_unitario`; `valor_total = soma dos subtotais`. | DER |
| RN12 | Quantidade > 0. KG aceita fração (ex.: 1,5); UN não aceita. | DER |
| RN13 | Preço do produto > 0. | DER |
| RN14 | Excluir um produto é **lógico** (`ativo = FALSE`): ele some do cardápio, mas o histórico continua. | RF06 |
| RN15 | Toda foto de produto exige **texto alternativo**. | NBR 5.9.1 |
| RN16 | Um cliente só é gravado com `consentimento_lgpd = TRUE` e `consentimento_em` preenchido. | LGPD |
| RN17 | Excluir os dados de um cliente é feito por **anonimização** (`anonimizado_em`), sem apagar o histórico de pedidos. | LGPD |
| RN18 | O telefone do cliente é único por estabelecimento. | DER |
| RN19 | Não há delivery: o pedido tem `data_retirada`, e o pagamento é presencial, na retirada. O sistema não registra pagamento. | Comunidade |
| RN20 | A mensagem copia o telefone do cliente no momento em que é gerada (`telefone_destino`). | DER |
| RN21 | **Edição de pedido por status.** 1-Novo: pode mudar tudo (cliente, itens, quantidades, data de retirada e observações). 2-Confirmado e 3-Em produção: pode mudar itens, quantidades, data e observações, mas não o cliente; a tela avisa que o cliente precisa ser avisado da mudança. 4-Concluído e 5-Recusado: não podem ser editados. Todo pedido cadastrado começa como 1-Novo, e os produtos são escolhidos do cardápio (só ativos). | RF13 / RF14 / ZAP-64 |

---

## 9. Requisitos legais (Atividade #9)

O foco é **CDC (Lei nº 8.078/1990)** e **LGPD (Lei nº 13.709/2018)**. Aspectos fiscais ficam de fora, porque o sistema não trata pagamentos.

| Lei | Requisito | Como o sistema atende |
|---|---|---|
| CDC | Informação clara sobre os produtos | Cardápio com descrição, sabor, preço por kg e foto, sem informação enganosa |
| CDC | Transparência na comunicação automatizada | Mensagem termina com "Mensagem gerada pelo Zappi" (textos em `docs/mensagens-whatsapp.md`) |
| CDC | Canal de atendimento | Contato direto com a Lídia (`estabelecimento.telefone_whatsapp`) |
| LGPD | Consentimento | Consentimento registrado antes de gravar nome e telefone |
| LGPD | Finalidade específica | Dados usados só para processar e acompanhar pedidos; nada de compartilhar com terceiros |
| LGPD | Segurança no armazenamento | Acesso restrito e dados segregados por estabelecimento |
| LGPD | Direito de exclusão | Anonimização a pedido do titular |

---

## 10. Segurança da informação (Atividade #10 — ABNT NBR ISO/IEC 27002:2022)

| Controle | Requisito do sistema | Implementação prevista |
|---|---|---|
| 5.15 Controle de acesso | Painel administrativo acessível só pela Lídia, mediante login | Spring Security; rotas `/api` protegidas, exceto login |
| 5.16 Gestão de identidade | E-mail único como identificador da conta | `usuario.email` UNIQUE |
| 5.17 Informações de autenticação | Senha com **mín. 8 caracteres, letras, números e ao menos 1 caractere especial** | Validação na aplicação |
| 8.24 Uso de criptografia | Senhas em hash (nunca em texto puro); comunicação via HTTPS | BCrypt; HTTPS/TLS gerenciado pelo Render; TLS com o Supabase |
| 5.34 Privacidade e dados pessoais | Dados de clientes segregados e com acesso restrito | `estabelecimento_id` em tudo; RLS no Supabase; acesso ao banco só pelo backend |
| 8.16 Monitoramento | Logs de login e de ações administrativas | Tabela `log_auditoria` |

Autenticação por **token JWT** nas requisições depois do login. O token vale **8 horas**, sem refresh token: ao expirar, a Lídia faz login de novo. No navegador, ele fica no `sessionStorage`: continua ao recarregar a página e some ao fechar a aba. Ele vai no header `Authorization: Bearer`, e a chave de assinatura fica em variável de ambiente, nunca no código.

**Bloqueio de login (RF02):** 5 falhas seguidas para o mesmo e-mail bloqueiam novos logins por 15 minutos. A contagem usa os registros `LOGIN_FALHA` do `log_auditoria` desde o último `LOGIN_SUCESSO`, sem alterar o DER. A mensagem é em linguagem simples e não revela se o e-mail existe.

Ações a registrar em `log_auditoria.acao`: `LOGIN_SUCESSO`, `LOGIN_FALHA`, `ESTABELECIMENTO_EDITADO`, `PRODUTO_CRIADO`, `PRODUTO_EDITADO`, `PRODUTO_EXCLUIDO`, `PEDIDO_CRIADO`, `PEDIDO_EDITADO`, `PEDIDO_CONFIRMADO`, `PEDIDO_RECUSADO`, `PEDIDO_STATUS_ALTERADO`. Em `PEDIDO_EDITADO`, o campo `detalhes` guarda o que mudou. Cada registro guarda data, hora, IP de origem e user agent.

---

## 11. Acessibilidade digital (Atividade #11 — ABNT NBR 17225:2025 / WCAG 2.2)

| Requisito NBR | Critério WCAG | Implementação no Zappi |
|---|---|---|
| 5.11.2 Contraste para texto | 1.4.3 (AA) | Contraste mínimo de 4,5:1, sobretudo em preços e descrições |
| 5.1.1 Indicador de foco visível | 2.4.7 (AA) | Borda destacada nos campos ao receber foco pelo teclado (começando pelo login) |
| 5.1.4 Ordem de foco previsível | 2.4.3 (A) | Cadastro de produto: nome → sabor → preço → foto → "Salvar" (encaixar os demais campos na mesma lógica). Cadastro de pedido: cliente → itens → data de retirada → observações → "Salvar" |
| 5.9.1 Texto alternativo | 1.1.1 (A) | Toda foto de produto com texto alternativo (`foto_texto_alternativo`) |
| 5.12.12 Nível de linguagem | 3.1.5 (AAA) | Mensagens do WhatsApp em linguagem simples, sem termos técnicos |
| 5.3.1 Rótulos ou instruções | 3.3.2 (A) | Todo campo de formulário com rótulo visível |

---

## 12. Arquitetura da solução (Atividade #13)

### 12.1 Componentes

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Acesso | Navegador (computador ou celular) | Sistema web, sem instalar aplicativo |
| Hospedagem | **Render** (plano gratuito) | Frontend como Static Site e backend como Web Service (Docker); deploy automático a cada merge na `main`. O Docker Compose fica só no ambiente local |
| Endereço e HTTPS | Render | Subdomínio gratuito `*.onrender.com`; HTTPS/TLS gerenciado, com HTTP redirecionando para HTTPS; regra de reescrita (`/*` → `/index.html`) para as rotas do React |
| Frontend | **React 19 + Vite** | Painel da Lídia: login, estabelecimento, produtos, Kanban com filtro de recusados, cadastro e edição de pedidos, botão "Enviar no WhatsApp". Futuro: cardápio público |
| Backend | **Java 21 + Spring Boot 4** (build com **Maven**, com Maven Wrapper) | API REST (JSON); regras de negócio; upload de fotos; geração das mensagens e links `wa.me`; isolamento por estabelecimento; CORS liberado só para o endereço do frontend |
| Persistência | **Spring Data JPA** + **Flyway** | Acesso ao banco; migrações em SQL puro em `backend/src/main/resources/db/migration`, só para frente |
| Segurança | **Spring Security** | Login, BCrypt, JWT, política de senha |
| Auditoria | Backend + `log_auditoria` | Logins e ações administrativas |
| Banco | **PostgreSQL (Supabase)** | Banco relacional gerenciado; TLS; criptografia em repouso; RLS em todas as tabelas; o backend e o Flyway conectam pelo session pooler (IPv4, porta 5432) |
| Arquivos | **Supabase Storage** | Bucket `produtos`; o banco guarda só o caminho; upload só pelo backend; leitura pública |
| Mensagens (MVP) | Link **wa.me** | O backend gera o texto e o link; a Lídia clica e envia |
| Mensagens (Futuro) | **WhatsApp Cloud API** (Meta) | Envio automático via HTTPS |
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

### 12.3 Como funciona a mensagem no MVP
- O backend monta o texto e um link no formato `https://wa.me/<telefone_destino>?text=<texto codificado em URL>`.
- A Lídia clica em "Enviar no WhatsApp". O WhatsApp abre com a mensagem pronta e ela só aperta enviar.
- O clique marca a mensagem como 2-Enviada e grava `enviado_em`, porque o sistema não tem como saber se ela apertou enviar dentro do WhatsApp. O botão continua disponível para reenviar, e o reenvio mantém o primeiro `enviado_em` (ZAP-64).
- O envio é **semiautomático**: o sistema prepara, a Lídia envia. O envio 100% automático (Cloud API) é **Futuro**; o campo `id_externo` já está reservado para ele.

### 12.4 Limitações aceitas da hospedagem gratuita
- O backend no Render (plano gratuito) **dorme após 15 minutos sem acesso**, e o primeiro acesso leva cerca de 1 minuto. Antes do ensaio, do vídeo e do treinamento, acordar o backend.
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
| estabelecimento — cliente | 1 : N | Clientes segregados por estabelecimento |
| estabelecimento — pedido | 1 : N | Número sequencial por estabelecimento |
| unidade_medida — produto | 1 : N | Produto vendido em KG ou UN |
| cliente — pedido | 1 : N | Um cliente faz vários pedidos |
| pedido — item_pedido | 1 : 1..N | Todo pedido tem ao menos um item |
| produto — item_pedido | 1 : N | Um produto aparece em vários pedidos |
| pedido — mensagem_whatsapp | 1 : N | Cada decisão gera uma mensagem |
| estabelecimento / usuario — log_auditoria | 0..1 : N | Pode ser nulo em falha de login |

### 13.2 Tabelas

Legenda: **Obr.** = obrigatório (NOT NULL).

#### estabelecimento
Confeitaria cadastrada (tenant). Exemplo: Casa Belt.

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| nome | VARCHAR(100) | Sim | | Nome fantasia. Ex.: Casa Belt |
| slug | VARCHAR(60) | Sim | UK | Minúsculas, números e hífen. Ex.: casa-belt (link do cardápio futuro) |
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

#### unidade_medida
Tabela de domínio. Valores fixos: 1-KG (Quilograma, aceita fração) e 2-UN (Unidade, não aceita fração).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | SMALLINT | Sim | PK | 1-KG, 2-UN |
| sigla | VARCHAR(5) | Sim | UK | KG, UN |
| descricao | VARCHAR(30) | Sim | | Quilograma, Unidade |
| permite_fracao | BOOLEAN | Sim | | KG = TRUE; UN = FALSE |

#### produto
Item do cardápio (RF05/RF06).

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| estabelecimento_id | BIGINT | Sim | FK | → estabelecimento.id |
| unidade_medida_id | SMALLINT | Sim | FK | → unidade_medida.id |
| nome | VARCHAR(100) | Sim | | Ex.: Bolo |
| sabor | VARCHAR(100) | Sim | | Ex.: Brigadeiro de chocolate |
| descricao | VARCHAR(500) | Não | | Informação clara e não enganosa (CDC) |
| preco | NUMERIC(10,2) | Sim | | Por unidade de medida. Ex.: 100,00 por KG. > 0 |
| foto_caminho | VARCHAR(255) | Não | | Caminho no bucket `produtos`. Ex.: 1/bolo-chocolate.jpg |
| foto_texto_alternativo | VARCHAR(150) | Não | | Obrigatório quando há foto (NBR 5.9.1) |
| ativo | BOOLEAN | Sim | | Exclusão lógica (RF06) |
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
| status | SMALLINT | Sim | | 1-Novo · 2-Confirmado · 3-Em produção · 4-Concluído · 5-Recusado |
| data_retirada | DATE | Sim | | Não há delivery |
| observacao | VARCHAR(500) | Não | | Ocasião, tema da festa |
| motivo_recusa | VARCHAR(500) | Não | | Obrigatório quando status = 5 (RF11) |
| valor_total | NUMERIC(10,2) | Sim | | Soma dos subtotais. Pago na retirada |
| criado_em | TIMESTAMPTZ | Sim | | Pedido recebido. Padrão now() |
| confirmado_em | TIMESTAMPTZ | Não | | RF09 |
| producao_em | TIMESTAMPTZ | Não | | RF15. Entrada em Em produção. **Coluna nova**, fora do dicionário da Atividade #14 (ZAP-83) |
| recusado_em | TIMESTAMPTZ | Não | | RF11 |
| concluido_em | TIMESTAMPTZ | Não | | Dispara a mensagem de "pronto" |
| atualizado_em | TIMESTAMPTZ | Sim | | |

#### item_pedido
Produto do pedido, com quantidade e personalização.

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| pedido_id | BIGINT | Sim | FK | → pedido.id, ON DELETE CASCADE |
| produto_id | BIGINT | Sim | FK | → produto.id |
| quantidade | NUMERIC(8,3) | Sim | | Ex.: 1,500 (KG) ou 10 (UN). > 0 |
| preco_unitario | NUMERIC(10,2) | Sim | | Preço congelado quando o item entra no pedido (RN10) |
| subtotal | NUMERIC(10,2) | Sim | | quantidade × preco_unitario |
| recheio | VARCHAR(100) | Não | | Texto livre |
| cobertura | VARCHAR(100) | Não | | Texto livre |
| observacao | VARCHAR(300) | Não | | |

#### mensagem_whatsapp
Mensagem gerada a cada decisão sobre o pedido (RF10/RF12). No MVP, a Lídia envia pelo `wa.me`.

| Coluna | Tipo | Obr. | Chave | Observação |
|---|---|---|---|---|
| id | BIGINT | Sim | PK | IDENTITY |
| pedido_id | BIGINT | Sim | FK | → pedido.id, ON DELETE CASCADE |
| tipo | SMALLINT | Sim | | 1-Confirmação · 2-Recusa · 3-Pronto para retirada |
| telefone_destino | VARCHAR(13) | Sim | | Cópia do telefone do cliente na geração |
| conteudo | TEXT | Sim | | Linguagem simples (NBR 5.12.12) + identificação do Zappi (CDC) |
| status | SMALLINT | Sim | | 1-Pendente · 2-Enviada · 3-Falha |
| id_externo | VARCHAR(100) | Não | | Reservado para a Cloud API (futuro) |
| criado_em | TIMESTAMPTZ | Sim | | Padrão now() |
| enviado_em | TIMESTAMPTZ | Não | | |

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
- `CHECK (status BETWEEN 1 AND 5)` em `pedido`; `tipo` e `status` de `mensagem_whatsapp` entre 1 e 3.
- `CHECK (consentimento_lgpd = TRUE)` em `cliente`.
- `CHECK (foto_caminho IS NULL OR foto_texto_alternativo IS NOT NULL)` em `produto`.
- `ON DELETE CASCADE` em `item_pedido.pedido_id` e `mensagem_whatsapp.pedido_id`.
- RLS habilitado em todas as tabelas (somente o backend acessa).

---

## 14. Pontos em aberto (decidir com a equipe antes de implementar)

1. **Texto da mensagem ao cliente.** **Decidido (ZAP-63):** os textos de confirmação, recusa (também usado no cancelamento) e pronto para retirada estão em [`docs/mensagens-whatsapp.md`](mensagens-whatsapp.md). Todos terminam com **"Mensagem gerada pelo Zappi"**.
2. **Quando a mensagem vira "Enviada".** **Decidido (ZAP-64):** ao clicar em "Enviar no WhatsApp". Detalhes na seção 12.3.
3. **Transições de status permitidas.** **Decidido (ZAP-64):**
   - mudar de coluna por **botões** nos detalhes do pedido, mostrando só o próximo passo possível, **sem arrastar**;
   - **cancelar** pedidos Confirmados e Em produção pelo fluxo de recusa: o pedido vai para Recusado, com motivo obrigatório; um status próprio "Cancelado" fica como melhoria futura;
   - **voltar** só para desfazer o último passo da produção: Concluído → Em produção e Em produção → Confirmado, com confirmação; ao voltar de Concluído, se o aviso de pronto já foi enviado, a tela lembra a Lídia de avisar o cliente;
   - nada volta para antes da confirmação, e um pedido Recusado não volta para o quadro.
4. **Massa do bolo.** **Decidido (ZAP-64):** sem campo próprio, e o DER não muda. A massa padrão de cada bolo vai na **descrição do produto** (ex.: "Massa de chocolate, recheio de brigadeiro…"). Quando o cliente pede outra massa, a Lídia anota na **observação do item** (`item_pedido.observacao`). Se o cardápio público (Futuro) precisar que o cliente escolha a massa na tela, avaliar um campo próprio.
5. **Salgados.** **Decidido (ZAP-64):** vendidos por **unidade (UN)**, sem unidade de medida nova. O cento, o meio cento e pacotes viram produtos próprios no cardápio (ex.: "Cento de coxinha"), o que também dá o desconto do cento. O sistema não obriga um mínimo de unidades: a Lídia combina com o cliente. No cadastro, o nome é o tipo ("Salgado") e o sabor é o item ("Coxinha de frango").
6. **Consistência de tenant.** Garantir que o pedido e o cliente pertencem ao mesmo estabelecimento (validação no backend ou FK composta).
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
10. **Região dos servidores e LGPD.** O Render não tem região em São Paulo. Avaliar com a equipe uma nota na seção 9 sobre a localização dos dados.

---

## 15. Sugestão de planos de implementação

Sugestão inicial de ordem. Cada item é um plano a ser detalhado e aprovado no Claude Code.

| # | Plano | Entrega | Rastreabilidade |
|---|---|---|---|
| 1 | Estrutura do repositório | Monorepo (`backend/`, `frontend/`, `infra/`), Docker Compose local, README | Arquitetura |
| 2 | Banco de dados | Migrações com as 9 tabelas, restrições da seção 13.3 e seed (seção 5.3) | Ativ. #14 |
| 3 | Autenticação | Login, BCrypt, JWT, política de senha, log de login, tela de login acessível | US1, RF01–RF02, ISO 5.15–5.17, 8.24, 8.16 |
| 4 | Estabelecimento | API e tela de cadastro/edição, log de edição | US2, RF03–RF04 |
| 5 | Produtos | CRUD com exclusão lógica, upload para o Storage, texto alternativo, ordem de foco | US3, RF05–RF06, NBR 5.9.1, 5.1.4 |
| 6 | Kanban de pedidos | Colunas por status, filtro de recusados, detalhes do pedido | US4, RF07–RF08 |
| 7 | Decisões sobre pedidos | Confirmar, recusar ou cancelar com motivo, em produção, concluir e voltar uma etapa da produção; transação status + mensagem + log | US5, US6, US8, RF09–RF12, RF15–RF16, RN03, RN05–RN08 |
| 8 | Mensagens WhatsApp | Textos, geração do link `wa.me`, botão "Enviar no WhatsApp", status da mensagem | RF10, RF12, CDC, NBR 5.12.12 |
| 9 | Acessibilidade e UX | Revisão de contraste, foco, rótulos e uso no celular | Ativ. #11 |
| 10 | Infra e deploy | Render (Static Site e Web Service) com HTTPS, Supabase, GitHub Actions (build e testes) e deploy automático do Render | Arquitetura |
| 11 | Preparação da demonstração | Roteiro e dados para o vídeo e para o treinamento da Lídia | Entregas finais |
| 12 | Cadastro e edição de pedidos | Botão "Novo pedido", formulário com produtos do cardápio, edição conforme o status, número por `MAX + 1`, logs de criação e edição | US7, RF13–RF14, RN09, RN10, RN21 |

---

## 16. Outras entregas que dependem do sistema

- **Vídeo narrado** com a demonstração do sistema, e o roteiro do vídeo.
- **Relatório técnico** do projeto.
- **Material de apoio** para a apresentação final.
- Demais atividades do PI até a #17 (Propostas de divulgação do sistema).
- **Treinamento da ação extensionista** (Empreendedorismo): encontro de 2 horas, depois do MVP pronto:
  - conversa sobre Kanban (25 min);
  - construção dos critérios de aceite e recusa (35 min);
  - treinamento prático no Zappi (35 min).

---

## 17. Histórico de decisões

| Decisão | Antes | Agora |
|---|---|---|
| Stack do backend | Node.js (Atividade #3, hipótese inicial) | **Java 21 + Spring Boot 4** |
| Escopo do MVP | Login, estabelecimento, produtos, confirmar/recusar 2 pedidos (Atividade #5) | **Escopo ampliado** (seção 5.2): Em produção, Concluído, mensagem de pronto, fotos, auditoria, CI/CD; depois, cancelamento, voltar uma etapa e cadastro e edição de pedidos |
| Envio ao WhatsApp | "Resposta automática" (Atividades #5, #6 e #9) | **MVP semiautomático com `wa.me`**; Cloud API no futuro |
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
| Mensagem "Enviada" | Em aberto (clique ou confirmação manual) | **Ao clicar em "Enviar no WhatsApp"** (ZAP-64). Motivo: o sistema não sabe se ela apertou enviar, e não acrescenta um passo extra para a Lídia |
| Unidade de venda dos salgados | Em aberto (unidade ou cento) | **Por unidade (UN)**; o cento e os pacotes viram produtos próprios (ZAP-64). Motivo: não muda o banco nem as telas, e o desconto do cento sai do preço de cada produto |
| Massa do bolo | Em aberto (campo próprio no item ou não) | **Sem campo próprio** (ZAP-64): massa padrão na descrição do produto e massa pedida pelo cliente na observação do item. Motivo: não muda o banco, e no MVP quem registra o pedido é a Lídia |
| Número do pedido | Em aberto (sequência ou `MAX + 1`) | **`MAX + 1` com bloqueio** da linha do estabelecimento (ZAP-64). Motivo: não muda o banco e não deixa buracos na numeração |
| Textos das mensagens do WhatsApp | Não redigidos | **Três textos** em `docs/mensagens-whatsapp.md` (ZAP-63), validados com autorização do Lucas. Motivo: linguagem simples (NBR 17225 5.12.12), identificação do Zappi (CDC), sem emojis e sem expor o endereço da Lídia |
| Andamento da produção | Escopo ampliado sem US nem RF numerado | **US8, RF15 e RF16** (ZAP-83, história ZAP-60). Motivo: formalizar o que já tinha sido aprovado, para ter rastreabilidade como as demais funcionalidades |
| Reenviar a mensagem | Não previsto (RF10 e RF12 só preparam a mensagem) | **Botão continua disponível para reenviar**, e o painel mostra só a mensagem da etapa atual, com as anteriores guardadas (ZAP-64, ZAP-51). Motivo: a Lídia pode fechar o WhatsApp sem mandar, e uma mensagem de outra etapa não deve ser enviada por engano |
| Criar e editar pedidos | Pedidos só pelo seed (seção 5.3) | **US7, RF13, RF14 e RN21** (ZAP-64, história ZAP-87): cadastro pelo botão "Novo pedido" e edição limitada pelo status. Motivo: sem isso, a Lídia não consegue usar o Zappi com pedidos de verdade |
| Data de entrada em produção | Sem coluna no dicionário de dados (Atividade #14) | **Coluna nova `producao_em`** em `pedido` (ZAP-83). Motivo: o histórico do pedido na tela mostra quando ele entrou em produção, e uma coluna é mais simples de consultar do que o log |
| Alterações fora da documentação original | Sem registro definido | **Toda alteração é registrada na `ZAP-83`** e nesta seção, com antes, agora e motivo (seção 0). Motivo: manter os documentos entregues em sala coerentes com o sistema entregue |

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

- **Épicos:** `ZAP-1` Portal do Administrador (MVP) · `ZAP-2` Portal do Cliente (Futuro) · `ZAP-3` Entregas em Sala.
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
