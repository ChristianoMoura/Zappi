# Zappi

**Seu cardápio, direto no zap.**

Cardápio digital com integração ao WhatsApp, feito para organizar os pedidos da **Casa Belt**, confeitaria artesanal da Lídia.

Projeto Integrador do curso de Tecnologia em Análise e Desenvolvimento de Sistemas do **Senac SP**, com ação extensionista em parceria com a disciplina de Empreendedorismo, Inovação e Economia Criativa.

> 🚧 **Em desenvolvimento.** Prazo da entrega final, com o Portal do Administrador e o Portal do Cliente: **22/11/2026**.

---

## Sobre o projeto

A Casa Belt produz bolos e salgados sob encomenda. Hoje todos os pedidos chegam pelo WhatsApp, misturados com conversas pessoais, e são controlados à mão em um caderno. Não há confirmação formal ao cliente, e em datas comemorativas fica difícil saber quanto ainda dá para aceitar.

O Zappi resolve a demanda escolhida pela própria Lídia: **organizar e gerir os pedidos**. Ela passa a acompanhar cada encomenda em um quadro Kanban, confirma ou recusa com um clique e o sistema prepara a mensagem para o cliente no WhatsApp. O cliente consulta o cardápio e faz o pedido pelo link da Casa Belt, sem precisar criar conta.

**ODS 8 — Trabalho Decente e Crescimento Econômico (meta 8.3):** apoio à organização e ao crescimento de um pequeno negócio informal.

## Escopo da entrega final

### Portal do Administrador

O painel da **Lídia**, a única usuária com login.

- Login com e-mail e senha
- Cadastro e edição dos dados do estabelecimento
- Cadastro, edição e exclusão lógica de produtos, com foto e texto alternativo
- Quadro Kanban de pedidos: **Novo → Confirmado → Em produção → Concluído**, com filtro para os **Recusados**
- Cadastro e edição de pedidos, com a edição limitada pelo status
- Confirmar, recusar ou cancelar pedidos (com motivo obrigatório na recusa e no cancelamento), mover para Em produção e Concluído e voltar uma etapa da produção
- Mensagem ao cliente gerada pelo sistema e botão **"Enviar no WhatsApp"** (link `wa.me`)
- Registro de auditoria de logins e ações administrativas
- Anonimização dos dados do cliente a pedido do titular (LGPD)

### Portal do Cliente

O cardápio público da Casa Belt, sem login.

- Cardápio pelo link do estabelecimento, com produtos ativos, fotos, descrições e preços
- Montagem do pedido: produtos, quantidade, recheio, cobertura, observações e data de retirada
- Identificação com nome e WhatsApp, com consentimento LGPD
- O pedido entra na coluna **Novo** do quadro da Lídia

**Em validação:** envio automático das mensagens pela WhatsApp Cloud API (Meta).

**Fora da entrega (futuro):** pagamento online, controle de estoque, relatórios financeiros e fidelização.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Java 21 + Spring Boot 4 (Spring Data JPA, Spring Security, JWT) |
| Banco de dados | PostgreSQL (Supabase) |
| Arquivos | Supabase Storage |
| Infraestrutura | Docker Compose, Nginx com HTTPS (Let's Encrypt), VM Linux |
| CI/CD | GitHub Actions |
| Gestão | Jira |

## Arquitetura

```
Navegador (computador ou celular)
        │  HTTPS
        ▼
     Nginx ──────────────► Frontend (React)
        │  /api
        ▼
 Backend (Spring Boot) ──► PostgreSQL (Supabase)
        │              └─► Supabase Storage (fotos)
        ▼
 Link wa.me ──► WhatsApp da Lídia ──► Cliente
```

Ao confirmar, recusar ou concluir um pedido, o backend muda o status, gera a mensagem e grava o log **na mesma transação**, e devolve o link `wa.me` com o texto pronto. A Lídia só aperta enviar.

## Estrutura do repositório

```
zappi/
├── backend/    # API REST em Java + Spring Boot
├── frontend/   # Painel da Lídia em React + Vite
├── infra/      # Docker Compose, Nginx e scripts de deploy
└── docs/       # Documentação do projeto
```

## Como rodar localmente

O Docker Compose sobe o banco de dados, o backend e o frontend.

### Pré-requisitos

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), ou Docker Engine com o plugin Compose

