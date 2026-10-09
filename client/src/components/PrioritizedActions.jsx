const SEVERITY_ICONS = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🔵',
  INFO: '⚪',
};

function SeverityBadge({ severity }) {
  return (
    <span className={`severity-badge severity-${severity}`} aria-label={`Severity: ${severity}`}>
      {SEVERITY_ICONS[severity]} {severity}
    </span>
  );
}

export default function PrioritizedActions({ actions }) {
  if (!actions || actions.length === 0) {
    return (
      <section className="prioritized-actions">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-title-icon" aria-hidden="true">🎯</span>
            Priority Fixes
          </h2>
        </div>
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 600 }}>No failing checks found!</div>
          <div style={{ fontSize: '0.85rem', marginTop: 4 }}>This page scores well on all audited dimensions.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="prioritized-actions" aria-labelledby="priority-fixes-title">
      <div className="section-header">
        <h2 className="section-title" id="priority-fixes-title">
          <span className="section-title-icon" aria-hidden="true">🎯</span>
          Priority Fixes
        </h2>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
          Sorted worst-first
        </span>
      </div>

      <ol aria-label="Prioritized list of issues to fix" style={{ listStyle: 'none', padding: 0 }}>
        {actions.map((action, idx) => (
          <li key={`${action.skill}-${action.checkName}-${idx}`}>
            <article
              className={`action-card sev-${action.severity}`}
              aria-label={`Issue ${idx + 1}: ${action.checkName}`}
            >
              <div className="action-card-header">
                <span className="action-number" aria-hidden="true">{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <SeverityBadge severity={action.severity} />
                    <span className="action-skill-name">{action.skill}</span>
                  </div>
                  <div className="action-check-name">{action.checkName}</div>
                </div>
              </div>

              {action.issue && (
                <p className="action-issue">{action.issue}</p>
              )}

              <div className="action-meta">
                {action.evidence && (
                  <div className="action-evidence">
                    <span aria-hidden="true" style={{ flexShrink: 0 }}>📋</span>
                    <span>{action.evidence}</span>
                  </div>
                )}
                {action.recommendation && (
                  <div className="action-recommendation">
                    <span aria-hidden="true" style={{ flexShrink: 0 }}>💡</span>
                    <span>{action.recommendation}</span>
                  </div>
                )}
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
