import type { Campaign, Session, Message } from '../types/soloforge';

export const api = {
  async getCampaigns(): Promise<Campaign[]> {
    const res = await fetch('/api/campaigns');
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
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao criar campanha');
    return res.json();
  },

  async getSessions(campaignId: string): Promise<Session[]> {
    const res = await fetch(`/api/sessions/campaign/${campaignId}`);
    if (!res.ok) throw new Error('Falha ao buscar sessões');
    return res.json();
  },

  async getMessages(sessionId: string): Promise<Message[]> {
    const res = await fetch(`/api/sessions/${sessionId}/messages`);
    if (!res.ok) throw new Error('Falha ao buscar mensagens');
    return res.json();
  },

  async sendMessage(sessionId: string, content: string, senderName: string = 'Herói'): Promise<Message> {
    const res = await fetch(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, senderName })
    });
    if (!res.ok) throw new Error('Falha ao enviar mensagem');
    return res.json();
  }
};
