import React, { useState, useEffect, useRef } from 'react';
import { 
  Sword, 
  BookOpen, 
  Scroll, 
  Send, 
  Sparkles, 
  PlusCircle, 
  ChevronRight, 
  ShieldAlert, 
  Flame, 
  User, 
  Bot,
  Dices,
  AlertTriangle,
  RotateCcw,
  Target,
  Landmark,
  Plus,
  CheckCircle2,
  Trash2,
  Users,
  Sparkle,
  History,
  Brain,
  Menu,
  X,
  LogOut,
  SlidersHorizontal,
  Edit,
  Zap,
  Compass,
  Eye,
  EyeOff,
  Eraser,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  Copy,
  Check,
  Lightbulb,
  MoreVertical,
  TrendingUp
} from 'lucide-react';

import { LoginScreen } from './components/LoginScreen';
import { AttributeTableView, NpcSkillsView, NpcStrategyView, NpcTierBadge } from './components/AttributeTableView';
import { MiniCharacterBanner } from './components/MiniCharacterBanner';
import { ThemeSwitcher, getSavedTheme, applyTheme } from './components/ThemeSwitcher';
import { EpisodeSummaryModal } from './components/EpisodeSummaryModal';
import { CreateCampaignModal } from './components/modals/CreateCampaignModal';
import { RulesSynthesizerModal } from './components/modals/RulesSynthesizerModal';
import { CharacterProgressionModal } from './components/modals/CharacterProgressionModal';
import { NpcFormModal } from './components/modals/NpcFormModal';
import { AiNpcGeneratorModal } from './components/modals/AiNpcGeneratorModal';
import { NpcEvolutionModal } from './components/modals/NpcEvolutionModal';
import { RollConfirmModal } from './components/modals/RollConfirmModal';
import { api } from './services/api';

import type { Campaign, Session, Message, StoryArc, WorldDecision, Npc, StoryDirective } from './types/soloforge';

interface PendingCheck {
  dice: string;      // ex: "d20"
  dc: number;        // ex: 14
  attribute: string; // ex: "Destreza"
  reason: string;    // ex: "Desviar da armadilha de espinhos"
}

type RightPanelTab = 'character' | 'npcs' | 'arcs' | 'decisions' | 'bible';