### Passo a passo

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/ChristianoMoura/Zappi.git
   cd Zappi
   ```

2. Suba o ambiente:

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

3. Confira se o serviço `banco` aparece como `healthy` e o `backend` e o `frontend` como `running`:

   ```bash
   docker compose -f infra/docker-compose.yml ps
   ```

4. Abra o painel em [http://localhost:5173](http://localhost:5173). Na primeira vez, o frontend leva alguns minutos para instalar as dependências; acompanhe com `docker compose -f infra/docker-compose.yml logs -f frontend`.

5. Confira o backend em [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health), que deve responder `{"status":"UP"}`. Na primeira vez, ele leva alguns minutos para baixar as dependências do Maven; acompanhe com `docker compose -f infra/docker-compose.yml logs -f backend`. O backend não recarrega sozinho: depois de mudar o código, reinicie com `docker compose -f infra/docker-compose.yml restart backend`.

Para parar o ambiente sem perder os dados:

```bash
docker compose -f infra/docker-compose.yml down
```

Para apagar também os dados do banco local e começar do zero:

```bash
docker compose -f infra/docker-compose.yml down -v
```

### Banco de dados

Em desenvolvimento, cada pessoa usa um PostgreSQL próprio, em contêiner. Em produção, o banco é o Supabase.

| Item | Valor local |
|---|---|
| Endereço | `localhost:5432` |
| Banco | `zappi` |
| Usuário | `zappi` |
| Senha | `zappi_local` |

Esses valores valem apenas para a máquina local. Para mudá-los, por exemplo se a porta 5432 já estiver em uso, copie `infra/.env.example` para `infra/.env` e edite o novo arquivo. Se mudar o usuário, a senha ou o nome do banco depois da primeira execução, recrie o banco com o comando `down -v`.

As credenciais do Supabase nunca devem ser colocadas no repositório.

### Backend sem Docker

Para desenvolver o backend direto na máquina, com o [JDK 21](https://adoptium.net/) e o banco do Docker Compose no ar (`docker compose -f infra/docker-compose.yml up -d banco`). Não é preciso instalar o Maven: o projeto usa o Maven Wrapper (`mvnw`).

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

No Windows (PowerShell ou Prompt de Comando), use `mvnw.cmd` no lugar de `./mvnw`.

| Comando | O que faz |
|---|---|
| `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` | Sobe a API em `http://localhost:8080`, usando o banco local |
| `./mvnw test` | Roda os testes (precisa do Docker aberto, porque os testes sobem um PostgreSQL próprio com Testcontainers) |
| `./mvnw verify` | Compila, roda os testes e gera o `.jar` em `backend/target` |

O backend usa Java 21, Spring Boot 4 (Web, Data JPA, Security, Validation e Actuator) e o driver do PostgreSQL. A configuração vem de variáveis de ambiente (`DB_URL`, `DB_USUARIO`, `DB_SENHA`, `CORS_ORIGENS`, `PORT`, `LIDIA_SENHA_HASH`, `JWT_CHAVE`, `SUPABASE_URL` e `SUPABASE_CHAVE_SECRETA`); o perfil `local` já traz os valores do banco do Docker Compose.

**Acesso à API:** só a verificação de saúde (`/actuator/health`) e o login (`POST /api/autenticacao/login`, ZAP-31) são abertos. Todas as outras rotas exigem o token JWT no header `Authorization: Bearer <token>` e respondem `401` sem ele, com ele inválido ou expirado (8 horas). O token é assinado com a chave da variável `JWT_CHAVE` (Base64, 32 bytes ou mais; gere com `openssl rand -base64 32`). Ela é obrigatória em produção; localmente e nos testes, se estiver vazia, o backend gera uma chave aleatória a cada subida, e os tokens antigos deixam de valer ao reiniciar. Os controllers recebem quem fez a requisição com `@AuthenticationPrincipal UsuarioAutenticado usuario` e filtram os dados pelo `estabelecimentoId` do token, nunca por um id vindo da requisição.

**Login (`POST /api/autenticacao/login`):**

