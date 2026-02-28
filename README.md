# 📅 Agenda Visual de Profissionais

Aplicação web moderna para gerenciar agenda de profissionais com interface visual intuitiva.

## 🚀 Tecnologias

- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Node.js + Express + tRPC
- **Database**: MySQL
- **Deployment**: Vercel

## 📋 Requisitos

- Node.js 18+
- pnpm
- MySQL 8+

## 🔧 Instalação Local

```bash
# Instalar dependências
pnpm install

# Configurar banco de dados
pnpm db:push

# Iniciar em desenvolvimento
pnpm dev
```

## 🌐 Variáveis de Ambiente

```
DATABASE_URL=mysql://user:password@host:3306/database
COOKIE_SECRET=your-secret-key
APP_ID=your-app-id
OWNER_OPEN_ID=your-owner-id
```

## 📦 Build para Produção

```bash
pnpm build
pnpm start
```

## 📝 Licença

MIT
