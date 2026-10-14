import React, { useState } from 'react';
import { Zap, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign, Npc } from '../../types/soloforge';

interface NpcEvolutionModalProps {
  npc: Npc | null;
  onClose: () => void;
  selectedCampaign: Campaign | null;
  onNpcEvolved: (evolvedNpc: Npc) => void;
}

export function NpcEvolutionModal({
  npc,
  onClose,
  selectedCampaign,
  onNpcEvolved
}: NpcEvolutionModalProps) {
  const [evolveEventText, setEvolveEventText] = useState('');
  const [isEvolvingNpc, setIsEvolvingNpc] = useState(false);

  if (!npc || !selectedCampaign) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evolveEventText.trim() || isEvolvingNpc) return;

    setIsEvolvingNpc(true);
    try {
      const evolved = await api.evolveNpc(selectedCampaign.id, npc.id, evolveEventText.trim());
      onNpcEvolved(evolved);
      onClose();
      setEvolveEventText('');
    } catch (err: unknown) {
      alert('Erro ao evoluir NPC com IA: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsEvolvingNpc(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-amber-500/50 w-full max-w-md max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-amber-500/40 bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
              {npc.imageUrl ? (
                <img src={npc.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Zap className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 truncate">
                Evolução Narrativa com IA
              </h3>
              <p className="text-[11px] text-slate-300 truncate">{npc.name} ({npc.role || 'Personagem'})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto p-4 space-y-3.5 text-xs flex-1">
            <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 text-[11px] space-y-1">
              <span className="text-amber-500 font-semibold uppercase text-[10px] tracking-wider block">Atributos Atuais:</span>
              <p className="font-mono text-slate-300 whitespace-pre-wrap">{npc.attributes || 'Nenhum atributo registrado ainda.'}</p>
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
              onClick={onClose}
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
  );
}