| Situação | Status | Corpo |
|---|---|---|
| Pedido | — | `{ "email": "lidia@casabelt.com", "senha": "..." }` |
| E-mail e senha certos | `200` | `{ "token": "<jwt>", "nome": "Lídia" }` |
| E-mail inexistente, senha errada ou usuária desativada | `401` | `{ "codigo": "CREDENCIAIS_INVALIDAS", "mensagem": "E-mail ou senha incorretos." }` |
| Campos vazios, e-mail mal formado ou JSON inválido | `400` | `{ "codigo": "DADOS_INVALIDOS", "mensagem": "Confira os dados informados." }` |
| 5 falhas com o mesmo e-mail em 15 minutos | `429` + header `Retry-After` (segundos) | `{ "codigo": "LOGIN_BLOQUEADO", "mensagem": "Muitas tentativas sem sucesso. Espere 15 minutos e tente novamente." }` |

A resposta de erro é a mesma nos três casos do `401`, e leva o mesmo tempo, para não revelar quais e-mails estão cadastrados. O e-mail é comparado sem diferenciar maiúsculas e minúsculas. No login certo, o backend grava `usuario.ultimo_login_em`. Todas as respostas de erro da API seguem o formato `{ "codigo", "mensagem" }`.

**Log de login (ZAP-33, ISO 27002 8.16):** toda tentativa com dados válidos fica no `log_auditoria`, com o e-mail informado (em minúsculas), o IP do navegador, o user agent e a data/hora. O `LOGIN_SUCESSO` leva o usuário e o estabelecimento. O `LOGIN_FALHA` é gravado mesmo com o erro e leva o motivo em `detalhes` (`EMAIL_INEXISTENTE`, `SENHA_INCORRETA` ou `USUARIO_INATIVO`); com e-mail inexistente, o usuário e o estabelecimento ficam nulos. O motivo fica só no log: a API responde sempre o mesmo `401`. A senha nunca é gravada.

**Bloqueio de login (ZAP-85, RF02):** 5 falhas com o mesmo e-mail nos últimos 15 minutos, desde o último login certo, bloqueiam novas tentativas com esse e-mail. Durante o bloqueio, nem a senha certa entra, porque ela nem é conferida, e o acesso volta sozinho 15 minutos depois das falhas. A contagem usa os `LOGIN_FALHA` do `log_auditoria`, sem mudar o banco. Cada tentativa recusada também vai para o log (`LOGIN_FALHA` com motivo `LOGIN_BLOQUEADO`), mas não conta para o bloqueio: insistir não prolonga a espera. O bloqueio vale para qualquer e-mail digitado, cadastrado ou não, para não revelar quais existem.

**Política de senha (ZAP-33, ISO 27002 5.17):** pelo menos 8 caracteres, com letra, número e caractere especial (espaço não conta), e no máximo 72 bytes, o limite do BCrypt. A regra fica em `PoliticaDeSenha`; toda requisição que define uma senha nova usa a anotação `@SenhaForte` no campo.

**Produtos (ZAP-39, RF05, RF06):** todas as rotas exigem o token e valem só para o estabelecimento dele (RN01).

| Rota | Resposta |
|---|---|
| `GET /api/produtos` | `200` com os produtos ativos, por nome e sabor |
| `GET /api/produtos/{id}` | `200` com o produto |
| `POST /api/produtos` | `201` com o produto criado e o header `Location` |
| `PUT /api/produtos/{id}` | `200` com o produto editado |
| `DELETE /api/produtos/{id}` | `204`. A exclusão é lógica (`ativo = false`, RN14): o produto some do cardápio, mas continua nos pedidos antigos com o preço congelado |

O corpo do `POST` e do `PUT` (e a resposta) usa os nomes da tela: `{ "nome", "sabor", "unidade": "KG" ou "UN", "preco", "descricao", "textoAlternativo" }`, e a resposta traz também `id`, `ativo` e `foto` (o endereço público da imagem, ou nulo sem foto). Nome, sabor, unidade e preço são obrigatórios; o preço é maior que zero, com até 2 casas (RN13); produto com foto exige o texto alternativo (RN15). Dados inválidos recebem `400 DADOS_INVALIDOS` com a mensagem de cada campo em `campos`, ex.: `{ "campos": { "preco": "Informe um preço maior que zero." } }`. Produto inexistente, já excluído ou de outro estabelecimento recebe `404 PRODUTO_NAO_ENCONTRADO`. Cada cadastro, edição e exclusão vai para o `log_auditoria` (`PRODUTO_CRIADO`, `PRODUTO_EDITADO` e `PRODUTO_EXCLUIDO`), com os valores de antes e depois em `detalhes`.

