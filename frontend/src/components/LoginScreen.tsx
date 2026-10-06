import React, { useState } from 'react';
import { Shield, KeyRound, User, Sparkles, AlertCircle, Lock } from 'lucide-react';
import { api } from '../services/api';

interface LoginScreenProps {
  onSuccess: (user: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Preencha seu usuário e senha de mestre.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Tenta validar no backend (/api/auth/login)
      const res = await api.login(username.trim(), password.trim());
      if (res.success && res.token) {
        localStorage.setItem('soloforge_token', res.token);
        localStorage.setItem('soloforge_user', username.trim());
        onSuccess(username.trim());
        return;
      }
    } catch {
      // 2. Fallback client-side com variáveis de ambiente do Vite caso backend esteja offline ou usando variáveis locais VITE_
      const envUser = import.meta.env.VITE_MASTER_USER;
      const envPass = import.meta.env.VITE_MASTER_PASS;

      if (envUser && envPass) {
        if (username.trim() === envUser && password.trim() === envPass) {
          localStorage.setItem('soloforge_token', 'local-client-auth-token');
          localStorage.setItem('soloforge_user', username.trim());
          onSuccess(username.trim());
          return;
        }
      }

      setErrorMsg('Credenciais incorretas ou acesso não autorizado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-500 mb-4 shadow-lg shadow-amber-500/5">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center justify-center gap-2">
            SoloForge <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Portão Secreto do Mestre
          </p>
        </div>

        {/* Alerta de Erro */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Usuário do Mestre
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Digite seu usuário..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Chave de Acesso (Senha)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-600/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Desbloqueando Forja...
              </span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Acessar SoloForge
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Ambiente privado e restrito configurado por variáveis de ambiente.
          </p>
        </div>
      </div>
    </div>
  );
};
