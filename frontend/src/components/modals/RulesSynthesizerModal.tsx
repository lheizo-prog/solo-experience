import React, { useState } from 'react';
import { Brain, Upload, FileText, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign } from '../../types/soloforge';

interface RulesSynthesizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampaign: Campaign | null;
  onRulesUpdated: (updatedCampaign: Campaign) => void;
}

export function RulesSynthesizerModal({
  isOpen,
  onClose,
  selectedCampaign,
  onRulesUpdated
}: RulesSynthesizerModalProps) {
  const [rulesInputMode, setRulesInputMode] = useState<'text' | 'files'>('files');
  const [rawRulesInputText, setRawRulesInputText] = useState('');
  const [rulesSystemName, setRulesSystemName] = useState('');
  const [selectedRuleFiles, setSelectedRuleFiles] = useState<File[]>([]);
  const [isSynthesizingRules, setIsSynthesizingRules] = useState(false);

  if (!isOpen || !selectedCampaign) return null;

  const handleSynthesizeRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSynthesizingRules) return;

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

      onRulesUpdated(updatedCampaign);
      onClose();
      setRawRulesInputText('');
      setSelectedRuleFiles([]);
      setRulesSystemName('');
    } catch (err: unknown) {
      alert('Erro ao sintetizar regras: ' + (err instanceof Error ? err.message : 'Falha na conexão'));
    } finally {
      setIsSynthesizingRules(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
          <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Sintetizar Regras com IA
          </h3>
          <button 
            type="button"
            onClick={() => !isSynthesizingRules && onClose()}
            className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
          <p className="text-xs text-slate-400 leading-relaxed">
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
                onClick={onClose}
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
    </div>
  );
}
