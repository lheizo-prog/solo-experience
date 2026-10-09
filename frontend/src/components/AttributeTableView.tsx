import React, { useState } from 'react';
import { Sword, Copy, Check, Shield, Heart } from 'lucide-react';

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

        if (key && val) {
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

  const { entries, extraNotes } = parseAttributeData(rawAttributes);

  if (!rawAttributes || (!entries.length && !extraNotes.length)) {
    return (
      <div className="p-2.5 rounded border border-dashed border-slate-800 text-center text-[11px] text-slate-500 italic">
        {emptyMessage}
      </div>
    );
  }

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

      {/* Linhas Extras / Habilidades de Combate / Ataques */}
      {extraNotes.length > 0 && (
        <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
            Habilidades & Ataques:
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
