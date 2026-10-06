import type { Campaign, Session, Message, StoryArc, WorldDecision, Npc } from '../types/soloforge';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  async getCampaigns(): Promise<Campaign[]> {
    const res = await fetch(`${API_BASE_URL}/api/campaigns`);
    if (!res.ok) throw new Error('Falha ao buscar campanhas');
    return res.json();
  },

  async createCampaign(data: {
    title: string;
    synopsis?: string;
    genre?: string;
    worldLore?: string;
    toneAndStyle?: string;
    playerCharacter?: string;
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
  }
};



