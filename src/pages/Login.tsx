import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2, Cpu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('e.nordmann@aeropredict.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleSumbit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(email);
      setIsLoading(false);
      navigate('/');
    }, 450);
  };

  const demoAccounts = [
    { email: 'e.nordmann@aeropredict.ai', role: 'Fleet Ops Manager', name: 'Erik Nordmann' },
    { email: 's.patel@fastapi-core.ai', role: 'Data Pipeline Lead', name: 'Dr. Sarah Patel' },
    { email: 'j.reynolds@maintenance.ops', role: 'Line Maintenance Supv', name: 'Marcus Reynolds' },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center p-4 md:p-8 relative overflow-hidden font-sans text-slate-800 dark:text-slate-200 transition-colors duration-200">
      
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 md:top-8 md:right-8 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900 rounded-lg transition-colors z-20"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
      </button>

      {/* Background industrial grid accents */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none transition-colors duration-200" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 dark:bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none transition-colors duration-200" />

      <div className="w-full max-w-md z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 bg-indigo-600 rounded-2xl items-center justify-center shadow-xl shadow-indigo-600/30 ring-4 ring-indigo-500/20 mb-2">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white transition-colors duration-200">AeroPredict AI</h1>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest transition-colors duration-200">Turbofan Predictive Maintenance SaaS</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative transition-colors duration-200">
          <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-colors duration-200">
            <Cpu className="w-3 h-3" /> FASTAPI v1 BACKEND READY
          </div>

          <form onSubmit={handleSumbit} className="space-y-6 mt-2">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 transition-colors duration-200">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    placeholder="operator@aeropredict.ai"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 transition-colors duration-200">Password</label>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono transition-colors duration-200">SSO / MFA ENABLED</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>Authenticating SSO...</>
              ) : (
                <>
                  Access Fleet Console <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Picker */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mb-3">Quick Demo Account Switcher:</p>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => setEmail(acc.email)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/60 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 transition-all text-left text-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${email === acc.email ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400'}`} />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block transition-colors duration-200">{acc.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{acc.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono transition-colors duration-200">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 font-mono">
          <ShieldCheck className="w-4 h-4 inline mr-1 text-emerald-500" /> Compliant with FAA Advisory Circular 120-111 & CMAPSS AI Protocols
        </div>
      </div>
    </div>
  );
};