**Fotos dos produtos (ZAP-40, RN15):** `POST /api/produtos/{id}/foto` recebe `multipart/form-data` com `arquivo` (JPG, PNG ou WebP, até 5 MB; o tipo é conferido pelo conteúdo, não pela extensão) e `textoAlternativo` (obrigatório, até 150 caracteres), e responde `200` com o produto. `DELETE /api/produtos/{id}/foto` tira a foto. O backend envia a foto para o bucket `produtos` do Supabase Storage com a chave secreta (`SUPABASE_CHAVE_SECRETA`), no caminho `{estabelecimento}/{produto}-{código}.{extensão}`, e o banco guarda só esse caminho; a leitura é pública, pelo endereço em `foto`. O nome muda a cada envio, para o navegador não mostrar a foto antiga, e a foto antiga é apagada do Storage depois que a troca é gravada. Arquivo inválido ou sem texto alternativo recebe `400` com a mensagem em `campos`. Sem a configuração do Supabase (localmente, por exemplo), o envio responde `503 FOTO_INDISPONIVEL` e o resto da API funciona. Em produção, `SUPABASE_URL` e `SUPABASE_CHAVE_SECRETA` são obrigatórias: sem elas, o backend não sobe.

**Logo e capa do estabelecimento (ZAP-119):** `POST /api/estabelecimento/logo` e `POST /api/estabelecimento/capa` recebem `multipart/form-data` com `arquivo`, nas mesmas regras da foto do produto (JPG, PNG ou WebP, até 5 MB, tipo conferido pelo conteúdo), e respondem `200` com o estabelecimento. `DELETE` nas mesmas rotas tira a foto. Não há texto alternativo: o do logo é "Logo de" + nome da loja, e a capa é decorativa. As fotos vão para o bucket público **`estabelecimentos`** do mesmo projeto do Supabase (`zappi.armazenamento.bucket-estabelecimento`), no caminho `{estabelecimento}/logo-{código}.{extensão}` ou `{estabelecimento}/capa-{código}.{extensão}`, e `GET /api/estabelecimento` devolve os endereços públicos em `logo` e `capa`. **Antes do primeiro deploy, crie o bucket `estabelecimentos` no painel do Supabase, com leitura pública**, como o `produtos`. Sem o bucket, o envio responde `503 FOTO_INDISPONIVEL` e o resto da API funciona.

**Pedidos (ZAP-44, RF07, RF08):** `GET /api/pedidos` lista os pedidos do estabelecimento do token (RN01) para o quadro, por status, data de retirada e número. Os recusados ficam de fora e só vêm com `?recusados=true` (RN04). Cada pedido traz `numero` (o `#1` do card, RN09), `status` (1-Novo, 2-Confirmado, 3-Em produção, 4-Concluído, 5-Recusado, RN03), `dataRetirada`, `observacao`, `valorTotal`, `cliente` (`nome`, `telefone` e `anonimizado`), `itens` (`produto`, `sabor`, `unidade`, `quantidade`, `precoUnitario` congelado, `subtotal`, `recheio`, `cobertura` e `observacao`), as datas de cada etapa (`criadoEm`, `confirmadoEm`, `producaoEm`, `concluidoEm` e `recusadoEm`, só as preenchidas, RN06), `motivoRecusa` e `cancelado` (`true` quando o pedido recusado já tinha sido confirmado). Cliente anonimizado (RN17) vem como "Cliente anonimizado", com o telefone nulo.

**Detalhes do pedido (ZAP-45, RF08):** `GET /api/pedidos/{numero}` (o número do card, ex.: `/api/pedidos/12`) devolve o pedido com os mesmos campos da listagem e mais as `mensagens` geradas (RN07): `id`, `tipo` (`CONFIRMACAO`, `RECUSA` ou `PRONTO`), `status` (`PENDENTE`, `ENVIADA` ou `FALHA`), `texto`, `criadoEm`, `enviadoEm` e `link`, o endereço `wa.me` com o telefone do cliente e o texto pronto. Com o cliente anonimizado, o `link` vem nulo. Número inexistente ou de outro estabelecimento recebe `404 PEDIDO_NAO_ENCONTRADO`.

