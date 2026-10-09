import { useState } from 'react';
import { getScoreColor } from './ScoreRing.jsx';

const SKILL_ICONS = {
  'Crawlability': '🕷️',
  'Structured Data': '📊',
  'Freshness': '🕐',
  'Content Quality': '📝',
};

function getSkillIcon(skillName) {
  return SKILL_ICONS[skillName] || '🔍';
}

function FindingRow({ finding }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="finding-row"
      role="article"
      aria-label={`Check: ${finding.checkName}`}
    >
      <span
        className={`finding-pass-icon ${finding.passed ? 'passed' : 'failed'}`}
        aria-label={finding.passed ? 'Passed' : 'Failed'}
        aria-hidden="true"
      >
        {finding.passed ? '✓' : '✗'}
      </span>

      <div className="finding-content">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2, cursor: finding.passed ? 'default' : 'pointer' }}
          onClick={() => !finding.passed && setExpanded((e) => !e)}
        >
          <span className="finding-check-name">{finding.checkName}</span>
          {!finding.passed && (
            <span
              className={`severity-badge severity-${finding.severity}`}
              aria-label={`Severity: ${finding.severity}`}
            >
              {finding.severity}
            </span>
          )}
          {!finding.passed && (
            <span
              style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 'auto' }}
              aria-hidden="true"
            >
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>

        {finding.passed && finding.evidence && (
          <div className="finding-evidence">{finding.evidence}</div>
        )}

        {!finding.passed && (
          <>
            {finding.issue && (
              <p className="finding-issue">{finding.issue}</p>
            )}
            {expanded && (
              <>
                {finding.evidence && (
                  <div className="finding-evidence">{finding.evidence}</div>
                )}
                {finding.recommendation && (
                  <div className="finding-recommendation">{finding.recommendation}</div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SkillGroup({ skillName, findings, score }) {
  const [open, setOpen] = useState(true);
  const color = getScoreColor(score);
  const icon = getSkillIcon(skillName);
  const failedCount = findings.filter((f) => !f.passed).length;

  return (
    <div className="skill-group">
      <div
        className="skill-group-header"
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
        aria-controls={`skill-group-${skillName}`}
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((o) => !o)}
      >
        <div className="skill-group-title">
          <span aria-hidden="true">{icon}</span>
          {skillName}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {failedCount > 0 && (
            <div className="skill-group-stats">
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(244,63,94,0.1)',
                  color: '#f43f5e',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: '1px solid rgba(244,63,94,0.25)',
                }}
              >
                {failedCount} issue{failedCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <span
            className="skill-group-score"
            style={{ color }}
            aria-label={`Score: ${score}`}
          >
            {score}
          </span>
          <svg
            className={`skill-group-chevron ${open ? 'open' : ''}`}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {open && (
        <div
          className="skill-group-findings"
          id={`skill-group-${skillName}`}
          role="list"
          aria-label={`Findings for ${skillName}`}
        >
          {findings.map((f, i) => (
            <FindingRow key={`${f.checkName}-${i}`} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FindingsBySkill({ findingsBySkill, skillScores }) {
  return (
    <section className="findings-by-skill" aria-labelledby="findings-by-skill-title">
      <div className="section-header">
        <h2 className="section-title" id="findings-by-skill-title">
          <span className="section-title-icon" aria-hidden="true">🔬</span>
          Findings by Skill
        </h2>
      </div>

      {Object.entries(findingsBySkill).map(([skillName, findings]) => (
        <SkillGroup
          key={skillName}
          skillName={skillName}
          findings={findings}
          score={skillScores[skillName] ?? 0}
        />
      ))}
    </section>
  );
}
