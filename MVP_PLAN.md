# 🗡️ SoloForge — MVP Concluído com Sucesso!

> **Forje suas próprias crônicas. A IA é o mestre, você é a lenda.**

O **SoloForge** atingiu 100% dos requisitos do seu MVP funcional e completo, unindo narrativa imersiva, inteligência artificial (Gemini), persistência em nuvem e mecânicas fiéis de RPG de mesa.

---

## 🏆 Tabela de Recursos Entregues

| Módulo / Fase | Recurso | Status | Descrição |
|---|---|:---:|---|
| **Infraestrutura** | Deploy em Nuvem Completo | ✅ | **Render** (Backend Docker Spring Boot), **Neon DB** (PostgreSQL 16) e **Vercel** (Frontend React + Tailwind). |
| **Fase 1 — Fundação** | CRUD de Campanhas & Regras | ✅ | Criação de crônica, Bíblia (lore, tom, PJ) e Sistema de Regras parametrizado. |
| **Fase 1 — Fundação** | Chat Interativo com IA | ✅ | Condução de narrativas com Gemini 1.5 Flash e injeção contextual contínua. |
| **Fase 1 — Fundação** | Árbitro de Regras & Dados | ✅ | Validação rígida de limites, declaração prévia de DT pelo Mestre, banner interativo e rolagem de dados (d4 a d100). |
| **Fase 2 — Memória** | Arcos Narrativos (Quests) | ✅ | Criação, acompanhamento e conclusão de missões ativas com injeção no prompt do Mestre. |
| **Fase 2 — Memória** | Memória do Mundo | ✅ | Registro permanente de escolhas do jogador e impactos no mundo que o Mestre recorda. |
| **Fase 3 — NPCs** | Cristalização de NPCs | ✅ | Personagens passageiros podem ser fixados/cristalizados com personalidade e memórias. |
| **Fase 4 — Polimento** | Resumos Automáticos de Sessão | ✅ | O Cronista IA resume os fatos do ato em tópicos e avança para o próximo ato sem estourar tokens. |

---

## 🏗️ Arquitetura do Sistema

```text
               ┌───────────────────────────────┐
               │    Frontend (React + Vite)    │
               │   Deploy: Vercel              │
               └──────────────┬────────────────┘
                              │ REST / HTTPS
                              ▼
               ┌───────────────────────────────┐
               │  Backend (Spring Boot 3 + 17) │
               │   Deploy: Render (Docker)     │
               └──────┬─────────────────┬──────┘
                      │                 │
         JPA / JDBC   │                 │ HTTP API
                      ▼                 ▼
        ┌──────────────────┐    ┌─────────────────┐
        │  PostgreSQL 16   │    │   Gemini API    │
        │  Neon DB (Cloud) │    │  (Google Cloud) │
        └──────────────────┘    └─────────────────┘
```
