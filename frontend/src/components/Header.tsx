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
    <header className="h-14 border-b border-[#363B30] bg-[#191C17]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 font-mono transition-colors">
      {/* Brand & Wordmark */}
      <div className="flex items-center space-x-3.5">
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="md:hidden p-1.5 rounded-lg text-[#B0B2A7] hover:text-[#F3F0E7] hover:bg-[#22261F] transition btn-magnetic"
            aria-label="Toggle navigation menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <div className="flex items-center space-x-2.5 group cursor-default">
          <div className="w-8 h-8 rounded-lg bg-[#22261F] flex items-center justify-center border border-[#505745] transition-colors">
            <Shield className="w-4 h-4 text-[#C7F36B]" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-[#F3F0E7] leading-none">
              CHAOS<span className="text-[#C7F36B]">PATCH</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-[#85897D] mt-0.5">
              SRE COMMAND CENTER
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#363B30] hidden lg:block" />
        <div className="items-center space-x-1.5 hidden lg:flex text-[11px] font-mono text-[#85897D]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C7F36B]" />
          <span>Inject failure. Let AI recover.</span>
        </div>
      </div>

      {/* Runtime Telemetry Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
        {/* Sandbox Isolation Status */}
        <div 
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#202A16] border border-[#363B30] text-[#C7F36B] text-[11px] font-semibold tracking-wide"
          title="Air-gapped Docker container isolation (--network none)"
        >
          <span className="w-2 h-2 rounded-full bg-[#C7F36B] animate-pulse" />
          <span>SANDBOX ISOLATED</span>
        </div>

        {/* Database Status */}
        <div 
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#22261F] border border-[#363B30] text-[11px]"
          title={`Database Connection: ${dbStatus}`}
        >
          <Database className="w-3.5 h-3.5 text-[#85897D] shrink-0" />
          <span className="text-[#85897D] hidden md:inline">DB:</span>
          <div className="flex items-center space-x-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dbStatus === 'healthy'
                  ? 'bg-[#C7F36B]'
                  : dbStatus === 'checking'
                  ? 'bg-[#86B7FF] animate-pulse'
                  : 'bg-[#FF6B55]'
              }`}
            />
            <span
              className={
                dbStatus === 'healthy'
                  ? 'text-[#C7F36B] font-bold'
                  : dbStatus === 'checking'
                  ? 'text-[#86B7FF] font-bold'
                  : 'text-[#FF6B55] font-bold'
              }
            >
              {dbStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* AI Provider Status */}
        <div 
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#22261F] border border-[#363B30] text-[11px] max-w-[210px]"
          title={`Active Model: ${settings?.model_id || 'Not configured'}`}
        >
          <Cpu className="w-3.5 h-3.5 text-[#C7F36B] shrink-0" />
          <span
            className={`truncate font-semibold tracking-tight ${
              inferenceStatus === 'ready' ? 'text-[#C7F36B]' : 'text-[#FFC66D]'
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
          className="p-1.5 rounded-md text-[#B0B2A7] hover:text-[#F3F0E7] hover:bg-[#22261F] border border-[#363B30] hover:border-[#505745] transition btn-magnetic cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C7F36B]' : 'hover:text-[#C7F36B] transition-colors'}`} />
        </button>
      </div>
    </header>
  );
};
