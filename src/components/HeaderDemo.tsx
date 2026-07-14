/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, RefreshCw, Layers, ShieldCheck, Database, Smartphone, BarChart3 } from 'lucide-react';

interface HeaderDemoProps {
  currentView: 'patient' | 'corporate';
  setView: (view: 'patient' | 'corporate') => void;
  onReset: () => void;
  syncStatus: boolean;
  selectedPatientName: string;
  selectedRole: string;
}

export const HeaderDemo: React.FC<HeaderDemoProps> = ({
  currentView,
  setView,
  onReset,
  syncStatus,
  selectedPatientName,
  selectedRole
}) => {
  return (
    <header id="saluscare-demo-header" className="bg-slate-900 text-white border-b border-slate-800 shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500 text-slate-950 p-2 rounded-lg flex items-center justify-center animate-pulse">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                SalusCare <span className="text-cyan-400 font-normal text-sm px-2 py-0.5 bg-slate-800 rounded border border-slate-700">Digital Health Intelligence</span>
              </h1>
              <p className="text-xs text-slate-400">Piattaforma Integrata Clinica & Operativa • Enterprise Mockup</p>
            </div>
          </div>

          {/* Navigation/Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Sync State Badge */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-xs text-slate-300">
              <Database className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span className="font-mono text-[11px]">saluscare_shared_v1:</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                ATTIVO
              </span>
            </div>

            {/* View Toggle */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
              <button
                id="btn-switch-patient"
                onClick={() => setView('patient')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  currentView === 'patient'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Vista Paziente</span>
              </button>
              <button
                id="btn-switch-corporate"
                onClick={() => setView('corporate')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  currentView === 'corporate'
                    ? 'bg-indigo-600 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Vista Azienda / Control Tower</span>
              </button>
            </div>

            {/* Reset Button */}
            <button
              id="btn-reset-demo"
              onClick={onReset}
              title="Azzera e rigenera i dati mock originali"
              className="bg-red-950/40 text-red-300 border border-red-800/60 hover:bg-red-900 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Reset Demo</span>
            </button>

          </div>

        </div>

        {/* Sync Status / Subheader Bar showing active demo context */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>Stato sincronizzazione: <strong className="text-emerald-400 font-normal">Stesso localStorage condiviso</strong></span>
          </div>
          <div>
            {currentView === 'patient' ? (
              <span>Paziente Selezionato: <strong className="text-cyan-400">{selectedPatientName}</strong></span>
            ) : (
              <span>Ruolo Operatore: <strong className="text-indigo-400">{selectedRole}</strong></span>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
