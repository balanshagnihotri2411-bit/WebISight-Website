export default function SummaryChips({ summary }) {
  const { totalChecks, passed, failed, critical, high, medium, low } = summary;

  const chips = [
    { label: `${passed} Passed`, className: 'chip-passed', icon: '✓', show: true },
    { label: `${failed} Failed`, className: 'chip-failed', icon: '✗', show: true },
    { label: `${critical} Critical`, className: 'chip-critical', icon: '🔴', show: critical > 0 },
    { label: `${high} High`, className: 'chip-high', icon: '🟠', show: high > 0 },
    { label: `${medium} Medium`, className: 'chip-medium', icon: '🟡', show: medium > 0 },
    { label: `${low} Low`, className: 'chip-low', icon: '🔵', show: low > 0 },
  ];

  return (
    <div
      className="summary-chips"
      role="list"
      aria-label="Audit summary statistics"
    >
      {chips
        .filter((c) => c.show)
        .map((chip) => (
          <span key={chip.label} className={`chip ${chip.className}`} role="listitem">
            <span aria-hidden="true">{chip.icon}</span>
            {chip.label}
          </span>
        ))}
      <span className="chip chip-passed" style={{ opacity: 0.5 }} role="listitem">
        {totalChecks} total checks
      </span>
    </div>
  );
}
