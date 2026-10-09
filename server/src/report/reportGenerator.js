/**
 * Report generator — scores findings, builds the AuditReport JSON.
 */

/** Penalty points subtracted from 100 per severity (failing findings only) */
const SEVERITY_PENALTY = {
  CRITICAL: 30,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
  INFO: 0,
};

/**
 * Calculate a score for a set of findings from one skill.
 * Starts at 100, subtracts penalties for failing findings, floors at 0.
 * @param {import('../skills/index.js').Finding[]} findings
 * @returns {number} 0–100
 */
function scoreSkill(findings) {
  let score = 100;
  for (const f of findings) {
    if (!f.passed) {
      score -= SEVERITY_PENALTY[f.severity] ?? 0;
    }
  }
  return Math.max(0, score);
}

/**
 * Build the full AuditReport from a url and a map of findings by skill.
 *
 * @param {string} url - The original audited URL
 * @param {Map<string, import('../skills/index.js').Finding[]>} findingsBySkillName
 * @returns {object} AuditReport
 */
export function generateReport(url, findingsBySkillName) {
  const skillScores = {};
  const allFindings = [];

  for (const [skillName, findings] of findingsBySkillName) {
    skillScores[skillName] = scoreSkill(findings);
    allFindings.push(...findings);
  }

  // Overall score = average of all skill scores
  const skillNames = Object.keys(skillScores);
  const overallScore =
    skillNames.length > 0
      ? Math.round(
          skillNames.reduce((sum, k) => sum + skillScores[k], 0) / skillNames.length
        )
      : 0;

  // Summary counts
  const totalChecks = allFindings.length;
  const passed = allFindings.filter((f) => f.passed).length;
  const failed = allFindings.filter((f) => !f.passed).length;
  const critical = allFindings.filter((f) => !f.passed && f.severity === 'CRITICAL').length;
  const high = allFindings.filter((f) => !f.passed && f.severity === 'HIGH').length;
  const medium = allFindings.filter((f) => !f.passed && f.severity === 'MEDIUM').length;
  const low = allFindings.filter((f) => !f.passed && f.severity === 'LOW').length;

  // Prioritized actions: failing findings sorted worst severity first
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  const prioritizedActions = allFindings
    .filter((f) => !f.passed)
    .sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

  // Findings organized by skill
  const findingsBySkill = {};
  for (const [skillName, findings] of findingsBySkillName) {
    findingsBySkill[skillName] = findings;
  }

  return {
    url,
    generatedAt: new Date().toISOString(),
    overallScore,
    skillScores,
    summary: {
      totalChecks,
      passed,
      failed,
      critical,
      high,
      medium,
      low,
    },
    prioritizedActions,
    findingsBySkill,
  };
}
