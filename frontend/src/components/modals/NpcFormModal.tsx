import React, { useState, useEffect } from 'react';
import { User, Swords, Crown, Upload, Edit } from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign, Npc, NpcTier } from '../../types/soloforge';

interface NpcFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampaign: Campaign | null;
  initialNpc?: Npc | null;
  onNpcSaved: (npc: Npc) => void;
}

export function NpcFormModal({
  isOpen,
  onClose,
  selectedCampaign,
  initialNpc,
  onNpcSaved
}: NpcFormModalProps) {
  const isEditing = Boolean(initialNpc);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [tier, setTier] = useState<NpcTier>('COMMON');
  const [imageUrl, setImageUrl] = useState('');
  const [attributes, setAttributes] = useState('');
  const [skills, setSkills] = useState('');
  const [combatStrategy, setCombatStrategy] = useState('');
  const [personality, setPersonality] = useState('');
  const [memory, setMemory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialNpc) {
      setName(initialNpc.name || '');
      setRole(initialNpc.role || '');
      setTier(initialNpc.tier || 'COMMON');
      setImageUrl(initialNpc.imageUrl || '');
      setAttributes(initialNpc.attributes || '');
      setSkills(initialNpc.skills || '');
      setCombatStrategy(initialNpc.combatStrategy || '');
      setPersonality(initialNpc.personality || '');
      setMemory(initialNpc.memory || '');
    } else {
      setName('');
      setRole('');
      setTier('COMMON');
      setImageUrl('');
      setAttributes('');
      setSkills('');
      setCombatStrategy('');
      setPersonality('');
      setMemory('');
    }
  }, [initialNpc, isOpen]);

  if (!isOpen || !selectedCampaign) return null;

  const handleImportNpcCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let insideQuotes = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
            if (insideQuotes && nextChar === '"') {
              currentField += '"';
              i++;
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentField);
            currentField = '';
          } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            currentRow.push(currentField);
            currentField = '';
            if (currentRow.length > 0 && currentRow.some(c => c.trim())) {
              rows.push(currentRow);
            }
            currentRow = [];
          } else {
            currentField += char;
          }
        }
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField);
          if (currentRow.some(c => c.trim())) {
            rows.push(currentRow);
          }
        }

        if (rows.length < 2) {
          alert('Arquivo CSV vazio ou sem linha de dados.');
          return;
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const dataRow = rows[1];

        const getCol = (key: string) => {
          const idx = headers.indexOf(key.toLowerCase());
          return idx !== -1 ? (dataRow[idx]?.trim() || '') : '';
        };

        const importedName = getCol('name') || getCol('nome');
        const importedRole = getCol('role') || getCol('papel') || getCol('ocupacao');
        const rawTier = (getCol('tier') || getCol('categoria') || 'COMMON').toUpperCase();
        const importedTier: NpcTier = (rawTier === 'BOSS' || rawTier === 'MINI_BOSS' || rawTier === 'COMMON') ? rawTier : 'COMMON';
        const importedImageUrl = getCol('imageurl') || getCol('imagem') || getCol('avatar');
        const importedAttributes = getCol('attributes') || getCol('atributos');
        const importedSkills = getCol('skills') || getCol('habilidades') || getCol('tecnicas');
        const importedStrategy = getCol('combatstrategy') || getCol('estrategia') || getCol('combate');
        const importedPersonality = getCol('personality') || getCol('personalidade');
        const importedMemory = getCol('memory') || getCol('memoria');

        if (importedName) setName(importedName);
        if (importedRole) setRole(importedRole);
        setTier(importedTier);
        if (importedImageUrl) setImageUrl(importedImageUrl);
        if (importedAttributes) setAttributes(importedAttributes);
        if (importedSkills) setSkills(importedSkills);
        if (importedStrategy) setCombatStrategy(importedStrategy);
        if (importedPersonality) setPersonality(importedPersonality);
        if (importedMemory) setMemory(importedMemory);
      } catch {
        alert('Não foi possível ler o arquivo CSV. Verifique a formatação do arquivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      if (isEditing && initialNpc) {
        const updated = await api.updateNpc(selectedCampaign.id, initialNpc.id, {
          name,
          role,
          tier,
          personality,
          memory,
          imageUrl: imageUrl.trim() || undefined,
          attributes: attributes.trim() || undefined,
          skills: skills.trim() || undefined,
          combatStrategy: combatStrategy.trim() || undefined
        });
        onNpcSaved(updated);
      } else {
        const created = await api.createNpc(selectedCampaign.id, {
          name,
          role,
          tier,
          personality,
          memory,
          imageUrl: imageUrl.trim() || undefined,
          attributes: attributes.trim() || undefined,
          skills: skills.trim() || undefined,
          combatStrategy: combatStrategy.trim() || undefined,
          isCrystallized: true
        });
        onNpcSaved(created);
      }
      onClose();
    } catch {
      // Mock local de contingência
      const mockResult: Npc = {
        id: initialNpc ? initialNpc.id : 'npc-' + Date.now(),
        campaignId: selectedCampaign.id,
        name,
        role,
        tier,
        personality,
        memory,
        imageUrl: imageUrl.trim() || undefined,
        attributes: attributes.trim() || undefined,
        skills: skills.trim() || undefined,
        combatStrategy: combatStrategy.trim() || undefined,
        isCrystallized: initialNpc ? initialNpc.isCrystallized : true,
        createdAt: initialNpc ? initialNpc.createdAt : new Date().toISOString()
      };
      onNpcSaved(mockResult);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md max-h-[90dvh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
            {isEditing ? <Edit className="w-4 h-4" /> : <User className="w-4 h-4" />}
            <span>{isEditing ? 'Editar Personagem / Ficha' : 'Cristalizar Novo Personagem'}</span>
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
          <div className="overflow-y-auto p-4 space-y-3 text-xs flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mestre Kame, General Grievous"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Papel / Título</label>
                <input
                  type="text"
                  placeholder="Ex: Mentor Arcano, Comandante"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Seletor de Categoria / Tier */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Categoria de Ameaça</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTier('COMMON')}
                  className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                    tier === 'COMMON'
                      ? 'bg-slate-700 text-white border border-slate-500'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Comum</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTier('MINI_BOSS')}
                  className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                    tier === 'MINI_BOSS'
                      ? 'bg-indigo-950/90 text-indigo-200 border border-indigo-500/60'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Swords className="w-3 h-3 text-indigo-400" />
                  <span>Mini Boss</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTier('BOSS')}
                  className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                    tier === 'BOSS'
                      ? 'bg-rose-950/90 text-rose-200 border border-rose-500/60'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Grande Chefe</span>
                </button>
              </div>
            </div>

            {/* Barra de Modelos CSV Isolados e Importação (Disponível tanto na criação quanto na edição) */}
            <div className="flex items-center justify-between gap-1.5 p-2 bg-slate-950/70 border border-slate-800/80 rounded-lg">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Modelos Isolados:</span>
                <a
                  href="/templates/npc_comum_template.csv"
                  download="npc_comum_template.csv"
                  className={`px-1.5 py-0.5 rounded text-[10px] transition border ${
                    tier === 'COMMON'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Baixar modelo CSV isolado para NPC Comum"
                >
                  Comum (.csv)
                </a>
                <a
                  href="/templates/npc_miniboss_template.csv"
                  download="npc_miniboss_template.csv"
                  className={`px-1.5 py-0.5 rounded text-[10px] transition border ${
                    tier === 'MINI_BOSS'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Baixar modelo CSV isolado para Mini Boss"
                >
                  Mini Boss (.csv)
                </a>
                <a
                  href="/templates/npc_boss_template.csv"
                  download="npc_boss_template.csv"
                  className={`px-1.5 py-0.5 rounded text-[10px] transition border ${
                    tier === 'BOSS'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Baixar modelo CSV isolado para Grande Boss"
                >
                  Boss (.csv)
                </a>
              </div>

              <label
                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded text-[10px] flex items-center gap-1 transition cursor-pointer border border-amber-500/30 shrink-0"
                title="Importar arquivo CSV para preencher a ficha automaticamente"
              >
                <Upload className="w-3 h-3 text-amber-400" />
                <span>Importar CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportNpcCsv}
                />
              </label>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">URL da Imagem / Avatar (Opcional)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="url"
                  placeholder="https://exemplo.com/avatar.jpg"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
                />
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="w-8 h-8 rounded-full border border-amber-500/50 object-cover" 
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Atributos & Estatísticas Numéricas</label>
              <textarea
                rows={2}
                placeholder="Ex: FOR: 16 | DES: 12 | CON: 14 | PV: 35/35 | CA: 15"
                value={attributes}
                onChange={e => setAttributes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Apenas valores numéricos e vitais (renderizados em tabela).</p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Habilidades & Técnicas de Combate</label>
              <textarea
                rows={2}
                placeholder="Ex: Golpe Esmagador: 0 Ki (Dano FOR x 2) | Tempestade de Lâminas: 2 Ki (Ataque duplo)"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 text-[11px]"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Técnicas, magias ou golpes especiais com custo e efeito.</p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Estratégia de Combate / Padrão de Ação</label>
              <textarea
                rows={2}
                placeholder="Ex: Fase 1 (100-50% PV): Postura defensiva | Fase 2 (<50% PV): Fúria e contra-ataques | Fraqueza: VEL baixa, vulnerável à distância"
                value={combatStrategy}
                onChange={e => setCombatStrategy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500 text-[11px]"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Fases de combate, reações e fraquezas que o Mestre IA seguirá.</p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Traços de Personalidade</label>
              <textarea
                rows={2}
                placeholder="Ex: Resmungão, leal a quem lhe paga cerveja anã, odeia magia."
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Memória / Relação com o Jogador</label>
              <textarea
                rows={2}
                placeholder="Ex: O herói o defendeu de cobradores de impostos. Ele prometeu forjar um escudo especial."
                value={memory}
                onChange={e => setMemory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 outline-none focus:border-amber-500"
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
              disabled={isSaving}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded font-medium cursor-pointer"
            >
              {isSaving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cristalizar Personagem')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