**Confirmar pedido (ZAP-49, RF09):** `POST /api/pedidos/{numero}/confirmar` leva um pedido Novo para Confirmado e grava `confirmado_em` (RN03, RN06). Na mesma ação, gera a mensagem de confirmação (tipo `CONFIRMACAO`, `PENDENTE` até ser enviada, com o telefone do cliente copiado na hora, RN07 e RN20), com o texto aprovado em [docs/mensagens-whatsapp.md](docs/mensagens-whatsapp.md), e grava `PEDIDO_CONFIRMADO` no `log_auditoria`. Tudo acontece numa transação só (RN08): se qualquer parte falhar, nada fica gravado. O pedido fica bloqueado durante a ação, então dois cliques seguidos não geram duas mensagens. A resposta é o pedido completo, como nos detalhes, já com a mensagem e o `link` para o botão "Enviar no WhatsApp". Pedido que não está Novo recebe `409 TRANSICAO_NAO_PERMITIDA`; inexistente ou de outro estabelecimento, `404`. A data de retirada da mensagem ("sábado, 14/11", ou "hoje, …" no próprio dia) é contada no fuso de São Paulo.

**Mensagens ao cliente (ZAP-50, RF10, RF12):** o `GeradorDeMensagens` monta os três textos aprovados em [docs/mensagens-whatsapp.md](docs/mensagens-whatsapp.md): confirmação, recusa ou cancelamento (o mesmo texto, com o motivo exatamente como a Lídia digitou) e pronto para retirada. Ele também monta o link `https://wa.me/<telefone>?text=<texto codificado>`. Quando a Lídia clica em "Enviar no WhatsApp", a tela chama `POST /api/pedidos/{numero}/mensagens/{id}/enviada`, que marca a mensagem como `ENVIADA` e grava `enviado_em`. Chamar de novo ao reenviar não dá erro e mantém a data do primeiro envio. A resposta é o pedido completo. Mensagem inexistente, de outro pedido ou de outro estabelecimento recebe `404 MENSAGEM_NAO_ENCONTRADA`. O status `FALHA` fica reservado para o envio automático pela WhatsApp Cloud API, ainda em validação.

As tabelas são criadas pelo **Flyway**, com migrações em SQL em `backend/src/main/resources/db/migration` (ex.: `V1__cria_tabelas.sql`). Elas rodam sozinhas na subida do backend, no banco local, nos testes e no Supabase. Nunca crie nem altere tabelas pelo painel do Supabase: toda mudança no banco é uma **nova** migração (`V2__...`, `V3__...`), sem editar as que já foram aplicadas. Na subida, o Hibernate confere se as entidades batem com as tabelas (`ddl-auto: validate`) e não sobe se houver diferença.

A migração `V2__dados_iniciais.sql` cria os dados iniciais em todos os ambientes, inclusive na produção, para a demonstração e o treinamento: o estabelecimento **Casa Belt**, a usuária **Lídia** (`lidia@casabelt.com`), produtos de exemplo e 2 pedidos Novos com clientes fictícios. A senha da Lídia é a mesma em todos os ambientes e **não fica no repositório**, nem em hash: a V2 lê o hash BCrypt da variável de ambiente `LIDIA_SENHA_HASH` e para com erro se ela estiver vazia. Peça a senha e o hash para a equipe. Localmente, coloque o hash no `infra/.env` (entre aspas simples, porque ele tem cifrões) ou, rodando direto na máquina, no terminal (`$env:LIDIA_SENHA_HASH = '<hash>'` no PowerShell). No Render, ele fica nas variáveis do serviço do backend. Nos testes, a V2 recebe o hash de uma senha aleatória. A variável só é lida na primeira subida, quando a V2 roda. Para começar do zero localmente, apague o banco com `docker compose -f infra/docker-compose.yml down -v`.

### Imagem do backend para produção (Render)

Em produção, o backend roda no Render a partir do `backend/Dockerfile`, com o perfil `prod`. A imagem é ajustada para o plano gratuito (0,1 CPU e 512 MB). Para gerá-la e testá-la na máquina, com os mesmos limites e o banco local no ar:

```bash
docker build -t zappi-backend backend
docker run --rm --memory=512m --cpus=0.1 --network zappi_default -p 127.0.0.1:8081:8080 -e DB_URL=jdbc:postgresql://banco:5432/zappi -e DB_USUARIO=zappi -e DB_SENHA=zappi_local -e CORS_ORIGENS=http://localhost:5173 -e JWT_CHAVE="$(openssl rand -base64 32)" -e LIDIA_SENHA_HASH="$LIDIA_SENHA_HASH" zappi-backend
```

