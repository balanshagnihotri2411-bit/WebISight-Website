import { getScoreColor } from './ScoreRing.jsx';

const STORAGE_KEY = 'webisight_recent_audits';
const MAX_RECENTS = 5;

export function saveRecentAudit(report) {
  try {
    const existing = loadRecentAudits();
    // Remove duplicates by URL
    const filtered = existing.filter((r) => r.url !== report.url);
    const updated = [
      {
        url: report.url,
        overallScore: report.overallScore,
        generatedAt: report.generatedAt,
      },
      ...filtered,
    ].slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable — silently ignore
  }
}

export function loadRecentAudits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

export default function RecentAudits({ recents, onSelect, onClear }) {
  if (!recents || recents.length === 0) return null;

  return (
    <aside className="recent-audits" aria-label="Recent audits">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2 className="recent-audits-title">
          <span aria-hidden="true">🕘</span>
          Recent Audits
        </h2>
        <button
          className="btn btn-ghost"
          onClick={onClear}
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          aria-label="Clear recent audit history"
        >
          Clear
        </button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {recents.map((audit) => {
          const color = getScoreColor(audit.overallScore);
          return (
            <li key={audit.url}>
              <button
                className="recent-audit-item"
                onClick={() => onSelect(audit.url)}
                aria-label={`Re-audit ${audit.url} (previous score: ${audit.overallScore})`}
              >
                <span
                  className="recent-score-dot"
                  style={{
                    background: `${color}20`,
                    color,
                    border: `1px solid ${color}40`,
                  }}
                  aria-hidden="true"
                >
                  {audit.overallScore}
                </span>
                <span className="recent-audit-url" title={audit.url}>
                  {audit.url}
                </span>
                <span className="recent-audit-time">
                  {timeAgo(audit.generatedAt)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
