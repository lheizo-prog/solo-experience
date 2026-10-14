import React, { useState } from 'react';
import { Scroll, Sparkles, Copy, Check, Sword, Eye, X, ChevronRight, Award, Compass } from 'lucide-react';
import type { Session } from '../types/soloforge';

interface EpisodeSummaryModalProps {
  session: Session;
  onClose: () => void;
  onProceedToNext?: () => void;
  isProceeding?: boolean;
}

interface ParsedEpisodeSummary {
  title: string;
  chronicle: string;
  milestones: string[];
  decisions: string[];
  rewards: string[];
  teaser: string;
  rawText: string;
}

export function parseEpisodeSummaryText(rawText?: string | null, fallbackActNumber: number = 1): ParsedEpisodeSummary {
  if (!rawText || !rawText.trim()) {
    return {
      title: `Ato ${fallbackActNumber}: Conclusão da Jornada`,
      chronicle: 'Nenhum registro crônico detalhado foi registrado para este episódio.',
      milestones: [],
      decisions: [],
      rewards: [],
      teaser: '',
      rawText: ''
    };
  }

  const lines = rawText.split(/\r?\n/);
  let title = `Ato ${fallbackActNumber}`;
  let chronicle = '';
  const milestones: string[] = [];
  const decisions: string[] = [];
  const rewards: string[] = [];
  let teaser = '';

  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('# ') && !title.includes(':')) {
      title = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    if (line.startsWith('## ')) {
      const lower = line.toLowerCase();
      if (lower.includes('crônica') || lower.includes('cronica') || lower.includes('acontecimento')) {
        currentSection = 'chronicle';
      } else if (lower.includes('feito') || lower.includes('decis') || lower.includes('conquista') || lower.includes('marco')) {
        currentSection = 'achievements';
      } else if (lower.includes('próximo') || lower.includes('proximo') || lower.includes('episódio') || lower.includes('teaser')) {
        currentSection = 'teaser';
      } else {
        currentSection = 'other';
      }
      continue;
    }

    if (currentSection === 'chronicle') {
      chronicle += (chronicle ? '\n\n' : '') + line;
    } else if (currentSection === 'achievements') {
      const lower = line.toLowerCase();
      if (lower.includes('provaç') || lower.includes('combate') || lower.includes('batalha')) {
        milestones.push(line.replace(/^[*-]\s*(?:\*\*[^*]+\*\*:\s*)?/, '').trim());
      } else if (lower.includes('decis') || lower.includes('escolha') || lower.includes('aliança')) {
        decisions.push(line.replace(/^[*-]\s*(?:\*\*[^*]+\*\*:\s*)?/, '').trim());
      } else if (lower.includes('descoberta') || lower.includes('recompensa') || lower.includes('item') || lower.includes('pista')) {
        rewards.push(line.replace(/^[*-]\s*(?:\*\*[^*]+\*\*:\s*)?/, '').trim());
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        milestones.push(line.replace(/^[*-]\s*/, '').trim());
      }
    } else if (currentSection === 'teaser') {
      teaser += (teaser ? ' ' : '') + line.replace(/^["“”']|["“”']$/g, '');
    }
  }

  // Fallback se não seguiu os marcadores markdown exatos
  if (!chronicle && !milestones.length && !teaser) {
    chronicle = rawText;
  }

  return {
    title,
    chronicle: chronicle || 'O herói avançou bravamente pelas provações, superando desafios e desvendando mistérios.',
    milestones,
    decisions,
    rewards,
    teaser,
    rawText
  };
}

export const EpisodeSummaryModal: React.FC<EpisodeSummaryModalProps> = ({
  session,
  onClose,
  onProceedToNext,
  isProceeding = false
}) => {
  const [copied, setCopied] = useState(false);
  const parsed = parseEpisodeSummaryText(session.summary, session.sessionNumber);

  const handleCopy = () => {
    const textToCopy = session.summary || `${parsed.title}\n\n${parsed.chronicle}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 w-full max-w-2xl max-h-[92dvh] rounded-2xl shadow-2xl shadow-amber-950/50 flex flex-col overflow-hidden relative">
        
        {/* Barra de Brilho Superior Decorativa */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shrink-0" />

        {/* Cabeçalho do Episódio */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-700/10 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-inner">
              <Scroll className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-widest text-amber-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Fechamento de Episódio / Ato
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  Ato {session.sessionNumber}
                </span>
              </div>
              <h2 className="font-rpg text-base sm:text-xl font-bold text-slate-100 tracking-wide mt-0.5 line-clamp-2">
                {parsed.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Fechar Crônica"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com a Crônica e Feitos */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm flex-1 font-sans">
          
          {/* Card da Crônica Narrativa */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-amber-900/40 relative shadow-inner space-y-2">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
              <Scroll className="w-3.5 h-3.5" />
              Crônica dos Acontecimentos
            </span>
            <p className="text-slate-200 leading-relaxed whitespace-pre-line text-xs sm:text-sm font-sans italic border-l-2 border-amber-500/50 pl-3">
              "{parsed.chronicle}"
            </p>
          </div>

          {/* Seção de Feitos & Marcos */}
          {(parsed.milestones.length > 0 || parsed.decisions.length > 0 || parsed.rewards.length > 0) && (
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Marcos & Conquistas Deste Ato:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Provações & Combates */}
                {parsed.milestones.length > 0 && (
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                      <Sword className="w-3.5 h-3.5 text-rose-400" />
                      Provações & Batalhas
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {parsed.milestones.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisões Cruciais */}
                {parsed.decisions.length > 0 && (
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      Decisões & Alianças
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {parsed.decisions.map((d, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Descobertas & Recompensas */}
                {parsed.rewards.length > 0 && (
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5 sm:col-span-2">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Descobertas & Recompensas
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {parsed.rewards.map((r, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Banner "No Próximo Episódio..." (Teaser) */}
          {parsed.teaser && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-950/60 border border-purple-500/40 space-y-1 shadow-lg shadow-purple-950/20">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                No Próximo Episódio...
              </span>
              <p className="text-xs sm:text-sm text-purple-100 font-medium italic">
                "{parsed.teaser}"
              </p>
            </div>
          )}

          <div className="pt-2 text-[10px] text-slate-500 italic flex items-center justify-between border-t border-slate-800/60">
            <span>Esta crônica foi gravada na memória histórica do Mestre IA.</span>
            <span>SoloForge Chronicles</span>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700 active:scale-95"
            title="Copiar Crônica Completa"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Crônica</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {onProceedToNext ? (
              <button
                type="button"
                onClick={onProceedToNext}
                disabled={isProceeding}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-amber-900/30 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span>Avançar para o Próximo Ato</span>
                <ChevronRight className="w-4 h-4 font-bold" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
