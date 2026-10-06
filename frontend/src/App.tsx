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
  Brain
} from 'lucide-react';


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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

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

  const handleSelectCampaign = async (camp: Campaign) => {
    setSelectedCampaign(camp);
    setPendingCheck(null);
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
        isCrystallized: true
      });
      setNpcs(prev => [created, ...prev]);
      setIsNewNpcModal(false);
      setNewNpcName('');
      setNewNpcRole('');
      setNewNpcPersonality('');
      setNewNpcMemory('');
    } catch {
      const mockNpc: Npc = {
        id: 'npc-' + Date.now(),
        campaignId: selectedCampaign.id,
        name: newNpcName,
        role: newNpcRole || 'Habitante',
        personality: newNpcPersonality,
        memory: newNpcMemory,
        isCrystallized: true,
        createdAt: new Date().toISOString()
      };
      setNpcs(prev => [mockNpc, ...prev]);
      setIsNewNpcModal(false);
      setNewNpcName('');
      setNewNpcRole('');
      setNewNpcPersonality('');
      setNewNpcMemory('');
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

    try {
      const created = await api.createCampaign({
        title: newTitle,
        genre: newGenre,
        synopsis: newSynopsis,
        playerCharacter: newCharacter,
        worldLore: newLore,
        systemName: 'SoloForge D20 Narrativo',
        coreMechanics: newRules,
        rollInstructions: 'O Mestre deve emitir a tag [PEDIR_TESTE: dado | DT | atributo | motivo] antes de definir consequências de ações arriscadas.'
      });
      setCampaigns(prev => [created, ...prev]);
      handleSelectCampaign(created);
      setIsCreatingModal(false);
      setNewTitle('');
      setNewSynopsis('');
      setNewCharacter('');
      setNewLore('');
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
    }
  };

  const cleanDisplayContent = (content: string) => {
    return content.replace(/\[PEDIR_TESTE:[^\]]+\]/g, '').trim();
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* SIDEBAR ESQUERDA: CAMPANHAS & SESSÕES */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col backdrop-blur-md">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-600/20 text-amber-500 rounded-lg border border-amber-500/30">
              <Sword className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-amber-400">SoloForge</h1>
              <p className="text-xs text-slate-400">Forje suas crônicas</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCreatingModal(true)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-md transition cursor-pointer"
            title="Criar Nova Campanha"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
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
              <button
                key={camp.id}
                onClick={() => handleSelectCampaign(camp)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition group cursor-pointer ${
                  selectedCampaign?.id === camp.id 
                    ? 'bg-amber-600/15 border border-amber-500/40 text-amber-200' 
                    : 'hover:bg-slate-800/70 text-slate-300 border border-transparent'
                }`}
              >
                <div className="truncate">
                  <div className="font-medium text-sm truncate flex items-center gap-1.5">
                    <Scroll className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {camp.title}
                  </div>
                  <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                    {camp.genre || 'Fantasia'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
              </button>
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
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-100 flex items-center gap-2">
                {selectedCampaign ? selectedCampaign.title : 'Selecione ou Crie uma Crônica'}
              </h2>
              {currentSession && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/30 font-medium">
                  {currentSession.title || `Ato ${currentSession.sessionNumber}`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {currentSession?.summary 
                ? `Resumo Histórico: ${currentSession.summary.slice(0, 80)}...`
                : (selectedCampaign?.synopsis || 'O Mestre IA está pronto para arbitrar as regras...')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedCampaign && currentSession && (
              <button
                onClick={handleConcludeSession}
                disabled={isConcludingSession || isLoading}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-sm shadow-amber-900/30 cursor-pointer disabled:cursor-not-allowed"
                title="Gera um resumo épico da sessão e inicia o próximo ato com contexto renovado"
              >
                {isConcludingSession ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Cronista Resumindo...</span>
                  </>
                ) : (
                  <>
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Concluir Ato & Avançar</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full">
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
          <div className="mx-6 mb-2 p-4 bg-gradient-to-r from-amber-950/80 to-slate-900/90 border-2 border-amber-500/70 rounded-xl shadow-xl flex items-center justify-between backdrop-blur-md animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-300 text-sm">TESTE EXIGIDO PELO MESTRE:</span>
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-xs rounded uppercase">
                    DT {pendingCheck.dc}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">({pendingCheck.attribute})</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Motivo: <span className="italic text-slate-200">"{pendingCheck.reason}"</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => rollDice(parseInt(pendingCheck.dice.replace(/\D/g, '') || '20', 10), pendingCheck)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-lg flex items-center gap-2 transition shadow-lg shadow-amber-600/30 cursor-pointer"
            >
              <Dices className="w-5 h-5" />
              Rolar {pendingCheck.dice.toUpperCase()} agora!
            </button>
          </div>
        )}

        {/* BARRA DE ROLAGEM RÁPIDA DE DADOS & INPUT BAR */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
          
          <div className="flex items-center justify-between max-w-4xl mx-auto text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Dices className="w-4 h-4 text-amber-500" />
                Rolagem Rápida:
              </span>
              {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                <button
                  key={sides}
                  onClick={() => rollDice(sides)}
                  disabled={!selectedCampaign || isLoading}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 hover:border-amber-500/50 rounded text-slate-200 font-mono transition text-[11px] cursor-pointer"
                >
                  d{sides}
                </button>
              ))}
            </div>

            {pendingCheck && (
              <span className="text-amber-400/90 text-xs flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                Teste pendente contra DT {pendingCheck.dc}
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
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-400 outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!selectedCampaign || !inputText.trim() || isLoading}
              className="px-5 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-lg shadow-amber-700/20 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Ação</span>
            </button>
          </form>
        </div>
      </main>

      {/* PAINEL DIREITO: ABAS DE BÍBLIA, ARCOS E MEMÓRIA DO MUNDO */}
      {selectedCampaign && (
        <aside className="w-96 border-l border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col overflow-hidden">
          
          {/* Cabeçalho de Abas */}
          <div className="flex border-b border-slate-800 bg-slate-950/50 p-1 gap-1">
            <button
              onClick={() => setActiveTab('arcs')}
              className={`flex-1 py-2 px-2 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
              className={`flex-1 py-2 px-2 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
              className={`flex-1 py-2 px-2 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
              className={`flex-1 py-2 px-2 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleToggleArcStatus(arc)}
                              className={`p-1 rounded transition cursor-pointer ${
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
                              className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                              title="Remover Arco"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                  <button
                    onClick={() => setIsNewNpcModal(true)}
                    className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs flex items-center gap-1 transition cursor-pointer"
                    title="Novo NPC"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
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
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200 text-xs">
                              {npc.name}
                            </span>
                            <span className="text-[10px] text-amber-400 px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-900/40">
                              {npc.role || 'Personagem'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleCrystallize(npc)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer ${
                              npc.isCrystallized
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                            title={npc.isCrystallized ? "Cristalizado no Contexto do Mestre" : "Passageiro (não injetado)"}
                          >
                            <Sparkle className="w-3 h-3 text-amber-400" />
                            <span>{npc.isCrystallized ? 'Cristalizado' : 'Passageiro'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteNpc(npc.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                            title="Remover NPC"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

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
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                  <span className="font-semibold text-slate-300 block mb-1">🧙 Personagem do Jogador (PJ)</span>
                  <p className="text-slate-400 leading-relaxed whitespace-pre-line">
                    {selectedCampaign.bible?.playerCharacter || 'Não especificado ainda.'}
                  </p>
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" />
              Registrar Personagem / NPC
            </h3>
            <form onSubmit={handleCreateNpc} className="space-y-3 text-xs">
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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

      {/* MODAL: SINTETIZADOR DE REGRAS COM IA (ARQUIVOS OU TEXTO) */}
      {isRulesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Sintetizar Regras com IA
              </h3>
              <button 
                onClick={() => !isSynthesizingRules && setIsRulesModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
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
      )}



      {/* MODAL DE CRIAÇÃO DE CAMPANHA */}
      {isCreatingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Sword className="w-5 h-5" />
                Forjar Nova Campanha
              </h3>
              <button 
                onClick={() => setIsCreatingModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
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

              <div>
                <label className="block text-slate-300 font-medium mb-1">Regras & Mecânicas (O Mestre seguirá rigidamente)</label>
                <textarea
                  rows={3}
                  value={newRules}
                  onChange={e => setNewRules(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Seu Personagem (Nome, Perícias e Equipamentos)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Thorne (Guerreiro Nível 1). Força: +3, Destreza: +1. Possui espada longa e cota de malha."
                  value={newCharacter}
                  onChange={e => setNewCharacter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
                />
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

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Iniciar Aventura
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
