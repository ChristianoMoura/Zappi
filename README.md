# Zappi

**Seu cardápio, direto no zap.**

Cardápio digital com integração ao WhatsApp, feito para organizar os pedidos da **Casa Belt**, confeitaria artesanal da Lídia.

Projeto Integrador do curso de Tecnologia em Análise e Desenvolvimento de Sistemas do **Senac SP**, com ação extensionista em parceria com a disciplina de Empreendedorismo, Inovação e Economia Criativa.

> 🚧 **Em desenvolvimento.** Prazo de entrega do MVP: **22/11/2026**.

---

## Sobre o projeto

A Casa Belt produz bolos e salgados sob encomenda. Hoje todos os pedidos chegam pelo WhatsApp, misturados com conversas pessoais, e são controlados à mão em um caderno. Não há confirmação formal ao cliente, e em datas comemorativas fica difícil saber quanto ainda dá para aceitar.

O Zappi resolve a demanda escolhida pela própria Lídia: **organizar e gerir os pedidos**. Ela passa a acompanhar cada encomenda em um quadro Kanban, confirma ou recusa com um clique e o sistema prepara a mensagem para o cliente no WhatsApp.

**ODS 8 — Trabalho Decente e Crescimento Econômico (meta 8.3):** apoio à organização e ao crescimento de um pequeno negócio informal.

## Escopo do MVP

O MVP cobre o **painel administrativo da Lídia**, a única usuária do sistema.

- Login com e-mail e senha
- Cadastro e edição dos dados do estabelecimento
- Cadastro, edição e exclusão lógica de produtos, com foto e texto alternativo
- Quadro Kanban de pedidos: **Novo → Confirmado → Em produção → Concluído**, com filtro para os **Recusados**
- Confirmar e recusar pedidos (recusa com motivo obrigatório)
- Mensagem ao cliente gerada pelo sistema e botão **"Enviar no WhatsApp"** (link `wa.me`)
- Registro de auditoria de logins e ações administrativas

**Fora do MVP (futuro):** cardápio público para o cliente fazer o pedido, envio automático pela WhatsApp Cloud API, pagamento online, controle de estoque, relatórios financeiros e fidelização.

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

> Por enquanto, o Docker Compose sobe o banco de dados e o frontend. O backend entrará nele quando seu projeto for criado (ZAP-68).

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

3. Confira se o serviço `banco` aparece como `healthy` e o `frontend` como `running`:

   ```bash
   docker compose -f infra/docker-compose.yml ps
   ```

4. Abra o painel em [http://localhost:5173](http://localhost:5173). Na primeira vez, o frontend leva alguns minutos para instalar as dependências; acompanhe com `docker compose -f infra/docker-compose.yml logs -f frontend`.

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

Enquanto o endpoint de login do backend (ZAP-31) não existe, o login é simulado **só no modo de desenvolvimento**, com o acesso fictício `lidia@casabelt.com` / `Bolo@2026`. A simulação fica em `frontend/src/autenticacao/servicoAutenticacao.js`, que é o único arquivo a mudar quando a ZAP-31 ficar pronta. A simulação também mostra o aviso de bloqueio depois de 5 erros seguidos com o mesmo e-mail; recarregar a página libera o login. Fora do modo de desenvolvimento, o login avisa que não está disponível.

A tela **Meu estabelecimento** segue o mesmo esquema enquanto a API da ZAP-36 não existe: em desenvolvimento, os dados da Casa Belt são simulados em `frontend/src/estabelecimento/servicoEstabelecimento.js` e ficam só na memória. Para testar a mensagem de link repetido, use o link `doces-da-ana`.

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
5. Faça o merge. A `main` é publicada automaticamente.

Não faça commits direto na `main`.

## Equipe

- Christiano Gomides Moura
- Henrique José da Silva
- Lucas G. Beltrão dos Santos
- Ryan Alexandrino da Silva

**Comunidade atendida:** Casa Belt, confeitaria artesanal da Lídia.

---

Senac SP · Projeto Integrador: Análise de Soluções de Tecnologia da Informação — Práticas Extensivas · 2026
