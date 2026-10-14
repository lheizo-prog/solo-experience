import React, { useState } from 'react';
import { Sparkles, User, Swords, Crown } from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign, Npc, NpcTier } from '../../types/soloforge';

interface AiNpcGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampaign: Campaign | null;
  onNpcGenerated: (npc: Npc) => void;
}

export function AiNpcGeneratorModal({
  isOpen,
  onClose,
  selectedCampaign,
  onNpcGenerated
}: AiNpcGeneratorModalProps) {
  const [aiNpcConcept, setAiNpcConcept] = useState('');
  const [aiNpcType, setAiNpcType] = useState<'BOSS' | 'MINION' | 'ALLY' | 'RIVAL' | 'MERCHANT'>('BOSS');
  const [aiNpcTier, setAiNpcTier] = useState<NpcTier>('MINI_BOSS');
  const [aiNpcChallenge, setAiNpcChallenge] = useState<'FÁCIL' | 'MÉDIO' | 'DIFÍCIL' | 'MORTAL' | 'LENDÁRIO'>('DIFÍCIL');
  const [aiNpcImageUrl, setAiNpcImageUrl] = useState('');
  const [isGeneratingAiNpc, setIsGeneratingAiNpc] = useState(false);

  if (!isOpen || !selectedCampaign) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingAiNpc) return;

    setIsGeneratingAiNpc(true);
    try {
      const generated = await api.generateNpcWithAi(selectedCampaign.id, {
        concept: aiNpcConcept.trim() || undefined,
        type: aiNpcType,
        tier: aiNpcTier,
        challengeLevel: aiNpcChallenge,
        imageUrl: aiNpcImageUrl.trim() || undefined
      });
      onNpcGenerated(generated);
      onClose();
      setAiNpcConcept('');
      setAiNpcImageUrl('');
    } catch (err: unknown) {
      alert('Erro ao forjar NPC com a IA: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsGeneratingAiNpc(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-md max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Forjar Criatura / Chefe com IA
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto p-4 space-y-3.5 text-xs flex-1">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              A IA lerá o livro de regras da campanha (<strong className="text-amber-300">{selectedCampaign.system?.name || 'Sistema Atual'}</strong>) e construirá estatísticas de combate, PV, atributos e fraquezas compatíveis.
            </p>

            {/* Seletor de Categoria Especializada (Comum, Mini Boss, Grande Boss) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <span>Categoria do Encontro / Desafio</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAiNpcTier('COMMON');
                    setAiNpcType('ALLY');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    aiNpcTier === 'COMMON'
                      ? 'bg-slate-800 border-slate-500 text-slate-100 shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                    <span>Comum</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Aliados, mercadores ou oponentes no mesmo nível do herói.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiNpcTier('MINI_BOSS');
                    setAiNpcType('RIVAL');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    aiNpcTier === 'MINI_BOSS'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-100 shadow-md shadow-indigo-950/40'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5 text-indigo-300">
                    <Swords className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mini Boss</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Inimigo de elite (+30% stats), 2 técnicas e fraqueza tática clara.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiNpcTier('BOSS');
                    setAiNpcType('BOSS');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    aiNpcTier === 'BOSS'
                      ? 'bg-rose-950/80 border-rose-500 text-rose-100 shadow-md shadow-rose-950/40'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5 text-rose-300">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Grande Boss</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Chefe épico com 3 fases de combate, técnicas devastadoras e fraqueza.
                  </p>
                </button>
              </div>
            </div>

            {/* Tipo de Criatura */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Papel Temático</label>
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
              onClick={onClose}
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
  );
}
