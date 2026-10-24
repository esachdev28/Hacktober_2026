import React, { useState, useEffect } from 'react';
import { Settings, Cpu, ShieldCheck, Database, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { SystemSettings, InferenceTestResult } from '../types';

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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-mono font-bold text-text-primary">System Settings & Model Connectivity</h1>
        <p className="text-xs font-mono text-text-muted mt-1">
          Inspect backend runtime parameters, sandbox policies, and live Hugging Face Qwen connectivity.
        </p>
      </div>

      {/* AI Model Configuration Card */}
      <div className="rounded-lg border border-canvas-border bg-canvas-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-accent-purple" />
            <span className="font-mono font-bold text-sm text-text-primary">AI Inference Configuration</span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-purple/10 text-accent-purple border border-accent-purple/30 font-bold">
            Qwen3-Coder (30B)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <div className="text-text-muted">Target Model ID:</div>
            <div className="text-text-primary font-bold mt-0.5 truncate">{settings?.model_id || 'Loading...'}</div>
          </div>
          <div>
            <div className="text-text-muted">Provider:</div>
            <div className="text-text-primary font-bold mt-0.5">{settings?.provider || 'Hugging Face Router'}</div>
          </div>
          <div>
            <div className="text-text-muted">Router Base URL:</div>
            <div className="text-text-primary font-bold mt-0.5 truncate">
              {settings?.inference_endpoint || 'https://router.huggingface.co/v1'}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Credential Security:</div>
            <div className="text-accent-success font-bold mt-0.5 flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-accent-success" />
              <span>Token stored server-side only (Redacted)</span>
            </div>
          </div>
        </div>

        {/* Inference Connectivity Test */}
        <div className="pt-2 border-t border-canvas-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono font-semibold text-text-primary">Live Connectivity Verification</div>
            <div className="text-[11px] font-mono text-text-muted">
              Sends an authenticated ping request to router.huggingface.co to measure round-trip latency.
            </div>
          </div>

          <button
            onClick={handleTestInference}
            disabled={testing}
            className="flex items-center space-x-2 px-4 py-2 rounded bg-canvas-surface border border-canvas-border hover:border-accent-purple hover:bg-accent-purple/10 text-xs font-mono font-bold text-text-primary transition shrink-0"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-purple" />
                <span>Pinging Router...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-accent-purple" />
                <span>Test Connectivity</span>
              </>
            )}
          </button>
        </div>

        {/* Test Result Callout */}
        {testResult && (
          <div
            className={`p-3.5 rounded border text-xs font-mono flex items-start space-x-3 ${
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

      {/* Sandbox Isolation & Security Parameters */}
      <div className="rounded-lg border border-canvas-border bg-canvas-card p-6 space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-canvas-border pb-3">
          <ShieldCheck className="w-5 h-5 text-accent-chaos" />
          <span className="font-mono font-bold text-sm text-text-primary">Sandbox Safety & Boundaries</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <div className="text-text-muted">Target Environment:</div>
            <div className="text-text-primary font-bold mt-0.5">{settings?.environment.toUpperCase()}</div>
          </div>
          <div>
            <div className="text-text-muted">Database Engine:</div>
            <div className="text-accent-success font-bold mt-0.5">SQLite (Operational)</div>
          </div>
          <div>
            <div className="text-text-muted">Max Repair Attempts:</div>
            <div className="text-text-primary font-bold mt-0.5">{settings?.max_repair_attempts || 3}</div>
          </div>
          <div>
            <div className="text-text-muted">Experiment Execution Timeout:</div>
            <div className="text-text-primary font-bold mt-0.5">{settings?.experiment_timeout_seconds || 300} seconds</div>
          </div>
          <div>
            <div className="text-text-muted">Model Temperature:</div>
            <div className="text-text-primary font-bold mt-0.5">{settings?.model_temperature || 0.2}</div>
          </div>
          <div>
            <div className="text-text-muted">Token Context Budget:</div>
            <div className="text-text-primary font-bold mt-0.5">{settings?.model_max_tokens || 4096} tokens</div>
          </div>
        </div>
      </div>
    </div>
  );
};
