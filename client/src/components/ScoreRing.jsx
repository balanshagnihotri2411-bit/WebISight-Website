import { useEffect, useRef } from 'react';

const SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColor(score) {
  if (score >= 85) return '#10b981';
  if (score >= 70) return '#84cc16';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#f97316';
  return '#f43f5e';
}

function getScoreClass(score) {
  if (score >= 85) return 'score-excellent';
  if (score >= 70) return 'score-good';
  if (score >= 50) return 'score-average';
  if (score >= 30) return 'score-poor';
  return 'score-critical';
}

/**
 * Animated SVG ring showing a 0–100 score.
 */
export default function ScoreRing({ score, label, size = SIZE }) {
  const strokeWidth = size * (STROKE_WIDTH / SIZE);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  const fontSize = size * 0.22;
  const labelSize = size * 0.1;

  return (
    <div className="score-ring-container" aria-label={`${label}: ${score} out of 100`}>
      <svg
        width={size}
        height={size}
        className="score-ring-svg"
        role="img"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          className="score-ring-track"
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          className="score-ring-fill"
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 8px ${color}60)`,
          }}
        />
        {/* Center text */}
        <g className="score-ring-text-group" transform={`rotate(90, ${cx}, ${cy})`}>
          <text
            x={cx}
            y={cy - fontSize * 0.3}
            className="score-ring-value"
            fontSize={fontSize}
            fill={color}
          >
            {score}
          </text>
          <text
            x={cx}
            y={cy + fontSize * 0.7}
            className="score-ring-label"
            fontSize={labelSize}
          >
            /100
          </text>
        </g>
      </svg>
      {label && (
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            maxWidth: size + 'px',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export { getScoreColor, getScoreClass };
