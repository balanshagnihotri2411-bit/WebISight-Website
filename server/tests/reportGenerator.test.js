import { describe, it, expect } from 'vitest';
import { generateReport } from '../src/report/reportGenerator.js';

/** Create a minimal findings map */
function makeFindings(findingsPerSkill) {
  return new Map(Object.entries(findingsPerSkill));
}

describe('reportGenerator', () => {
  it('returns 100 overall score when all checks pass', () => {
    const findings = makeFindings({
      Crawlability: [{ skill: 'Crawlability', checkName: 'HTTP', severity: 'INFO', passed: true, issue: null, evidence: 'OK', recommendation: null }],
      'Structured Data': [{ skill: 'Structured Data', checkName: 'Schema', severity: 'INFO', passed: true, issue: null, evidence: 'OK', recommendation: null }],
    });
    const report = generateReport('https://example.com', findings);
    expect(report.overallScore).toBe(100);
    expect(report.summary.passed).toBe(2);
    expect(report.summary.failed).toBe(0);
  });

  it('subtracts correct penalty for CRITICAL finding', () => {
    const findings = makeFindings({
      Crawlability: [
        { skill: 'Crawlability', checkName: 'HTTP', severity: 'CRITICAL', passed: false, issue: 'Bad', evidence: '404', recommendation: 'Fix' },
      ],
    });
    const report = generateReport('https://example.com', findings);
    expect(report.skillScores['Crawlability']).toBe(70); // 100 - 30
  });

  it('subtracts correct penalty for HIGH finding', () => {
    const findings = makeFindings({
      Crawlability: [
        { skill: 'Crawlability', checkName: 'Title', severity: 'HIGH', passed: false, issue: 'Missing', evidence: '', recommendation: 'Add' },
      ],
    });
    const report = generateReport('https://example.com', findings);
    expect(report.skillScores['Crawlability']).toBe(80); // 100 - 20
  });

  it('floors skill score at 0', () => {
    const criticals = Array.from({ length: 5 }, (_, i) => ({
      skill: 'Crawlability',
      checkName: `Check${i}`,
      severity: 'CRITICAL',
      passed: false,
      issue: 'Bad',
      evidence: '',
      recommendation: 'Fix',
    }));
    const findings = makeFindings({ Crawlability: criticals });
    const report = generateReport('https://example.com', findings);
    expect(report.skillScores['Crawlability']).toBe(0);
  });

  it('sorts prioritized actions worst-first', () => {
    const findings = makeFindings({
      Crawlability: [
        { skill: 'Crawlability', checkName: 'A', severity: 'LOW', passed: false, issue: 'Low issue', evidence: '', recommendation: '' },
        { skill: 'Crawlability', checkName: 'B', severity: 'CRITICAL', passed: false, issue: 'Critical issue', evidence: '', recommendation: '' },
        { skill: 'Crawlability', checkName: 'C', severity: 'HIGH', passed: false, issue: 'High issue', evidence: '', recommendation: '' },
      ],
    });
    const report = generateReport('https://example.com', findings);
    expect(report.prioritizedActions[0].severity).toBe('CRITICAL');
    expect(report.prioritizedActions[1].severity).toBe('HIGH');
    expect(report.prioritizedActions[2].severity).toBe('LOW');
  });

  it('includes all required report fields', () => {
    const findings = makeFindings({
      Crawlability: [],
    });
    const report = generateReport('https://example.com', findings);
    expect(report).toHaveProperty('url');
    expect(report).toHaveProperty('generatedAt');
    expect(report).toHaveProperty('overallScore');
    expect(report).toHaveProperty('skillScores');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('prioritizedActions');
    expect(report).toHaveProperty('findingsBySkill');
  });

  it('calculates average of skill scores for overall', () => {
    const findings = makeFindings({
      SkillA: [{ skill: 'SkillA', checkName: 'X', severity: 'CRITICAL', passed: false, issue: '', evidence: '', recommendation: '' }], // 70
      SkillB: [{ skill: 'SkillB', checkName: 'Y', severity: 'HIGH', passed: false, issue: '', evidence: '', recommendation: '' }],     // 80
    });
    const report = generateReport('https://example.com', findings);
    expect(report.skillScores['SkillA']).toBe(70);
    expect(report.skillScores['SkillB']).toBe(80);
    expect(report.overallScore).toBe(75); // (70 + 80) / 2
  });
});
