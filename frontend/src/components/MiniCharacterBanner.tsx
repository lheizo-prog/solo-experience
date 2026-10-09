import React from 'react';
import { User, Shield, Heart, TrendingUp, ChevronUp, ChevronDown, BookOpen } from 'lucide-react';
import { parseAttributeData } from './AttributeTableView';

interface MiniCharacterBannerProps {
  characterDescription?: string | null;
  rawAttributes?: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenCharacterSheet: () => void;
  onEvolveCharacter: () => void;
}

export const MiniCharacterBanner: React.FC<MiniCharacterBannerProps> = ({
  characterDescription,
  rawAttributes,
  isOpen,
  onToggleOpen,
  onOpenCharacterSheet,
  onEvolveCharacter
}) => {
  if (!characterDescription && !rawAttributes) {
    return null;
  }

  // Extrai nome/conceito enxuto a partir do texto do personagem
  const descLines = (characterDescription || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const heroNameLine = descLines[0] || 'Protagonista';
  const heroConceptLine = descLines[1] || '';

  const { entries, vitalHp, defenseCa } = parseAttributeData(rawAttributes);

  // Filtra atributos chave que não sejam PV ou CA para exibir de relance (até 6 atributos)
  const keyAttributes = entries
    .filter(e => !e.isVital && !e.isDefense)
    .slice(0, 6);

  if (!isOpen) {
    return (
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-amber-400" />
          </div>
          <span className="font-semibold text-slate-200 text-xs truncate">
            {heroNameLine}
          </span>

          {vitalHp && (
            <span className="flex items-center gap-1 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
              <Heart className="w-2.5 h-2.5 text-emerald-400" />
              {vitalHp.value}
            </span>
          )}

          {defenseCa && (
            <span className="flex items-center gap-1 bg-sky-950/50 border border-sky-500/30 text-sky-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
              <Shield className="w-2.5 h-2.5 text-sky-400" />
              {defenseCa.value}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenCharacterSheet}
            className="text-[10px] text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded hover:bg-slate-800 transition cursor-pointer font-medium"
          >
            Ficha
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer rounded hover:bg-slate-800"
            title="Expandir barra de status rápido"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/95 border-b border-amber-950/60 px-3 sm:px-4 py-2 backdrop-blur-md shadow-sm z-10 shrink-0 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Identificação do Herói */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-sm">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100 text-xs sm:text-sm truncate">
                {heroNameLine}
              </span>
              {vitalHp && (
                <span className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  <Heart className="w-2.5 h-2.5 text-emerald-400" />
                  PV: {vitalHp.value}
                </span>
              )}
              {defenseCa && (
                <span className="flex items-center gap-1 bg-sky-950/60 border border-sky-500/40 text-sky-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  <Shield className="w-2.5 h-2.5 text-sky-400" />
                  CA: {defenseCa.value}
                </span>
              )}
            </div>
            {heroConceptLine && (
              <p className="text-[10px] text-amber-300/80 truncate max-w-sm mt-0.5">
                {heroConceptLine}
              </p>
            )}
          </div>
        </div>

        {/* Atributos Principais & Ações Rápidas */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          {keyAttributes.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {keyAttributes.map((attr, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-mono shrink-0"
                >
                  <span className="text-slate-400 font-semibold">{attr.name}:</span>
                  <span className="text-amber-400 font-bold">{attr.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={onEvolveCharacter}
              className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer active:scale-95"
              title="Evoluir Atributos com IA"
            >
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span>Evoluir</span>
            </button>

            <button
              type="button"
              onClick={onOpenCharacterSheet}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer active:scale-95"
              title="Abrir Ficha Completa no Grimório"
            >
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span>Ficha</span>
            </button>

            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition cursor-pointer ml-1"
              title="Minimizar barra"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
