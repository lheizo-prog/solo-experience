# 🗡️ Plano de Entrega do MVP — SoloForge

> **Objetivo do MVP**: Permitir que um jogador crie uma crônica, converse com o Mestre IA (Gemini), veja as consequências serem registradas na memória do mundo, gerencie NPCs descobertos e role dados sem sair do chat.

---

## 📊 Status Atual (Atualizado)

| Camada / Feature | Status | Detalhes |
|---|:---:|---|
| **Infra & Deploy** | ✅ **Concluído** | Backend no Render (Docker), DB no Neon DB (PostgreSQL 16) e Frontend na Vercel. |
| **Schema & Entidades** | ✅ **Concluído** | Campaign, Bible, System, Session, Message, NPC, WorldDecision, StoryArc. |
| **CRUD de Campanha** | ✅ **Concluído** | Criação de campanha, inicialização da Bíblia e do Sistema de Regras. |
| **Chat Básico & Gemini** | ✅ **Concluído** | Envio de mensagens com injeção de contexto mestre e histórico de mensagens. |
| **Árbitro de Regras & Rolagem de Dados** | ✅ **Concluído** | Validação de ações contra o sistema, DT prévia, tag `[PEDIR_TESTE]`, banner de rolagem e dados rápidos (d4 a d100). |
| **Arcos Narrativos & Memória do Mundo (Etapa 2)** | ✅ **Concluído** | Endpoints de Arcos e Decisões, abas no painel lateral direito, modal de criação rápida, toggle de conclusão e injeção no prompt do Mestre. |

---

## 🎯 As 2 Etapas Restantes para Fechar o MVP

```mermaid
graph TD
    A[Etapa 3: Cristalização de NPCs] --> B[Etapa 4: Resumos de Sessão & Próximo Ato]
```

---

### 👥 Etapa 3 — Sistema de Cristalização de NPCs
> *O grande diferencial: transformar personagens passageiros gerados pelo Gemini em figuras persistentes da crônica.*

- **O que falta**:
  1. **API de NPCs no Backend**:
     - `GET /api/campaigns/{id}/npcs` (Listar NPCs da crônica).
     - `POST /api/campaigns/{id}/npcs` (Criar ou salvar NPC com personalidade e memória).
     - `PATCH /api/npcs/{id}/crystallize` (Alternar entre passageiro e cristalizado).
  2. **Interface de NPCs (Frontend)**:
     - Adicionar a aba **[NPCs]** no painel direito ao lado de Arcos, Mundo e Bíblia.
     - Botão de ação rápida ou modal para salvar um NPC citado na narrativa.
  3. **Efeito no Jogo**:
     - NPCs com `isCrystallized = true` já são injetados automaticamente na memória contínua do Mestre IA pelo `ContextBuilderService`.

---

### 📜 Etapa 4 — Resumos Automáticos de Sessão & Avanço de Ato
> *Permite campanhas longas divididas em episódios (Ato I, Ato II, etc.) de forma leve e organizada.*

- **O que falta**:
  1. **Endpoint de Fechamento**:
     - `POST /api/sessions/{id}/conclude`: Dispara um prompt ao Gemini solicitando um resumo conciso dos fatos da sessão e salva no `Session.summary`.
  2. **Criação do Próximo Ato**:
     - Botão *"Encerrar Sessão & Iniciar Próximo Ato"*.
     - O chat inicia limpo, carregando o resumo das sessões anteriores no contexto da nova sessão em vez de reenviar todo o histórico antigo.
