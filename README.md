# Zappi - TESTE

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

> A estrutura será criada na primeira entrega de código.

## Como rodar localmente

> Instruções serão adicionadas assim que a estrutura inicial e o Docker Compose estiverem prontos.

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
