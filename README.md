# Sistema de Pedidos — Gráfica UFSM

Sistema web para gerenciamento de pedidos de impressão da Gráfica Universitária da UFSM (Imprensa Universitária).

## Funcionalidades

- Autenticação via portal legado UFSM (LDAP)
- Wizard de novo pedido com cálculo de preço em tempo real
- Upload de arquivos de arte por item (PDF, PNG, JPG, AI, CDR)
- Painel do operador com máquina de estados de pedidos
- Notificações internas + e-mail por evento de status
- Catálogo de serviços com CRUD e suspensão temporária

## Stack

- **Backend:** Node.js 20 + Express 4 + EJS (server-side rendering)
- **Banco de dados:** PostgreSQL 15
- **Design System:** GOV.BR DS v3.7.0
- **Infraestrutura:** Docker + Docker Compose

## Como rodar

### Pré-requisitos

- Docker e Docker Compose instalados

### Passos

1. Clone o repositório e entre na pasta:
   ```bash
   git clone https://github.com/giana-lucca/grafica.git
   cd grafica
   ```

2. Copie e configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   # Edite .env com suas configurações
   ```

3. Suba os containers:
   ```bash
   docker compose up --build
   ```

4. Acesse em [http://localhost:3000](http://localhost:3000)

### Variáveis de ambiente

| Variável | Descrição | Obrigatório em produção |
|---|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL | Sim |
| `PORTAL_URL` | URL do portal legado UFSM | Sim |
| `SESSION_SECRET` | Segredo para sessões | Sim |
| `EMAIL_HOST` | Servidor SMTP | Sim |
| `EMAIL_PORT` | Porta SMTP | Sim |
| `EMAIL_USER` | Usuário SMTP | Sim |
| `EMAIL_PASS` | Senha SMTP | Sim |
| `EMAIL_FROM` | Remetente dos e-mails | Sim |
| `BASE_URL` | URL pública da aplicação | Não (padrão: `http://localhost:3000`) |
| `UPLOAD_DIR` | Diretório de uploads | Não (padrão: `/app/uploads`) |

## Testes

```bash
cd app
npm test
```

- Testes de serviço (auth, preço): rodam sem banco de dados
- Testes de integração (models): requerem banco disponível via Docker

## Fluxo de status dos pedidos

```
rascunho ──► aguardando_analise ──► em_producao ──► pronto ──► retirado
                   ▲   │                 │
                   │   ▼                 ▼
                   └ pendencia ◄─────────┘
                        │
                        ▼
                    cancelado
```

Transições da gráfica (operador/admin), definidas em `TRANSICOES` (`app/src/routes/admin.js`):

- `aguardando_analise` → `em_producao` · `pendencia` · `cancelado`
- `pendencia` → `em_producao` · `cancelado`
- `em_producao` → `pronto` · `pendencia`
- `pronto` → `retirado`

Além dessas, o **cliente** move `pendencia` → `aguardando_analise` ao responder a
pendência (`app/src/routes/pedidos.js`).

## Perfis de usuário

| Perfil | Acesso |
|---|---|
| `cliente` | Criar pedidos, acompanhar status, responder pendências |
| `operador` | Gerenciar pedidos, atualizar status |
| `admin` | Operador + gerenciar catálogo de serviços |