export function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConcludingSession, setIsConcludingSession] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isVisualChatCleared, setIsVisualChatCleared] = useState(false);
  const [isCreatingModal, setIsCreatingModal] = useState(false);


  // Autenticação restrita ao Mestre
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('soloforge_token'));
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem('soloforge_user') || 'Mestre da Forja';
  });

  // Gavetas e Visibilidade Responsiva (Mobile e Desktop)
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);

  // Rolador & Teste Ativo solicitado pelo Mestre
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null);
  const [rollMode, setRollMode] = useState<'NORMAL' | 'ADVANTAGE' | 'DISADVANTAGE'>('NORMAL');
  const [testBonus, setTestBonus] = useState<number>(0);

  // Rolador Livre: Quantidade de Dados e Bônus
  const [freeDiceCount, setFreeDiceCount] = useState<number>(1);
  const [freeDiceBonus, setFreeDiceBonus] = useState<number>(0);

  // Modal de Confirmação e Mensagem de Intenção da Rolagem
  interface RollConfirmData {
    sides: number;
    checkTarget?: PendingCheck;
    count?: number;
    mode?: 'NORMAL' | 'ADVANTAGE' | 'DISADVANTAGE';
    bonus?: number;
  }
  const [rollConfirmData, setRollConfirmData] = useState<RollConfirmData | null>(null);
  const [rollActionMessage, setRollActionMessage] = useState('');

  // Painel Central: Abas de Aventura vs Direcionamento de História
  const [mainTab, setMainTab] = useState<'chat' | 'directives'>('chat');
  const [directives, setDirectives] = useState<StoryDirective[]>([]);
  const [newDirectiveText, setNewDirectiveText] = useState('');
  const [newDirectiveType, setNewDirectiveType] = useState<StoryDirective['type']>('NARRATIVE_DIRECTION');
  const [isSubmittingDirective, setIsSubmittingDirective] = useState(false);

  // Painel Direito: Abas
  const [activeTab, setActiveTab] = useState<RightPanelTab>('character');
  const [isPjMiniBannerOpen, setIsPjMiniBannerOpen] = useState(true);
  const [isFullCharacterBioExpanded, setIsFullCharacterBioExpanded] = useState(false);
  const [arcs, setArcs] = useState<StoryArc[]>([]);
  const [decisions, setDecisions] = useState<WorldDecision[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);

  // Estados de Expansão/Acordeão (com persistência no localStorage)
  const [expandedNpcIds, setExpandedNpcIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('soloforge_expanded_npcs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedBibleSections, setExpandedBibleSections] = useState<{ system: boolean; character: boolean; lore: boolean }>(() => {
    try {
      const saved = localStorage.getItem('soloforge_bible_sections');
      return saved ? JSON.parse(saved) : { system: true, character: true, lore: true };
    } catch {
      return { system: true, character: true, lore: true };
    }
  });

  // Busca e Filtros de NPCs
  const [npcSearchTerm, setNpcSearchTerm] = useState('');
  const [npcFilterMode, setNpcFilterMode] = useState<'ALL' | 'CRYSTALLIZED'>('ALL');

  // Feedback de Cópia (ID do item copiado)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Menu de Ações Rápidas no Mobile (Dropdown compacto no Header)
  const [isMobileActionMenuOpen, setIsMobileActionMenuOpen] = useState(false);

  // Dicas de Ação sob Demanda (ID da mensagem com dicas expandidas)
  const [expandedActionHints, setExpandedActionHints] = useState<Record<string, boolean>>({});

  const toggleActionHints = (msgId: string) => {
    setExpandedActionHints(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const parseActionHints = (content: string): string[] => {
    if (!content) return [];
    const match = content.match(/\[DICAS_DE_ACAO:\s*([^\]]+)\]/i);
    if (!match) return [];
    return match[1].split('|').map(s => s.trim()).filter(Boolean);
  };

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleNpcExpanded = (id: string) => {
    setExpandedNpcIds(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem('soloforge_expanded_npcs', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleBibleSection = (section: 'system' | 'character' | 'lore') => {
    setExpandedBibleSections(prev => {
      const updated = { ...prev, [section]: !prev[section] };
      localStorage.setItem('soloforge_bible_sections', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleAllNpcs = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    npcs.forEach(n => {
      updated[n.id] = expand;
    });
    setExpandedNpcIds(updated);
    localStorage.setItem('soloforge_expanded_npcs', JSON.stringify(updated));
  };

  const toggleAllBibleSections = (expand: boolean) => {
    const updated = { system: expand, character: expand, lore: expand };
    setExpandedBibleSections(updated);
    localStorage.setItem('soloforge_bible_sections', JSON.stringify(updated));
  };

  // Modais de Criação Rápida de Arco, Decisão e NPC
  const [isNewArcModal, setIsNewArcModal] = useState(false);
  const [newArcTitle, setNewArcTitle] = useState('');
  const [newArcGoal, setNewArcGoal] = useState('');

  const [isNewDecisionModal, setIsNewDecisionModal] = useState(false);
  const [newDecisionTitle, setNewDecisionTitle] = useState('');
  const [newDecisionAction, setNewDecisionAction] = useState('');
  const [newDecisionConsequence, setNewDecisionConsequence] = useState('');

  const [isNewNpcModal, setIsNewNpcModal] = useState(false);
  const [editingNpc, setEditingNpc] = useState<Npc | null>(null);
  const [evolvingNpc, setEvolvingNpc] = useState<Npc | null>(null);
  const [isEvolvingCharacter, setIsEvolvingCharacter] = useState(false);
  const [summaryModalSession, setSummaryModalSession] = useState<Session | null>(null);
  const [pendingNextSession, setPendingNextSession] = useState<Session | null>(null);
  const [isAiNpcModal, setIsAiNpcModal] = useState(false);
  const [isRulesModal, setIsRulesModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    localStorage.removeItem('soloforge_token');
    localStorage.removeItem('soloforge_user');
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = (user: string) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadCampaigns();
    }
  }, [isAuthenticated]);

  const loadCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaign) {
        handleSelectCampaign(data[0]);
      }
    } catch {
      console.log('Sem conexão com o backend ou lista vazia');
    }
  };

  const handleDeleteCampaign = async (campaignId: string, campaignTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja apagar a crônica "${campaignTitle}" e todo o seu histórico permanentemente?`)) {
      return;
    }

    try {
      await api.deleteCampaign(campaignId);
      const remaining = campaigns.filter(c => c.id !== campaignId);
      setCampaigns(remaining);

      if (selectedCampaign?.id === campaignId) {
        if (remaining.length > 0) {
          handleSelectCampaign(remaining[0]);
        } else {
          setSelectedCampaign(null);
          setCurrentSession(null);
          setSessions([]);
          setMessages([]);
          setArcs([]);
          setDecisions([]);
          setNpcs([]);
          setDirectives([]);
        }
      }
    } catch (err: unknown) {
      alert('Erro ao excluir campanha: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    }
  };



  const handleSelectCampaign = async (camp: Campaign) => {
    setSelectedCampaign(camp);
    setPendingCheck(null);
    setIsMobileLeftOpen(false);
    try {
      // Carrega sessões
      const sessList = await api.getSessions(camp.id);
      setSessions(sessList);
      if (sessList.length > 0) {
        setCurrentSession(sessList[0]);
        loadMessages(sessList[0].id);
      } else {
        setCurrentSession(null);
        setMessages([]);
      }

      // Carrega arcos, decisões, NPCs e diretrizes da campanha
      loadSideData(camp.id);
    } catch (e) {
      console.error(e);
    }
  };


  const loadSideData = async (campaignId: string) => {
    try {
      const [arcsData, decisionsData, npcsData, directivesData] = await Promise.all([
        api.getArcs(campaignId),
        api.getDecisions(campaignId),
        api.getNpcs(campaignId),
        api.getDirectives(campaignId).catch(() => [])
      ]);
      setArcs(arcsData);
      setDecisions(decisionsData);
      setNpcs(npcsData);
      setDirectives(directivesData);
    } catch {
      console.log('Modo offline / sem dados de arcos');
    }
  };


  const findAttributeBonus = (attributeName: string, attributesStr?: string): number => {
    if (!attributesStr || !attributeName) return 0;
    const cleanAttr = attributeName.trim().toLowerCase();
    const lines = attributesStr.split('\n');
    for (const line of lines) {
      const parts = line.split(/[:|=]/);
      if (parts.length >= 2) {
        const namePart = parts[0].trim().toLowerCase();
        if (namePart.includes(cleanAttr) || cleanAttr.includes(namePart)) {
          const numMatch = parts[1].match(/([+-]?\d+)/);
          if (numMatch) {
            const parsed = parseInt(numMatch[1], 10);
            return isNaN(parsed) ? 0 : parsed;
          }
        }
      }
    }
    return 0;
  };

  const applyPendingCheck = (check: PendingCheck | null) => {
    setPendingCheck(check);
    if (check) {
      const detectedBonus = findAttributeBonus(check.attribute, selectedCampaign?.bible?.characterAttributes);
      setTestBonus(detectedBonus);
      setRollMode('NORMAL');
    }
  };

  const parseDiceFormula = (diceStr: string): { count: number; sides: number } => {
    const match = diceStr.toLowerCase().match(/^(\d*)d(\d+)$/);
    if (match) {
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const sides = parseInt(match[2], 10);
      return { count: isNaN(count) || count <= 0 ? 1 : count, sides: isNaN(sides) ? 20 : sides };
    }
    const fallbackSides = parseInt(diceStr.replace(/\D/g, '') || '20', 10);
    return { count: 1, sides: fallbackSides };
  };

  const isDamageRoll = (check: PendingCheck | null | undefined): boolean => {
    if (!check) return false;
    return check.dc === 0 || 
           check.attribute.toLowerCase().includes('dano') || 
           check.attribute.toLowerCase().includes('damage') ||
           check.reason.toLowerCase().includes('dano');
  };

  const parseRollRequest = (text: string): PendingCheck | null => {
    // Suporta [PEDIR_TESTE: d20 | DT: 14 | Atletismo | Escalar] e rolagens de dano como [PEDIR_TESTE: 1d8 | DT: 0 | Dano (Espada) | Golpe]
    const match = text.match(/\[PEDIR_TESTE:\s*(\d*[dD]\d+)\s*\|\s*DT:\s*(\d+|-|0|N\/?A)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/i);
    if (match) {
      const rawDice = match[1].toLowerCase();
      const rawDc = match[2];
      const parsedDc = parseInt(rawDc, 10);
      return {
        dice: rawDice,
        dc: isNaN(parsedDc) ? 0 : parsedDc,
        attribute: match[3].trim(),
        reason: match[4].trim()
      };
    }
    return null;
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const msgs = await api.getMessages(sessionId);
      setMessages(msgs);
      
      const lastGMMsg = [...msgs].reverse().find(m => m.sender === 'GM');
      if (lastGMMsg) {
        const check = parseRollRequest(lastGMMsg.content);
        applyPendingCheck(check);
      }
      
      scrollToBottom();
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (customText?: string, isDiceRoll: boolean = false) => {
    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim() || !currentSession || isLoading) return;

    if (customText === undefined) {
      setInputText('');
    }

    const playerName = selectedCampaign?.bible?.playerCharacter?.split('\n')[0] || 'Aventureiro';
    const optimisticMsg: Message = {
      id: 'temp-' + Date.now(),
      sessionId: currentSession.id,
      sender: isDiceRoll ? 'SYSTEM' : 'PLAYER',
      senderName: isDiceRoll ? 'Mesa de Dados' : playerName,
      content: textToSend,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setIsLoading(true);
    setPendingCheck(null);
    scrollToBottom();

    try {
      const gmReply = await api.sendMessage(
        currentSession.id, 
        textToSend, 
        isDiceRoll ? 'Sistema / Rolagem' : playerName
      );
      setMessages(prev => [...prev, gmReply]);

      const check = parseRollRequest(gmReply.content);
      if (check) {
        applyPendingCheck(check);
      }
      scrollToBottom();
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      // Reverte mensagem temporária não confirmada no backend
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      if (customText === undefined) {
        setInputText(textToSend); // Devolve o texto digitado ao input para não perder o que foi escrito
      }

      const errorMsg: Message = {
        id: 'err-' + Date.now(),
        sessionId: currentSession.id,
        sender: 'SYSTEM',
        senderName: 'SoloForge - Conexão',
        content: `⚠️ [Falha de Comunicação]: Não foi possível enviar a mensagem para o servidor. Verifique a conexão com o backend e tente novamente.`,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
      scrollToBottom();
    } finally {
      setIsLoading(false);
      setIsVisualChatCleared(false);
    }
  };

  const handleRegenerateLastMessage = async () => {
    if (!currentSession || isRegenerating || isLoading) return;

    setIsRegenerating(true);
    setPendingCheck(null);

    try {
      const updatedGmMsg = await api.regenerateLastMessage(currentSession.id);
      setMessages(prev => {
        const copy = [...prev];
        const lastGmIdx = copy.map(m => m.sender).lastIndexOf('GM');
        if (lastGmIdx !== -1) {
          copy[lastGmIdx] = updatedGmMsg;
        } else {
          copy.push(updatedGmMsg);
        }
        return copy;
      });

      const check = parseRollRequest(updatedGmMsg.content);
      if (check) applyPendingCheck(check);
      scrollToBottom();
    } catch (err: unknown) {
      alert('Erro ao regenerar resposta do Mestre: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleClearVisualChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('Deseja limpar a visualização da tela? (Suas memórias da campanha, decisões e atos gravados no banco continuarão 100% seguros).')) {
      setMessages([]);
      setIsVisualChatCleared(true);
      setPendingCheck(null);
    }
  };

  const handleRestoreVisualChat = () => {
    if (currentSession) {
      loadMessages(currentSession.id);
      setIsVisualChatCleared(false);
    }
  };

  const openRollConfirmModal = (
    sides: number,
    checkTarget?: PendingCheck,
    count?: number,
    mode?: 'NORMAL' | 'ADVANTAGE' | 'DISADVANTAGE',
    bonus?: number
  ) => {
    // Se o jogador já tiver digitado algo no input do chat, aproveita como intenção inicial
    const initialText = inputText.trim();
    setRollActionMessage(initialText || (!checkTarget ? 'Rolagem livre de dados' : ''));
    setRollConfirmData({
      sides,
      checkTarget,
      count: count !== undefined ? count : freeDiceCount,
      mode: mode || rollMode,
      bonus: bonus !== undefined ? bonus : (checkTarget ? testBonus : freeDiceBonus)
    });
  };

  const executeRollConfirmed = (actionDescription: string) => {
    if (!rollConfirmData) return;
    const { sides, checkTarget, count, mode, bonus } = rollConfirmData;
    const finalDesc = actionDescription.trim() || (!checkTarget ? 'Rolagem livre de dados' : '');
    rollDice(sides, checkTarget, count, mode, bonus, finalDesc);
    setRollConfirmData(null);
    setRollActionMessage('');
    // Se o texto confirmado era o que estava no input do chat, limpa o input
    if (inputText.trim() === actionDescription.trim()) {
      setInputText('');
    }
  };

  const rollDice = (
    sides: number, 
    checkTarget?: PendingCheck,
    overrideCount?: number,
    overrideMode?: 'NORMAL' | 'ADVANTAGE' | 'DISADVANTAGE',
    overrideBonus?: number,
    actionDescription?: string
  ) => {
    const actionPrefix = actionDescription && actionDescription.trim().length > 0 
      ? `Ação do Personagem: "${actionDescription.trim()}"\n\n` 
      : '';

    if (checkTarget) {
      const isDamage = isDamageRoll(checkTarget);
      const bonus = overrideBonus !== undefined ? overrideBonus : testBonus;

      if (isDamage) {
        const { count: formulaCount, sides: formulaSides } = parseDiceFormula(checkTarget.dice);
        const count = overrideCount !== undefined ? overrideCount : formulaCount;
        const actualSides = sides || formulaSides;
        const rolls: number[] = [];
        for (let i = 0; i < count; i++) {
          rolls.push(Math.floor(Math.random() * actualSides) + 1);
        }
        const sum = rolls.reduce((acc, v) => acc + v, 0);
        const total = Math.max(0, sum + bonus);
        const formula = `${count}d${actualSides}`;
        const rollsStr = rolls.join(', ');
        const bonusStr = bonus !== 0 ? ` ${bonus > 0 ? '+' : '-'} ${Math.abs(bonus)} (Modificador)` : '';

        const msg = `${actionPrefix}💥 [ROLAGEM DE DANO: ${checkTarget.attribute}]: O jogador rolou ${formula} [ ${rollsStr} ]${bonusStr} = Total ${total} de Dano contra o alvo para "${checkTarget.reason}".`;
        handleSendMessage(msg, true);
      } else {
        const mode = overrideMode || rollMode;
        const bonusStr = bonus !== 0 ? ` ${bonus > 0 ? '+' : '-'} ${Math.abs(bonus)} (Bônus de ${checkTarget.attribute})` : '';

        if (mode === 'ADVANTAGE') {
          const r1 = Math.floor(Math.random() * sides) + 1;
          const r2 = Math.floor(Math.random() * sides) + 1;
          const highest = Math.max(r1, r2);
          const total = highest + bonus;
          const isSuccess = total >= checkTarget.dc;
          const isCrit = sides === 20 && highest === 20;
          const isFumble = sides === 20 && highest === 1;

          let outcome = isSuccess ? 'SUCESSO' : 'FALHA';
          if (isCrit) outcome = 'SUCESSO CRÍTICO (20 NATURAL)!';
          if (isFumble) outcome = 'FALHA CRÍTICA (1 NATURAL)!';

          const msg = `${actionPrefix}🎲 [TESTE COM VANTAGEM: ${checkTarget.attribute}]: O jogador rolou 2d${sides} [ ${r1}, ${r2} ] -> Maior: ${highest}${bonusStr} = Total ${total} vs DT ${checkTarget.dc} (${outcome}) para "${checkTarget.reason}".`;
          handleSendMessage(msg, true);
        } else if (mode === 'DISADVANTAGE') {
          const r1 = Math.floor(Math.random() * sides) + 1;
          const r2 = Math.floor(Math.random() * sides) + 1;
          const lowest = Math.min(r1, r2);
          const total = lowest + bonus;
          const isSuccess = total >= checkTarget.dc;
          const isCrit = sides === 20 && lowest === 20;
          const isFumble = sides === 20 && lowest === 1;

          let outcome = isSuccess ? 'SUCESSO' : 'FALHA';
          if (isCrit) outcome = 'SUCESSO CRÍTICO (20 NATURAL)!';
          if (isFumble) outcome = 'FALHA CRÍTICA (1 NATURAL)!';

          const msg = `${actionPrefix}🎲 [TESTE COM DESVANTAGEM: ${checkTarget.attribute}]: O jogador rolou 2d${sides} [ ${r1}, ${r2} ] -> Menor: ${lowest}${bonusStr} = Total ${total} vs DT ${checkTarget.dc} (${outcome}) para "${checkTarget.reason}".`;
          handleSendMessage(msg, true);
        } else {
          const roll = Math.floor(Math.random() * sides) + 1;
          const total = roll + bonus;
          const isSuccess = total >= checkTarget.dc;
          const isCrit = sides === 20 && roll === 20;
          const isFumble = sides === 20 && roll === 1;

          let outcome = isSuccess ? 'SUCESSO' : 'FALHA';
          if (isCrit) outcome = 'SUCESSO CRÍTICO (20 NATURAL)!';
          if (isFumble) outcome = 'FALHA CRÍTICA (1 NATURAL)!';

          const msg = `${actionPrefix}🎲 [TESTE OFICIAL: ${checkTarget.attribute}]: O jogador rolou 1d${sides} [ ${roll} ]${bonusStr} = Total ${total} vs DT ${checkTarget.dc} (${outcome}) para "${checkTarget.reason}".`;
          handleSendMessage(msg, true);
        }
      }
    } else {
      // Rolagem Livre (Múltiplos dados e/ou Dano)
      const count = overrideCount !== undefined ? overrideCount : freeDiceCount;
      const bonus = overrideBonus !== undefined ? overrideBonus : freeDiceBonus;
      const rolls: number[] = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }
      const sum = rolls.reduce((acc, v) => acc + v, 0);
      const total = sum + bonus;
      const bonusStr = bonus !== 0 ? ` ${bonus > 0 ? '+' : '-'} ${Math.abs(bonus)} (Bônus)` : '';
      const rollsStr = rolls.length > 1 ? `[ ${rolls.join(', ')} ]` : `[ ${rolls[0]} ]`;
      const formula = `${count}d${sides}`;

      const msg = `${actionPrefix}🎲 [ROLAGEM LIVRE]: Rolou ${formula} ${rollsStr}${bonusStr} = Total ${total}.`;
      handleSendMessage(msg, true);
    }
  };

  // Handlers para Arcos Narrativos
  const handleCreateArc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !newArcTitle.trim()) return;

    try {
      const created = await api.createArc(selectedCampaign.id, {
        title: newArcTitle,
        goal: newArcGoal,
        status: 'ACTIVE',
        currentProgress: 'Iniciado recentemente.'
      });
      setArcs(prev => [created, ...prev]);
      setIsNewArcModal(false);
      setNewArcTitle('');
      setNewArcGoal('');
    } catch (err: unknown) {
      alert('Erro ao criar arco narrativo: ' + (err instanceof Error ? err.message : 'Falha na comunicação com o servidor'));
    }
  };

  const handleToggleArcStatus = async (arc: StoryArc) => {
    if (!selectedCampaign) return;
    const nextStatus = arc.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE';
    try {
      const updated = await api.updateArcProgress(selectedCampaign.id, arc.id, {
        status: nextStatus,
        currentProgress: nextStatus === 'COMPLETED' ? 'Objetivo concluído com sucesso!' : 'Em andamento.'
      });
      setArcs(prev => prev.map(a => a.id === arc.id ? updated : a));
    } catch (err: unknown) {
      alert('Erro ao atualizar status do arco: ' + (err instanceof Error ? err.message : 'Falha na comunicação com o servidor'));
    }
  };

  const handleDeleteArc = async (arcId: string) => {
    if (!selectedCampaign) return;
    try {
      await api.deleteArc(selectedCampaign.id, arcId);
      setArcs(prev => prev.filter(a => a.id !== arcId));
    } catch (err: unknown) {
      alert('Erro ao deletar arco: ' + (err instanceof Error ? err.message : 'Falha na comunicação com o servidor'));
    }
  };

  // Handlers para Decisões do Mundo
  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !newDecisionTitle.trim() || !newDecisionAction.trim()) return;

    try {
      const created = await api.createDecision(selectedCampaign.id, {
        title: newDecisionTitle,
        decision: newDecisionAction,
        consequence: newDecisionConsequence
      });
      setDecisions(prev => [created, ...prev]);
      setIsNewDecisionModal(false);
      setNewDecisionTitle('');
      setNewDecisionAction('');
      setNewDecisionConsequence('');
    } catch (err: unknown) {
      alert('Erro ao registrar decisão do mundo: ' + (err instanceof Error ? err.message : 'Falha na comunicação com o servidor'));
    }
  };

  const handleDeleteDecision = async (decisionId: string) => {
    if (!selectedCampaign) return;
    try {
      await api.deleteDecision(selectedCampaign.id, decisionId);
      setDecisions(prev => prev.filter(d => d.id !== decisionId));
    } catch (err: unknown) {
      alert('Erro ao deletar decisão: ' + (err instanceof Error ? err.message : 'Falha na comunicação com o servidor'));
    }
  };

  // Handlers para Diretrizes da História & Fatos
  const handleCreateDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !newDirectiveText.trim() || isSubmittingDirective) return;

    setIsSubmittingDirective(true);
    try {
      const created = await api.createDirective(selectedCampaign.id, {
        directive: newDirectiveText.trim(),
        type: newDirectiveType,
        isActive: true
      });
      setDirectives(prev => [created, ...prev]);
      setNewDirectiveText('');
    } catch (err: unknown) {
      alert('Erro ao criar diretriz de história: ' + (err instanceof Error ? err.message : 'Falha na comunicação com o servidor'));
    } finally {
      setIsSubmittingDirective(false);
    }
  };

  const handleToggleDirective = async (directiveId: string) => {
    if (!selectedCampaign) return;
    try {
      const updated = await api.toggleDirective(selectedCampaign.id, directiveId);
      setDirectives(prev => prev.map(d => d.id === directiveId ? updated : d));
    } catch {
      setDirectives(prev => prev.map(d => d.id === directiveId ? { ...d, isActive: !d.isActive } : d));
    }
  };

  const handleDeleteDirective = async (directiveId: string) => {
    if (!selectedCampaign) return;
    try {
      await api.deleteDirective(selectedCampaign.id, directiveId);
      setDirectives(prev => prev.filter(d => d.id !== directiveId));
    } catch {
      setDirectives(prev => prev.filter(d => d.id !== directiveId));
    }
  };

  const handleToggleCrystallize = async (npc: Npc) => {
    if (!selectedCampaign) return;
    try {
      const updated = await api.toggleCrystallizeNpc(selectedCampaign.id, npc.id);
      setNpcs(prev => prev.map(n => n.id === npc.id ? updated : n));
    } catch {
      setNpcs(prev => prev.map(n => n.id === npc.id ? { ...n, isCrystallized: !n.isCrystallized } : n));
    }
  };

  const handleDeleteNpc = async (npcId: string) => {
    if (!selectedCampaign) return;
    try {
      await api.deleteNpc(selectedCampaign.id, npcId);
      setNpcs(prev => prev.filter(n => n.id !== npcId));
    } catch {
      setNpcs(prev => prev.filter(n => n.id !== npcId));
    }
  };

  // Handlers para Conclusão de Sessão & Próximo Ato
  const handleConcludeSession = async () => {
    if (!currentSession || !selectedCampaign || isConcludingSession) return;
    setIsConcludingSession(true);

    try {
      // 1. Conclui a sessão e obtém a sessão com a crônica de encerramento gerada pelo Gemini
      const concluded = await api.concludeSession(currentSession.id);

      // 2. Recarrega as sessões da campanha
      const updatedSessions = await api.getSessions(selectedCampaign.id);
      setSessions(updatedSessions);

      // 3. Identifica a nova sessão criada (próximo ato) e o ato recém-concluído
      const nextSession = updatedSessions[updatedSessions.length - 1];
      const finishedSession = updatedSessions.find(s => s.id === currentSession.id) || concluded;

      // 4. Abre o modal comemorativo de Fim de Episódio com o resumo e teaser
      setPendingNextSession(nextSession);
      setSummaryModalSession(finishedSession);
    } catch {
      // Mock offline caso a rede falhe
      const finishedActNumber = currentSession.sessionNumber;
      const nextActNumber = finishedActNumber + 1;
      const updatedMock: Session = {
        ...currentSession,
        title: `Ato ${finishedActNumber}: O Despertar da Centelha`,
        summary: `# Ato ${finishedActNumber}: O Despertar da Centelha\n\n## 📜 Crônica dos Acontecimentos\nO herói avançou bravamente pelas provações, superou perigos ancestrais e desvendou pistas críticas para o destino da crônica.\n\n## ⚔️ Feitos, Decisões & Conquistas\n- Batalha memorável contra forças hostis.\n- Escolha corajosa de manter a honra intacta diante do perigo.\n- Conquista de novo fôlego e pistas ancestrais para a jornada.\n\n## 🔮 No Próximo Episódio...\n"Nas profundezas do desconhecido, um novo chamado ecoa desafiando os limites do protagonista..."`
      };

      const newActMock: Session = {
        id: 'session-' + Date.now(),
        campaignId: selectedCampaign.id,
        sessionNumber: nextActNumber,
        title: `Ato ${nextActNumber}`,
        createdAt: new Date().toISOString()
      };

      setSessions(prev => [...prev.map(s => s.id === currentSession.id ? updatedMock : s), newActMock]);
      setPendingNextSession(newActMock);
      setSummaryModalSession(updatedMock);
    } finally {
      setIsConcludingSession(false);
    }
  };

  const handleProceedToNextAct = () => {
    if (!pendingNextSession) {
      setSummaryModalSession(null);
      return;
    }
    const next = pendingNextSession;
    setCurrentSession(next);
    loadMessages(next.id);
    setPendingCheck(null);
    setSummaryModalSession(null);
    setPendingNextSession(null);
  };

  const handleSelectSession = (sess: Session) => {
    setCurrentSession(sess);
    loadMessages(sess.id);
    setPendingCheck(null);
    setIsMobileLeftOpen(false);
  };


  const cleanDisplayContent = (content: string) => {
    if (!content) return '';

    let cleaned = content;

    // 1. Remove qualquer bloco de pensamento formalmente declarado
    cleaned = cleaned.replace(/<pensamento>[\s\S]*?<\/pensamento>/gi, '');
    cleaned = cleaned.replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, '');
    cleaned = cleaned.replace(/\[PENSAMENTO\][\s\S]*?\[\/PENSAMENTO\]/gi, '');

    // 2. Se contiver a tag <narrativa>...</narrativa>, extrai puramente o interior
    const xmlMatch = cleaned.match(/<narrativa>([\s\S]*?)(?:<\/narrativa>|$)/i);
    if (xmlMatch && xmlMatch[1]?.trim()) {
      cleaned = xmlMatch[1].trim();
    } else {
      // Se contiver [NARRATIVA]...[/NARRATIVA]
      const bracketMatch = cleaned.match(/\[NARRATIVA\]([\s\S]*?)(?:\[\/NARRATIVA\]|$)/i);
      if (bracketMatch && bracketMatch[1]?.trim()) {
        cleaned = bracketMatch[1].trim();
      }
    }

    // 3. Remove tags internas de teste mecânico e de dicas de ação da visualização do balão de texto (viram componentes interativos)
    cleaned = cleaned.replace(/\[PEDIR_TESTE:[^\]]+\]/g, '').trim();
    cleaned = cleaned.replace(/\[DICAS_DE_ACAO:[^\]]+\]/g, '').trim();

    // 4. Corte de cabeçalhos de rascunho (*Drafting response:*, *Cena:*, etc.)
    const startMatch = cleaned.match(/(?:^\s*\*+(?:Drafting response:?|Draft:?|Cena:?|A Cena:?)\*+|\b(?:Drafting response|Cena):)\s*\n?/im);
    if (startMatch && startMatch.index !== undefined) {
      cleaned = cleaned.substring(startMatch.index + startMatch[0].length).trim();
    }

    // 5. Higienização de tópicos de pensamento que possam ter vazado no início
    const lines = cleaned.split(/\r?\n/);
    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const isThoughtLine = /^\*\s*\*(?:Sem notas|Sem metalinguagem|Foco na imersão|Conclusão|Ajuste de tom|Decisão do Mestre)/i.test(line)
        || /^\*\s*\(?(?:Decisão do Mestre|Ajuste de tom|Tom|Objetivo|Conexão com o personagem|O ambiente deve ser)\)?/i.test(line)
        || /^\*?\s*\(?(?:Decisão do Mestre|Drafting response)\)?/i.test(line)
        || /^\*\s*(?:Shonen|Seinen|Grimdark|O tom deve ser|O objetivo d[eo]|O ambiente deve)/i.test(line);

      if (isThoughtLine) {
        startIndex = i + 1;
      } else {
        break;
      }
    }
    if (startIndex > 0 && startIndex < lines.length) {
      cleaned = lines.slice(startIndex).join('\n').trim();
    }

    // 6. Corte de checklists finais (*Check against rules:*, *Final Polish.*, etc.)
    const endMatch = cleaned.match(/(?:^\s*\*+(?:Check against rules|Final Polish|Auto-correção|Self-correction|Notas de bastidores)\*+|Check against rules:|Notes:)/im);
    if (endMatch && endMatch.index !== undefined) {
      cleaned = cleaned.substring(0, endMatch.index).trim();
    }

    const finalResult = cleaned.trim();
    if (!finalResult) {
      // Se sobrou vazio após os cortes, recupera o conteúdo original removendo apenas as tags XML literais
      const fallback = content.replace(/<\/?(?:narrativa|pensamento|scratchpad)>/gi, '')
        .replace(/\[PEDIR_TESTE:[^\]]+\]/g, '')
        .replace(/\[DICAS_DE_ACAO:[^\]]+\]/g, '')
        .trim();
      return fallback || 'O Mestre aguarda sua decisão. O que você faz a seguir?';
    }

    return finalResult;
  };

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      
      {/* OVERLAY MOBILE PARA SIDEBARS */}
      {(isMobileLeftOpen || isMobileRightOpen) && (
        <div 
          onClick={() => { setIsMobileLeftOpen(false); setIsMobileRightOpen(false); }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* SIDEBAR ESQUERDA: CAMPANHAS & SESSÕES */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 sm:w-80 border-r border-slate-800 bg-slate-900/98 lg:bg-slate-900/60 flex flex-col h-[100dvh] max-h-[100dvh] lg:h-full lg:max-h-full overflow-hidden backdrop-blur-md transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isMobileLeftOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-600/20 text-amber-500 rounded-lg border border-amber-500/30">
              <Sword className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-amber-400">SoloForge</h1>
              <p className="text-[11px] text-slate-400">Mestre: <span className="text-amber-300 font-medium">{currentUser}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsCreatingModal(true)}
              className="p-2 w-9 h-9 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-md transition cursor-pointer"
              title="Criar Nova Campanha"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 w-9 h-9 flex items-center justify-center hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-md transition cursor-pointer"
              title="Sair do SoloForge"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileLeftOpen(false)}
              className="p-2 w-9 h-9 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition cursor-pointer lg:hidden"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Lista de Campanhas */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Suas Campanhas
          </div>
          {campaigns.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400 border border-dashed border-slate-800 rounded-lg m-2">
              Nenhuma campanha ativa.
              <button 
                onClick={() => setIsCreatingModal(true)} 
                className="mt-2 block w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition cursor-pointer"
              >
                Criar Primeira Crônica
              </button>
            </div>
          ) : (
            campaigns.map(camp => (
              <div
                key={camp.id}
                onClick={() => handleSelectCampaign(camp)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition group cursor-pointer ${
                  selectedCampaign?.id === camp.id 
                    ? 'bg-amber-600/15 border border-amber-500/40 text-amber-200' 
                    : 'hover:bg-slate-800/70 text-slate-300 border border-transparent'
                }`}
              >
                <div className="truncate flex-1 pr-2">
                  <div className="font-medium text-sm truncate flex items-center gap-1.5">
                    <Scroll className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {camp.title}
                  </div>
                  <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                    {camp.genre || 'Fantasia'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleDeleteCampaign(camp.id, camp.title, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 active:bg-rose-900/60 rounded transition opacity-80 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer"
                    title={`Excluir crônica "${camp.title}"`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500 opacity-60 lg:opacity-0 lg:group-hover:opacity-100 transition hidden sm:block" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Atos e Sessões da Campanha */}
        {selectedCampaign && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-amber-500" />
                Atos da Crônica ({sessions.length})
              </span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {sessions.map(sess => {
                const isSelected = currentSession?.id === sess.id;
                return (
                  <button
                    key={sess.id}
                    onClick={() => handleSelectSession(sess)}
                    className={`w-full text-left p-1.5 rounded flex items-center justify-between text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                        : 'hover:bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <span className="truncate pr-1">
                      {sess.title || `Ato ${sess.sessionNumber}`}
                    </span>
                    {sess.summary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSummaryModalSession(sess);
                          setPendingNextSession(null);
                        }}
                        className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded border border-amber-500/30 font-semibold flex items-center gap-1 shrink-0 transition"
                        title="Ver Crônica Completa deste Episódio / Ato"
                      >
                        <Scroll className="w-2.5 h-2.5" />
                        <span>Crônica</span>
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* ÁREA CENTRAL: O CHAT DE INTERAÇÃO DO RPG */}
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-slate-950 relative">
        {/* Header do Chat */}
        <header className="h-14 sm:h-16 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur-sm gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Botão de abrir sidebar de campanhas no mobile */}
            <button
              onClick={() => setIsMobileLeftOpen(true)}
              className="p-2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg lg:hidden cursor-pointer shrink-0"
              title="Abrir Campanhas"
            >
              <Menu className="w-5 h-5 text-amber-400" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm sm:text-base text-slate-100 truncate">
                  {selectedCampaign ? selectedCampaign.title : 'Selecione ou Crie uma Crônica'}
                </h2>
                {currentSession && (
                  <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/30 font-medium whitespace-nowrap">
                    {currentSession.title || `Ato ${currentSession.sessionNumber}`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {currentSession?.summary 
                  ? `Resumo Histórico: ${currentSession.summary.slice(0, 80)}...`
                  : (selectedCampaign?.synopsis || 'O Mestre IA está pronto para arbitrar as regras...')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Ações Desktop (Exibidas diretamente em telas md+) */}
            <div className="hidden md:flex items-center gap-2">
              {/* Se o ato atual já possui crônica/resumo concluído */}
              {selectedCampaign && currentSession?.summary && (
                <button
                  type="button"
                  onClick={() => {
                    setSummaryModalSession(currentSession);
                    setPendingNextSession(null);
                  }}
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                  title="Ver Crônica de Fechamento deste Ato"
                >
                  <Scroll className="w-3.5 h-3.5 text-amber-400" />
                  <span>Crônica do Ato</span>
                </button>
              )}

              {/* Se o ato está ativo e em andamento, permite concluir com a crônica */}
              {selectedCampaign && currentSession && !currentSession.summary && (
                <button
                  onClick={handleConcludeSession}
                  disabled={isConcludingSession || isLoading}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-sm shadow-amber-900/30 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                  title="Gera a crônica de Fim de Episódio e avança para o próximo ato"
                >
                  {isConcludingSession ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Cronista Escrevendo...</span>
                    </>
                  ) : (
                    <>
                      <Scroll className="w-3.5 h-3.5 text-amber-300" />
                      <span>Concluir Episódio (Ato)</span>
                    </>
                  )}
                </button>
              )}

              {/* Botão de Limpar Tela (Somente Visual) */}
              {selectedCampaign && messages.length > 0 && (
                <button
                  onClick={handleClearVisualChat}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-amber-300 border border-slate-700/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  title="Limpar mensagens da visualização da tela (suas memórias e decisões no banco permanecem salvas)"
                >
                  <Eraser className="w-3.5 h-3.5 text-slate-400" />
                  <span>Limpar Tela</span>
                </button>
              )}
            </div>

            {/* Menu Contextual Mobile (Ações compactas em telas menores que md) */}
            {selectedCampaign && (
              <div className="relative md:hidden">
                <button
                  onClick={() => setIsMobileActionMenuOpen(prev => !prev)}
                  className="w-9 h-9 p-2 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg cursor-pointer"
                  title="Ações do Ato"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMobileActionMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsMobileActionMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-40 animate-fade-in backdrop-blur-md">
                      {currentSession?.summary && (
                        <button
                          onClick={() => {
                            setIsMobileActionMenuOpen(false);
                            setSummaryModalSession(currentSession);
                            setPendingNextSession(null);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-amber-300 hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <Scroll className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ver Crônica do Ato</span>
                        </button>
                      )}

                      {currentSession && !currentSession.summary && (
                        <button
                          onClick={() => {
                            setIsMobileActionMenuOpen(false);
                            handleConcludeSession();
                          }}
                          disabled={isConcludingSession || isLoading}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-amber-400 hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isConcludingSession ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              <span>Escrevendo Crônica...</span>
                            </>
                          ) : (
                            <>
                              <Scroll className="w-3.5 h-3.5 text-amber-300" />
                              <span>Concluir Episódio (Ato)</span>
                            </>
                          )}
                        </button>
                      )}

                      {messages.length > 0 && (
                        <button
                          onClick={() => {
                            setIsMobileActionMenuOpen(false);
                            handleClearVisualChat();
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer border-t border-slate-800/60"
                        >
                          <Eraser className="w-3.5 h-3.5 text-slate-400" />
                          <span>Limpar Tela</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Botão de abrir painel direito (Fichas, Arcos, Regras) no mobile */}
            {selectedCampaign && (
              <button
                onClick={() => setIsMobileRightOpen(prev => !prev)}
                className="w-9 h-9 sm:w-10 sm:h-10 p-2 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-amber-400 rounded-lg lg:hidden cursor-pointer"
                title="Abrir Bíblia & Regras"
              >
                <SlidersHorizontal className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            )}

            {/* Seletor de Atmosfera e Temas de Fundo */}
            <ThemeSwitcher />

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full">
              <ShieldAlert className="w-3.5 h-3.5" />
              Memória Ativa
            </div>
          </div>
        </header>

        {/* NAVEGAÇÃO DE ABAS CENTRAIS */}
        {selectedCampaign && (
          <div className="flex items-center border-b border-slate-800 bg-slate-900/60 px-3 sm:px-6 gap-2 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setMainTab('chat')}
              className={`flex items-center gap-2 min-h-[42px] py-2 px-3 border-b-2 text-xs sm:text-sm font-medium transition cursor-pointer shrink-0 ${
                mainTab === 'chat'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sword className="w-4 h-4" />
              <span>Aventura / Ações</span>
            </button>

            <button
              onClick={() => setMainTab('directives')}
              className={`flex items-center gap-2 min-h-[42px] py-2 px-3 border-b-2 text-xs sm:text-sm font-medium transition cursor-pointer shrink-0 ${
                mainTab === 'directives'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Direcionamento</span>
              {directives.filter(d => d.isActive).length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-bold">
                  {directives.filter(d => d.isActive).length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* CONTEÚDO DA ABA CENTRAL: CHAT OU DIRECIONAMENTO DA HISTÓRIA */}
        {mainTab === 'directives' && selectedCampaign ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header explicativo */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-900/80 to-slate-900/80 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-amber-300">
                    Sussurros do Destino & Fatos Estabelecidos
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Instrua o <strong>Game Master IA</strong> sobre reviravoltas iminentes, rumos narrativos, fatos consolidados ou o clima da campanha.
                    Todas as diretrizes <strong>ativas</strong> têm prioridade máxima de condução narrativa durante os diálogos e acontecimentos!
                  </p>
                </div>
              </div>
            </div>

            {/* Formulário para Adicionar Nova Diretriz */}
            <form onSubmit={handleCreateDirective} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkle className="w-3.5 h-3.5 text-amber-400" />
                  Nova Diretriz ou Fato Ocorrido
                </span>
                <span className="text-[11px] text-slate-400">
                  Injetado diretamente no prompt do Mestre
                </span>
              </div>

              <div>
                <textarea
                  rows={2}
                  value={newDirectiveText}
                  onChange={(e) => setNewDirectiveText(e.target.value)}
                  placeholder="Ex: O ferreiro de pedra na verdade é um espião da corte decadente disfarçado; Conduza a cena para uma emboscada na ponte suspensa..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Tipo:</span>
                  {(
                    [
                      { key: 'NARRATIVE_DIRECTION', label: '🧭 Rumo Narrativo' },
                      { key: 'PLOT_TWIST', label: '⚡ Reviravolta' },
                      { key: 'ESTABLISHED_FACT', label: '📜 Fato Estabelecido' },
                      { key: 'TONE_SUGGESTION', label: '🎭 Clima / Tom' }
                    ] as const
                  ).map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setNewDirectiveType(t.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition cursor-pointer ${
                        newDirectiveType === t.key
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!newDirectiveText.trim() || isSubmittingDirective}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isSubmittingDirective ? 'Registrando...' : 'Registrar Diretriz'}
                </button>
              </div>
            </form>

            {/* Lista de Diretrizes Registradas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Diretrizes da Crônica ({directives.length})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Desative diretrizes que já se concluíram na história
                </span>
              </div>

              {directives.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800/60 text-slate-400 space-y-2">
                  <Compass className="w-8 h-8 mx-auto text-slate-500 stroke-1" />
                  <p className="text-xs">Nenhum direcionamento ou fato registrado ainda.</p>
                  <p className="text-[11px] text-slate-400">
                    Use o formulário acima para guiar a narrativa sem que isso apareça no diálogo aberto com o Mestre.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {directives.map((dir) => {
                    const typeLabels: Record<string, { label: string; badgeClass: string }> = {
                      PLOT_TWIST: { label: 'Reviravolta', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
                      NARRATIVE_DIRECTION: { label: 'Rumo Narrativo', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                      ESTABLISHED_FACT: { label: 'Fato Estabelecido', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                      TONE_SUGGESTION: { label: 'Clima / Tom', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
                    };
                    const typeConfig = typeLabels[dir.type] || { label: dir.type, badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' };

                    return (
                      <div
                        key={dir.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          dir.isActive
                            ? 'bg-slate-900/90 border-amber-500/40 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeConfig.badgeClass}`}>
                              {typeConfig.label}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(dir.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <p className={`text-xs leading-relaxed ${dir.isActive ? 'text-slate-100 font-medium' : 'text-slate-400 line-through'}`}>
                            {dir.directive}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                          <button
                            type="button"
                            onClick={() => handleToggleDirective(dir.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                              dir.isActive
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                            }`}
                            title={dir.isActive ? 'Pausar diretriz para a IA não usar agora' : 'Ativar diretriz para a IA usar'}
                          >
                            {dir.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{dir.isActive ? 'Ativa no Mestre' : 'Pausada'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDirective(dir.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition cursor-pointer"
                            title="Excluir diretriz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* MINI-BANNER DE STATUS RÁPIDO DO PJ */}
            <MiniCharacterBanner
              characterDescription={selectedCampaign?.bible?.playerCharacter}
              rawAttributes={selectedCampaign?.bible?.characterAttributes}
              isOpen={isPjMiniBannerOpen}
              onToggleOpen={() => setIsPjMiniBannerOpen(prev => !prev)}
              onOpenCharacterSheet={() => {
                setActiveTab('character');
                setIsMobileRightOpen(true);
              }}
              onEvolveCharacter={() => setIsEvolvingCharacter(true)}
            />

            {/* Mensagens da Aventura */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
              {/* Banner de Restauração quando o chat foi limpo visualmente */}
              {isVisualChatCleared && messages.length === 0 && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center max-w-lg mx-auto space-y-3">
                  <p className="text-xs text-slate-300">
                    A visualização do chat foi limpa para uma nova cena. O histórico completo, suas decisões e os atos anteriores permanecem preservados no Grimório.
                  </p>
                  <button
                    onClick={handleRestoreVisualChat}
                    className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restaurar mensagens da sessão
                  </button>
                </div>
              )}

              {messages.length === 0 && !isVisualChatCleared ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto text-slate-400 space-y-3">
                  <div className="p-4 bg-slate-900 rounded-full border border-slate-800 text-amber-500">
                    <Flame className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-medium text-slate-200">A Crônica Aguarda</h3>
                  <p className="text-xs leading-relaxed">
                    Descreva sua ação. O Mestre irá avaliar suas regras e perícias, barrar ações inválidas ou exigir um teste com <strong>DT explícita</strong> antes de definir o resultado.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isPlayer = msg.sender === 'PLAYER';
                  const isSystem = msg.sender === 'SYSTEM';
                  const isLastGmMessage = !isPlayer && !isSystem && idx === messages.map(m => m.sender).lastIndexOf('GM');

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="px-4 py-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2 shadow-lg backdrop-blur-sm">
                          <Dices className="w-4 h-4 text-amber-400 animate-bounce" />
                          <span>{msg.content}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-3xl ${isPlayer ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isPlayer 
                          ? 'bg-amber-600/20 border-amber-500/40 text-amber-400' 
                          : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400'
                      }`}>
                        {isPlayer ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-300">
                            {msg.senderName || (isPlayer ? 'Jogador' : 'Mestre IA')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className={`p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap border shadow-md ${
                          isPlayer 
                            ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white border-amber-500/30 shadow-amber-900/10' 
                            : 'bg-slate-900/90 text-slate-200 border-slate-800 shadow-slate-950/50 backdrop-blur-sm'
                        }`}>
                          {cleanDisplayContent(msg.content)}
                        </div>

                        {/* Ações e Dicas da Mensagem do Mestre */}
                        {!isPlayer && !isSystem && (
                          <div className="mt-1.5 flex flex-col gap-1.5 w-full">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Botão Opcional de Dicas de Ação (Apenas se o jogador quiser abrir) */}
                              {(() => {
                                const hints = parseActionHints(msg.content);
                                const isExpanded = !!expandedActionHints[msg.id];
                                if (hints.length === 0) return null;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => toggleActionHints(msg.id)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer border ${
                                      isExpanded
                                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border-slate-800'
                                    }`}
                                    title="Ver sugestões de ações possíveis para esta cena (opcional)"
                                  >
                                    <Lightbulb className="w-3 h-3 text-amber-400" />
                                    <span>{isExpanded ? 'Ocultar Dicas de Ação' : '💡 Ideias de Ação'}</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                                  </button>
                                );
                              })()}

                              {/* Botão de Regenerar Resposta na última mensagem do GM */}
                              {isLastGmMessage && (
                                <button
                                  type="button"
                                  onClick={handleRegenerateLastMessage}
                                  disabled={isRegenerating || isLoading}
                                  className="px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 disabled:opacity-40 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
                                  title="Solicita ao Mestre uma nova narração para a ação anterior"
                                >
                                  <RotateCcw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                                  <span>{isRegenerating ? 'Consultando novamente...' : 'Tentar outra resposta'}</span>
                                </button>
                              )}
                            </div>

                            {/* Painel Retrátil de Dicas de Ação */}
                            {expandedActionHints[msg.id] && (() => {
                              const hints = parseActionHints(msg.content);
                              if (hints.length === 0) return null;
                              return (
                                <div className="p-2.5 bg-slate-950/90 border border-amber-900/40 rounded-lg space-y-1.5 animate-fadeIn max-w-xl">
                                  <span className="text-[10px] uppercase font-semibold text-amber-500 tracking-wider flex items-center gap-1">
                                    <Lightbulb className="w-3 h-3" />
                                    Ideias e Abordagens (Clique para usar):
                                  </span>
                                  <div className="flex flex-col gap-1">
                                    {hints.map((hint, hIdx) => (
                                      <button
                                        key={hIdx}
                                        type="button"
                                        onClick={() => {
                                          setInputText(hint);
                                        }}
                                        className="text-left text-xs text-slate-300 hover:text-amber-200 hover:bg-amber-950/30 p-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
                                      >
                                        <ChevronRight className="w-3 h-3 text-amber-500 shrink-0" />
                                        <span>{hint}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {isLoading && (
                <div className="flex gap-3 items-center text-xs text-amber-400/80 italic p-3 bg-slate-900/50 rounded-lg border border-slate-800/60 w-fit">
                  <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
                  O Mestre está consultando o sistema de regras e pesando a dificuldade...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* BANNER INTERATIVO: QUANDO O MESTRE EXIGE UM TESTE COM DT OU ROLAGEM DE DANO */}
            {pendingCheck && !isLoading && (() => {
              const isDamage = isDamageRoll(pendingCheck);
              const { count: diceCount, sides: diceSides } = parseDiceFormula(pendingCheck.dice);

              return (
                <div className={`mx-2 sm:mx-6 mb-2 p-3 sm:p-4 rounded-xl shadow-xl flex flex-col gap-3 backdrop-blur-md animate-fade-in shrink-0 border-2 ${
                  isDamage 
                    ? 'bg-gradient-to-r from-red-950/80 via-rose-950/70 to-slate-900/90 border-red-500/70 shadow-red-900/20' 
                    : 'bg-gradient-to-r from-amber-950/80 to-slate-900/90 border-amber-500/70 shadow-amber-900/20'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={`p-2 sm:p-2.5 rounded-lg border shrink-0 ${
                        isDamage 
                          ? 'bg-red-500/20 text-red-400 border-red-500/40' 
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}>
                        {isDamage ? (
                          <Sword className="w-5 h-5 animate-pulse text-red-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className={`font-bold text-xs sm:text-sm ${isDamage ? 'text-red-300' : 'text-amber-300'}`}>
                            {isDamage ? 'ROLAGEM DE DANO:' : 'TESTE EXIGIDO:'}
                          </span>
                          {isDamage ? (
                            <span className="px-1.5 py-0.5 bg-red-600 text-white font-black text-[10px] sm:text-xs rounded uppercase tracking-wider">
                              {pendingCheck.dice.toUpperCase()}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs rounded uppercase">
                              DT {pendingCheck.dc}
                            </span>
                          )}
                          <span className="text-[11px] sm:text-xs text-slate-300 font-medium truncate">
                            ({pendingCheck.attribute})
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1">
                          {isDamage ? 'Alvo / Golpe:' : 'Motivo:'} <span className="italic text-slate-200">"{pendingCheck.reason}"</span>
                        </p>
                      </div>
                    </div>

                    {/* Controles de Modo (se teste regular) e Stepper de Bônus / Modificador */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!isDamage && (
                        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setRollMode('NORMAL')}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                              rollMode === 'NORMAL' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => setRollMode('ADVANTAGE')}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                              rollMode === 'ADVANTAGE' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Rola 2 dados e seleciona o maior"
                          >
                            Vantagem (2d)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRollMode('DISADVANTAGE')}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                              rollMode === 'DISADVANTAGE' ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Rola 2 dados e seleciona o menor"
                          >
                            Desvantagem (2d)
                          </button>
                        </div>
                      )}

                      {/* Stepper de Bônus de Modificador */}
                      <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 gap-1.5 text-xs">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {isDamage ? 'Modif.:' : 'Bônus:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTestBonus(prev => prev - 1)}
                          className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold cursor-pointer text-xs"
                        >
                          -
                        </button>
                        <span className={`font-mono text-xs font-bold min-w-[24px] text-center ${testBonus > 0 ? 'text-emerald-400' : testBonus < 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                          {testBonus >= 0 ? `+${testBonus}` : testBonus}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTestBonus(prev => prev + 1)}
                          className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold cursor-pointer text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openRollConfirmModal(diceSides, pendingCheck, diceCount, rollMode, testBonus)}
                    className={`w-full min-h-[44px] px-4 py-2.5 font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition shadow-lg cursor-pointer shrink-0 ${
                      isDamage
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-700/30'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-600/30'
                    }`}
                  >
                    {isDamage ? <Flame className="w-4 sm:w-5 h-4 sm:h-5" /> : <Dices className="w-4 sm:w-5 h-4 sm:h-5" />}
                    <span>
                      {isDamage ? (
                        `💥 Rolar Dano (${pendingCheck.dice.toLowerCase()})${testBonus !== 0 ? ` (${testBonus > 0 ? '+' : ''}${testBonus})` : ''} agora!`
                      ) : (
                        `Rolar ${rollMode === 'ADVANTAGE' ? `2${pendingCheck.dice.toLowerCase()} com Vantagem` : rollMode === 'DISADVANTAGE' ? `2${pendingCheck.dice.toLowerCase()} com Desvantagem` : `1${pendingCheck.dice.toLowerCase()}`}${testBonus !== 0 ? ` (${testBonus > 0 ? '+' : ''}${testBonus})` : ''} contra DT ${pendingCheck.dc} agora!`
                      )}
                    </span>
                  </button>
                </div>
              );
            })()}

            {/* BARRA DE ROLAGEM RÁPIDA DE DADOS & INPUT BAR */}
            <div className="p-2.5 sm:p-4 border-t border-slate-800 bg-slate-900/50 space-y-2 sm:space-y-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap items-center justify-between gap-2 max-w-4xl mx-auto text-xs text-slate-400">
                <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full no-scrollbar touch-pan-x">
                  {/* Seletor de Quantidade de Dados */}
                  <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 shrink-0">
                    <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">Qtd:</span>
                    {[1, 2, 3, 4].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setFreeDiceCount(q)}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                          freeDiceCount === q ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {q}x
                      </button>
                    ))}
                  </div>

                  {/* Stepper de Bônus da Rolagem Livre */}
                  <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg px-1.5 py-0.5 gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Bônus:</span>
                    <button
                      type="button"
                      onClick={() => setFreeDiceBonus(prev => prev - 1)}
                      className="w-4 h-4 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold cursor-pointer text-[10px]"
                    >
                      -
                    </button>
                    <span className={`font-mono text-xs font-bold min-w-[20px] text-center ${freeDiceBonus > 0 ? 'text-emerald-400' : freeDiceBonus < 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {freeDiceBonus >= 0 ? `+${freeDiceBonus}` : freeDiceBonus}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFreeDiceBonus(prev => prev + 1)}
                      className="w-4 h-4 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold cursor-pointer text-[10px]"
                    >
                      +
                    </button>
                  </div>

                  {/* Botões de Dados Poliédricos Táteis (Estilo Gemas RPG) */}
                  {[
                    { sides: 4, label: 'd4', color: 'from-amber-600/30 to-amber-700/20 text-amber-200 border-amber-500/40 hover:border-amber-400 hover:shadow-amber-500/20' },
                    { sides: 6, label: 'd6', color: 'from-emerald-600/30 to-emerald-700/20 text-emerald-200 border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20' },
                    { sides: 8, label: 'd8', color: 'from-cyan-600/30 to-blue-700/20 text-cyan-200 border-cyan-500/40 hover:border-cyan-400 hover:shadow-cyan-500/20' },
                    { sides: 10, label: 'd10', color: 'from-purple-600/30 to-indigo-700/20 text-purple-200 border-purple-500/40 hover:border-purple-400 hover:shadow-purple-500/20' },
                    { sides: 12, label: 'd12', color: 'from-orange-600/30 to-amber-700/20 text-orange-200 border-orange-500/40 hover:border-orange-400 hover:shadow-orange-500/20' },
                    { sides: 20, label: 'd20', color: 'from-rose-600/50 via-red-600/40 to-amber-600/40 text-amber-100 border-amber-400/60 shadow-md shadow-rose-950/60 font-black ring-1 ring-amber-400/40 hover:scale-105' },
                    { sides: 100, label: 'd100', color: 'from-slate-700/40 to-slate-800/40 text-amber-300 border-slate-600/60 hover:border-amber-400 hover:shadow-amber-500/20' }
                  ].map(dice => (
                    <button
                      key={dice.sides}
                      onClick={() => openRollConfirmModal(dice.sides, undefined, freeDiceCount, 'NORMAL', freeDiceBonus)}
                      disabled={!selectedCampaign || isLoading}
                      className={`min-w-[46px] h-[38px] px-2.5 bg-gradient-to-br disabled:opacity-40 border rounded-xl font-mono font-bold transition-all text-xs flex items-center justify-center cursor-pointer active:scale-95 text-center shrink-0 shadow-sm hover:-translate-y-0.5 ${dice.color}`}
                      title={freeDiceCount > 1 || freeDiceBonus !== 0 ? `Rolar ${freeDiceCount}${dice.label}${freeDiceBonus !== 0 ? ` (${freeDiceBonus >= 0 ? `+${freeDiceBonus}` : freeDiceBonus})` : ''}` : `Rolar 1${dice.label}`}
                    >
                      <span>{freeDiceCount > 1 ? `${freeDiceCount}${dice.label}` : dice.label}</span>
                      {freeDiceBonus !== 0 && (
                        <span className="text-[9px] text-amber-400 ml-0.5">
                          {freeDiceBonus > 0 ? `+${freeDiceBonus}` : freeDiceBonus}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {pendingCheck && (
                  <span className="text-amber-400/90 text-[11px] flex items-center gap-1 font-medium shrink-0">
                    <RotateCcw className="w-3 h-3" />
                    DT {pendingCheck.dc} ({pendingCheck.attribute})
                  </span>
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2 max-w-4xl mx-auto">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    selectedCampaign 
                      ? "Descreva sua ação ou fala... (Mestre avaliará regras e DT)" 
                      : "Selecione uma campanha para jogar..."
                  }
                  disabled={!selectedCampaign || isLoading}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-100 placeholder-slate-400 outline-none transition disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!selectedCampaign || !inputText.trim() || isLoading}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 min-h-[44px] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-700/20 cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ação</span>
                </button>
              </form>

              {/* BARRA INFERIOR MOBILE DE 1 TOQUE (Bottom Navigation Bar) */}
              <nav className="lg:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('chat');
                    setIsMobileRightOpen(false);
                    setIsMobileLeftOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                    mainTab === 'chat' && !isMobileRightOpen && !isMobileLeftOpen
                      ? 'text-amber-400 bg-amber-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sword className="w-4 h-4 mb-0.5" />
                  <span>Aventura</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('character');
                    setIsMobileRightOpen(true);
                    setIsMobileLeftOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                    isMobileRightOpen && activeTab === 'character'
                      ? 'text-amber-400 bg-amber-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-4 h-4 mb-0.5" />
                  <span>Herói</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('npcs');
                    setIsMobileRightOpen(true);
                    setIsMobileLeftOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                    isMobileRightOpen && activeTab === 'npcs'
                      ? 'text-amber-400 bg-amber-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 mb-0.5" />
                  <span>NPCs</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('arcs');
                    setIsMobileRightOpen(true);
                    setIsMobileLeftOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                    isMobileRightOpen && activeTab === 'arcs'
                      ? 'text-amber-400 bg-amber-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Target className="w-4 h-4 mb-0.5" />
                  <span>Arcos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileLeftOpen(true);
                    setIsMobileRightOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                    isMobileLeftOpen
                      ? 'text-amber-400 bg-amber-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scroll className="w-4 h-4 mb-0.5" />
                  <span>Crônicas</span>
                </button>
              </nav>
            </div>
          </>
        )}
      </main>

      {/* PAINEL DIREITO: ABAS DE BÍBLIA, ARCOS E MEMÓRIA DO MUNDO */}
      {selectedCampaign && (
        <aside className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 max-w-full border-l border-slate-800 bg-slate-900/98 lg:bg-slate-900/60 backdrop-blur-md flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden transition-transform duration-300 ease-in-out lg:static lg:h-full lg:max-h-full lg:translate-x-0 ${
          isMobileRightOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
        }`}>
          
          {/* Header Mobile do Painel Direito */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between lg:hidden bg-slate-950/40 shrink-0">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4" />
              Grimório & Crônicas
            </span>
            <button
              onClick={() => setIsMobileRightOpen(false)}
              className="p-2 w-10 h-10 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition cursor-pointer"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cabeçalho de Abas */}
          <div className="flex border-b border-slate-800/80 bg-slate-950/70 p-1.5 gap-1 overflow-x-auto shrink-0 no-scrollbar">
            <button
              onClick={() => setActiveTab('character')}
              className={`flex-1 min-w-[76px] min-h-[42px] py-2 px-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer ${
                activeTab === 'character'
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/50 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium'
              }`}
            >
              <User className={`w-3.5 h-3.5 transition-colors ${activeTab === 'character' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="tracking-wide">Personagem</span>
            </button>

            <button
              onClick={() => setActiveTab('npcs')}
              className={`flex-1 min-w-[76px] min-h-[42px] py-2 px-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer ${
                activeTab === 'npcs'
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/50 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium'
              }`}
            >
              <Users className={`w-3.5 h-3.5 transition-colors ${activeTab === 'npcs' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="tracking-wide">NPCs</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold transition-all ${
                activeTab === 'npcs'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40 shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
              }`}>
                {npcs.filter(n => n.isCrystallized).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('arcs')}
              className={`flex-1 min-w-[76px] min-h-[42px] py-2 px-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer ${
                activeTab === 'arcs'
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/50 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium'
              }`}
            >
              <Target className={`w-3.5 h-3.5 transition-colors ${activeTab === 'arcs' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="tracking-wide">Arcos</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold transition-all ${
                activeTab === 'arcs'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40 shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
              }`}>
                {arcs.filter(a => a.status === 'ACTIVE').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('decisions')}
              className={`flex-1 min-w-[76px] min-h-[42px] py-2 px-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer ${
                activeTab === 'decisions'
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/50 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium'
              }`}
            >
              <Landmark className={`w-3.5 h-3.5 transition-colors ${activeTab === 'decisions' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="tracking-wide">Mundo</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold transition-all ${
                activeTab === 'decisions'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40 shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
              }`}>
                {decisions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('bible')}
              className={`flex-1 min-w-[76px] min-h-[42px] py-2 px-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer ${
                activeTab === 'bible'
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/50 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 transition-colors ${activeTab === 'bible' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="tracking-wide">Bíblia</span>
            </button>
          </div>


          {/* Conteúdo da Aba */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ABA 0: FICHA DO PERSONAGEM DO JOGADOR (PJ) */}
            {activeTab === 'character' && (
              <div className="space-y-4 animate-tab-content">
                {/* Header do Herói com Ações Rápidas */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-100 tracking-wide truncate">
                            {selectedCampaign?.bible?.playerCharacter?.split('\n')[0] || 'Protagonista'}
                          </h3>
                          <span className="text-[10px] bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold px-2 py-0.5 rounded-full shadow-xs tracking-wider uppercase">
                            PJ Ativo
                          </span>
                        </div>
                        {selectedCampaign?.bible?.playerCharacter?.split('\n')[1] && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                            {selectedCampaign.bible.playerCharacter.split('\n')[1]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setIsEvolvingCharacter(true)}
                        className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-amber-900/30 active:scale-95"
                        title="Evoluir Atributos por Marco/Nível com IA"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Evoluir (IA)</span>
                      </button>

                      <button
                        onClick={() => {
                          const pjContent = [
                            selectedCampaign?.bible?.playerCharacter || '',
                            selectedCampaign?.bible?.characterAttributes ? `Atributos:\n${selectedCampaign.bible.characterAttributes}` : ''
                          ].filter(Boolean).join('\n\n');
                          handleCopyToClipboard(pjContent, 'pj-full-sheet');
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition cursor-pointer"
                        title="Copiar Ficha Completa"
                      >
                        {copiedId === 'pj-full-sheet' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabela de Atributos & Combate Padronizada */}
                <AttributeTableView
                  rawAttributes={selectedCampaign?.bible?.characterAttributes}
                  title="Tabela de Atributos & Estatísticas"
                  copyId="pj-char-attributes"
                  onCopy={handleCopyToClipboard}
                  copiedId={copiedId}
                  emptyMessage="Nenhum atributo registrado para o personagem. Você pode defini-los na Bíblia ou evoluir com IA."
                />

                {/* Detalhes de Antecedente, História e Memória (Enxuto por padrão, expansível completo) */}
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      Histórico & Conceito do Herói
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsFullCharacterBioExpanded(prev => !prev)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>{isFullCharacterBioExpanded ? 'Resumir' : 'Ver Texto Completo'}</span>
                      {isFullCharacterBioExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {isFullCharacterBioExpanded ? (
                    <div className="pt-2 border-t border-slate-800/80 animate-fadeIn space-y-2">
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line text-xs font-sans">
                        {selectedCampaign?.bible?.playerCharacter || 'Nenhum histórico detalhado informado.'}
                      </p>
                      <p className="text-[10px] text-slate-500 italic border-t border-slate-800/60 pt-1">
                        Memória integral ativa enviada ao Mestre IA em todas as decisões.
                      </p>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                      {selectedCampaign?.bible?.playerCharacter ? (
                        <p className="italic">
                          {selectedCampaign.bible.playerCharacter.split('\n').filter(Boolean).slice(0, 3).join(' ')}...
                        </p>
                      ) : (
                        <p className="text-slate-500 italic">Nenhum histórico informado.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 1: ARCOS & MISSÕES */}
            {activeTab === 'arcs' && (
              <div className="space-y-3 animate-tab-content">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30">
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span>Arcos Narrativos</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        {arcs.filter(a => a.status === 'ACTIVE').length} ativos
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Objetivos principais e secundários guiados pelo Mestre IA.</p>
                  </div>
                  <button
                    onClick={() => setIsNewArcModal(true)}
                    className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-sm shadow-amber-900/30"
                    title="Novo Arco"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {arcs.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-400 space-y-2">
                    <p>Nenhum arco narrativo registrado ainda.</p>
                    <button
                      onClick={() => setIsNewArcModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-xs transition cursor-pointer"
                    >
                      Criar Primeira Quest
                    </button>
                  </div>
                ) : (
                  arcs.map(arc => {
                    const isCompleted = arc.status === 'COMPLETED';
                    return (
                      <div
                        key={arc.id}
                        className={`p-3 rounded-lg border text-xs transition ${
                          isCompleted
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                            : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-slate-200 block text-xs">
                              {arc.title}
                            </span>
                            {arc.goal && (
                              <p className="text-slate-400 mt-0.5 leading-relaxed text-[11px]">
                                {arc.goal}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleToggleArcStatus(arc)}
                              className={`p-1.5 rounded transition cursor-pointer active:scale-95 ${
                                isCompleted
                                  ? 'text-emerald-400 hover:text-emerald-300'
                                  : 'text-slate-400 hover:text-emerald-400'
                              }`}
                              title={isCompleted ? "Reabrir Quest" : "Concluir Quest"}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteArc(arc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 active:text-rose-300 rounded transition cursor-pointer active:scale-95"
                              title="Remover Arco"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {arc.currentProgress && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-amber-300/80 flex items-center justify-between">
                            <span>Progresso: {arc.currentProgress}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                              isCompleted ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                            }`}>
                              {arc.status}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ABA 2: NPCS (CRISTALIZAÇÃO & PERSISTÊNCIA) */}
            {activeTab === 'npcs' && (
              <div className="space-y-3 animate-tab-content">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span>Personagens & NPCs</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        {npcs.filter(n => n.isCrystallized).length} cristalizados
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">NPCs cristalizados são preservados na memória ativa do Mestre IA.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsAiNpcModal(true)}
                      className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-amber-900/30 active:scale-95"
                      title="Forjar NPC, Inimigo ou Boss com IA baseado no sistema de regras"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Forjar com IA</span>
                    </button>
                    <button
                      onClick={() => setIsNewNpcModal(true)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs flex items-center gap-1 transition cursor-pointer border border-slate-700 active:scale-95"
                      title="Novo NPC Manual"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Barra de Busca Rápida e Ações Globais */}
                {npcs.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={npcSearchTerm}
                          onChange={e => setNpcSearchTerm(e.target.value)}
                          placeholder="Buscar por nome ou papel..."
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-900/90 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500 transition"
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleAllNpcs(true)}
                          className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 rounded transition cursor-pointer"
                          title="Expandir detalhes de todos os NPCs"
                        >
                          Expandir
                        </button>
                        <button
                          onClick={() => toggleAllNpcs(false)}
                          className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 rounded transition cursor-pointer"
                          title="Recolher detalhes de todos os NPCs"
                        >
                          Recolher
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        onClick={() => setNpcFilterMode('ALL')}
                        className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                          npcFilterMode === 'ALL'
                            ? 'bg-slate-800 text-slate-200 font-semibold'
                            : 'text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        Todos ({npcs.length})
                      </button>
                      <button
                        onClick={() => setNpcFilterMode('CRYSTALLIZED')}
                        className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer flex items-center gap-1 ${
                          npcFilterMode === 'CRYSTALLIZED'
                            ? 'bg-amber-950/80 text-amber-300 font-semibold border border-amber-900/50'
                            : 'text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        <Sparkle className="w-2.5 h-2.5 text-amber-400" />
                        Cristalizados ({npcs.filter(n => n.isCrystallized).length})
                      </button>
                    </div>
                  </div>
                )}

                {npcs.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-400 space-y-2">
                    <p>Nenhum personagem registrado nesta crônica.</p>
                    <button
                      onClick={() => setIsNewNpcModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-xs transition cursor-pointer"
                    >
                      Registrar Primeiro NPC
                    </button>
                  </div>
                ) : (
                  npcs
                    .filter(npc => {
                      if (npcFilterMode === 'CRYSTALLIZED' && !npc.isCrystallized) return false;
                      if (!npcSearchTerm.trim()) return true;
                      const term = npcSearchTerm.toLowerCase();
                      return (
                        npc.name.toLowerCase().includes(term) ||
                        (npc.role && npc.role.toLowerCase().includes(term))
                      );
                    })
                    .map(npc => {
                      const isExpanded = !!expandedNpcIds[npc.id];
                      const hasStoryDetails = !!(npc.description || npc.personality || npc.memory);

                      return (
                        <div
                          key={npc.id}
                          className={`p-3 rounded-lg border text-xs transition space-y-2.5 ${
                            npc.isCrystallized 
                              ? 'bg-slate-950/90 border-amber-500/40 shadow-sm shadow-amber-900/10' 
                              : 'bg-slate-950/40 border-slate-800/80 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                              {/* Avatar / Imagem com Fallback Temático */}
                              <div className="w-10 h-10 rounded-full border border-amber-500/40 bg-slate-900 shrink-0 overflow-hidden flex items-center justify-center shadow-inner relative group">
                                {npc.imageUrl ? (
                                  <img 
                                    src={npc.imageUrl} 
                                    alt={npc.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-amber-400 font-bold text-xs uppercase">
                                    {npc.name.slice(0, 2)}
                                  </span>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-200 text-xs">
                                    {npc.name}
                                  </span>
                                  <NpcTierBadge tier={npc.tier} />
                                  <span className="text-[10px] text-amber-400 px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-900/40">
                                    {npc.role || 'Personagem'}
                                  </span>
                                </div>
                                {npc.description && !isExpanded && (
                                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                    {npc.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Botão de Evoluir por Evento com IA */}
                              <button
                                onClick={() => setEvolvingNpc(npc)}
                                className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 active:bg-amber-900/60 rounded transition cursor-pointer active:scale-95"
                                title="Evoluir Atributos por Evento (IA)"
                              >
                                <Zap className="w-3.5 h-3.5" />
                              </button>

                              {/* Botão de Editar Ficha/Imagem */}
                              <button
                                onClick={() => setEditingNpc(npc)}
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:bg-slate-700 rounded transition cursor-pointer active:scale-95"
                                title="Editar Atributos & Imagem"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleCrystallize(npc)}
                                className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                                  npc.isCrystallized
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                                title={npc.isCrystallized ? "Cristalizado no Contexto do Mestre" : "Passageiro (não injetado)"}
                              >
                                <Sparkle className="w-3 h-3 text-amber-400" />
                                <span className="hidden sm:inline">{npc.isCrystallized ? 'Cristalizado' : 'Passageiro'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteNpc(npc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 active:text-rose-300 hover:bg-rose-950/40 rounded transition cursor-pointer active:scale-95"
                                title="Remover NPC"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* REQUISITO: Atributos Estruturados em Tabela (Paridade com a ficha do PJ) */}
                          {npc.attributes && (
                            <AttributeTableView
                              rawAttributes={npc.attributes}
                              title="Atributos & Combate"
                              copyId={`attr-${npc.id}`}
                              onCopy={handleCopyToClipboard}
                              copiedId={copiedId}
                              compact={true}
                            />
                          )}

                          {/* REQUISITO: Habilidades & Técnicas */}
                          {npc.skills && (
                            <NpcSkillsView rawSkills={npc.skills} />
                          )}

                          {/* REQUISITO: Estratégia de Combate / Padrão de Combate / Fases / Fraquezas */}
                          {npc.combatStrategy && (
                            <NpcStrategyView rawStrategy={npc.combatStrategy} tier={npc.tier} />
                          )}

                          {/* Toggle de Detalhes da História (Descrição, Personalidade, Memória) */}
                          {hasStoryDetails && (
                            <div>
                              <button
                                onClick={() => toggleNpcExpanded(npc.id)}
                                className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-900/60 text-[11px] text-slate-400 hover:text-amber-300 transition cursor-pointer"
                              >
                                <span>{isExpanded ? 'Ocultar detalhes da história' : 'Ver história & personalidade'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 space-y-2 pt-2 border-t border-slate-800/80 animate-fadeIn">
                                  {npc.description && (
                                    <div className="text-slate-300 text-[11px] leading-relaxed">
                                      <strong className="text-slate-400 block mb-0.5">Descrição:</strong>
                                      <p className="text-slate-300">{npc.description}</p>
                                    </div>
                                  )}

                                  {npc.personality && (
                                    <div className="text-slate-300 text-[11px] leading-relaxed">
                                      <strong className="text-slate-400 block mb-0.5">Personalidade:</strong>
                                      <p className="text-slate-300">{npc.personality}</p>
                                    </div>
                                  )}

                                  {npc.memory && (
                                    <div className="text-amber-200/90 text-[11px] leading-relaxed italic bg-amber-950/20 p-2 rounded border border-amber-900/30">
                                      <strong className="text-amber-400 not-italic block mb-0.5">Memória com o PJ:</strong>
                                      {npc.memory}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            )}


            {/* ABA 2: DECISÕES DO MUNDO (MEMÓRIA PERMANENTE) */}
            {activeTab === 'decisions' && (
              <div className="space-y-3 animate-tab-content">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30">
                        <Landmark className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span>Memória do Mundo</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        {decisions.length} fatos
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Marcas permanentes e escolhas históricas que afetam a narrativa.</p>
                  </div>
                  <button
                    onClick={() => setIsNewDecisionModal(true)}
                    className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-sm shadow-amber-900/30"
                    title="Registrar Decisão"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {decisions.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-400 space-y-2">
                    <p>O mundo ainda aguarda as suas escolhas históricas.</p>
                    <button
                      onClick={() => setIsNewDecisionModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-xs transition cursor-pointer"
                    >
                      Registrar Escolha Importante
                    </button>
                  </div>
                ) : (
                  decisions.map(dec => (
                    <div
                      key={dec.id}
                      className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 hover:border-amber-500/40 text-xs transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-300 text-xs">{dec.title}</span>
                        <button
                          onClick={() => handleDeleteDecision(dec.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                          title="Remover Decisão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        <strong className="text-slate-400">Ato:</strong> {dec.decision}
                      </p>

                      {dec.consequence && (
                        <p className="text-amber-200/90 leading-relaxed text-[11px] italic bg-amber-950/30 p-2 rounded border border-amber-900/30">
                          <strong className="text-amber-400">Impacto:</strong> {dec.consequence}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABA 3: BÍBLIA & REGRAS */}
            {activeTab === 'bible' && (
              <div className="space-y-3 text-xs animate-tab-content">
                {/* Cabeçalho da Aba & Ações Globais */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 tracking-wide">Bíblia da Campanha</h3>
                      <p className="text-[11px] text-slate-400">Regras, criação de personagem e lore canônico.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleAllBibleSections(true)}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded transition cursor-pointer font-medium active:scale-95"
                      title="Expandir todas as seções da bíblia"
                    >
                      Expandir Todas
                    </button>
                    <button
                      onClick={() => toggleAllBibleSections(false)}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded transition cursor-pointer font-medium active:scale-95"
                      title="Recolher todas as seções da bíblia"
                    >
                      Recolher Todas
                    </button>
                  </div>
                </div>

                {/* Seção 1: Sistema de Regras & Arbitragem */}
                <div className="p-3 bg-slate-950/70 rounded-lg border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleBibleSection('system')}
                      className="font-semibold text-amber-300 flex items-center gap-1.5 hover:text-amber-200 transition cursor-pointer text-left"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Sistema: {selectedCampaign.system?.name || 'Regras Padrão'}</span>
                      {expandedBibleSections.system ? (
                        <ChevronUp className="w-3.5 h-3.5 text-amber-400 ml-1" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const fullRules = [
                            selectedCampaign.system?.name ? `Sistema: ${selectedCampaign.system.name}` : '',
                            selectedCampaign.system?.coreMechanics || '',
                            selectedCampaign.system?.statsAndAttributes ? `Atributos: ${selectedCampaign.system.statsAndAttributes}` : '',
                            selectedCampaign.system?.rollInstructions ? `Instruções de Rolagem: ${selectedCampaign.system.rollInstructions}` : ''
                          ].filter(Boolean).join('\n\n');
                          handleCopyToClipboard(fullRules, 'bible-system');
                        }}
                        className="px-1.5 py-1 text-slate-400 hover:text-amber-300 rounded text-[10px] flex items-center gap-1 transition cursor-pointer"
                        title="Copiar regras do sistema"
                      >
                        {copiedId === 'bible-system' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setIsRulesModal(true)}
                        className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer border border-amber-500/40"
                        title="Importar e compactar manuais (PDF, MD, CSV, TXT) ou texto com IA"
                      >
                        <Brain className="w-3 h-3" />
                        <span>Sintetizar</span>
                      </button>
                    </div>
                  </div>

                  {expandedBibleSections.system ? (
                    <div className="space-y-2 pt-1 border-t border-slate-800/80 animate-fadeIn">
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line font-mono text-[11px]">
                        {selectedCampaign.system?.coreMechanics || 'Rolagens de D20 e validações contra regras do cenário.'}
                      </p>
                      {selectedCampaign.system?.statsAndAttributes && (
                        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                          <strong className="text-slate-300">Atributos & Cálculos:</strong>
                          <p className="mt-0.5 font-mono">{selectedCampaign.system.statsAndAttributes}</p>
                        </div>
                      )}
                      {selectedCampaign.system?.rollInstructions && (
                        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-amber-300/80">
                          <strong className="text-amber-400">Instruções de Rolagem & DT:</strong>
                          <p className="mt-0.5 font-mono">{selectedCampaign.system.rollInstructions}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[10px] italic line-clamp-1">
                      {selectedCampaign.system?.coreMechanics || 'Rolagens de D20 e validações contra regras do cenário.'}
                    </p>
                  )}
                </div>

                {/* Seção 2: Personagem do Jogador */}
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleBibleSection('character')}
                      className="font-semibold text-slate-300 flex items-center gap-1.5 hover:text-amber-300 transition cursor-pointer text-left"
                    >
                      <span>🧙 Personagem do Jogador (PJ)</span>
                      {expandedBibleSections.character ? (
                        <ChevronUp className="w-3.5 h-3.5 text-amber-400 ml-1" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsEvolvingCharacter(true)}
                        className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-300 border border-amber-500/30 rounded text-[10px] flex items-center gap-1 transition cursor-pointer font-medium active:scale-95"
                        title="Evoluir Atributos do Personagem com IA"
                      >
                        <TrendingUp className="w-3 h-3 text-amber-400" />
                        <span>Evoluir (IA)</span>
                      </button>
                      <button
                        onClick={() => {
                          const pjContent = [
                            selectedCampaign.bible?.playerCharacter || '',
                            selectedCampaign.bible?.characterAttributes ? `Atributos:\n${selectedCampaign.bible.characterAttributes}` : ''
                          ].filter(Boolean).join('\n\n');
                          handleCopyToClipboard(pjContent, 'bible-character');
                        }}
                        className="px-1.5 py-1 text-slate-400 hover:text-amber-300 rounded text-[10px] flex items-center gap-1 transition cursor-pointer"
                        title="Copiar dados do personagem"
                      >
                        {copiedId === 'bible-character' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedBibleSections.character ? (
                    <div className="space-y-2 pt-1 border-t border-slate-800/80 animate-fadeIn">
                      <p className="text-slate-400 leading-relaxed whitespace-pre-line text-[11px]">
                        {selectedCampaign.bible?.playerCharacter || 'Não especificado ainda.'}
                      </p>

                      {/* Atributos Formatados em Tabela Padronizada */}
                      {selectedCampaign.bible?.characterAttributes && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                          <AttributeTableView
                            rawAttributes={selectedCampaign.bible.characterAttributes}
                            title="Atributos & Estatísticas Ativas"
                            copyId="bible-character-attr"
                            onCopy={handleCopyToClipboard}
                            copiedId={copiedId}
                            compact={true}
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setActiveTab('character')}
                              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <span>Ver Ficha Completa na Aba Personagem</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[10px] italic line-clamp-1">
                      {selectedCampaign.bible?.playerCharacter || 'Não especificado ainda.'}
                    </p>
                  )}
                </div>

                {/* Seção 3: Lore do Mundo */}
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleBibleSection('lore')}
                      className="font-semibold text-slate-300 flex items-center gap-1.5 hover:text-amber-300 transition cursor-pointer text-left"
                    >
                      <span>🗺️ Lore do Mundo</span>
                      {expandedBibleSections.lore ? (
                        <ChevronUp className="w-3.5 h-3.5 text-amber-400 ml-1" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        handleCopyToClipboard(selectedCampaign.bible?.worldLore || '', 'bible-lore');
                      }}
                      className="px-1.5 py-1 text-slate-400 hover:text-amber-300 rounded text-[10px] flex items-center gap-1 transition cursor-pointer"
                      title="Copiar lore do mundo"
                    >
                      {copiedId === 'bible-lore' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {expandedBibleSections.lore ? (
                    <div className="pt-1 border-t border-slate-800/80 animate-fadeIn">
                      <p className="text-slate-400 leading-relaxed whitespace-pre-line text-[11px]">
                        {selectedCampaign.bible?.worldLore || 'Sem registros detalhados de lore.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[10px] italic line-clamp-1">
                      {selectedCampaign.bible?.worldLore || 'Sem registros detalhados de lore.'}
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        </aside>
      )}

      {/* MODAL: CRIAR NOVO ARCO */}
      {isNewArcModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" />
              Novo Arco Narrativo / Missão
            </h3>
            <form onSubmit={handleCreateArc} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Título da Quest *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: O Resgate do Mensageiro"
                  value={newArcTitle}
                  onChange={e => setNewArcTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Objetivo / Meta</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Localizar o mensageiro capturado pelos bandidos nas colinas."
                  value={newArcGoal}
                  onChange={e => setNewArcGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewArcModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium cursor-pointer"
                >
                  Registrar Arco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR DECISÃO DO MUNDO */}
      {isNewDecisionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2 mb-3">
              <Landmark className="w-4 h-4" />
              Registrar Marco no Mundo
            </h3>
            <form onSubmit={handleCreateDecision} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Título do Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aliança com os Rebeldes de Ferro"
                  value={newDecisionTitle}
                  onChange={e => setNewDecisionTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Decisão Tomada pelo PJ *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: O herói recusou o suborno do barão e entregou os documentos aos rebeldes."
                  value={newDecisionAction}
                  onChange={e => setNewDecisionAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Consequência / Impacto no Cenário</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Os guardas da cidade agora estão hostis, mas os rebeldes oferecem abrigo seguro."
                  value={newDecisionConsequence}
                  onChange={e => setNewDecisionConsequence(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewDecisionModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium cursor-pointer"
                >
                  Gravar na Memória
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ISOLADO: CRIAÇÃO DE NOVO NPC */}
      <NpcFormModal
        isOpen={isNewNpcModal}
        onClose={() => setIsNewNpcModal(false)}
        selectedCampaign={selectedCampaign}
        onNpcSaved={(npc) => setNpcs(prev => [npc, ...prev])}
      />

      {/* MODAL ISOLADO: FORJAR NPC OU BOSS COM IA */}
      <AiNpcGeneratorModal
        isOpen={isAiNpcModal}
        onClose={() => setIsAiNpcModal(false)}
        selectedCampaign={selectedCampaign}
        onNpcGenerated={(npc) => setNpcs(prev => [npc, ...prev])}
      />

      {/* MODAL ISOLADO: EDITAR NPC */}
      <NpcFormModal
        isOpen={Boolean(editingNpc)}
        onClose={() => setEditingNpc(null)}
        initialNpc={editingNpc}
        selectedCampaign={selectedCampaign}
        onNpcSaved={(npc) => setNpcs(prev => prev.map(n => n.id === npc.id ? npc : n))}
      />

      {/* MODAL ISOLADO: EVOLUIR NPC POR EVENTO NARRATIVO COM IA */}
      <NpcEvolutionModal
        npc={evolvingNpc}
        onClose={() => setEvolvingNpc(null)}
        selectedCampaign={selectedCampaign}
        onNpcEvolved={(npc) => setNpcs(prev => prev.map(n => n.id === npc.id ? npc : n))}
      />

      {/* MODAL ISOLADO: EVOLUÇÃO DE ATRIBUTOS DO PERSONAGEM COM IA */}
      <CharacterProgressionModal
        isOpen={isEvolvingCharacter}
        onClose={() => setIsEvolvingCharacter(false)}
        selectedCampaign={selectedCampaign}
        onProgressionSaved={(camp) => {
          setSelectedCampaign(camp);
          setCampaigns(prev => prev.map(c => c.id === camp.id ? camp : c));
        }}
      />

      {/* MODAL ISOLADO: SINTETIZADOR DE REGRAS COM IA */}
      <RulesSynthesizerModal
        isOpen={isRulesModal}
        onClose={() => setIsRulesModal(false)}
        selectedCampaign={selectedCampaign}
        onRulesUpdated={(camp) => {
          setSelectedCampaign(camp);
          setCampaigns(prev => prev.map(c => c.id === camp.id ? camp : c));
        }}
      />

      {/* MODAL ISOLADO: CRIAÇÃO DE CAMPANHA */}
      <CreateCampaignModal
        isOpen={isCreatingModal}
        onClose={() => setIsCreatingModal(false)}
        onCampaignCreated={(camp) => {
          setCampaigns(prev => [camp, ...prev]);
          handleSelectCampaign(camp);
        }}
      />

      {/* MODAL ISOLADO: CONFIRMAÇÃO & INTENÇÃO DA ROLAGEM DE DADOS */}
      <RollConfirmModal
        data={rollConfirmData}
        initialMessage={rollActionMessage}
        onClose={() => {
          setRollConfirmData(null);
          setRollActionMessage('');
        }}
        onConfirm={(msg) => executeRollConfirmed(msg)}
      />

      {/* MODAL CINEMATOGRÁFICO: CRÔNICA DE FIM DE EPISÓDIO / ATO */}
      {summaryModalSession && (
        <EpisodeSummaryModal
          session={summaryModalSession}
          onClose={() => {
            setSummaryModalSession(null);
            setPendingNextSession(null);
          }}
          onProceedToNext={pendingNextSession ? handleProceedToNextAct : undefined}
          isProceeding={false}
        />
      )}

    </div>
  );
}

export default App;
