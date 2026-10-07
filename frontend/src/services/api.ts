import type { Campaign, Session, Message, StoryArc, WorldDecision, Npc, StoryDirective } from '../types/soloforge';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  async login(username: string, password: string): Promise<{ success: boolean; token: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Credenciais inválidas');
    }
    return res.json();
  },

  async verifyAuth(token: string): Promise<{ authenticated: boolean; user?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: { 'X-Master-Token': token }
    });
    if (!res.ok) return { authenticated: false };
    return res.json();
  },

  async getCampaigns(): Promise<Campaign[]> {

    const res = await fetch(`${API_BASE_URL}/api/campaigns`);
    if (!res.ok) throw new Error('Falha ao buscar campanhas');
    return res.json();
  },

  async deleteCampaign(campaignId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao excluir campanha');
  },

  async createCampaign(data: {
    title: string;
    synopsis?: string;
    genre?: string;
    worldLore?: string;
    toneAndStyle?: string;
    playerCharacter?: string;
    characterAttributes?: string;
    keyThemes?: string;
    systemName?: string;
    coreMechanics?: string;
    statsAndAttributes?: string;
    rollInstructions?: string;
  }): Promise<Campaign> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao criar campanha');
    return res.json();
  },

  async createCampaignWithFiles(
    data: {
      title: string;
      synopsis?: string;
      genre?: string;
      worldLore?: string;
      playerCharacter?: string;
      characterAttributes?: string;
      systemName?: string;
    },
    files: File[]
  ): Promise<Campaign> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.genre) formData.append('genre', data.genre);
    if (data.synopsis) formData.append('synopsis', data.synopsis);
    if (data.playerCharacter) formData.append('playerCharacter', data.playerCharacter);
    if (data.characterAttributes) formData.append('characterAttributes', data.characterAttributes);
    if (data.worldLore) formData.append('worldLore', data.worldLore);
    if (data.systemName) formData.append('systemName', data.systemName);

    files.forEach(f => formData.append('files', f));

    const res = await fetch(`${API_BASE_URL}/api/campaigns/with-files`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Falha ao criar campanha com arquivos de regras');
    return res.json();
  },

  async uploadRulesFiles(campaignId: string, files: File[], systemName?: string): Promise<Campaign> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (systemName) formData.append('systemName', systemName);

    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/upload-rules`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Falha ao processar e sintetizar arquivos de regras');
    return res.json();
  },

  async synthesizeRulesFromText(campaignId: string, rawText: string, systemName?: string): Promise<Campaign> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/synthesize-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, systemName })
    });
    if (!res.ok) throw new Error('Falha ao sintetizar regras de texto');
    return res.json();
  },


  async getSessions(campaignId: string): Promise<Session[]> {
    const res = await fetch(`${API_BASE_URL}/api/sessions/campaign/${campaignId}`);
    if (!res.ok) throw new Error('Falha ao buscar sessões');
    return res.json();
  },

  async getMessages(sessionId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/messages`);
    if (!res.ok) throw new Error('Falha ao buscar mensagens');
    return res.json();
  },

  async sendMessage(sessionId: string, content: string, senderName: string = 'Herói'): Promise<Message> {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, senderName })
    });
    if (!res.ok) throw new Error('Falha ao enviar mensagem');
    return res.json();
  },

  async concludeSession(sessionId: string): Promise<Session> {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/conclude`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Falha ao concluir sessão e gerar resumo');
    return res.json();
  },


  // === ARCOS NARRATIVOS (QUESTS) ===
  async getArcs(campaignId: string): Promise<StoryArc[]> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/arcs`);
    if (!res.ok) throw new Error('Falha ao buscar arcos');
    return res.json();
  },

  async createArc(campaignId: string, data: {
    title: string;
    goal?: string;
    status?: string;
    currentProgress?: string;
  }): Promise<StoryArc> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao criar arco');
    return res.json();
  },

  async updateArcProgress(campaignId: string, arcId: string, data: {
    status?: string;
    currentProgress?: string;
  }): Promise<StoryArc> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/arcs/${arcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao atualizar arco');
    return res.json();
  },

  async deleteArc(campaignId: string, arcId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/arcs/${arcId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao deletar arco');
  },

  // === DECISÕES DO MUNDO (MEMÓRIA) ===
  async getDecisions(campaignId: string): Promise<WorldDecision[]> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/decisions`);
    if (!res.ok) throw new Error('Falha ao buscar decisões');
    return res.json();
  },

  async createDecision(campaignId: string, data: {
    title: string;
    decision: string;
    consequence?: string;
  }): Promise<WorldDecision> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao registrar decisão');
    return res.json();
  },

  async deleteDecision(campaignId: string, decisionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/decisions/${decisionId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao deletar decisão');
  },

  // === NPCS (CRISTALIZAÇÃO & PERSISTÊNCIA) ===
  async getNpcs(campaignId: string): Promise<Npc[]> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/npcs`);
    if (!res.ok) throw new Error('Falha ao buscar NPCs');
    return res.json();
  },

  async createNpc(campaignId: string, data: {
    name: string;
    role?: string;
    description?: string;
    personality?: string;
    memory?: string;
    imageUrl?: string;
    attributes?: string;
    isCrystallized?: boolean;
  }): Promise<Npc> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/npcs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao criar NPC');
    return res.json();
  },

  async updateNpc(campaignId: string, npcId: string, data: {
    name?: string;
    role?: string;
    description?: string;
    personality?: string;
    memory?: string;
    imageUrl?: string;
    attributes?: string;
    isCrystallized?: boolean;
  }): Promise<Npc> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/npcs/${npcId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao atualizar NPC');
    return res.json();
  },

  async evolveNpc(campaignId: string, npcId: string, eventDescription: string): Promise<Npc> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/npcs/${npcId}/evolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventDescription })
    });
    if (!res.ok) throw new Error('Falha ao evoluir NPC com IA');
    return res.json();
  },

  async generateNpcWithAi(campaignId: string, data: {
    concept?: string;
    type?: string;
    challengeLevel?: string;
    imageUrl?: string;
  }): Promise<Npc> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/npcs/generate-with-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao forjar NPC/Boss com a IA');
    return res.json();
  },

  async toggleCrystallizeNpc(campaignId: string, npcId: string): Promise<Npc> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/npcs/${npcId}/crystallize`, {
      method: 'PATCH'
    });
    if (!res.ok) throw new Error('Falha ao alterar cristalização do NPC');
    return res.json();
  },

  async deleteNpc(campaignId: string, npcId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/npcs/${npcId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao deletar NPC');
  },

  // Story Directives & Steering
  async getDirectives(campaignId: string): Promise<StoryDirective[]> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/directives`);
    if (!res.ok) throw new Error('Falha ao buscar diretrizes de história');
    return res.json();
  },

  async createDirective(campaignId: string, data: {
    directive: string;
    type?: string;
    isActive?: boolean;
  }): Promise<StoryDirective> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/directives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao criar diretriz de história');
    return res.json();
  },

  async toggleDirective(campaignId: string, directiveId: string): Promise<StoryDirective> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/directives/${directiveId}/toggle`, {
      method: 'PATCH'
    });
    if (!res.ok) throw new Error('Falha ao alternar status da diretriz');
    return res.json();
  },

  async deleteDirective(campaignId: string, directiveId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/directives/${directiveId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao excluir diretriz de história');
  }
};



