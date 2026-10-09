import React, { useState } from 'react';
import { Sword, Copy, Check, Shield, Heart, Zap, Target, AlertTriangle, Crown, Swords, User } from 'lucide-react';
import type { NpcTier } from '../types/soloforge';

export interface ParsedAttribute {
  name: string;
  value: string;
  isVital?: boolean; // PV, HP, Vida
  isDefense?: boolean; // CA, Armadura, Defesa
}

export interface AttributeParseResult {
  entries: ParsedAttribute[];
  extraNotes: string[];
  vitalHp?: ParsedAttribute;
  defenseCa?: ParsedAttribute;
}

/**
 * Realiza o parsing de texto de atributos com múltiplos delimitadores (\n, |, ;)
 * e extrai pares Chave: Valor bem como notas de combate.
 */
export function parseAttributeData(raw?: string | null): AttributeParseResult {
  if (!raw || !raw.trim()) {
    return { entries: [], extraNotes: [] };
  }

  const entries: ParsedAttribute[] = [];
  const extraNotes: string[] = [];

  // Divide por quebra de linha inicial
  const rawLines = raw.split(/\r?\n/);

  for (const line of rawLines) {
    if (!line.trim()) continue;

    // Divide por pipes '|' caso existam na mesma linha
    const segments = line.includes('|')
      ? line.split('|').map(s => s.trim()).filter(Boolean)
      : [line.trim()];

    for (const segment of segments) {
      if (!segment) continue;

      const colonIdx = segment.indexOf(':');
      if (colonIdx > 0) {
        const key = segment.substring(0, colonIdx).trim();
        const val = segment.substring(colonIdx + 1).trim();

        // Evita tratar títulos longos de parágrafos como nomes de atributos
        if (key && val && key.length <= 25) {
          const upperKey = key.toUpperCase();
          const isVital = upperKey === 'PV' || upperKey === 'HP' || upperKey.includes('VIDA');
          const isDefense = upperKey === 'CA' || upperKey === 'DEF' || upperKey.includes('ARMADURA') || upperKey.includes('DEFESA');

          entries.push({
            name: key,
            value: val,
            isVital,
            isDefense
          });
          continue;
        }
      }

      // Se não for par Chave: Valor, guarda como habilidade/ação/nota
      extraNotes.push(segment);
    }
  }

  const vitalHp = entries.find(e => e.isVital);
  const defenseCa = entries.find(e => e.isDefense);

  return { entries, extraNotes, vitalHp, defenseCa };
}

interface AttributeTableViewProps {
  rawAttributes?: string | null;
  title?: string;
  showCopy?: boolean;
  copyId?: string;
  onCopy?: (text: string, id: string) => void;
  copiedId?: string | null;
  compact?: boolean;
  emptyMessage?: string;
}

