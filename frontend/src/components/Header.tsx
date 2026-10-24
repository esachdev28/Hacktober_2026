import React, { useState, useEffect } from 'react';
import { Shield, Cpu, Database, Activity, RefreshCw } from 'lucide-react';
import { api } from '../api/client';

export const Header: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'healthy' | 'offline'>('checking');
  const [inferenceStatus, setInferenceStatus] = useState<'checking' | 'ready' | 'not_configured'>('checking');
  const [modelName, setModelName] = useState<string>('Qwen/Qwen3-Coder-30B');

  const checkStatus = async () => {
    try {
      const health = await api.getHealth();
      setDbStatus(health.database === 'healthy' ? 'healthy' : 'offline');
      setInferenceStatus(health.inference === 'configured' ? 'ready' : 'not_configured');
    } catch {
      setDbStatus('offline');
      setInferenceStatus('not_configured');
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-canvas-border bg-canvas-subtle/80 backdrop-blur px-6 flex items-center justify-between z-20 sticky top-0">
      {/* Brand & Tagline */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-mono font-bold text-lg tracking-wider text-text-primary">
            CHAOS<span className="text-accent-chaos">PATCH</span>
          </span>
        </div>
        <div className="h-4 w-px bg-canvas-border" />
        <span className="text-xs font-mono text-text-muted hidden md:inline-block">
          INJECT FAILURE. LET AI RECOVER.
        </span>
      </div>

      {/* Status Badges */}
      <div className="flex items-center space-x-3 text-xs font-mono">
        {/* Sandbox Environment Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>SANDBOX ISOLATED</span>
        </div>

        {/* Database Status */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-canvas-surface border border-canvas-border text-text-secondary">
          <Database className="w-3.5 h-3.5 text-text-muted" />
          <span>DB:</span>
          <span className={dbStatus === 'healthy' ? 'text-accent-success font-semibold' : 'text-accent-failure'}>
            {dbStatus.toUpperCase()}
          </span>
        </div>

        {/* AI Provider Status */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-canvas-surface border border-canvas-border text-text-secondary">
          <Cpu className="w-3.5 h-3.5 text-text-muted" />
          <span>MODEL:</span>
          <span className={inferenceStatus === 'ready' ? 'text-accent-purple font-semibold' : 'text-amber-400'}>
            {inferenceStatus === 'ready' ? 'QWEN-30B' : 'OFFLINE'}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={checkStatus}
          title="Refresh system status"
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-canvas-hover transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
