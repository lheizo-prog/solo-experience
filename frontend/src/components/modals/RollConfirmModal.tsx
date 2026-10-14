import { useState, useEffect } from 'react';
import { Sword, Dices, Flame, X } from 'lucide-react';

export interface PendingCheck {
  dice: string;      // ex: "d20"
  dc: number;        // ex: 14
  attribute: string; // ex: "Destreza"
  reason: string;    // ex: "Desviar da armadilha de espinhos"
}

export interface RollConfirmData {
  sides: number;
  checkTarget?: PendingCheck;
  count?: number;
  mode?: 'NORMAL' | 'ADVANTAGE' | 'DISADVANTAGE';
  bonus?: number;
}

interface RollConfirmModalProps {
  data: RollConfirmData | null;
  initialMessage?: string;
  onClose: () => void;
  onConfirm: (actionDescription: string) => void;
}

export function RollConfirmModal({
  data,
  initialMessage = '',
  onClose,
  onConfirm
}: RollConfirmModalProps) {
  const [actionMessage, setActionMessage] = useState(initialMessage);

  useEffect(() => {
    setActionMessage(initialMessage);
  }, [initialMessage, data]);

  if (!data) return null;

  const isDamage = Boolean(
    data.checkTarget && (
      data.checkTarget.dc === 0 ||
      data.checkTarget.attribute.toLowerCase().includes('dano') ||
      data.checkTarget.attribute.toLowerCase().includes('damage') ||
      data.checkTarget.reason.toLowerCase().includes('dano')
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between ${
          data.checkTarget && isDamage
            ? 'bg-gradient-to-r from-red-950/50 via-slate-900 to-slate-900'
            : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              data.checkTarget && isDamage
                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
            }`}>
              {data.checkTarget && isDamage ? (
                <Sword className="w-5 h-5" />
              ) : (
                <Dices className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {data.checkTarget && isDamage
                  ? 'Confirmar Rolagem de Dano'
                  : 'Confirmar Rolagem de Dados'}
              </h3>
              <p className="text-xs text-slate-400">
                {data.checkTarget 
                  ? isDamage
                    ? `Rolagem de Dano: ${data.checkTarget.attribute}`
                    : `Teste Oficial: ${data.checkTarget.attribute} (DT ${data.checkTarget.dc})`
                  : `Rolagem Livre: ${data.count || 1}d${data.sides}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo & Detalhes da Rolagem */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Badge de Resumo da Rolagem */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Mecânica / Fórmula</span>
              <span className="text-sm font-mono font-bold text-amber-400">
                {data.checkTarget ? (
                  isDamage ? (
                    <>
                      <span className="text-red-400 font-bold">{data.count || 1}d{data.sides}</span>
                      {(data.bonus || 0) !== 0 ? ` ${(data.bonus || 0) > 0 ? '+' : ''}${data.bonus}` : ''}
                      <span className="text-rose-400/90 font-sans text-xs ml-1.5 font-bold">(Dano)</span>
                    </>
                  ) : (
                    <>
                      {data.mode === 'ADVANTAGE' ? `2${data.checkTarget.dice} (Vantagem)` : data.mode === 'DISADVANTAGE' ? `2${data.checkTarget.dice} (Desvantagem)` : `1${data.checkTarget.dice}`}
                      {(data.bonus || 0) !== 0 ? ` ${(data.bonus || 0) > 0 ? '+' : ''}${data.bonus}` : ''}
                      <span className="text-slate-400 font-sans text-xs ml-1.5">vs DT {data.checkTarget.dc}</span>
                    </>
                  )
                ) : (
                  <>
                    {data.count || 1}d{data.sides}
                    {(data.bonus || 0) !== 0 ? ` ${(data.bonus || 0) > 0 ? '+' : ''}${data.bonus}` : ''}
                  </>
                )}
              </span>
            </div>

            {data.checkTarget && (
              <div className="text-right max-w-[200px]">
                <span className="text-[10px] text-slate-400 block font-medium">
                  {isDamage ? 'Alvo / Golpe' : 'Motivo / Desafio'}
                </span>
                <span className="text-xs text-slate-200 line-clamp-1 italic" title={data.checkTarget.reason}>
                  "{data.checkTarget.reason}"
                </span>
              </div>
            )}
          </div>

          {/* Campo Obrigatório da Mensagem de Ação */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Descreva a ação / fala do seu personagem</span>
                {data.checkTarget ? (
                  <span className={isDamage ? "text-red-400 text-[11px] font-normal" : "text-amber-400 text-[11px] font-normal"}>
                    {isDamage ? "*Obrigatório para o Golpe" : "*Obrigatório para Teste"}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px] font-normal">(Opcional)</span>
                )}
              </label>
              <span className="text-[10px] text-slate-400">
                A IA avaliará essa narrativa junto ao resultado
              </span>
            </div>
            <textarea
              autoFocus
              rows={3}
              value={actionMessage}
              onChange={(e) => setActionMessage(e.target.value)}
              placeholder={
                data.checkTarget
                  ? isDamage
                    ? `Ex: Desfere o golpe com firmeza em direção ao oponente, aproveitando a abertura...`
                    : `Ex: Firma os pés no chão, aperta o bastão e tenta ${data.checkTarget.reason.toLowerCase()} com determinação...`
                  : "Ex: Descreva o golpe, o feitiço ou a intenção que motivou esta rolagem (opcional)..."
              }
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={data.checkTarget ? !actionMessage.trim() : false}
            onClick={() => onConfirm(actionMessage)}
            className={`px-5 py-2.5 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg cursor-pointer disabled:cursor-not-allowed ${
              data.checkTarget && isDamage
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white shadow-red-700/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 shadow-amber-600/20'
            }`}
          >
            {data.checkTarget && isDamage ? (
              <Flame className="w-4 h-4" />
            ) : (
              <Dices className="w-4 h-4" />
            )}
            <span>
              {data.checkTarget && isDamage
                ? 'Confirmar e Rolar Dano'
                : 'Confirmar e Rolar Dados'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
