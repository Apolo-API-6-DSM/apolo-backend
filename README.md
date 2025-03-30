<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">Backend API</h1>

<p align="center">
  API desenvolvida com NestJS, MongoDB e PostgreSQL utilizando Docker para containerização
</p>

## Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (v16 ou superior)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

## Configuração do Ambiente

1. **Clone o repositório**
   ```bash
   git clone [https://github.com/Apolo-API-6-DSM/apolo-backend]
   cd [apolo-backend]

2. **Crie o arquivo .env na raiz do projeto**
    ```bash
    DATABASE_URL="postgresql://usuario:senha@localhost:5432/api-6sem"
    MONGO_URI=
    PORT=3000

  OBS: Se você for executar o docker compose, se você não alterar nada, essa vai ser sua url do banco de dados no postgresql

3. **Banco de dados**
    ```bash
    Crie uma conta no mongoDB online ou adicione no seu banco de dados do mongoDB local

    O banco no PostgreSQL já vai ser criado, no momento que você rodar o docker

3. **Suba o container do PostgreSQL**
    ```bash
    docker compose up -d

    Verifique se o container iniciou corretamente:
    docker ps

4. **Instale as dependências**
    ```bash
    npm install

5. **Instale as dependências**
    ```bash
    npx prisma migrate dev
    npx prisma generate

6. **Instale as dependências**
    ```bash
    npm run start:dev ou npm run start

## Estrutura do projeto
```text
apolo-backend/
├── dist/                  # Código compilado (TypeScript → JavaScript)
├── node_modules/          # Dependências do Node.js
├── prisma/                # Configuração do Prisma ORM
│   └── schema.prisma      # Schema do banco de dados
├── src/                   # Código fonte principal
│   ├── app.module.ts      # Módulo raiz
│   ├── main.ts            # Ponto de entrada
│   └── ...                # Outros módulos
├── test/                  # Testes automatizados
├── uploads/               # Arquivos enviados (se aplicável)
├── .env                   # Variáveis de ambiente
├── .gitignore             # Arquivos ignorados pelo Git
├── .prettierrc            # Configuração do Prettier
├── docker-compose.yml     # Configuração do Docker
├── eslint.config.mjs      # Configuração do ESLint
├── nest-cli.json          # Configuração do Nest CLI
├── package.json           # Dependências e scripts
├── tsconfig.json          # Configuração do TypeScript
└── tsconfig.build.json    # Configuração de build do TypeScript