import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  ShieldCheck,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '../api/client';
import { SystemSettings, InferenceTestResult } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<InferenceTestResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTestInference = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testInference();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Request failed to inference tester',
        error: err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <SectionHeader
        badge="ENGINE CONFIGURATION"
        title="System Settings & Model Connectivity"
        description="Inspect backend runtime parameters, isolation guardrails, and live AI provider connectivity."
      />

      {loading ? (
        <LoadingSkeleton className="h-64 rounded-xl" count={2} />
      ) : (
        <div className="space-y-6 font-mono text-xs">
          {/* AI Inference Provider Bento Card */}
          <div className="rounded-xl border border-canvas-border bg-canvas-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-canvas-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-accent-purple/10 border border-accent-purple/30 text-accent-purple">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">
                    AI Inference Provider Configuration
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Active neural synthesis engine for root-cause hypothesis generation
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded text-xs font-bold bg-accent-purple/15 text-accent-purple border border-accent-purple/30 self-start sm:self-auto uppercase">
                {settings?.provider ? `${settings.provider.toUpperCase()} ACTIVE` : 'PROVIDER ACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Target Model ID</div>
                <div className="text-text-primary font-bold mt-1 text-xs truncate" title={settings?.model_id}>
                  {settings?.model_id || 'Not configured'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Provider Engine</div>
                <div className="text-text-primary font-bold mt-1 text-xs">
                  {settings?.provider || 'default'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Router Base URL</div>
                <div className="text-text-primary font-bold mt-1 text-xs truncate" title={settings?.inference_endpoint}>
                  {settings?.inference_endpoint || 'Default Endpoint'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Credential Security</div>
                <div className="text-accent-success font-bold mt-1 text-xs flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{settings?.has_credentials ? 'Configured Server-Side (Redacted)' : 'No Token Configured'}</span>
                </div>
              </div>
            </div>

            {/* Inference Ping Action Bar */}
            <div className="pt-2 border-t border-canvas-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-text-primary text-xs">
                  Live Provider Connectivity Verification
                </div>
                <div className="text-[11px] text-text-muted">
                  Sends an authenticated ping request to the active AI endpoint to measure round-trip latency.
                </div>
              </div>

              <button
                onClick={handleTestInference}
                disabled={testing}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-canvas-surface border border-canvas-border hover:border-accent-purple hover:bg-accent-purple/10 text-xs font-bold text-text-primary hover:text-accent-purple transition cursor-pointer shrink-0"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-purple" />
                    <span>Pinging Provider...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-accent-purple" />
                    <span>Test Connectivity</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Result Callout */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
                  testResult.success
                    ? 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                    : 'bg-accent-failure/10 border-accent-failure/30 text-accent-failure'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold">{testResult.message}</div>
                  {testResult.latency_ms && (
                    <div className="text-[11px] text-text-secondary">
                      Round-trip Latency: <span className="font-bold text-text-primary">{testResult.latency_ms} ms</span>
                    </div>
                  )}
                  {testResult.error && (
                    <div className="text-[11px] text-text-muted break-all">Error: {testResult.error}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sandbox Isolation & Security Parameters Bento Card */}
          <div className="rounded-xl border border-canvas-border bg-canvas-card p-6 space-y-5">
            <div className="flex items-center space-x-3 border-b border-canvas-border pb-4">
              <div className="p-2.5 rounded-lg bg-accent-chaos/10 border border-accent-chaos/30 text-accent-chaos">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">
                  Sandbox Safety Boundaries & Environment
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Docker isolation parameters and resource constraints
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Target Environment</div>
                <div className="text-text-primary font-bold mt-1 text-xs">
                  {settings?.environment?.toUpperCase() || 'SANDBOX'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Database Status</div>
                <div className="text-accent-success font-bold mt-1 text-xs">
                  SQLite (Operational)
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Max Repair Attempts</div>
                <div className="text-text-primary font-bold mt-1 text-xs">
                  {settings?.max_repair_attempts || 3}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Execution Timeout</div>
                <div className="text-text-primary font-bold mt-1 text-xs">
                  {settings?.experiment_timeout_seconds || 300} seconds
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Sampling Temperature</div>
                <div className="text-text-primary font-bold mt-1 text-xs">
                  {settings?.model_temperature ?? 0.2}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#070A10] border border-canvas-border">
                <div className="text-[10px] text-text-muted uppercase">Token Context Budget</div>
                <div className="text-text-primary font-bold mt-1 text-xs">
                  {settings?.model_max_tokens || 4096} tokens
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
