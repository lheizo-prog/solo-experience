# SoloForge 🗡️

> **Forje suas próprias crônicas. A IA é o mestre, você é a lenda.**

SoloForge é uma plataforma web para campanhas completas de RPG solo com um Mestre IA imersivo, persistência de contexto, bíblia narrativa, sistema de regras customizável e gerenciamento de NPCs.

---

## 🏗️ Arquitetura e Estrutura

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Java 17 + Spring Boot 3.4.4 (Spring Data JPA, RestClient, Lombok, Validation)
- **Database**: PostgreSQL 16 (via Docker Compose)
- **LLM Provider**: Gemini API (Google AI)

```text
SoloExperience/
├── docker-compose.yml       # Banco de dados PostgreSQL 16
├── backend/                 # API REST com Spring Boot 3 e integração Gemini
│   ├── mvnw / mvnw.cmd      # Maven Wrapper (Java 17)
│   └── src/
└── frontend/                # Interface Dark Fantasy em React + Tailwind
    ├── package.json
    └── src/
```

---

## 🚀 Como Executar

### 1. Iniciar o Banco de Dados (PostgreSQL)
Certifique-se de que o Docker Desktop está em execução e rode na raiz:
```bash
docker compose up -d
```

### 2. Iniciar o Backend (Spring Boot 3)
```bash
cd backend

# Opcional: Definir sua chave do Gemini (ou configure nas variáveis de ambiente):
# set GEMINI_API_KEY=sua_chave_aqui

.\mvnw.cmd spring-boot:run
```
O backend iniciará na porta `http://localhost:8080`.

### 3. Iniciar o Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Acesse a aplicação em `http://localhost:5173`.
