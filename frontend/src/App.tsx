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
  FastForward,
  Upload,
  FileText,
  Brain,
  Menu,
  X,
  LogOut,
  SlidersHorizontal,
  Download,
  FileSpreadsheet,
  Edit,
  Zap
} from 'lucide-react';

import { LoginScreen } from './components/LoginScreen';
import { api } from './services/api';

import type { Campaign, Session, Message, StoryArc, WorldDecision, Npc } from './types/soloforge';

interface PendingCheck {
  dice: string;      // ex: "d20"
  dc: number;        // ex: 14
  attribute: string; // ex: "Destreza"
  reason: string;    // ex: "Desviar da armadilha de espinhos"
}

type RightPanelTab = 'bible' | 'arcs' | 'decisions' | 'npcs';


export function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConcludingSession, setIsConcludingSession] = useState(false);
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

  // Painel Direito: Abas
  const [activeTab, setActiveTab] = useState<RightPanelTab>('arcs');
  const [arcs, setArcs] = useState<StoryArc[]>([]);
  const [decisions, setDecisions] = useState<WorldDecision[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);

  // Modais de Criação Rápida de Arco, Decisão e NPC
  const [isNewArcModal, setIsNewArcModal] = useState(false);
  const [newArcTitle, setNewArcTitle] = useState('');
  const [newArcGoal, setNewArcGoal] = useState('');

  const [isNewDecisionModal, setIsNewDecisionModal] = useState(false);
  const [newDecisionTitle, setNewDecisionTitle] = useState('');
  const [newDecisionAction, setNewDecisionAction] = useState('');
  const [newDecisionConsequence, setNewDecisionConsequence] = useState('');

  const [isNewNpcModal, setIsNewNpcModal] = useState(false);
  const [newNpcName, setNewNpcName] = useState('');
  const [newNpcRole, setNewNpcRole] = useState('');
  const [newNpcPersonality, setNewNpcPersonality] = useState('');
  const [newNpcMemory, setNewNpcMemory] = useState('');
  const [newNpcImageUrl, setNewNpcImageUrl] = useState('');
  const [newNpcAttributes, setNewNpcAttributes] = useState('');

  // Edição Manual de NPC
  const [editingNpc, setEditingNpc] = useState<Npc | null>(null);
  const [editNpcName, setEditNpcName] = useState('');
  const [editNpcRole, setEditNpcRole] = useState('');
  const [editNpcPersonality, setEditNpcPersonality] = useState('');
  const [editNpcMemory, setEditNpcMemory] = useState('');
  const [editNpcImageUrl, setEditNpcImageUrl] = useState('');
  const [editNpcAttributes, setEditNpcAttributes] = useState('');

  // Evolução de NPC por Evento com IA
  const [evolvingNpc, setEvolvingNpc] = useState<Npc | null>(null);
  const [evolveEventText, setEvolveEventText] = useState('');
  const [isEvolvingNpc, setIsEvolvingNpc] = useState(false);

  // Gerador de NPC/Boss com IA
  const [isAiNpcModal, setIsAiNpcModal] = useState(false);
  const [aiNpcConcept, setAiNpcConcept] = useState('');
  const [aiNpcType, setAiNpcType] = useState<'BOSS' | 'MINION' | 'ALLY' | 'RIVAL' | 'MERCHANT'>('BOSS');
  const [aiNpcChallenge, setAiNpcChallenge] = useState<'FÁCIL' | 'MÉDIO' | 'DIFÍCIL' | 'MORTAL' | 'LENDÁRIO'>('DIFÍCIL');
  const [aiNpcImageUrl, setAiNpcImageUrl] = useState('');
  const [isGeneratingAiNpc, setIsGeneratingAiNpc] = useState(false);


  // Modal de Importação & Síntese de Regras (Etapa de Regras com IA)
  const [isRulesModal, setIsRulesModal] = useState(false);
  const [rulesInputMode, setRulesInputMode] = useState<'text' | 'files'>('files');
  const [rawRulesInputText, setRawRulesInputText] = useState('');
  const [rulesSystemName, setRulesSystemName] = useState('');
  const [selectedRuleFiles, setSelectedRuleFiles] = useState<File[]>([]);
  const [isSynthesizingRules, setIsSynthesizingRules] = useState(false);



  // Formulário de Nova Campanha
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('Dark Fantasy');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newCharacter, setNewCharacter] = useState('');
  const [newLore, setNewLore] = useState('');
  const [newRules, setNewRules] = useState(
    '1. Toda ação arriscada exige teste d20 contra uma DT definida pelo Mestre.\n' +
    '2. Dificuldades: Fácil (10), Média (15), Difícil (20), Quase Impossível (25).\n' +
    '3. O Mestre deve barrar ações que infrinjam os atributos, inventário ou a física do cenário.'
  );

  // Opções de regras na criação de campanha
  const [creationRulesMode, setCreationRulesMode] = useState<'text' | 'files'>('text');
  const [creationSystemName, setCreationSystemName] = useState('');
  const [creationRuleFiles, setCreationRuleFiles] = useState<File[]>([]);
  const [isCreatingCampaignLoading, setIsCreatingCampaignLoading] = useState(false);

  // Tabela Dinâmica de Atributos do Personagem
  const [newAttributes, setNewAttributes] = useState<{ id: string; name: string; value: string }[]>([
    { id: '1', name: 'Força', value: '+3' },
    { id: '2', name: 'Destreza', value: '+2' },
    { id: '3', name: 'Constituição', value: '+2' },
    { id: '4', name: 'Inteligência', value: '+0' },
    { id: '5', name: 'Sabedoria', value: '+1' },
    { id: '6', name: 'Carisma', value: '-1' }
  ]);

  const addAttributeRow = () => {
    setNewAttributes(prev => [...prev, { id: Date.now().toString(), name: '', value: '' }]);
  };

  const removeAttributeRow = (id: string) => {
    setNewAttributes(prev => prev.filter(attr => attr.id !== id));
  };

  const updateAttributeRow = (id: string, field: 'name' | 'value', val: string) => {
    setNewAttributes(prev => prev.map(attr => attr.id === id ? { ...attr, [field]: val } : attr));
  };

  const applyAttributePreset = (preset: 'd20' | 'cthulhu' | 'cyberpunk' | 'narrative') => {
    if (preset === 'd20') {
      setNewAttributes([
        { id: '1', name: 'Força', value: '+3' },
        { id: '2', name: 'Destreza', value: '+2' },
        { id: '3', name: 'Constituição', value: '+2' },
        { id: '4', name: 'Inteligência', value: '+0' },
        { id: '5', name: 'Sabedoria', value: '+1' },
        { id: '6', name: 'Carisma', value: '-1' }
      ]);
    } else if (preset === 'cthulhu') {
      setNewAttributes([
        { id: '1', name: 'Físico / Força', value: '55%' },
        { id: '2', name: 'Destreza / Fuga', value: '60%' },
        { id: '3', name: 'Investigação / Percepção', value: '75%' },
        { id: '4', name: 'Ocultismo / Misticismo', value: '40%' },
        { id: '5', name: 'Lábia / Persuasão', value: '50%' },
        { id: '6', name: 'Sanidade Atual', value: '70 / 99' }
      ]);
    } else if (preset === 'cyberpunk') {
      setNewAttributes([
        { id: '1', name: 'Reflexos', value: '8' },
        { id: '2', name: 'Interface / Hacking', value: '9' },
        { id: '3', name: 'Frieza / Sangue Frio', value: '7' },
        { id: '4', name: 'Tecnologia', value: '6' },
        { id: '5', name: 'Corpo / Armadura', value: '5' }
      ]);
    } else if (preset === 'narrative') {
      setNewAttributes([
        { id: '1', name: 'Corpo', value: 'Forte' },
        { id: '2', name: 'Mente', value: 'Astuta' },
        { id: '3', name: 'Alma', value: 'Inabalável' }
      ]);
    }
  };

  const handleDownloadAttributeTemplate = () => {
    const templateData = {
      descricao: "Modelo de Ficha de Atributos do SoloForge - Adapte conforme o seu livro de regras",
      personagem: "Thorne, o Proscrito",
      atributos: newAttributes.map(a => ({ atributo: a.name || 'Nome', valor: a.value || '0' }))
    };
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_atributos_soloforge.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAttributesFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.atributos)) {
            const imported = parsed.atributos.map((item: { atributo?: string; valor?: string; name?: string; value?: string }, idx: number) => ({
              id: `${Date.now()}-${idx}`,
              name: item.atributo || item.name || '',
              value: String(item.valor ?? item.value ?? '')
            }));
            if (imported.length > 0) setNewAttributes(imported);
          } else if (typeof parsed === 'object') {
            const imported = Object.entries(parsed).map(([key, val], idx) => ({
              id: `${Date.now()}-${idx}`,
              name: key,
              value: String(val)
            }));
            if (imported.length > 0) setNewAttributes(imported);
          }
        } else {
          // Linhas em CSV ou TXT (formato: Nome,Valor ou Nome:Valor)
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
          const imported = lines.map((line, idx) => {
            const parts = line.includes(':') ? line.split(':') : line.split(',');
            return {
              id: `${Date.now()}-${idx}`,
              name: parts[0]?.trim() || '',
              value: parts.slice(1).join(',').trim() || ''
            };
          }).filter(item => item.name);
          if (imported.length > 0) setNewAttributes(imported);
        }
      } catch {
        alert('Não foi possível ler o arquivo. Certifique-se de que é um JSON, CSV ou TXT válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


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

      // Carrega arcos e decisões da campanha
      loadSideData(camp.id);
    } catch (e) {
      console.error(e);
    }
  };


  const loadSideData = async (campaignId: string) => {
    try {
      const [arcsData, decisionsData, npcsData] = await Promise.all([
        api.getArcs(campaignId),
        api.getDecisions(campaignId),
        api.getNpcs(campaignId)
      ]);
      setArcs(arcsData);
      setDecisions(decisionsData);
      setNpcs(npcsData);
    } catch {
      console.log('Modo offline / sem dados de arcos');
    }
  };


  const parseRollRequest = (text: string): PendingCheck | null => {
    const match = text.match(/\[PEDIR_TESTE:\s*([dD]\d+)\s*\|\s*DT:\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/i);
    if (match) {
      return {
        dice: match[1].toLowerCase(),
        dc: parseInt(match[2], 10),
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
        setPendingCheck(check);
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
        setPendingCheck(check);
      }
      scrollToBottom();
    } catch {
      let mockReply = '';
      if (isDiceRoll) {
        mockReply = `[SoloForge GM]: O som dos dados ecoa no chão de pedra! Vejo seu resultado para o teste. Diante do esforço, as circunstâncias se desenrolam à sua volta... O que você faz a seguir?`;
      } else {
        mockReply = `[SoloForge GM]: Diante de sua intenção "${textToSend}", o Mestre analisa suas capacidades e a física do ambiente. O peso da decisão se faz sentir.\n\n[PEDIR_TESTE: d20 | DT: 14 | Reflexos | Agir antes que o perigo se concretize]`;
      }

      const gmMsg: Message = {
        id: 'mock-' + Date.now(),
        sessionId: currentSession.id,
        sender: 'GM',
        senderName: 'Mestre IA',
        content: mockReply,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, gmMsg]);
      const check = parseRollRequest(mockReply);
      if (check) setPendingCheck(check);
      scrollToBottom();
    } finally {
      setIsLoading(false);
    }
  };

  const rollDice = (sides: number, checkTarget?: PendingCheck) => {
    const roll = Math.floor(Math.random() * sides) + 1;
    let messageText = '';

    if (checkTarget) {
      const isSuccess = roll >= checkTarget.dc;
      const isCritSuccess = sides === 20 && roll === 20;
      const isCritFail = sides === 20 && roll === 1;

      let resultOutcome = isSuccess ? 'SUCESSO' : 'FALHA';
      if (isCritSuccess) resultOutcome = 'SUCESSO CRÍTICO (20 NATURAL)!';
      if (isCritFail) resultOutcome = 'FALHA CRÍTICA (1 NATURAL)!';

      messageText = `🎲 [TESTE OFICIAL: ${checkTarget.attribute}]: O jogador rolou 1d${sides} e obteve [ ${roll} ] contra DT ${checkTarget.dc} (${resultOutcome}) para "${checkTarget.reason}".`;
    } else {
      messageText = `🎲 [ROLAGEM LIVRE]: Rolou 1d${sides} e obteve [ ${roll} ].`;
    }

    handleSendMessage(messageText, true);
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
    } catch {
      const mockArc: StoryArc = {
        id: 'arc-' + Date.now(),
        campaignId: selectedCampaign.id,
        title: newArcTitle,
        goal: newArcGoal,
        status: 'ACTIVE',
        currentProgress: 'Iniciado recentemente.',
        createdAt: new Date().toISOString()
      };
      setArcs(prev => [mockArc, ...prev]);
      setIsNewArcModal(false);
      setNewArcTitle('');
      setNewArcGoal('');
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
    } catch {
      setArcs(prev => prev.map(a => a.id === arc.id ? { ...a, status: nextStatus } : a));
    }
  };

  const handleDeleteArc = async (arcId: string) => {
    if (!selectedCampaign) return;
    try {
      await api.deleteArc(selectedCampaign.id, arcId);
      setArcs(prev => prev.filter(a => a.id !== arcId));
    } catch {
      setArcs(prev => prev.filter(a => a.id !== arcId));
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
    } catch {
      const mockDec: WorldDecision = {
        id: 'dec-' + Date.now(),
        campaignId: selectedCampaign.id,
        title: newDecisionTitle,
        decision: newDecisionAction,
        consequence: newDecisionConsequence || 'As repercussões ainda se manifestam pelo reino.',
        createdAt: new Date().toISOString()
      };
      setDecisions(prev => [mockDec, ...prev]);
      setIsNewDecisionModal(false);
      setNewDecisionTitle('');
      setNewDecisionAction('');
      setNewDecisionConsequence('');
    }
  };

  const handleDeleteDecision = async (decisionId: string) => {
    if (!selectedCampaign) return;
    try {
      await api.deleteDecision(selectedCampaign.id, decisionId);
      setDecisions(prev => prev.filter(d => d.id !== decisionId));
    } catch {
      setDecisions(prev => prev.filter(d => d.id !== decisionId));
    }
  };

  // Handlers para NPCs
  const handleCreateNpc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !newNpcName.trim()) return;

    try {
      const created = await api.createNpc(selectedCampaign.id, {
        name: newNpcName,
        role: newNpcRole,
        personality: newNpcPersonality,
        memory: newNpcMemory,
        imageUrl: newNpcImageUrl.trim() || undefined,
        attributes: newNpcAttributes.trim() || undefined,
        isCrystallized: true
      });
      setNpcs(prev => [created, ...prev]);
      setIsNewNpcModal(false);
      setNewNpcName('');
      setNewNpcRole('');
      setNewNpcPersonality('');
      setNewNpcMemory('');
      setNewNpcImageUrl('');
      setNewNpcAttributes('');
    } catch {
      const mockNpc: Npc = {
        id: 'npc-' + Date.now(),
        campaignId: selectedCampaign.id,
        name: newNpcName,
        role: newNpcRole || 'Habitante',
        personality: newNpcPersonality,
        memory: newNpcMemory,
        imageUrl: newNpcImageUrl.trim() || undefined,
        attributes: newNpcAttributes.trim() || undefined,
        isCrystallized: true,
        createdAt: new Date().toISOString()
      };
      setNpcs(prev => [mockNpc, ...prev]);
      setIsNewNpcModal(false);
      setNewNpcName('');
      setNewNpcRole('');
      setNewNpcPersonality('');
      setNewNpcMemory('');
      setNewNpcImageUrl('');
      setNewNpcAttributes('');
    }
  };

  const handleGenerateAiNpc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || isGeneratingAiNpc) return;

    setIsGeneratingAiNpc(true);
    try {
      const generated = await api.generateNpcWithAi(selectedCampaign.id, {
        concept: aiNpcConcept.trim() || undefined,
        type: aiNpcType,
        challengeLevel: aiNpcChallenge,
        imageUrl: aiNpcImageUrl.trim() || undefined
      });
      setNpcs(prev => [generated, ...prev]);
      setIsAiNpcModal(false);
      setAiNpcConcept('');
      setAiNpcImageUrl('');
    } catch (err: unknown) {
      alert('Erro ao forjar NPC com a IA: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsGeneratingAiNpc(false);
    }
  };

  const handleOpenEditNpc = (npc: Npc) => {
    setEditingNpc(npc);
    setEditNpcName(npc.name);
    setEditNpcRole(npc.role || '');
    setEditNpcPersonality(npc.personality || '');
    setEditNpcMemory(npc.memory || '');
    setEditNpcImageUrl(npc.imageUrl || '');
    setEditNpcAttributes(npc.attributes || '');
  };

  const handleSaveEditNpc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !editingNpc) return;

    try {
      const updated = await api.updateNpc(selectedCampaign.id, editingNpc.id, {
        name: editNpcName,
        role: editNpcRole,
        personality: editNpcPersonality,
        memory: editNpcMemory,
        imageUrl: editNpcImageUrl.trim() || undefined,
        attributes: editNpcAttributes.trim() || undefined
      });
      setNpcs(prev => prev.map(n => n.id === editingNpc.id ? updated : n));
      setEditingNpc(null);
    } catch {
      // Fallback otimista
      setNpcs(prev => prev.map(n => n.id === editingNpc.id ? {
        ...n,
        name: editNpcName,
        role: editNpcRole,
        personality: editNpcPersonality,
        memory: editNpcMemory,
        imageUrl: editNpcImageUrl,
        attributes: editNpcAttributes
      } : n));
      setEditingNpc(null);
    }
  };

  const handleOpenEvolveNpc = (npc: Npc) => {
    setEvolvingNpc(npc);
    setEvolveEventText('');
  };

  const handleEvolveNpc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !evolvingNpc || !evolveEventText.trim() || isEvolvingNpc) return;

    setIsEvolvingNpc(true);
    try {
      const evolved = await api.evolveNpc(selectedCampaign.id, evolvingNpc.id, evolveEventText.trim());
      setNpcs(prev => prev.map(n => n.id === evolvingNpc.id ? evolved : n));
      setEvolvingNpc(null);
      setEvolveEventText('');
    } catch (err: unknown) {
      alert('Erro ao evoluir NPC com IA: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsEvolvingNpc(false);
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
      // 1. Conclui a sessão e obtém o resumo gerado pelo Gemini
      await api.concludeSession(currentSession.id);

      // 2. Recarrega as sessões da campanha
      const updatedSessions = await api.getSessions(selectedCampaign.id);
      setSessions(updatedSessions);

      // 3. Muda automaticamente para o novo Ato criado
      const nextSession = updatedSessions[updatedSessions.length - 1];
      setCurrentSession(nextSession);
      loadMessages(nextSession.id);
      setPendingCheck(null);
    } catch {
      // Mock offline caso a rede falhe
      const finishedActNumber = currentSession.sessionNumber;
      const nextActNumber = finishedActNumber + 1;
      const updatedMock: Session = {
        ...currentSession,
        summary: `Resumo do Ato ${finishedActNumber}: O herói avançou bravamente pelas provações, superou perigos ancestrais e desvendou pistas críticas para a crônica.`
      };

      const newActMock: Session = {
        id: 'session-' + Date.now(),
        campaignId: selectedCampaign.id,
        sessionNumber: nextActNumber,
        title: `Ato ${nextActNumber}`,
        createdAt: new Date().toISOString()
      };

      setSessions(prev => [...prev.map(s => s.id === currentSession.id ? updatedMock : s), newActMock]);
      setCurrentSession(newActMock);
      setMessages([
        {
          id: 'intro-' + Date.now(),
          sessionId: newActMock.id,
          sender: 'GM',
          senderName: 'Mestre IA',
          content: `Inicia-se o Ato ${nextActNumber}! O pó das batalhas passadas começa a assentar, mas um novo horizonte de mistérios se descortina. O que você faz a seguir?`,
          createdAt: new Date().toISOString()
        }
      ]);
      setPendingCheck(null);
    } finally {
      setIsConcludingSession(false);
    }
  };

  const handleSelectSession = (sess: Session) => {
    setCurrentSession(sess);
    loadMessages(sess.id);
    setPendingCheck(null);
    setIsMobileLeftOpen(false);
  };


  // Handler para Sintetizar Regras com IA (Upload de Arquivos ou Texto)
  const handleSynthesizeRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || isSynthesizingRules) return;

    setIsSynthesizingRules(true);
    try {
      let updatedCampaign: Campaign;
      if (rulesInputMode === 'files') {
        if (selectedRuleFiles.length === 0) {
          alert('Por favor, selecione ao menos um arquivo (.pdf, .txt, .md, .csv).');
          setIsSynthesizingRules(false);
          return;
        }
        updatedCampaign = await api.uploadRulesFiles(
          selectedCampaign.id,
          selectedRuleFiles,
          rulesSystemName.trim() || undefined
        );
      } else {
        if (!rawRulesInputText.trim()) {
          alert('Por favor, insira o texto das regras para sintetizar.');
          setIsSynthesizingRules(false);
          return;
        }
        updatedCampaign = await api.synthesizeRulesFromText(
          selectedCampaign.id,
          rawRulesInputText.trim(),
          rulesSystemName.trim() || undefined
        );
      }

      setSelectedCampaign(updatedCampaign);
      setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
      setIsRulesModal(false);
      setRawRulesInputText('');
      setSelectedRuleFiles([]);
      setRulesSystemName('');
    } catch (err: unknown) {
      alert('Erro ao sintetizar regras: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsSynthesizingRules(false);
    }
  };




  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Constrói a representação textual dos atributos (ex: Força: +3 | Destreza: +2)
    const validAttributes = newAttributes.filter(a => a.name.trim());
    const attributesString = validAttributes.length > 0
      ? validAttributes.map(a => `${a.name.trim()}: ${a.value.trim() || '0'}`).join('\n')
      : 'Atributos padrão do sistema';

    setIsCreatingCampaignLoading(true);
    try {
      let created: Campaign;

      if (creationRulesMode === 'files' && creationRuleFiles.length > 0) {
        created = await api.createCampaignWithFiles(
          {
            title: newTitle,
            genre: newGenre,
            synopsis: newSynopsis,
            playerCharacter: newCharacter,
            characterAttributes: attributesString,
            worldLore: newLore,
            systemName: creationSystemName.trim() || undefined
          },
          creationRuleFiles
        );
      } else {
        created = await api.createCampaign({
          title: newTitle,
          genre: newGenre,
          synopsis: newSynopsis,
          playerCharacter: newCharacter,
          characterAttributes: attributesString,
          worldLore: newLore,
          systemName: creationSystemName.trim() || 'SoloForge D20 Narrativo',
          coreMechanics: newRules,
          rollInstructions: 'O Mestre deve emitir a tag [PEDIR_TESTE: dado | DT | atributo | motivo] antes de definir consequências de ações arriscadas.'
        });
      }

      setCampaigns(prev => [created, ...prev]);
      handleSelectCampaign(created);
      setIsCreatingModal(false);
      setNewTitle('');
      setNewSynopsis('');
      setNewCharacter('');
      setNewLore('');
      setCreationRuleFiles([]);
      setCreationSystemName('');
      setCreationRulesMode('text');
    } catch {
      const localCamp: Campaign = {
        id: 'local-' + Date.now(),
        title: newTitle,
        genre: newGenre,
        synopsis: newSynopsis,
        createdAt: new Date().toISOString(),
        bible: {
          id: 'b-1',
          playerCharacter: newCharacter,
          characterAttributes: attributesString,
          worldLore: newLore,
          toneAndStyle: 'Imersivo, desafiador e fiel às regras'
        },
        system: {
          id: 's-1',
          name: 'SoloForge D20 Narrativo',
          coreMechanics: newRules
        }
      };
      setCampaigns(prev => [localCamp, ...prev]);
      setSelectedCampaign(localCamp);
      const mockSession: Session = {
        id: 's-mock-1',
        campaignId: localCamp.id,
        sessionNumber: 1,
        title: 'Ato I: O Despertar da Jornada',
        createdAt: new Date().toISOString()
      };
      setSessions([mockSession]);
      setCurrentSession(mockSession);
      setMessages([
        {
          id: 'msg-intro',
          sessionId: mockSession.id,
          sender: 'GM',
          senderName: 'Mestre IA',
          content: `Bem-vindo a ${newTitle}! Sou o seu Mestre e árbitro de regras. Seus limites, perícias e decisões serão levados a sério. O que você faz primeiro?`,
          createdAt: new Date().toISOString()
        }
      ]);
      setIsCreatingModal(false);
    } finally {
      setIsCreatingCampaignLoading(false);
    }
  };

  const cleanDisplayContent = (content: string) => {
    return content.replace(/\[PEDIR_TESTE:[^\]]+\]/g, '').trim();
  };

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      
      {/* OVERLAY MOBILE PARA SIDEBARS */}
      {(isMobileLeftOpen || isMobileRightOpen) && (
        <div 
          onClick={() => { setIsMobileLeftOpen(false); setIsMobileRightOpen(false); }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* SIDEBAR ESQUERDA: CAMPANHAS & SESSÕES */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 sm:w-80 border-r border-slate-800 bg-slate-900/95 lg:bg-slate-900/60 flex flex-col backdrop-blur-md transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isMobileLeftOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
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
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-md transition cursor-pointer"
              title="Criar Nova Campanha"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-md transition cursor-pointer"
              title="Sair do SoloForge"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileLeftOpen(false)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition cursor-pointer lg:hidden"
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
                    <span className="truncate">
                      {sess.title || `Ato ${sess.sessionNumber}`}
                    </span>
                    {sess.summary && (
                      <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-800/40">
                        Resumido
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* ÁREA CENTRAL: O CHAT DE INTERAÇÃO DO RPG */}
      <main className="flex-1 flex flex-col bg-slate-950 relative">
        {/* Header do Chat */}
        <header className="h-16 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur-sm gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Botão de abrir sidebar de campanhas no mobile */}
            <button
              onClick={() => setIsMobileLeftOpen(true)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg lg:hidden cursor-pointer shrink-0"
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

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {selectedCampaign && currentSession && (
              <button
                onClick={handleConcludeSession}
                disabled={isConcludingSession || isLoading}
                className="px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-sm shadow-amber-900/30 cursor-pointer disabled:cursor-not-allowed"
                title="Gera um resumo épico da sessão e inicia o próximo ato com contexto renovado"
              >
                {isConcludingSession ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden md:inline">Cronista Resumindo...</span>
                  </>
                ) : (
                  <>
                    <FastForward className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Concluir Ato & Avançar</span>
                    <span className="md:hidden">Concluir</span>
                  </>
                )}
              </button>
            )}

            {/* Botão de abrir painel direito (Fichas, Arcos, Regras) no mobile */}
            {selectedCampaign && (
              <button
                onClick={() => setIsMobileRightOpen(prev => !prev)}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 text-amber-400 rounded-lg lg:hidden cursor-pointer"
                title="Abrir Bíblia & Regras"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full">
              <ShieldAlert className="w-3.5 h-3.5" />
              Memória Ativa
            </div>
          </div>
        </header>



        {/* Mensagens da Aventura */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
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
            messages.map((msg) => {
              const isPlayer = msg.sender === 'PLAYER';
              const isSystem = msg.sender === 'SYSTEM';

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

        {/* BANNER INTERATIVO: QUANDO O MESTRE EXIGE UM TESTE COM DT */}
        {pendingCheck && !isLoading && (
          <div className="mx-3 sm:mx-6 mb-2 p-3 sm:p-4 bg-gradient-to-r from-amber-950/80 to-slate-900/90 border-2 border-amber-500/70 rounded-xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 backdrop-blur-md animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40 shrink-0">
                <AlertTriangle className="w-5 sm:w-6 h-5 sm:h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-amber-300 text-xs sm:text-sm">TESTE EXIGIDO:</span>
                  <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs rounded uppercase">
                    DT {pendingCheck.dc}
                  </span>
                  <span className="text-[11px] sm:text-xs text-slate-300 font-medium">({pendingCheck.attribute})</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-2">
                  Motivo: <span className="italic text-slate-200">"{pendingCheck.reason}"</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => rollDice(parseInt(pendingCheck.dice.replace(/\D/g, '') || '20', 10), pendingCheck)}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-amber-600/30 cursor-pointer shrink-0"
            >
              <Dices className="w-4 sm:w-5 h-4 sm:h-5" />
              Rolar {pendingCheck.dice.toUpperCase()} agora!
            </button>
          </div>
        )}

        {/* BARRA DE ROLAGEM RÁPIDA DE DADOS & INPUT BAR */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/50 space-y-2.5 sm:space-y-3">
          
          <div className="flex flex-wrap items-center justify-between gap-2 max-w-4xl mx-auto text-xs text-slate-400">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full no-scrollbar">
              <span className="font-semibold text-slate-300 flex items-center gap-1 text-[11px] whitespace-nowrap">
                <Dices className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Dados:
              </span>
              {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                <button
                  key={sides}
                  onClick={() => rollDice(sides)}
                  disabled={!selectedCampaign || isLoading}
                  className="min-w-[36px] py-1.5 px-2 bg-slate-950 hover:bg-slate-800 active:bg-amber-950/60 disabled:opacity-40 border border-slate-800 hover:border-amber-500/50 rounded text-slate-200 font-mono transition text-xs cursor-pointer active:scale-95 text-center shrink-0"
                >
                  d{sides}
                </button>
              ))}
            </div>

            {pendingCheck && (
              <span className="text-amber-400/90 text-[11px] flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                DT {pendingCheck.dc}
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
                  ? "Descreva sua ação ou fala... (O Mestre avaliará a viabilidade e pedirá teste se incerto)" 
                  : "Selecione uma campanha para jogar..."
              }
              disabled={!selectedCampaign || isLoading}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-3 text-base sm:text-sm text-slate-100 placeholder-slate-400 outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!selectedCampaign || !inputText.trim() || isLoading}
              className="px-4 sm:px-5 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-lg shadow-amber-700/20 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ação</span>
            </button>
          </form>
        </div>
      </main>

      {/* PAINEL DIREITO: ABAS DE BÍBLIA, ARCOS E MEMÓRIA DO MUNDO */}
      {selectedCampaign && (
        <aside className={`fixed inset-y-0 right-0 z-40 w-80 sm:w-96 border-l border-slate-800 bg-slate-900/95 lg:bg-slate-900/60 backdrop-blur-md flex flex-col overflow-hidden transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileRightOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
        }`}>
          
          {/* Header Mobile do Painel Direito */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between lg:hidden bg-slate-950/40">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4" />
              Grimório & Crônicas
            </span>
            <button
              onClick={() => setIsMobileRightOpen(false)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cabeçalho de Abas */}
          <div className="flex border-b border-slate-800 bg-slate-950/50 p-1 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('arcs')}
              className={`flex-1 min-w-[70px] py-2 px-1.5 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'arcs'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Arcos ({arcs.filter(a => a.status === 'ACTIVE').length})</span>
            </button>


            <button
              onClick={() => setActiveTab('npcs')}
              className={`flex-1 min-w-[70px] py-2 px-1.5 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'npcs'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>NPCs ({npcs.filter(n => n.isCrystallized).length})</span>
            </button>

            <button
              onClick={() => setActiveTab('decisions')}
              className={`flex-1 min-w-[70px] py-2 px-1.5 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'decisions'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Mundo ({decisions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bible')}
              className={`flex-1 min-w-[70px] py-2 px-1.5 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'bible'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >

              <BookOpen className="w-3.5 h-3.5" />
              <span>Bíblia</span>
            </button>
          </div>


          {/* Conteúdo da Aba */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ABA 1: ARCOS & MISSÕES */}
            {activeTab === 'arcs' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-amber-500" />
                      Arcos Narrativos (Quests)
                    </h3>
                    <p className="text-[11px] text-slate-400">Objetivos ativos que o Mestre IA guia.</p>
                  </div>
                  <button
                    onClick={() => setIsNewArcModal(true)}
                    className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs flex items-center gap-1 transition cursor-pointer"
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-500" />
                      Personagens & NPCs
                    </h3>
                    <p className="text-[11px] text-slate-400">NPCs cristalizados são lembrados pelo Mestre IA.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsAiNpcModal(true)}
                      className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-amber-900/30"
                      title="Forjar NPC, Inimigo ou Boss com IA baseado no sistema de regras"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Forjar com IA</span>
                    </button>
                    <button
                      onClick={() => setIsNewNpcModal(true)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs flex items-center gap-1 transition cursor-pointer border border-slate-700"
                      title="Novo NPC Manual"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

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
                  npcs.map(npc => (
                    <div
                      key={npc.id}
                      className={`p-3 rounded-lg border text-xs transition space-y-2 ${
                        npc.isCrystallized 
                          ? 'bg-slate-950/90 border-amber-500/40 shadow-sm shadow-amber-900/10' 
                          : 'bg-slate-950/40 border-slate-800/80 opacity-70'
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
                                  // Fallback se imagem quebrar
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
                              <span className="text-[10px] text-amber-400 px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-900/40">
                                {npc.role || 'Personagem'}
                              </span>
                            </div>
                            {npc.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {npc.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Botão de Evoluir por Evento com IA */}
                          <button
                            onClick={() => handleOpenEvolveNpc(npc)}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 active:bg-amber-900/60 rounded transition cursor-pointer active:scale-95"
                            title="Evoluir Atributos por Evento (IA)"
                          >
                            <Zap className="w-4 h-4" />
                          </button>

                          {/* Botão de Editar Ficha/Imagem */}
                          <button
                            onClick={() => handleOpenEditNpc(npc)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:bg-slate-700 rounded transition cursor-pointer active:scale-95"
                            title="Editar Atributos & Imagem"
                          >
                            <Edit className="w-4 h-4" />
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
                            <Sparkle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">{npc.isCrystallized ? 'Cristalizado' : 'Passageiro'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteNpc(npc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 active:text-rose-300 hover:bg-rose-950/40 rounded transition cursor-pointer active:scale-95"
                            title="Remover NPC"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Exibição dos Atributos do NPC */}
                      {npc.attributes && (
                        <div className="bg-slate-900/90 rounded border border-amber-950/60 p-2 text-[11px] font-mono text-amber-200/90 leading-tight">
                          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-500 font-sans font-semibold mb-1">
                            <Sword className="w-3 h-3" />
                            <span>Atributos & Combate:</span>
                          </div>
                          <span className="whitespace-pre-wrap">{npc.attributes}</span>
                        </div>
                      )}

                      {npc.personality && (
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          <strong className="text-slate-400">Personalidade:</strong> {npc.personality}
                        </p>
                      )}

                      {npc.memory && (
                        <p className="text-amber-200/90 text-[11px] leading-relaxed italic bg-amber-950/20 p-1.5 rounded border border-amber-900/20">
                          <strong className="text-amber-400">Memória com o PJ:</strong> {npc.memory}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}


            {/* ABA 2: DECISÕES DO MUNDO (MEMÓRIA PERMANENTE) */}
            {activeTab === 'decisions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-amber-500" />
                      Memória do Mundo
                    </h3>
                    <p className="text-[11px] text-slate-400">Marcas e consequências que o Mestre recorda.</p>
                  </div>
                  <button
                    onClick={() => setIsNewDecisionModal(true)}
                    className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs flex items-center gap-1 transition cursor-pointer"
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
              <div className="space-y-4 text-xs">
                {/* Sistema de Regras & Arbitragem */}
                <div className="p-3 bg-slate-950/70 rounded-lg border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      Sistema: {selectedCampaign.system?.name || 'Regras Padrão'}
                    </span>
                    <button
                      onClick={() => {
                        setRulesSystemName(selectedCampaign.system?.name || '');
                        setIsRulesModal(true);
                      }}
                      className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer border border-amber-500/40"
                      title="Importar e compactar manuais (PDF, MD, CSV, TXT) ou texto com IA"
                    >
                      <Brain className="w-3 h-3" />
                      <span>Sintetizar com IA</span>
                    </button>
                  </div>
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


                {/* Personagem do Jogador */}
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2">
                  <span className="font-semibold text-slate-300 block mb-1">🧙 Personagem do Jogador (PJ)</span>
                  <p className="text-slate-400 leading-relaxed whitespace-pre-line text-[11px]">
                    {selectedCampaign.bible?.playerCharacter || 'Não especificado ainda.'}
                  </p>

                  {/* Atributos Formatados em Tags/Cards */}
                  {selectedCampaign.bible?.characterAttributes && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-semibold text-amber-400 block mb-1.5 uppercase tracking-wider">
                        Atributos & Estatísticas Ativas:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {selectedCampaign.bible.characterAttributes.split('\n').filter(Boolean).map((attrLine, idx) => {
                          const [name, ...valParts] = attrLine.split(':');
                          const val = valParts.join(':').trim();
                          return (
                            <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded px-2 py-1 flex items-center justify-between">
                              <span className="text-slate-300 font-medium text-[11px] truncate">{name.trim()}</span>
                              <span className="text-amber-400 font-mono font-bold text-[11px] ml-1 shrink-0">{val || '—'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lore do Mundo */}
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                  <span className="font-semibold text-slate-300 block mb-1">🗺️ Lore do Mundo</span>
                  <p className="text-slate-400 leading-relaxed whitespace-pre-line">
                    {selectedCampaign.bible?.worldLore || 'Sem registros detalhados de lore.'}
                  </p>
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

      {/* MODAL: REGISTRAR NOVO NPC */}
      {isNewNpcModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Registrar Personagem / NPC
              </h3>
              <button
                type="button"
                onClick={() => setIsNewNpcModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNpc} className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto p-4 space-y-3 text-xs flex-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nome do Personagem *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aldous, o Ferreiro Caolho"
                    value={newNpcName}
                    onChange={e => setNewNpcName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Papel / Ocupação</label>
                  <input
                    type="text"
                    placeholder="Ex: Mestre Armeiro da Vila, Mercador Errante, Inquisidor"
                    value={newNpcRole}
                    onChange={e => setNewNpcRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">URL da Imagem / Avatar (Opcional)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      placeholder="https://exemplo.com/avatar.jpg"
                      value={newNpcImageUrl}
                      onChange={e => setNewNpcImageUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                    />
                    {newNpcImageUrl && (
                      <img 
                        src={newNpcImageUrl} 
                        alt="Preview" 
                        className="w-8 h-8 rounded-full border border-amber-500/50 object-cover" 
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Atributos / Ficha de Combate</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: FOR: 16 | DES: 12 | CON: 14 | PV: 35/35 | CA: 15 | Martelo Pesado (1d8+3)"
                    value={newNpcAttributes}
                    onChange={e => setNewNpcAttributes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Traços de Personalidade</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Resmungão, leal a quem lhe paga cerveja anã, odeia magia."
                    value={newNpcPersonality}
                    onChange={e => setNewNpcPersonality(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Memória / Relação com o Jogador</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: O herói o defendeu de cobradores de impostos. Ele prometeu forjar um escudo especial."
                    value={newNpcMemory}
                    onChange={e => setNewNpcMemory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewNpcModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium cursor-pointer"
                >
                  Cristalizar Personagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FORJAR NPC OU BOSS COM IA BASEADO NAS REGRAS */}
      {isAiNpcModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-amber-500/40 w-full max-w-md max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Forjar Criatura / Chefe com IA
              </h3>
              <button
                type="button"
                onClick={() => setIsAiNpcModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateAiNpc} className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto p-4 space-y-3.5 text-xs flex-1">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  A IA lerá o livro de regras da campanha (<strong className="text-amber-300">{selectedCampaign?.system?.name || 'Sistema Atual'}</strong>) e construirá estatísticas de combate, PV, atributos e fraquezas compatíveis.
                </p>

                {/* Tipo de Criatura */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Ameaça / Papel</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {(['BOSS', 'MINION', 'ALLY', 'RIVAL', 'MERCHANT'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAiNpcType(t)}
                        className={`py-2 px-2 rounded border text-[11px] font-medium transition cursor-pointer active:scale-95 text-center ${
                          aiNpcType === t
                            ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t === 'BOSS' && '👑 Chefe / Boss'}
                        {t === 'MINION' && '💀 Monstro'}
                        {t === 'ALLY' && '🤝 Aliado'}
                        {t === 'RIVAL' && '⚔️ Rival'}
                        {t === 'MERCHANT' && '💰 Mercador'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nível de Desafio */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nível de Dificuldade</label>
                  <div className="grid grid-cols-5 gap-1">
                    {(['FÁCIL', 'MÉDIO', 'DIFÍCIL', 'MORTAL', 'LENDÁRIO'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAiNpcChallenge(c)}
                        className={`py-1.5 px-1 rounded border text-[10px] font-medium text-center transition cursor-pointer active:scale-95 ${
                          aiNpcChallenge === c
                            ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Imagem Opcional */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">URL da Imagem / Avatar (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/monstro.jpg"
                    value={aiNpcImageUrl}
                    onChange={e => setAiNpcImageUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 placeholder-slate-500 text-xs"
                  />
                </div>

                {/* Conceito / Inspiração */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Conceito ou Inspiração (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Um cavaleiro espectral amaldiçoado que empunha fogo azul e guarda a ponte das almas."
                    value={aiNpcConcept}
                    onChange={e => setAiNpcConcept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 placeholder-slate-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAiNpcModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAiNpc}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-amber-900/30"
                >
                  {isGeneratingAiNpc ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Consultando Livro & Forjando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Forjar com IA Agora</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR FICHA E IMAGEM DO NPC */}
      {editingNpc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Editar Personagem / Ficha
              </h3>
              <button
                type="button"
                onClick={() => setEditingNpc(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditNpc} className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto p-4 space-y-3 text-xs flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={editNpcName}
                      onChange={e => setEditNpcName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Papel / Título</label>
                    <input
                      type="text"
                      value={editNpcRole}
                      onChange={e => setEditNpcRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">URL da Imagem / Avatar</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      placeholder="https://exemplo.com/avatar.jpg"
                      value={editNpcImageUrl}
                      onChange={e => setEditNpcImageUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                    />
                    {editNpcImageUrl && (
                      <img 
                        src={editNpcImageUrl} 
                        alt="Preview" 
                        className="w-8 h-8 rounded-full border border-amber-500/50 object-cover" 
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Atributos & Combate (Estatísticas)</label>
                  <textarea
                    rows={3}
                    placeholder="FOR: 18 | DES: 14 | CON: 16 | PV: 50/50 | CA: 16..."
                    value={editNpcAttributes}
                    onChange={e => setEditNpcAttributes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Personalidade</label>
                  <textarea
                    rows={2}
                    value={editNpcPersonality}
                    onChange={e => setEditNpcPersonality(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Memória / Relação com o Jogador</label>
                  <textarea
                    rows={2}
                    value={editNpcMemory}
                    onChange={e => setEditNpcMemory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingNpc(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EVOLUIR NPC POR EVENTO NARRATIVO COM IA */}
      {evolvingNpc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-amber-500/50 w-full max-w-md max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border border-amber-500/40 bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
                  {evolvingNpc.imageUrl ? (
                    <img src={evolvingNpc.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Zap className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 truncate">
                    Evolução Narrativa com IA
                  </h3>
                  <p className="text-[11px] text-slate-300 truncate">{evolvingNpc.name} ({evolvingNpc.role || 'Personagem'})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvolvingNpc(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEvolveNpc} className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto p-4 space-y-3.5 text-xs flex-1">
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 text-[11px] space-y-1">
                  <span className="text-amber-500 font-semibold uppercase text-[10px] tracking-wider block">Atributos Atuais:</span>
                  <p className="font-mono text-slate-300 whitespace-pre-wrap">{evolvingNpc.attributes || 'Nenhum atributo registrado ainda.'}</p>
                </div>

                <div>
                  <label className="block text-slate-200 font-medium mb-1">
                    O que aconteceu a este personagem na história? *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ex: 'Sobreviveu à forja dos dragões nas profundezas e absorveu uma lâmina rúnica.' ou 'Derrotou o rival na arena e subiu de nível.' ou 'Perdeu um braço na emboscada.'"
                    value={evolveEventText}
                    onChange={e => setEvolveEventText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500 text-xs placeholder-slate-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    A IA recalculará os atributos, bônus, cicatrizes e memórias respeitando as regras do sistema ({selectedCampaign?.system?.name || 'Sistema Atual'}).
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setEvolvingNpc(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEvolvingNpc || !evolveEventText.trim()}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-amber-900/30"
                >
                  {isEvolvingNpc ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Recalculando Atributos...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Evoluir Atributos com IA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL: SINTETIZADOR DE REGRAS COM IA (ARQUIVOS OU TEXTO) */}
      {isRulesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Sintetizar Regras com IA
              </h3>
              <button 
                onClick={() => !isSynthesizingRules && setIsRulesModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
              <p className="text-xs text-slate-400 leading-relaxed">
                Envie manuais de regras ou cole textos brutos. O Gemini lerá todo o conteúdo, extrairá a essência mecânica sem omitir nenhuma regra de jogo e salvará a versão otimizada no banco para guiar o Mestre.
              </p>

            <form onSubmit={handleSynthesizeRules} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome do Sistema de Regras</label>
                <input
                  type="text"
                  placeholder="Ex: D&D 5e Simplificado, Tormenta20, Cyberpunk RED Solo"
                  value={rulesSystemName}
                  onChange={e => setRulesSystemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              {/* Seletor de Modo: Arquivos vs Texto */}
              <div className="flex bg-slate-950 p-1 rounded border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => setRulesInputMode('files')}
                  className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    rulesInputMode === 'files'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Múltiplos Arquivos (.pdf, .txt, .md, .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRulesInputMode('text')}
                  className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    rulesInputMode === 'text'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Colar Texto Bruto</span>
                </button>
              </div>

              {rulesInputMode === 'files' ? (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">
                    Selecione um ou mais arquivos (.pdf, .txt, .md, .csv):
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.csv"
                    onChange={e => {
                      if (e.target.files) {
                        setSelectedRuleFiles(Array.from(e.target.files));
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-600 file:text-white file:cursor-pointer hover:file:bg-amber-500 text-xs"
                  />
                  {selectedRuleFiles.length > 0 && (
                    <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <span className="font-semibold text-amber-400">Arquivos selecionados ({selectedRuleFiles.length}):</span>
                      <ul className="list-disc pl-4 text-slate-400">
                        {selectedRuleFiles.map((file, idx) => (
                          <li key={idx} className="truncate">
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Cole o conteúdo completo ou rascunho de regras:
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Cole aqui mecânicas de combate, regras de perícias, cálculo de dano, magia, tabelas de DT..."
                    value={rawRulesInputText}
                    onChange={e => setRawRulesInputText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSynthesizingRules}
                  onClick={() => setIsRulesModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSynthesizingRules}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-900/30"
                >
                  {isSynthesizingRules ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Sintetizando Regras com IA...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-3.5 h-3.5" />
                      <span>Processar & Salvar no Banco</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}



      {/* MODAL DE CRIAÇÃO DE CAMPANHA */}
      {isCreatingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
                <Sword className="w-5 h-5" />
                Forjar Nova Campanha
              </h3>
              <button 
                onClick={() => setIsCreatingModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Título da Crônica *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: A Sombra da Cidadela Negra"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Gênero</label>
                <input
                  type="text"
                  placeholder="Ex: Dark Fantasy, Cyberpunk, D&D 5e Solo"
                  value={newGenre}
                  onChange={e => setNewGenre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              {/* SELEÇÃO DE REGRAS DO SISTEMA (TEXTO VS UPLOAD DE LIVROS/ARQUIVOS) */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-slate-300 font-semibold text-xs">
                      Regras & Sistema de Jogo *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      O Mestre IA seguirá e arbitrará com base nessas diretrizes.
                    </span>
                  </div>

                  {/* Nome Opcional do Sistema */}
                  <input
                    type="text"
                    placeholder="Nome do Sistema (ex: Tormenta20, D&D 5e)"
                    value={creationSystemName}
                    onChange={e => setCreationSystemName(e.target.value)}
                    className="w-44 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2 py-1 text-slate-200 placeholder-slate-500 text-[10px] outline-none"
                  />
                </div>

                {/* Seletor de Modo: Texto vs Arquivos */}
                <div className="flex bg-slate-900 p-1 rounded border border-slate-800 gap-1">
                  <button
                    type="button"
                    onClick={() => setCreationRulesMode('text')}
                    className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px] ${
                      creationRulesMode === 'text'
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Escrever Regras Livres</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationRulesMode('files')}
                    className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px] ${
                      creationRulesMode === 'files'
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Livro / Arquivos (.pdf, .txt, .md, .csv)</span>
                  </button>
                </div>

                {creationRulesMode === 'text' ? (
                  <textarea
                    rows={3}
                    value={newRules}
                    onChange={e => setNewRules(e.target.value)}
                    placeholder="Digite ou cole as regras essenciais do sistema..."
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                ) : (
                  <div className="space-y-2">
                    <label className="block text-slate-300 text-[11px]">
                      Selecione os arquivos do sistema (A IA lerá, sintetizará e indexará no banco):
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt,.md,.csv"
                      onChange={e => {
                        if (e.target.files) {
                          setCreationRuleFiles(Array.from(e.target.files));
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-300 file:mr-2.5 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-amber-600 file:text-white file:cursor-pointer hover:file:bg-amber-500 text-[11px]"
                    />
                    {creationRuleFiles.length > 0 ? (
                      <div className="p-2 bg-slate-900/90 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
                        <span className="font-semibold text-amber-400">Livros / Documentos prontos ({creationRuleFiles.length}):</span>
                        <ul className="list-disc pl-4 text-slate-400 max-h-24 overflow-y-auto">
                          {creationRuleFiles.map((file, idx) => (
                            <li key={idx} className="truncate">
                              {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-400/80 italic">
                        * Dica: Você pode enviar o PDF do manual básico ou notas de homebrew em .md/.txt.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Seu Personagem (Nome e Conceito)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Thorne, guerreiro renegado em busca de redenção nas terras ermas."
                  value={newCharacter}
                  onChange={e => setNewCharacter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              {/* TABELA DINÂMICA DE ATRIBUTOS COM PRESETS E IMPORT/DOWNLOAD */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-amber-300 text-xs block">
                      Atributos & Valores do Personagem
                    </span>
                    <span className="text-[10px] text-slate-400">
                      A IA interpretará as categorias e valores de acordo com as regras inseridas.
                    </span>
                  </div>

                  {/* Ações de Modelo (Download e Upload) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDownloadAttributeTemplate}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded text-[10px] flex items-center gap-1 transition cursor-pointer border border-slate-700"
                      title="Baixar arquivo modelo (.json) para preenchimento"
                    >
                      <Download className="w-3 h-3 text-amber-400" />
                      <span>Baixar Modelo</span>
                    </button>

                    <label
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded text-[10px] flex items-center gap-1 transition cursor-pointer border border-slate-700"
                      title="Importar atributos de arquivo .json ou .csv"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-amber-400" />
                      <span>Importar Ficha</span>
                      <input
                        type="file"
                        accept=".json,.csv,.txt"
                        className="hidden"
                        onChange={handleImportAttributesFile}
                      />
                    </label>
                  </div>
                </div>

                {/* Presets Rápidos de 1 Clique */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">Modelos Prontos:</span>
                  <button
                    type="button"
                    onClick={() => applyAttributePreset('d20')}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded text-[10px] transition cursor-pointer whitespace-nowrap"
                  >
                    D20 Clássico
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAttributePreset('cthulhu')}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded text-[10px] transition cursor-pointer whitespace-nowrap"
                  >
                    Terror / Investigação
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAttributePreset('cyberpunk')}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded text-[10px] transition cursor-pointer whitespace-nowrap"
                  >
                    Cyberpunk
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAttributePreset('narrative')}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded text-[10px] transition cursor-pointer whitespace-nowrap"
                  >
                    Narrativo Leve
                  </button>
                </div>

                {/* Tabela de Linhas de Atributos */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {newAttributes.map((attr) => (
                    <div key={attr.id} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Nome (Ex: Força, Sanidade, Astúcia)"
                        value={attr.name}
                        onChange={e => updateAttributeRow(attr.id, 'name', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1 text-slate-200 placeholder-slate-500 text-[11px] outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Valor (Ex: +3, 65%, 4d6)"
                        value={attr.value}
                        onChange={e => updateAttributeRow(attr.id, 'value', e.target.value)}
                        className="w-28 sm:w-32 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1 text-amber-300 placeholder-slate-500 text-[11px] outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttributeRow(attr.id)}
                        disabled={newAttributes.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded transition cursor-pointer shrink-0"
                        title="Remover Atributo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addAttributeRow}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400/90 hover:text-amber-300 border border-dashed border-slate-800 hover:border-amber-500/40 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Outro Atributo / Perícia</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Sinopse Breve</label>
                <textarea
                  rows={2}
                  placeholder="Uma breve introdução ao mistério ou premissa principal..."
                  value={newSynopsis}
                  onChange={e => setNewSynopsis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Lore do Mundo</label>
                  <textarea
                    rows={2}
                    placeholder="As florestas são amaldiçoadas e a magia exige sacrifício de vitalidade..."
                    value={newLore}
                    onChange={e => setNewLore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreatingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCampaignLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white disabled:text-slate-400 rounded font-medium flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition"
                >
                  {isCreatingCampaignLoading ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Forjando Universo com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Iniciar Aventura</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
