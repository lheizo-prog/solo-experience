import React, { useState } from 'react';
import { 
  Sword, 
  Sparkles, 
  Upload, 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Trash2, 
  Plus 
} from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign } from '../../types/soloforge';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: (campaign: Campaign) => void;
}

export function CreateCampaignModal({ isOpen, onClose, onCampaignCreated }: CreateCampaignModalProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('Dark Fantasy');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newCharacter, setNewCharacter] = useState('');
  const [newLore, setNewLore] = useState('');
  const [newRules, setNewRules] = useState(
    '1. Toda ação arriscada exige teste d20 contra uma DT definida pelo Mestre.\n' +
    '2. Dificuldades: Fácil (10), Média (15), Difícil (20), Quase Impossível (25).\n' +
    '3. O Mestre deve barrar ações que infrinjam os atributos, inventário ou a física do cenário.'
  );

  const [creationRulesMode, setCreationRulesMode] = useState<'text' | 'files'>('text');
  const [creationSystemName, setCreationSystemName] = useState('');
  const [creationRuleFiles, setCreationRuleFiles] = useState<File[]>([]);
  const [isCreatingCampaignLoading, setIsCreatingCampaignLoading] = useState(false);

  // Tabela Dinâmica de Atributos do Personagem
  const [newAttributes, setNewAttributes] = useState<{ id: string; name: string; value: string }[]>([
    { id: '1', name: 'Força', value: '+3' },
    { id: '2', name: 'Destreza', value: '+2' },
    { id: '3', name: 'Constituição', value: '+2' },
    { id: '4', name: 'Inteligência', value: '+0' },
    { id: '5', name: 'Sabedoria', value: '+1' },
    { id: '6', name: 'Carisma', value: '-1' }
  ]);

  if (!isOpen) return null;

  const addAttributeRow = () => {
    setNewAttributes(prev => [...prev, { id: Date.now().toString(), name: '', value: '' }]);
  };

  const removeAttributeRow = (id: string) => {
    setNewAttributes(prev => prev.filter(attr => attr.id !== id));
  };

  const updateAttributeRow = (id: string, field: 'name' | 'value', val: string) => {
    setNewAttributes(prev => prev.map(attr => attr.id === id ? { ...attr, [field]: val } : attr));
  };

  const applyAttributePreset = (preset: 'd20' | 'cthulhu' | 'cyberpunk' | 'narrative') => {
    if (preset === 'd20') {
      setNewAttributes([
        { id: '1', name: 'Força', value: '+3' },
        { id: '2', name: 'Destreza', value: '+2' },
        { id: '3', name: 'Constituição', value: '+2' },
        { id: '4', name: 'Inteligência', value: '+0' },
        { id: '5', name: 'Sabedoria', value: '+1' },
        { id: '6', name: 'Carisma', value: '-1' }
      ]);
    } else if (preset === 'cthulhu') {
      setNewAttributes([
        { id: '1', name: 'Físico / Força', value: '55%' },
        { id: '2', name: 'Destreza / Fuga', value: '60%' },
        { id: '3', name: 'Investigação / Percepção', value: '75%' },
        { id: '4', name: 'Ocultismo / Misticismo', value: '40%' },
        { id: '5', name: 'Lábia / Persuasão', value: '50%' },
        { id: '6', name: 'Sanidade Atual', value: '70 / 99' }
      ]);
    } else if (preset === 'cyberpunk') {
      setNewAttributes([
        { id: '1', name: 'Reflexos', value: '8' },
        { id: '2', name: 'Interface / Hacking', value: '9' },
        { id: '3', name: 'Frieza / Sangue Frio', value: '7' },
        { id: '4', name: 'Tecnologia', value: '6' },
        { id: '5', name: 'Corpo / Armadura', value: '5' }
      ]);
    } else if (preset === 'narrative') {
      setNewAttributes([
        { id: '1', name: 'Corpo', value: 'Forte' },
        { id: '2', name: 'Mente', value: 'Astuta' },
        { id: '3', name: 'Alma', value: 'Inabalável' }
      ]);
    }
  };

  const handleDownloadAttributeTemplate = () => {
    const templateData = {
      descricao: "Modelo de Ficha de Atributos do SoloForge - Adapte conforme o seu livro de regras",
      personagem: "Thorne, o Proscrito",
      atributos: newAttributes.map(a => ({ atributo: a.name || 'Nome', valor: a.value || '0' }))
    };
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_atributos_soloforge.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAttributesFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.atributos)) {
            const imported = parsed.atributos.map((item: { atributo?: string; valor?: string; name?: string; value?: string }, idx: number) => ({
              id: `${Date.now()}-${idx}`,
              name: item.atributo || item.name || '',
              value: String(item.valor ?? item.value ?? '')
            }));
            if (imported.length > 0) setNewAttributes(imported);
          } else if (typeof parsed === 'object') {
            const imported = Object.entries(parsed).map(([key, val], idx) => ({
              id: `${Date.now()}-${idx}`,
              name: key,
              value: String(val)
            }));
            if (imported.length > 0) setNewAttributes(imported);
          }
        } else {
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
          const imported = lines.map((line, idx) => {
            const parts = line.includes(':') ? line.split(':') : line.split(',');
            return {
              id: `${Date.now()}-${idx}`,
              name: parts[0]?.trim() || '',
              value: parts.slice(1).join(',').trim() || ''
            };
          }).filter(item => item.name);
          if (imported.length > 0) setNewAttributes(imported);
        }
      } catch {
        alert('Não foi possível ler o arquivo. Certifique-se de que é um JSON, CSV ou TXT válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const validAttributes = newAttributes.filter(a => a.name.trim());
    const attributesString = validAttributes.length > 0
      ? validAttributes.map(a => `${a.name.trim()}: ${a.value.trim() || '0'}`).join('\n')
      : 'Atributos padrão do sistema';

    setIsCreatingCampaignLoading(true);
    try {
      let created: Campaign;

      if (creationRulesMode === 'files' && creationRuleFiles.length > 0) {
        created = await api.createCampaignWithFiles(
          {
            title: newTitle,
            genre: newGenre,
            synopsis: newSynopsis,
            playerCharacter: newCharacter,
            characterAttributes: attributesString,
            worldLore: newLore,
            systemName: creationSystemName.trim() || undefined
          },
          creationRuleFiles
        );
      } else {
        created = await api.createCampaign({
          title: newTitle,
          genre: newGenre,
          synopsis: newSynopsis,
          playerCharacter: newCharacter,
          characterAttributes: attributesString,
          worldLore: newLore,
          systemName: creationSystemName.trim() || 'SoloForge D20 Narrativo',
          coreMechanics: newRules,
          rollInstructions: 'O Mestre deve emitir a tag [PEDIR_TESTE: dado | DT | atributo | motivo] antes de definir consequências de ações arriscadas.'
        });
      }

      onCampaignCreated(created);
      onClose();
      // Limpeza de formulário
      setNewTitle('');
      setNewSynopsis('');
      setNewCharacter('');
      setNewLore('');
      setCreationRuleFiles([]);
      setCreationSystemName('');
      setCreationRulesMode('text');
    } catch {
      const localCamp: Campaign = {
        id: 'local-' + Date.now(),
        title: newTitle,
        genre: newGenre,
        synopsis: newSynopsis,
        createdAt: new Date().toISOString(),
        bible: {
          id: 'b-1',
          playerCharacter: newCharacter,
          characterAttributes: attributesString,
          worldLore: newLore,
          toneAndStyle: 'Imersivo, desafiador e fiel às regras'
        },
        system: {
          id: 's-1',
          name: creationSystemName.trim() || 'SoloForge D20 Narrativo',
          coreMechanics: newRules
        }
      };
      onCampaignCreated(localCamp);
      onClose();
    } finally {
      setIsCreatingCampaignLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
            <Sword className="w-5 h-5" />
            Forjar Nova Campanha
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
          <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1 text-xs">
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
                placeholder="Ex: Dark Fantasy, Cyberpunk, D&D 5e Solo"
                value={newGenre}
                onChange={e => setNewGenre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
              />
            </div>

            {/* SELEÇÃO DE REGRAS DO SISTEMA (TEXTO VS UPLOAD DE LIVROS/ARQUIVOS) */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-slate-300 font-semibold text-xs">
                    Regras & Sistema de Jogo *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    O Mestre IA seguirá e arbitrará com base nessas diretrizes.
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Nome do Sistema (ex: Tormenta20, D&D 5e)"
                  value={creationSystemName}
                  onChange={e => setCreationSystemName(e.target.value)}
                  className="w-44 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2 py-1 text-slate-200 placeholder-slate-500 text-[10px] outline-none"
                />
              </div>

              <div className="flex bg-slate-900 p-1 rounded border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => setCreationRulesMode('text')}
                  className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px] ${
                    creationRulesMode === 'text'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Escrever Regras Livres</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationRulesMode('files')}
                  className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px] ${
                    creationRulesMode === 'files'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Carregar Livro / Arquivos (.pdf, .txt, .md, .csv)</span>
                </button>
              </div>

              {creationRulesMode === 'text' ? (
                <textarea
                  rows={3}
                  value={newRules}
                  onChange={e => setNewRules(e.target.value)}
                  placeholder="Digite ou cole as regras essenciais do sistema..."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              ) : (
                <div className="space-y-2">
                  <label className="block text-slate-300 text-[11px]">
                    Selecione os arquivos do sistema (A IA lerá, sintetizará e indexará no banco):
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.csv"
                    onChange={e => {
                      if (e.target.files) {
                        setCreationRuleFiles(Array.from(e.target.files));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-300 file:mr-2.5 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-amber-600 file:text-white file:cursor-pointer hover:file:bg-amber-500 text-[11px]"
                  />
                  {creationRuleFiles.length > 0 ? (
                    <div className="p-2 bg-slate-900/90 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <span className="font-semibold text-amber-400">Livros / Documentos prontos ({creationRuleFiles.length}):</span>
                      <ul className="list-disc pl-4 text-slate-400 max-h-24 overflow-y-auto">
                        {creationRuleFiles.map((file, idx) => (
                          <li key={idx} className="truncate">
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-400/80 italic">
                      * Dica: Você pode enviar o PDF do manual básico ou notas de homebrew em .md/.txt.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Seu Personagem (Nome e Conceito)</label>
              <textarea
                rows={2}
                placeholder="Ex: Thorne, guerreiro renegado em busca de redenção nas terras ermas."
                value={newCharacter}
                onChange={e => setNewCharacter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
              />
            </div>

            {/* TABELA DINÂMICA DE ATRIBUTOS COM PRESETS E IMPORT/DOWNLOAD */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-amber-300 text-xs block">
                    Atributos & Valores do Personagem
                  </span>
                  <span className="text-[10px] text-slate-400">
                    A IA interpretará as categorias e valores de acordo com as regras inseridas.
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadAttributeTemplate}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded text-[10px] flex items-center gap-1 transition cursor-pointer border border-slate-700"
                    title="Baixar arquivo modelo (.json) para preenchimento"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>Baixar Modelo</span>
                  </button>

                  <label
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded text-[10px] flex items-center gap-1 transition cursor-pointer border border-slate-700"
                    title="Importar atributos de arquivo .json ou .csv"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-amber-400" />
                    <span>Importar Ficha</span>
                    <input
                      type="file"
                      accept=".json,.csv,.txt"
                      className="hidden"
                      onChange={handleImportAttributesFile}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-[10px] text-slate-400 font-medium shrink-0">Modelos Prontos:</span>
                <button
                  type="button"
                  onClick={() => applyAttributePreset('d20')}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded text-[10px] transition cursor-pointer whitespace-nowrap"
                >
                  D20 Clássico
                </button>
                <button
                  type="button"
                  onClick={() => applyAttributePreset('cthulhu')}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded text-[10px] transition cursor-pointer whitespace-nowrap"
                >
                  Terror / Investigação
                </button>
                <button
                  type="button"
                  onClick={() => applyAttributePreset('cyberpunk')}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded text-[10px] transition cursor-pointer whitespace-nowrap"
                >
                  Cyberpunk
                </button>
                <button
                  type="button"
                  onClick={() => applyAttributePreset('narrative')}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded text-[10px] transition cursor-pointer whitespace-nowrap"
                >
                  Narrativo Leve
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {newAttributes.map((attr) => (
                  <div key={attr.id} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Nome (Ex: Força, Sanidade, Astúcia)"
                      value={attr.name}
                      onChange={e => updateAttributeRow(attr.id, 'name', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1 text-slate-200 placeholder-slate-500 text-[11px] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Valor (Ex: +3, 65%, 4d6)"
                      value={attr.value}
                      onChange={e => updateAttributeRow(attr.id, 'value', e.target.value)}
                      className="w-28 sm:w-32 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1 text-amber-300 placeholder-slate-500 text-[11px] outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttributeRow(attr.id)}
                      disabled={newAttributes.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded transition cursor-pointer shrink-0"
                      title="Remover Atributo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addAttributeRow}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400/90 hover:text-amber-300 border border-dashed border-slate-800 hover:border-amber-500/40 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar Outro Atributo / Perícia</span>
              </button>
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
              <label className="block text-slate-300 font-medium mb-1">Lore do Mundo</label>
              <textarea
                rows={2}
                placeholder="As florestas são amaldiçoadas e a magia exige sacrifício de vitalidade..."
                value={newLore}
                onChange={e => setNewLore(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingCampaignLoading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white disabled:text-slate-400 rounded font-medium flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition"
            >
              {isCreatingCampaignLoading ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Forjando Universo com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Iniciar Aventura</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
