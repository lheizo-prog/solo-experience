import React, { useState, useEffect } from 'react';
import { Palette, Check, Sparkles, Flame, Sun, Moon, TreePine } from 'lucide-react';

export type SoloTheme = 'dark' | 'light' | 'arcane' | 'crimson' | 'emerald';

export interface ThemeOption {
  id: SoloTheme;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colors: {
    bg: string;
    surface: string;
    accent: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Obsidian & Âmbar',
    description: 'Grimdark clássico com brilho dourado',
    icon: Moon,
    colors: {
      bg: '#060911',
      surface: '#0e1426',
      accent: '#f59e0b'
    }
  },
  {
    id: 'light',
    name: 'Pergaminho & Tinta',
    description: 'Manuscrito medieval de regras',
    icon: Sun,
    colors: {
      bg: '#f5efe3',
      surface: '#fdfaf2',
      accent: '#b45309'
    }
  },
  {
    id: 'arcane',
    name: 'Vazio Arcano',
    description: 'Nébula cósmica e magia estelar',
    icon: Sparkles,
    colors: {
      bg: '#040612',
      surface: '#0b112d',
      accent: '#818cf8'
    }
  },
  {
    id: 'crimson',
    name: 'Forja Carmesim',
    description: 'Brasas vulcânicas e sangue',
    icon: Flame,
    colors: {
      bg: '#0c0406',
      surface: '#1e0b10',
      accent: '#f43f5e'
    }
  },
  {
    id: 'emerald',
    name: 'Bosque Feérico',
    description: 'Musgo profundo e floresta ancestral',
    icon: TreePine,
    colors: {
      bg: '#030c07',
      surface: '#091f13',
      accent: '#10b981'
    }
  }
];

export function getSavedTheme(): SoloTheme {
  const saved = localStorage.getItem('soloforge_theme') as SoloTheme;
  if (saved && THEME_OPTIONS.some(t => t.id === saved)) {
    return saved;
  }
  return 'dark';
}

export function applyTheme(theme: SoloTheme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('soloforge_theme', theme);
}

interface ThemeSwitcherProps {
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ compact = false }) => {
  const [currentTheme, setCurrentTheme] = useState<SoloTheme>('dark');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = getSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);
  }, []);

  const handleSelectTheme = (theme: SoloTheme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    setIsOpen(false);
  };

  const activeOption = THEME_OPTIONS.find(t => t.id === currentTheme) || THEME_OPTIONS[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 rounded-lg border transition cursor-pointer ${
          compact
            ? 'p-1.5 sm:px-2 sm:py-1 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 text-xs'
            : 'px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 text-xs shadow-sm'
        }`}
        title={`Tema atual: ${activeOption.name}. Clique para mudar a cor de fundo.`}
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner shrink-0"
          style={{ backgroundColor: activeOption.colors.accent }}
        />
        <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="hidden sm:inline font-medium text-[11px] truncate max-w-[100px]">
          {activeOption.name}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/98 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-fade-in space-y-1">
            <div className="px-2.5 py-1.5 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-3 h-3 text-amber-400" />
                Atmosfera & Fundo
              </span>
              <span className="text-[9px] text-slate-500">5 Opções</span>
            </div>

            <div className="space-y-1 pt-1">
              {THEME_OPTIONS.map(opt => {
                const isSelected = opt.id === currentTheme;
                const IconComponent = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectTheme(opt.id)}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border border-amber-500/50 text-white shadow-sm'
                        : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner"
                        style={{ backgroundColor: opt.colors.bg }}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: opt.colors.accent }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <IconComponent className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-semibold truncate text-slate-100">
                            {opt.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
