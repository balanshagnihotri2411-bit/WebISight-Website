import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {Object} Finding
 * @property {string} skill         - Skill name
 * @property {string} checkName     - Name of this specific check
 * @property {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO'} severity
 * @property {boolean} passed       - Whether the check passed
 * @property {string|null} issue    - Human-readable description of the problem (null if passed)
 * @property {string|null} evidence - Supporting data from the crawl
 * @property {string|null} recommendation - Actionable fix (null if passed)
 */

let _skills = null;

/**
 * Auto-load all skill files in the current directory.
 * Excludes index.js itself and any non-skill files.
 * @returns {Promise<Array<{ name: string, run: (crawlResult: any) => Finding[] }>>}
 */
export async function loadSkills() {
  if (_skills) return _skills;

  const files = await readdir(__dirname);
  const skillFiles = files.filter(
    (f) => f.endsWith('Skill.js') && f !== 'index.js'
  );

  const loaded = await Promise.all(
    skillFiles.map(async (file) => {
      const filePath = join(__dirname, file);
      const mod = await import(pathToFileURL(filePath).href);
      if (typeof mod.run !== 'function' || typeof mod.name !== 'string') {
        throw new Error(`Skill file ${file} must export { name, run }`);
      }
      return { name: mod.name, run: mod.run };
    })
  );

  _skills = loaded;
  return _skills;
}