export const AttributeTableView: React.FC<AttributeTableViewProps> = ({
  rawAttributes,
  title = 'Atributos & Combate',
  showCopy = true,
  copyId = 'attr-copy',
  onCopy,
  copiedId,
  compact = false,
  emptyMessage = 'Nenhum atributo cadastrado.'
}) => {
  const [internalCopied, setInternalCopied] = useState(false);
  const isCopied = copiedId ? copiedId === copyId : internalCopied;

  const handleCopy = () => {
    if (!rawAttributes) return;
    if (onCopy) {
      onCopy(rawAttributes, copyId);
    } else {
      navigator.clipboard.writeText(rawAttributes);
      setInternalCopied(true);
      setTimeout(() => setInternalCopied(false), 2000);
    }
  };

  const { entries, extraNotes, vitalHp } = parseAttributeData(rawAttributes);

  if (!rawAttributes || (!entries.length && !extraNotes.length)) {
    return (
      <div className="p-2.5 rounded border border-dashed border-slate-800 text-center text-[11px] text-slate-500 italic">
        {emptyMessage}
      </div>
    );
  }

  // Cálculo da Barra de Vida se houver vitalHp
  const hpData = (() => {
    if (!vitalHp) return null;
    const match = vitalHp.value.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      const cur = parseInt(match[1], 10);
      const max = parseInt(match[2], 10);
      if (!isNaN(cur) && !isNaN(max) && max > 0) {
        return { current: cur, max, percent: Math.max(0, Math.min(100, Math.round((cur / max) * 100))) };
      }
    }
    const single = vitalHp.value.match(/(\d+)/);
    if (single) {
      const val = parseInt(single[1], 10);
      if (!isNaN(val) && val > 0) {
        return { current: val, max: val, percent: 100 };
      }
    }
    return null;
  })();

  return (
    <div className={`bg-slate-950/70 border border-slate-800/80 rounded-lg overflow-hidden ${compact ? 'p-2' : 'p-2.5'} space-y-2`}>
      {/* Cabeçalho da Tabela */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-amber-400">
        <div className="flex items-center gap-1.5">
          <Sword className="w-3.5 h-3.5 text-amber-500" />
          <span>{title}</span>
        </div>

        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] normal-case tracking-normal text-slate-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
            title="Copiar atributos"
          >
            {isCopied ? (
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
        )}
      </div>

      {/* Barra Visual de Vida (PV) se detectado */}
      {hpData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded p-1.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold">
            <span className="text-emerald-400 flex items-center gap-1">
              <Heart className="w-2.5 h-2.5 fill-emerald-500 text-emerald-400 animate-pulse" />
              {vitalHp?.name || 'Pontos de Vida (PV)'}
            </span>
            <span className="font-mono text-slate-200">
              {hpData.current} / {hpData.max} ({hpData.percent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                hpData.percent > 50
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-400 shadow-sm shadow-emerald-500/30'
                  : hpData.percent > 25
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-400 shadow-sm shadow-amber-500/30'
                  : 'bg-gradient-to-r from-rose-600 to-red-500 shadow-sm shadow-rose-500/40 animate-pulse'
              }`}
              style={{ width: `${hpData.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Grade / Tabela de Atributos */}
      {entries.length > 0 && (
        <div className={`grid ${compact ? 'grid-cols-2 gap-1' : 'grid-cols-2 sm:grid-cols-3 gap-1.5'}`}>
          {entries.map((item, idx) => {
            // Verifica se tem modificador entre parênteses para realçar (ex: "16 (+3)")
            const hasMod = item.value.includes('(') && item.value.includes(')');
            
            return (
              <div
                key={idx}
                className={`bg-slate-900/90 border rounded px-2 py-1 flex items-center justify-between gap-1 transition ${
                  item.isVital
                    ? 'border-emerald-600/40 bg-emerald-950/20'
                    : item.isDefense
                    ? 'border-sky-600/40 bg-sky-950/20'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  {item.isVital && <Heart className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                  {item.isDefense && <Shield className="w-2.5 h-2.5 text-sky-400 shrink-0" />}
                  <span className="text-slate-300 font-medium text-[11px] truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  {hasMod ? (
                    <span className="font-mono text-[11px]">
                      <span className="text-slate-100 font-bold">{item.value.split('(')[0].trim()} </span>
                      <span className="text-amber-400 font-semibold text-[10px]">({item.value.split('(')[1]}</span>
                    </span>
                  ) : (
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        item.isVital
                          ? 'text-emerald-300'
                          : item.isDefense
                          ? 'text-sky-300'
                          : 'text-amber-400'
                      }`}
                    >
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Linhas Extras se houver */}
      {extraNotes.length > 0 && (
        <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
            Notas de Combate:
          </span>
          <div className="flex flex-wrap gap-1">
            {extraNotes.map((note, idx) => (
              <span
                key={idx}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded leading-relaxed inline-block"
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Badge Temático para o Tier do NPC
 */
export const NpcTierBadge: React.FC<{ tier?: NpcTier | string }> = ({ tier }) => {
  const normalized = (tier || 'COMMON').toUpperCase();

  if (normalized === 'BOSS') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 text-rose-200 border border-rose-500/60 flex items-center gap-1 shadow-md shadow-rose-950/50 ring-1 ring-amber-400/30 animate-pulse">
        <Crown className="w-3 h-3 text-amber-400 drop-shadow" />
        <span className="tracking-wide">Grande Chefe</span>
      </span>
    );
  }

  if (normalized === 'MINI_BOSS') {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-950 to-slate-900 text-indigo-200 border border-indigo-500/50 flex items-center gap-1 shadow-sm shadow-indigo-950/40">
        <Swords className="w-3 h-3 text-indigo-400" />
        <span>Mini Boss</span>
      </span>
    );
  }

  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-900/90 text-slate-400 border border-slate-800 flex items-center gap-1">
      <User className="w-2.5 h-2.5 text-slate-400" />
      <span>Comum</span>
    </span>
  );
};

/**
 * Visualização Estruturada de Habilidades & Técnicas do NPC
 */
export const NpcSkillsView: React.FC<{ rawSkills?: string | null }> = ({ rawSkills }) => {
  if (!rawSkills || !rawSkills.trim()) return null;

  // Quebra por linhas ou pipes '|'
  const items = rawSkills.includes('|')
    ? rawSkills.split('|').map(s => s.trim()).filter(Boolean)
    : rawSkills.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  return (
    <div className="bg-slate-950/60 border border-indigo-950/60 rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
        <Zap className="w-3.5 h-3.5 text-indigo-400" />
        <span>Habilidades & Técnicas</span>
      </div>

      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const colonIdx = item.indexOf(':');
          const hasColon = colonIdx > 0;
          const title = hasColon ? item.substring(0, colonIdx).trim() : '';
          const desc = hasColon ? item.substring(colonIdx + 1).trim() : item;

          return (
            <div key={idx} className="bg-slate-900/80 border border-slate-800/80 rounded px-2.5 py-1.5 text-xs">
              {hasColon ? (
                <div>
                  <span className="font-semibold text-amber-300 text-[11px] block">{title}</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">{desc}</p>
                </div>
              ) : (
                <p className="text-slate-300 text-[11px] leading-relaxed">{desc}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Visualização Estruturada de Estratégia de Combate, Fases e Fraquezas
 */
export const NpcStrategyView: React.FC<{ rawStrategy?: string | null; tier?: NpcTier | string }> = ({
  rawStrategy,
  tier
}) => {
  if (!rawStrategy || !rawStrategy.trim()) return null;

  const isBossOrMini = (tier || '').toUpperCase().includes('BOSS');

  // Quebra por linhas ou pipes
  const segments = rawStrategy.includes('|')
    ? rawStrategy.split('|').map(s => s.trim()).filter(Boolean)
    : rawStrategy.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  // Isola fraquezas e fases
  const weaknesses: string[] = [];
  const phasesOrTactics: string[] = [];

  for (const seg of segments) {
    if (seg.toLowerCase().includes('fraqueza') || seg.toLowerCase().includes('vulnerab')) {
      weaknesses.push(seg);
    } else {
      phasesOrTactics.push(seg);
    }
  }

  return (
    <div className={`rounded-lg p-2.5 space-y-2 border ${
      isBossOrMini 
        ? 'bg-slate-950/80 border-amber-950/80 shadow-sm' 
        : 'bg-slate-950/60 border-slate-800/80'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
        <Target className="w-3.5 h-3.5 text-amber-400" />
        <span>Estratégia & Padrão de Combate</span>
      </div>

      {/* Fases / Padrões de Ação */}
      <div className="space-y-1.5">
        {phasesOrTactics.map((tactic, idx) => {
          const colonIdx = tactic.indexOf(':');
          const hasColon = colonIdx > 0;
          const title = hasColon ? tactic.substring(0, colonIdx).trim() : '';
          const desc = hasColon ? tactic.substring(colonIdx + 1).trim() : tactic;

          const isPhase = title.toLowerCase().includes('fase') || tactic.toLowerCase().includes('fase');

          return (
            <div
              key={idx}
              className={`rounded px-2.5 py-1.5 text-xs border ${
                isPhase
                  ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                  : 'bg-slate-900/80 border-slate-800/80 text-slate-300'
              }`}
            >
              {hasColon ? (
                <div>
                  <span className={`font-bold text-[11px] block ${isPhase ? 'text-amber-400' : 'text-slate-200'}`}>
                    {title}
                  </span>
                  <p className="text-[11px] leading-relaxed mt-0.5 text-slate-300">{desc}</p>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed">{desc}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Fraquezas em Destaque */}
      {weaknesses.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-800/80">
          {weaknesses.map((w, idx) => (
            <div
              key={idx}
              className="bg-rose-950/30 border border-rose-500/40 rounded p-2 text-xs flex items-start gap-2 text-rose-200"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="text-rose-300 font-semibold block">Vulnerabilidade / Fraqueza Tática:</strong>
                <p className="text-rose-200/90 mt-0.5">
                  {w.includes(':') ? w.split(':')[1].trim() : w}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
