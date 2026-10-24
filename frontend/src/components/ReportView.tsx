import React, { useState } from 'react';
import { Download, Copy, Check, FileText, ShieldAlert, Award } from 'lucide-react';
import { ExperimentReport } from '../types';
import { api } from '../api/client';

interface ReportViewProps {
  report: ExperimentReport;
}

export const ReportView: React.FC<ReportViewProps> = ({ report }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopyMarkdown = async () => {
    try {
      const res = await api.getExperimentReportMarkdown(report.experiment.id);
      navigator.clipboard.writeText(res.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown report', err);
    }
  };

  const handleDownloadJSON = () => {
    setDownloading(true);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `chaospatch-report-exp-${report.experiment.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setDownloading(false);
  };

  const exp = report.experiment;
  const incident = report.incident;
  const isRecovered = exp.final_verified === true;

  return (
    <div className="space-y-6">
      {/* Report Header Card */}
      <div className="rounded-lg border border-canvas-border bg-canvas-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-canvas-border pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isRecovered ? 'bg-accent-success/20 text-accent-success' : 'bg-accent-failure/20 text-accent-failure'
              }`}
            >
              {isRecovered ? <Award className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-base font-mono font-bold text-text-primary">
                Incident Post-Mortem Report #EXP-{exp.id}
              </div>
              <div className="text-xs font-mono text-text-muted mt-0.5">
                Scenario: <span className="text-accent-chaos font-semibold">{exp.scenario_type}</span> | Target:{' '}
                {exp.target_environment}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-canvas-surface border border-canvas-border text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-canvas-hover transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-accent-success" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied MD' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-accent-chaos text-canvas font-mono text-xs font-bold hover:bg-amber-400 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div>
            <div className="text-text-muted">Final Status</div>
            <div className={`font-bold mt-1 ${isRecovered ? 'text-accent-success' : 'text-accent-failure'}`}>
              {isRecovered ? 'VERIFIED RECOVERY' : 'VERIFICATION FAILED'}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Baseline Health</div>
            <div className="text-text-primary font-bold mt-1">
              {exp.baseline_passed ? 'PASSED (Clean)' : 'FAILED'}
            </div>
          </div>
          <div>
            <div className="text-text-muted">Duration</div>
            <div className="text-text-primary font-bold mt-1">{exp.duration_ms || 0} ms</div>
          </div>
          <div>
            <div className="text-text-muted">Checks Executed</div>
            <div className="text-text-primary font-bold mt-1">
              {report.verification_runs.filter((v) => v.status === 'PASSED').length} /{' '}
              {report.verification_runs.length} Passed
            </div>
          </div>
        </div>
      </div>

      {/* Root Cause & Diagnosis */}
      {incident && (
        <div className="rounded-lg border border-canvas-border bg-canvas-card p-5 space-y-3">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
            Incident Diagnosis & Provenance
          </div>
          <div className="text-sm font-semibold text-text-primary">{incident.title}</div>
          <div className="text-xs font-mono text-text-secondary leading-relaxed bg-canvas-surface/60 p-3 rounded border border-canvas-border">
            {incident.root_cause || incident.description}
          </div>
          <div className="text-[11px] font-mono text-text-muted">
            Model Confidence: <span className="text-accent-chaos font-bold">{Math.round((incident.confidence || 0) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Evidence Table */}
      <div className="rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
        <div className="px-4 py-3 bg-canvas-surface border-b border-canvas-border text-xs font-mono font-bold text-text-primary">
          Evidence Package Artifacts ({report.evidence.length})
        </div>
        <div className="divide-y divide-canvas-border overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-canvas-subtle text-text-muted">
              <tr>
                <th className="py-2 px-3">Stable ID</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Source</th>
                <th className="py-2 px-3">Severity</th>
                <th className="py-2 px-3">Excerpt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-canvas-border text-text-secondary">
              {report.evidence.map((e) => (
                <tr key={e.id} className="hover:bg-canvas-hover/30">
                  <td className="py-2 px-3 font-bold text-accent-chaos">{e.id}</td>
                  <td className="py-2 px-3 uppercase">{e.evidence_type}</td>
                  <td className="py-2 px-3 text-text-muted">{e.source}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        e.severity === 'error'
                          ? 'bg-accent-failure/20 text-accent-failure'
                          : e.severity === 'warning'
                          ? 'bg-accent-chaos/20 text-accent-chaos'
                          : 'bg-canvas-surface text-text-muted'
                      }`}
                    >
                      {e.severity}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-text-muted truncate max-w-xs">{e.content.slice(0, 75)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
