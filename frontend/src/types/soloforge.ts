export interface CampaignBible {
  id: string;
  worldLore?: string;
  toneAndStyle?: string;
  playerCharacter?: string;
  characterAttributes?: string;
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

export interface StoryArc {
  id: string;
  campaignId: string;
  title: string;
  goal?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  currentProgress?: string;
  createdAt: string;
}

export interface WorldDecision {
  id: string;
  campaignId: string;
  title: string;
  decision: string;
  consequence?: string;
  createdAt: string;
}

export type NpcTier = 'COMMON' | 'MINI_BOSS' | 'BOSS';

export interface Npc {
  id: string;
  campaignId: string;
  name: string;
  role?: string;
  tier?: NpcTier;
  description?: string;
  personality?: string;
  memory?: string;
  imageUrl?: string;
  attributes?: string;
  skills?: string;
  combatStrategy?: string;
  isCrystallized: boolean;
  createdAt: string;
}

export interface StoryDirective {
  id: string;
  campaignId: string;
  directive: string;
  type: 'PLOT_TWIST' | 'NARRATIVE_DIRECTION' | 'ESTABLISHED_FACT' | 'TONE_SUGGESTION';
  isActive: boolean;
  createdAt: string;
}

export interface AttributeProgressionSuggestion {
  attributeName: string;
  suggestedIncrease: number;
  reasoning: string;
}

export interface ProgressionEvaluationResponse {
  systemName: string;
  systemScaleExplanation: string;
  situationImpact: string;
  awardedPoints: number;
  suggestedAllocations: AttributeProgressionSuggestion[];
  narrativeReasoning: string;
  narrativeNote: string;
}