Variáveis de ambiente de produção, configuradas no painel do Render (nunca no repositório):

| Variável | Obrigatória | O que é |
|---|---|---|
| `DB_URL` | Sim | Conexão do **session pooler** do Supabase, no formato `jdbc:postgresql://<host-do-pooler>:5432/postgres?sslmode=require`. O host aparece no botão **Connect** do painel do Supabase |
| `DB_USUARIO` | Sim | Usuário do pooler, no formato `postgres.<id-do-projeto>` |
| `DB_SENHA` | Sim | Senha do banco do Supabase |
| `CORS_ORIGENS` | Sim | Endereço do frontend no Render (ex.: `https://<nome-do-site>.onrender.com`). Mais de um, separados por vírgula |
| `JWT_CHAVE` | Sim | Chave de assinatura do token de login, em Base64 com 32 bytes ou mais (`openssl rand -base64 32`). Trocar a chave desloga todo mundo |
| `SUPABASE_URL` | Sim | Endereço do projeto no Supabase, no formato `https://<id-do-projeto>.supabase.co` (o mesmo id do usuário `postgres.<id-do-projeto>`). Fica em **Project Settings → Data API** (Project URL) |
| `SUPABASE_CHAVE_SECRETA` | Sim | Chave secreta do projeto, em **Project Settings → API Keys → Secret keys**. Só o backend usa, para enviar e apagar fotos |
| `LIDIA_SENHA_HASH` | Na primeira subida | Hash BCrypt da senha da Lídia, lido só quando a V2 (dados iniciais) roda |
| `PORT` | Não | Porta do servidor; o Render preenche sozinho |
| `DB_POOL_MAXIMO` | Não | Máximo de conexões com o banco (padrão 5), porque o pooler gratuito do Supabase aceita poucas |

O health check do Render deve usar o caminho `/actuator/health`.

### Frontend sem Docker

