import { fetchAndCrawl } from '../crawler/httpFetcher.js';
import { loadSkills } from '../skills/index.js';
import { generateReport } from '../report/reportGenerator.js';

/**
 * Fetch once, run all skills, generate a report.
 * @param {string} url - Validated URL to audit
 * @returns {Promise<object>} AuditReport
 */
export async function runAudit(url) {
  // 1. Single fetch
  const crawlResult = await fetchAndCrawl(url);

  // 2. Load all skills
  const skills = await loadSkills();

  // 3. Run all skills concurrently against the same CrawlResult
  const results = await Promise.all(
    skills.map((skill) =>
      Promise.resolve()
        .then(() => skill.run(crawlResult))
        .catch((err) => {
          console.error(`Skill "${skill.name}" threw an error:`, err);
          // Return a single error finding so the audit doesn't fail entirely
          return [
            {
              skill: skill.name,
              checkName: 'Skill Execution Error',
              severity: 'INFO',
              passed: false,
              issue: `Skill failed to run: ${err.message}`,
              evidence: err.stack || err.message,
              recommendation: 'Please report this as a bug.',
            },
          ];
        })
    )
  );

  // 4. Build findings map: skill name → findings[]
  const findingsBySkillName = new Map();
  for (let i = 0; i < skills.length; i++) {
    findingsBySkillName.set(skills[i].name, results[i]);
  }

  // 5. Generate and return the report
  return generateReport(url, findingsBySkillName);
}
