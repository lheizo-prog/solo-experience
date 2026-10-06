export interface CampaignBible {
  id: string;
  worldLore?: string;
  toneAndStyle?: string;
  playerCharacter?: string;
  keyThemes?: string;
}

export interface CampaignSystem {
  id: string;
  name: string;
  coreMechanics?: string;
  statsAndAttributes?: string;
  rollInstructions?: string;
}

export interface Campaign {
  id: string;
  title: string;
  synopsis?: string;
  genre?: string;
  bible?: CampaignBible;
  system?: CampaignSystem;
  createdAt: string;
}

export interface Session {
  id: string;
  campaignId: string;
  sessionNumber: number;
  title?: string;
  summary?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  sender: 'PLAYER' | 'GM' | 'NPC' | 'SYSTEM';
  senderName?: string;
  content: string;
  createdAt: string;
}
