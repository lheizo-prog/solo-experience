import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  ChevronUp, 
  ChevronDown, 
  Check 
} from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign, ProgressionEvaluationResponse } from '../../types/soloforge';

interface CharacterProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampaign: Campaign | null;
  onProgressionSaved: (updatedCampaign: Campaign) => void;
}

export function CharacterProgressionModal({
  isOpen,
  onClose,
  selectedCampaign,
  onProgressionSaved
}: CharacterProgressionModalProps) {
  const [characterEvolutionEvent, setCharacterEvolutionEvent] = useState('');
  const [characterProgressionType, setCharacterProgressionType] = useState('LEVEL_UP');
  const [isEvaluatingProgression, setIsEvaluatingProgression] = useState(false);
  const [progressionEvaluation, setProgressionEvaluation] = useState<ProgressionEvaluationResponse | null>(null);
  const [allocatedIncreases, setAllocatedIncreases] = useState<Record<string, number>>({});
  const [remainingPoints, setRemainingPoints] = useState<number>(0);
  const [showAiSuggestion, setShowAiSuggestion] = useState<boolean>(false);
  const [isSavingCharacterProgression, setIsSavingCharacterProgression] = useState(false);

  if (!isOpen || !selectedCampaign) return null;

  const handleEvaluateCharacterProgression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterEvolutionEvent.trim() || isEvaluatingProgression) return;

    setIsEvaluatingProgression(true);
    try {
      const evaluation = await api.evaluateCharacterProgression(selectedCampaign.id, {
        eventDescription: characterEvolutionEvent.trim(),
        progressionType: characterProgressionType
      });
      setProgressionEvaluation(evaluation);
      setRemainingPoints(evaluation.awardedPoints);
      setAllocatedIncreases({});
      setShowAiSuggestion(false);
    } catch (err: unknown) {
      alert('Erro ao calcular evolução de atributos com a IA: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsEvaluatingProgression(false);
    }
  };

  const handleIncreaseAttribute = (attrName: string) => {
    if (remainingPoints <= 0) return;
    setAllocatedIncreases(prev => ({
      ...prev,
      [attrName]: (prev[attrName] || 0) + 1
    }));
    setRemainingPoints(prev => prev - 1);
  };

  const handleDecreaseAttribute = (attrName: string) => {
    if ((allocatedIncreases[attrName] || 0) <= 0) return;
    setAllocatedIncreases(prev => ({
      ...prev,
      [attrName]: prev[attrName] - 1
    }));
    setRemainingPoints(prev => prev + 1);
  };

  const handleApplyAiSuggestion = () => {
    if (!progressionEvaluation) return;
    const newAllocated: Record<string, number> = {};
    let spent = 0;
    for (const alloc of progressionEvaluation.suggestedAllocations) {
      if (alloc.suggestedIncrease > 0 && spent + alloc.suggestedIncrease <= progressionEvaluation.awardedPoints) {
        newAllocated[alloc.attributeName] = alloc.suggestedIncrease;
        spent += alloc.suggestedIncrease;
      }
    }
    setAllocatedIncreases(newAllocated);
    setRemainingPoints(Math.max(0, progressionEvaluation.awardedPoints - spent));
  };

  const handleSaveCharacterProgression = async () => {
    if (!selectedCampaign.bible || isSavingCharacterProgression) return;

    setIsSavingCharacterProgression(true);
    try {
      const currentAttrs = selectedCampaign.bible.characterAttributes || '';
      const lines = currentAttrs.split('\n').filter(Boolean);

      const updatedLines = lines.map(line => {
        const [name, ...valParts] = line.split(':');
        const trimmedName = name.trim();
        const currentVal = valParts.join(':').trim();

        const matchEntry = Object.entries(allocatedIncreases).find(
          ([k]) => k.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        const increase = matchEntry ? matchEntry[1] : 0;
        if (increase === 0) return line;

        const numMatch = currentVal.match(/\d+/);
        if (!numMatch) {
          return `${trimmedName}: ${currentVal} (+${increase})`;
        }

        const oldNum = parseInt(numMatch[0], 10);
        const newNum = oldNum + increase;

        if (currentVal.includes('(') && currentVal.includes(')')) {
          const mod = Math.floor((newNum - 10) / 2);
          const modStr = (mod >= 0 ? '+' : '') + mod;
          return `${trimmedName}: ${newNum} (${modStr})`;
        }

        const updatedVal = currentVal.replace(/\d+/, String(newNum));
        return `${trimmedName}: ${updatedVal}`;
      });

      const newAttributesString = updatedLines.join('\n');

      const updatedCampaign = await api.updateBible(selectedCampaign.id, {
        worldLore: selectedCampaign.bible.worldLore,
        toneAndStyle: selectedCampaign.bible.toneAndStyle,
        playerCharacter: selectedCampaign.bible.playerCharacter,
        characterAttributes: newAttributesString,
        keyThemes: selectedCampaign.bible.keyThemes
      });

      onProgressionSaved(updatedCampaign);
      onClose();
      // Reset de estado
      setProgressionEvaluation(null);
      setCharacterEvolutionEvent('');
      setAllocatedIncreases({});
      alert('Ficha do Personagem atualizada com sucesso!');
    } catch (err: unknown) {
      alert('Erro ao salvar nova ficha: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsSavingCharacterProgression(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-xl max-h-[90dvh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300">
                Evolução de Atributos & Conquistas
              </h3>
              <p className="text-[11px] text-slate-400">
                Interpretando as regras de <strong className="text-slate-300">{selectedCampaign.system?.name || 'Sistema Atual'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {!progressionEvaluation ? (
            /* ETAPA 1: DESCRIÇÃO DO EVENTO / MARCO NARRATIVO */
            <form onSubmit={handleEvaluateCharacterProgression} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  O que aconteceu na narrativa para justificar essa evolução? *
                </label>
                <textarea
                  rows={3}
                  required
                  value={characterEvolutionEvent}
                  onChange={e => setCharacterEvolutionEvent(e.target.value)}
                  placeholder="Ex: Superei o duelo com o Campeão de Sangue após semanas de treino nas montanhas, ou encontrei o Tomo Arcano ancestral na cripta..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 outline-none focus:border-amber-500 placeholder-slate-500 text-xs leading-relaxed"
                />
              </div>

              {/* Exemplos Rápidos de Inspiração */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                  Inspirações Rápidas de Marcos:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCharacterEvolutionEvent('Subida de Nível: Após superar os perigos do último arco, meu personagem alcançou um novo patamar de poder e maturidade.');
                      setCharacterProgressionType('LEVEL_UP');
                    }}
                    className="p-2 bg-slate-950/60 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 rounded-lg text-left text-[11px] text-slate-300 transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-base">🏆</span>
                    <div>
                      <strong className="block text-slate-200">Subida de Nível</strong>
                      <span className="text-[10px] text-slate-400">Marco de evolução clássico</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCharacterEvolutionEvent('Vitória em Batalha Épica: Enfrentei e derrotei um oponente colossal em combate corporal extremo, exigindo cada gota de esforço físico.');
                      setCharacterProgressionType('EPIC_MILESTONE');
                    }}
                    className="p-2 bg-slate-950/60 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 rounded-lg text-left text-[11px] text-slate-300 transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-base">⚔️</span>
                    <div>
                      <strong className="block text-slate-200">Combate Épico</strong>
                      <span className="text-[10px] text-slate-400">Superação de limites</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCharacterEvolutionEvent('Treinamento Intenso: Dediquei semanas a treinos árduos, estudos arcanos ou meditação solitária para aprimorar minhas capacidades.');
                      setCharacterProgressionType('TRAINING');
                    }}
                    className="p-2 bg-slate-950/60 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 rounded-lg text-left text-[11px] text-slate-300 transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-base">📖</span>
                    <div>
                      <strong className="block text-slate-200">Treino / Estudo</strong>
                      <span className="text-[10px] text-slate-400">Aperfeiçoamento focado</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCharacterEvolutionEvent('Bênção / Dádiva Sobrenatural: Fui abençoado por uma entidade antiga, absorvi essência divina ou empunhei uma relíquia transformadora.');
                      setCharacterProgressionType('CUSTOM');
                    }}
                    className="p-2 bg-slate-950/60 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 rounded-lg text-left text-[11px] text-slate-300 transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-base">✨</span>
                    <div>
                      <strong className="block text-slate-200">Bênção / Dádiva</strong>
                      <span className="text-[10px] text-slate-400">Transformação arcana</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Card Informativo sobre a Leitura do Sistema */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-slate-300 space-y-1">
                <span className="font-semibold text-amber-400 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Interpretação Personalizada por Sistema de Regras
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  A IA consultará as regras do <strong>{selectedCampaign.system?.name || 'Sistema Atual'}</strong>, lerá a escala numérica matemática (ex: D20 de 1 a 20, D100 percentual ou Storyteller) e calculará a quantidade justa de pontos de atributo para esta conquista.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEvaluatingProgression || !characterEvolutionEvent.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition shadow-lg shadow-amber-600/20 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isEvaluatingProgression ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Interpretando Sistema com IA...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span>Interpretar Sistema & Calcular Pontos</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ETAPA 2: ALOCAÇÃO LIVRE COM SUGESTÃO DA IA SOB DEMANDA */
            <div className="space-y-4">
              {/* Card de Análise da Escala do Sistema */}
              <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-950/80 to-slate-900 border border-amber-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold uppercase tracking-wider">
                    {progressionEvaluation.systemName} • {progressionEvaluation.situationImpact}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold font-mono">
                    +{progressionEvaluation.awardedPoints} {progressionEvaluation.awardedPoints === 1 ? 'Ponto Conquistado' : 'Pontos Conquistados'}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {progressionEvaluation.systemScaleExplanation}
                </p>
              </div>

              {/* Painel de Pontos Disponíveis */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                    Pontos Disponíveis para Distribuir
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {remainingPoints}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 text-right max-w-[240px]">
                  Use os botões <strong className="text-slate-200">[-]</strong> e <strong className="text-slate-200">[+]</strong> em cada atributo abaixo para alocar livremente.
                </span>
              </div>

              {/* Lista de Atributos com Stepper Manual */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Atributos Atuais & Ajuste de Pontos:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedCampaign.bible?.characterAttributes || '').split('\n').filter(Boolean).map((line, idx) => {
                    const [name, ...valParts] = line.split(':');
                    const trimmedName = name.trim();
                    const currentVal = valParts.join(':').trim();
                    const numMatch = currentVal.match(/\d+/);
                    const baseNum = numMatch ? parseInt(numMatch[0], 10) : 10;
                    const increase = allocatedIncreases[trimmedName] || 0;
                    const newNum = baseNum + increase;

                    let previewVal = currentVal;
                    if (increase > 0) {
                      if (currentVal.includes('(') && currentVal.includes(')')) {
                        const mod = Math.floor((newNum - 10) / 2);
                        const modStr = (mod >= 0 ? '+' : '') + mod;
                        previewVal = `${newNum} (${modStr})`;
                      } else {
                        previewVal = currentVal.replace(/\d+/, String(newNum));
                      }
                    }

                    return (
                      <div 
                        key={idx} 
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                          increase > 0 
                            ? 'bg-amber-950/30 border-amber-500/60 shadow-sm shadow-amber-950/20' 
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-200 text-xs block truncate">
                            {trimmedName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                            <span className="text-slate-400 font-mono">{currentVal}</span>
                            {increase > 0 && (
                              <>
                                <span className="text-amber-400">→</span>
                                <span className="text-emerald-400 font-bold font-mono">{previewVal}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Controles de Stepper */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-800 rounded-lg p-1">
                          <button
                            type="button"
                            disabled={increase <= 0}
                            onClick={() => handleDecreaseAttribute(trimmedName)}
                            className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded font-bold transition cursor-pointer text-xs"
                          >
                            -
                          </button>
                          <span className={`w-5 text-center font-mono font-bold text-xs ${increase > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            +{increase}
                          </span>
                          <button
                            type="button"
                            disabled={remainingPoints <= 0}
                            onClick={() => handleIncreaseAttribute(trimmedName)}
                            className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded font-bold transition cursor-pointer text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* REQUISITO CRÍTICO: SUGESTÃO DA IA EXIBIDA SOMENTE SE O JOGADOR QUISER (SOB DEMANDA) */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <button
                  type="button"
                  onClick={() => setShowAiSuggestion(prev => !prev)}
                  className="w-full p-3 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-amber-300 hover:bg-slate-900/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>Ver Sugestão de Distribuição da IA</span>
                    <span className="text-[10px] text-slate-500 font-normal">(Opcional)</span>
                  </div>
                  {showAiSuggestion ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showAiSuggestion && (
                  <div className="p-3.5 border-t border-slate-800 space-y-3 bg-slate-900/40 animate-fade-in">
                    <p className="text-slate-300 text-xs italic leading-relaxed">
                      "{progressionEvaluation.narrativeReasoning}"
                    </p>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-amber-400 block uppercase tracking-wider">
                        Recomendação do Mestre:
                      </span>
                      <div className="space-y-1.5">
                        {progressionEvaluation.suggestedAllocations.map((alloc, idx) => (
                          <div key={idx} className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg flex items-start justify-between gap-2 text-[11px]">
                            <div>
                              <strong className="text-slate-200">{alloc.attributeName}</strong>
                              <p className="text-slate-400 text-[10px] mt-0.5">{alloc.reasoning}</p>
                            </div>
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-mono font-bold shrink-0">
                              +{alloc.suggestedIncrease}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleApplyAiSuggestion}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Aplicar Esta Sugestão nos Steppers</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo da Crônica Narrativa */}
              {progressionEvaluation.narrativeNote && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 italic">
                  📜 <strong className="text-slate-300 font-sans not-italic">Crônica:</strong> "{progressionEvaluation.narrativeNote}"
                </div>
              )}

              {/* Footer com Ações */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProgressionEvaluation(null)}
                  className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer"
                >
                  ← Refazer Cálculo / Voltar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSavingCharacterProgression}
                    onClick={handleSaveCharacterProgression}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-900/30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSavingCharacterProgression ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando Ficha...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmar e Salvar Ficha</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
