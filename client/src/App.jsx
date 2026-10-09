import { useState, useEffect, useCallback } from 'react';
import './index.css';

import { runAudit, friendlyErrorMessage } from './api.js';
import UrlForm from './components/UrlForm.jsx';
import ScoreRing, { getScoreColor, getScoreClass } from './components/ScoreRing.jsx';
import SummaryChips from './components/SummaryChips.jsx';
import PrioritizedActions from './components/PrioritizedActions.jsx';
import FindingsBySkill from './components/FindingsBySkill.jsx';
import { DownloadButton, LoadReportButton } from './components/DownloadButton.jsx';
import RecentAudits, { saveRecentAudit, loadRecentAudits } from './components/RecentAudits.jsx';

function formatDate(isoStr) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(isoStr));
  } catch {
    return isoStr;
  }
}

export default function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveStatus, setLiveStatus] = useState('');
  const [recents, setRecents] = useState(() => loadRecentAudits());

  // Keep recents in sync with localStorage
  const refreshRecents = useCallback(() => {
    setRecents(loadRecentAudits());
  }, []);

  async function handleAudit(url) {
    setLoading(true);
    setError(null);
    setReport(null);
    setLiveStatus('Analyzing your website…');

    try {
      const result = await runAudit(url);
      setReport(result);
      setLiveStatus('Audit complete.');
      saveRecentAudit(result);
      refreshRecents();
    } catch (err) {
      setError(friendlyErrorMessage(err));
      setLiveStatus('Audit failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleRecentSelect(url) {
    handleAudit(url);
  }

  function handleClearRecents() {
    try {
      localStorage.removeItem('webisight_recent_audits');
    } catch {
      // ignore
    }
    setRecents([]);
  }

  function handleLoadReport(loadedReport) {
    setReport(loadedReport);
    setError(null);
    setLiveStatus('Loaded saved report.');
  }

  const overallColor = report ? getScoreColor(report.overallScore) : '#6366f1';

  return (
    <div className="app">
      {/* Accessible live region for status updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {liveStatus}
      </div>

      {/* Screen reader only helper */}
      <style>{`.sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }`}</style>

      {/* ── Header ── */}
      <header className="header" role="banner">
        <div className="header-logo">
          <div className="header-icon" aria-hidden="true">👁️</div>
          <h1>WebISight</h1>
        </div>
        <p className="header-subtitle">
          Website Readiness &amp; AI Discoverability Analyzer — find out if AI assistants can
          find, understand, and accurately cite your website.
        </p>
        <span className="header-badge">
          <span aria-hidden="true">🤖</span> AI-Powered Audit
        </span>
      </header>

      {/* ── URL Form ── */}
      <main id="main-content">
        <UrlForm onSubmit={handleAudit} loading={loading} />

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="form-error"
            style={{ maxWidth: 820, margin: '0 auto 24px', padding: '14px 20px' }}
          >
            <span aria-hidden="true">⚠️</span>
            {error}
          </div>
        )}

        {/* Recent Audits */}
        {!report && !loading && recents.length > 0 && (
          <div style={{ maxWidth: 820, margin: '0 auto 32px' }}>
            <RecentAudits
              recents={recents}
              onSelect={handleRecentSelect}
              onClear={handleClearRecents}
            />
          </div>
        )}

        {/* Loading shimmer */}
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: 'var(--text-secondary)',
            }}
            aria-label="Loading audit results"
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 20px',
                border: '4px solid rgba(99,102,241,0.2)',
                borderTopColor: 'var(--accent-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
              aria-hidden="true"
            />
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Auditing your site…</div>
            <div style={{ fontSize: '0.85rem', marginTop: 6, color: 'var(--text-muted)' }}>
              Crawling, parsing, and running all audit checks
            </div>
          </div>
        )}

        {/* Results */}
        {report && !loading && (
          <section className="results-section" aria-label="Audit results">
            {/* Score Hero */}
            <div className="score-hero">
              <div className="score-hero-inner">
                {/* Big score ring */}
                <ScoreRing score={report.overallScore} label="Overall Score" size={140} />

                {/* Meta + skill scores */}
                <div className="score-hero-meta">
                  <div className="score-hero-url">
                    <span aria-hidden="true">🔗</span>
                    {report.url}
                    {report.cached && (
                      <span className="cached-badge">
                        <span aria-hidden="true">⚡</span> Cached
                      </span>
                    )}
                  </div>

                  <h2 className="score-hero-title">
                    <span
                      className={getScoreClass(report.overallScore)}
                      aria-label={`Overall score: ${report.overallScore} out of 100`}
                    >
                      {report.overallScore}/100
                    </span>{' '}
                    AI Discoverability Score
                  </h2>

                  <div className="score-hero-generated">
                    Generated: {formatDate(report.generatedAt)}
                  </div>

                  {/* Skill score mini rings */}
                  <div className="skill-scores-row" aria-label="Per-skill scores">
                    {Object.entries(report.skillScores).map(([skill, score]) => (
                      <ScoreRing key={skill} score={score} label={skill} size={72} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="action-bar">
              <DownloadButton report={report} />
              <LoadReportButton onLoad={handleLoadReport} />
              {recents.length > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => setReport(null)}
                  aria-label="Clear current results and start a new audit"
                >
                  <span aria-hidden="true">🔄</span>
                  New Audit
                </button>
              )}
            </div>

            {/* Summary chips */}
            <SummaryChips summary={report.summary} />

            <div className="divider" role="separator" />

            {/* Prioritized actions */}
            <PrioritizedActions actions={report.prioritizedActions} />

            <div className="divider" role="separator" />

            {/* Findings by skill */}
            <FindingsBySkill
              findingsBySkill={report.findingsBySkill}
              skillScores={report.skillScores}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '32px 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          borderTop: '1px solid var(--border-color)',
          marginTop: 32,
        }}
        role="contentinfo"
      >
        <p>
          WebISight — Stateless, database-free AI discoverability analysis.{' '}
          <span aria-hidden="true">⚡</span>
        </p>
        <p style={{ marginTop: 4 }}>
          All audits run on-demand. No data is stored on the server.
        </p>
      </footer>
    </div>
  );
}
