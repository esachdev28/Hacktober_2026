import React, { useState, useEffect } from 'react';
import { Shield, Cpu, Database, RefreshCw, Menu, X, Activity } from 'lucide-react';
import { api } from '../api/client';
import { SystemSettings } from '../types';

interface HeaderProps {
  onToggleMobileNav?: () => void;
  mobileNavOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileNav, mobileNavOpen }) => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'healthy' | 'offline'>('checking');
  const [inferenceStatus, setInferenceStatus] = useState<'checking' | 'ready' | 'not_configured'>('checking');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRuntimeStatus = async () => {
    setIsRefreshing(true);
    try {
      const [health, sysSettings] = await Promise.allSettled([
        api.getHealth(),
        api.getSettings(),
      ]);

      if (health.status === 'fulfilled') {
        setDbStatus(health.value.database === 'healthy' ? 'healthy' : 'offline');
        setInferenceStatus(health.value.inference === 'configured' ? 'ready' : 'not_configured');
      } else {
        setDbStatus('offline');
        setInferenceStatus('not_configured');
      }

      if (sysSettings.status === 'fulfilled') {
        setSettings(sysSettings.value);
      }
    } catch {
      setDbStatus('offline');
      setInferenceStatus('not_configured');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRuntimeStatus();
    const interval = setInterval(fetchRuntimeStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  // Format real provider and model label truthfully
  const getProviderModelDisplay = () => {
    if (!settings) {
      return inferenceStatus === 'ready' ? 'INFERENCE READY' : 'OFFLINE';
    }
    const providerName = settings.provider ? settings.provider.toUpperCase() : 'AI';
    const modelParts = (settings.model_id || '').split('/');
    const shortModel = modelParts[modelParts.length - 1] || 'MODEL';
    return `${providerName}: ${shortModel.toUpperCase()}`;
  };

  return (
    <header className="h-14 border-b border-[#253148]/80 bg-[#0D1220]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 font-mono transition-all">
      {/* Brand & Wordmark */}
      <div className="flex items-center space-x-3.5">
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[#1A243B] transition btn-magnetic"
            aria-label="Toggle navigation menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <div className="flex items-center space-x-2.5 group cursor-default">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 flex items-center justify-center shadow-[0_0_15px_rgba(255,159,10,0.25)] border border-amber-400/30 group-hover:shadow-[0_0_20px_rgba(255,159,10,0.4)] transition-all duration-200">
            <Shield className="w-4 h-4 text-white drop-shadow" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-text-primary leading-none">
              CHAOS<span className="text-accent-chaos">PATCH</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-text-muted/80 mt-0.5">
              SRE COMMAND CENTER
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#253148] hidden lg:block" />
        <div className="items-center space-x-1.5 hidden lg:flex text-[11px] font-mono text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-chaos/60 animate-ping" />
          <span>Inject failure. Let AI recover.</span>
        </div>
      </div>

      {/* Runtime Telemetry Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
        {/* Sandbox Isolation Status */}
        <div 
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-semibold tracking-wide shadow-sm"
          title="Air-gapped Docker container isolation (--network none)"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>SANDBOX ISOLATED</span>
        </div>

        {/* Database Status */}
        <div 
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#131B2E]/90 border border-[#253148] text-[11px] shadow-sm"
          title={`Database Connection: ${dbStatus}`}
        >
          <Database className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="text-text-muted hidden md:inline">DB:</span>
          <div className="flex items-center space-x-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dbStatus === 'healthy'
                  ? 'bg-accent-success'
                  : dbStatus === 'checking'
                  ? 'bg-accent-info animate-pulse'
                  : 'bg-accent-failure'
              }`}
            />
            <span
              className={
                dbStatus === 'healthy'
                  ? 'text-accent-success font-bold'
                  : dbStatus === 'checking'
                  ? 'text-accent-info font-bold'
                  : 'text-accent-failure font-bold'
              }
            >
              {dbStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* AI Provider Status */}
        <div 
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#131B2E]/90 border border-[#253148] text-[11px] max-w-[210px] shadow-sm"
          title={`Active Model: ${settings?.model_id || 'Not configured'}`}
        >
          <Cpu className="w-3.5 h-3.5 text-accent-purple shrink-0" />
          <span
            className={`truncate font-semibold tracking-tight ${
              inferenceStatus === 'ready' ? 'text-accent-purple' : 'text-amber-400'
            }`}
          >
            {getProviderModelDisplay()}
          </span>
        </div>

        {/* Refresh Action */}
        <button
          onClick={fetchRuntimeStatus}
          disabled={isRefreshing}
          title="Refresh runtime health telemetry"
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-[#1A243B] border border-[#253148] hover:border-accent-chaos/40 transition btn-magnetic cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent-chaos' : 'hover:text-accent-chaos transition-colors'}`} />
        </button>
      </div>
    </header>
  );
};