Para desenvolver o frontend direto na máquina, com [Node.js](https://nodejs.org/) 24 ou mais recente:

```bash
cd frontend
npm install
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o painel em `http://localhost:5173`, recarregando a cada alteração |
| `npm run build` | Gera a versão de produção em `frontend/dist` |
| `npm run lint` | Verifica o código com o oxlint |
| `npm test` | Roda os testes uma vez com o Vitest |
| `npm run test:watch` | Roda os testes de novo a cada alteração |

O frontend usa React 19, Vite, [Mantine](https://mantine.dev) (componentes) e React Router. O tema com as cores, os tamanhos e o foco visível fica em `frontend/src/tema.js` e `frontend/src/estilos.css`; use os componentes do Mantine para manter o padrão de acessibilidade em todas as telas.

A identidade visual (paleta "Ciano com creme", fonte Lexend e logo) está nesses arquivos e em `frontend/src/assets/`. As regras completas estão no [Guia de Identidade Visual](docs/identidade-visual.md).

O login chama o backend de verdade (`POST /api/autenticacao/login`, ZAP-31), em `frontend/src/autenticacao/servicoAutenticacao.js`. Em desenvolvimento, o Vite repassa `/api` ao backend local (`http://localhost:8080`; no Docker Compose, ao contêiner do backend), então o backend precisa estar no ar, com a `LIDIA_SENHA_HASH` definida, para entrar com `lidia@casabelt.com` e a senha combinada (peça para a equipe). Depois de 5 erros seguidos, a tela mostra o aviso de bloqueio (resposta `429` do backend, ZAP-85).

A tela **Meu estabelecimento** ainda é simulada enquanto a API da ZAP-36 não existe: em desenvolvimento, os dados da Casa Belt são simulados em `frontend/src/estabelecimento/servicoEstabelecimento.js`. O nome e o logo salvos ali aparecem também no topo do painel e no login, e as alterações ficam guardadas no navegador (`localStorage`, chave `zappi.estabelecimento-simulado`) para continuarem valendo depois de recarregar a página. Para voltar aos dados originais, apague essa chave nas ferramentas do navegador (F12 → Application → Local Storage). Para testar a mensagem de link repetido, use o link `doces-da-ana`.

## Produção (Render + Supabase)

O sistema roda no plano gratuito do [Render](https://render.com), com o banco e as fotos no Supabase. Os dois serviços estão descritos no [`render.yaml`](render.yaml):

| Serviço | Endereço | O que é |
|---|---|---|
| Painel (frontend) | `https://zappi-casabelt.onrender.com` | Static Site com o build do React. É o endereço que a equipe e a Lídia usam |
| API (backend) | `https://zappi-casabelt-api.onrender.com` | Web Service com a imagem do `backend/Dockerfile` |

O endereço final de cada serviço aparece no painel do Render depois da criação. Se o Render der outro nome, atualize o `render.yaml` (a regra de `/api` e o `CORS_ORIGENS`).

**Como o deploy acontece:** a cada merge na `main`, o GitHub Actions roda os testes e o Render publica sozinho, **só se todos os checks do commit passarem** (inclusive o SonarCloud). O backend só é publicado de novo quando algo em `backend/` muda, e o frontend, quando algo em `frontend/` muda. A mudança aparece no ar alguns minutos depois do merge.

**Como o frontend chama a API:** o painel continua chamando `/api`. O Static Site repassa essas chamadas para o backend sem mudar o endereço no navegador, e o React Router funciona ao recarregar qualquer página.

**Primeiro acesso do dia:** no plano gratuito, o backend "dorme" depois de 15 minutos sem uso e leva de 1 a 2,5 minutos para acordar. O Supabase gratuito pausa o projeto depois de 1 semana sem uso. Antes de demonstrações e do treinamento, abra o sistema alguns minutos antes.

**Quem administra:** as contas do Render e do Supabase são do Henrique (no plano gratuito do Render, só uma pessoa tem acesso ao painel). Os segredos do banco (`DB_URL`, `DB_USUARIO` e `DB_SENHA`) , o hash da senha da Lídia (`LIDIA_SENHA_HASH`) a chave do token (`JWT_CHAVE`) e a chave secreta do Supabase (`SUPABASE_CHAVE_SECRETA`) ficam só no painel do Render, nunca no repositório.

## Requisitos não funcionais

- **Segurança (ABNT NBR ISO/IEC 27002:2022):** acesso só com login, senhas em hash BCrypt, política de senha forte, HTTPS, dados separados por estabelecimento e trilha de auditoria.
- **Privacidade (LGPD):** consentimento antes de gravar dados de clientes, uso só para processar pedidos e direito de exclusão por anonimização.
- **Consumidor (CDC):** informação clara sobre os produtos e identificação das mensagens geradas pelo Zappi.
- **Acessibilidade (ABNT NBR 17225:2025 / WCAG 2.2):** contraste mínimo de 4,5:1, foco visível, rótulos em todos os campos, texto alternativo nas fotos e linguagem simples.
- **Usabilidade:** interface pensada para uma usuária de 54 anos, com poucos passos, botões grandes e bom funcionamento no celular.

## Como contribuir

O backlog fica no Jira, no projeto **ZAP**. Cada funcionalidade é uma história, dividida em subtarefas de backend, frontend e testes.

### Padrão de branches, commits e pull requests

Use sempre a **chave da subtarefa do Jira**. Assim o trabalho aparece automaticamente no card certo.

| Onde | Padrão | Exemplo |
|---|---|---|
| Branch | `ZAP-<número>-descricao-curta` | `ZAP-34-tela-login` |
| Commit | `ZAP-<número> descrição` | `ZAP-34 cria tela de login com foco visível` |
| Pull request | `ZAP-<número> Título` | `ZAP-34 Tela de login` |

Fluxo de trabalho:

1. Crie uma branch a partir da `main` para cada subtarefa.
2. Faça commits pequenos, sempre com a chave da subtarefa.
3. Abra um pull request para a `main`.
4. Outra pessoa da equipe revisa e os testes do GitHub Actions precisam passar.
5. Faça o merge. A `main` é publicada automaticamente no Render, depois que os checks passarem (veja "Produção").

Não faça commits direto na `main`.

## Equipe

- Christiano Gomides Moura
- Henrique José da Silva
- Lucas G. Beltrão dos Santos
- Ryan Alexandrino da Silva

**Comunidade atendida:** Casa Belt, confeitaria artesanal da Lídia.

---

Senac SP · Projeto Integrador: Análise de Soluções de Tecnologia da Informação — Práticas Extensivas · 2026
