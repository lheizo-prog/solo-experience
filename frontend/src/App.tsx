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
  Bot
} from 'lucide-react';
import { api } from './services/api';
import type { Campaign, Session, Message } from './types/soloforge';

export function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingModal, setIsCreatingModal] = useState(false);

  // Formulário de Nova Campanha
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('Dark Fantasy');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newCharacter, setNewCharacter] = useState('');
  const [newLore, setNewLore] = useState('');

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
    try {
      const sessList = await api.getSessions(camp.id);
      setSessions(sessList);
      if (sessList.length > 0) {
        setCurrentSession(sessList[0]);
        loadMessages(sessList[0].id);
      } else {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const msgs = await api.getMessages(sessionId);
      setMessages(msgs);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentSession || isLoading) return;

    const userText = inputText.trim();
    setInputText('');

    // Adiciona otimista
    const optimisticMsg: Message = {
      id: 'temp-' + Date.now(),
      sessionId: currentSession.id,
      sender: 'PLAYER',
      senderName: selectedCampaign?.bible?.playerCharacter?.split('\n')[0] || 'Aventureiro',
      content: userText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setIsLoading(true);
    scrollToBottom();

    try {
      const gmReply = await api.sendMessage(currentSession.id, userText, optimisticMsg.senderName);
      setMessages(prev => [...prev, gmReply]);
      scrollToBottom();
    } catch {
      // Mock de resposta caso o backend não esteja ativo
      setMessages(prev => [
        ...prev,
        {
          id: 'mock-' + Date.now(),
          sessionId: currentSession.id,
          sender: 'GM',
          senderName: 'Mestre IA',
          content: `[SoloForge GM]: Diante de sua ação "${userText}", as sombras ao redor hesitam. A taverna silencia e os olhos do estalajadeiro se fixam em você. O que você faz a seguir?`,
          createdAt: new Date().toISOString()
        }
      ]);
      scrollToBottom();
    } finally {
      setIsLoading(false);
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
        coreMechanics: 'Rolagens de 1d20 + modificadores. Dificuldade padrão: Fácil (10), Moderado (15), Difícil (20).',
      });
      setCampaigns(prev => [created, ...prev]);
      handleSelectCampaign(created);
      setIsCreatingModal(false);
      setNewTitle('');
      setNewSynopsis('');
      setNewCharacter('');
      setNewLore('');
    } catch {
      // Criação local de demonstração se backend estiver offline
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
          toneAndStyle: 'Imersivo e sombrio'
        },
        system: {
          id: 's-1',
          name: 'SoloForge D20 Narrativo'
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
          content: `Saudações a ${newTitle}! As brumas do destino se abrem. Seu personagem ${newCharacter || 'O Andarilho'} se encontra diante de novos perigos e escolhas que mudarão o mundo. Dê seu primeiro passo!`,
          createdAt: new Date().toISOString()
        }
      ]);
      setIsCreatingModal(false);
    }
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
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-md transition"
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
                className="mt-2 block w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition"
              >
                Criar Primeira Crônica
              </button>
            </div>
          ) : (
            campaigns.map(camp => (
              <button
                key={camp.id}
                onClick={() => handleSelectCampaign(camp)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition group ${
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

        {/* Informações da Sessão Atual */}
        {selectedCampaign && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300">Sessão Ativa:</span>
              <span className="text-amber-400 font-mono">#{currentSession?.sessionNumber || 1}</span>
            </div>
            <p className="truncate text-slate-400">{currentSession?.title || 'Ato I'}</p>
          </div>
        )}
      </aside>

      {/* ÁREA CENTRAL: O CHAT DE INTERAÇÃO DO RPG */}
      <main className="flex-1 flex flex-col bg-slate-950 relative">
        {/* Header do Chat */}
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur-sm">
          <div>
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              {selectedCampaign ? selectedCampaign.title : 'Selecione ou Crie uma Crônica'}
              {selectedCampaign && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {selectedCampaign.genre || 'RPG Solo'}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {selectedCampaign?.synopsis || 'O Mestre IA está aguardando suas diretrizes...'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              IA Pronta (Gemini)
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
                Digite a sua primeira ação no chat abaixo para iniciar o diálogo com o Mestre IA. Ele usará as regras e a bíblia da campanha para orquestrar as consequências.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isPlayer = msg.sender === 'PLAYER';
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
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-amber-400/80 italic p-3 bg-slate-900/50 rounded-lg border border-slate-800/60 w-fit">
              <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
              O Mestre está tecendo os fios do destino e consultando as regras...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                selectedCampaign 
                  ? "Descreva sua ação ou fala (ex: 'Saco minha espada e investigo o altar antigo...')" 
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

      {/* PAINEL DIREITO: BÍBLIA & REGRAS DA CAMPANHA */}
      {selectedCampaign && (
        <aside className="w-84 border-l border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col overflow-y-auto p-5 space-y-6">
          <div className="flex items-center gap-2 text-amber-400 font-semibold border-b border-slate-800 pb-3">
            <BookOpen className="w-5 h-5" />
            <h3>Bíblia da Crônica</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Personagem do Jogador */}
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-slate-300 block mb-1">🧙 Personagem do Jogador</span>
              <p className="text-slate-400 leading-relaxed">
                {selectedCampaign.bible?.playerCharacter || 'Não especificado ainda.'}
              </p>
            </div>

            {/* Lore do Mundo */}
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-slate-300 block mb-1">🗺️ Lore do Mundo</span>
              <p className="text-slate-400 leading-relaxed">
                {selectedCampaign.bible?.worldLore || 'Sem registros detalhados de lore.'}
              </p>
            </div>

            {/* Sistema de Regras */}
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                Sistema: {selectedCampaign.system?.name || 'Regras Padrão'}
              </span>
              <p className="text-slate-400 leading-relaxed">
                {selectedCampaign.system?.coreMechanics || 'Rolagens de D20 e desafios narrativos orientados pelo Mestre.'}
              </p>
            </div>
          </div>
        </aside>
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
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
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
                  placeholder="Ex: Dark Fantasy, Cyberpunk, Lovecraftiano"
                  value={newGenre}
                  onChange={e => setNewGenre(e.target.value)}
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
                <label className="block text-slate-300 font-medium mb-1">Seu Personagem (Nome, Classe, Breve Descrição)</label>
                <input
                  type="text"
                  placeholder="Ex: Thorne, um Caçador de Recompensas amaldiçoado"
                  value={newCharacter}
                  onChange={e => setNewCharacter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Lore do Mundo (Bíblia Inicial)</label>
                <textarea
                  rows={2}
                  placeholder="O império caiu há 200 anos e as cinzas místicas cobrem as florestas..."
                  value={newLore}
                  onChange={e => setNewLore(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium flex items-center gap-1.5"
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
