/**
 * Architecture Constraint Checker
 *
 * 의존성 방향 규칙:
 *   Types → Lib → Hooks → Components → Pages
 *   Context는 Types + Lib + Hooks까지 허용
 *
 * 추가 검사:
 *   - 파일 크기 제한 (300줄)
 *   - types/ 레이어가 다른 src/ 모듈을 import하지 않는지
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(import.meta.dirname, '..', 'src');
const PYTHON_DIR = path.resolve(import.meta.dirname, '..', 'functions-python');
const MAX_LINES = 300;

// Layer definitions: lower index = lower layer
const LAYERS = [
  { name: 'types',      dir: 'types',      rank: 0 },
  { name: 'lib',        dir: 'lib',        rank: 1 },
  { name: 'hooks',      dir: 'hooks',      rank: 2 },
  { name: 'context',    dir: 'context',    rank: 2 }, // same rank as hooks
  { name: 'components', dir: 'components', rank: 3 },
  { name: 'pages',      dir: 'pages',      rank: 4 },
] as const;

// Special rule: context can import hooks (same rank), but not components/pages
// components can import hooks and context (rank <= 3)

interface Violation {
  file: string;
  line: number;
  message: string;
}

function getLayer(filePath: string) {
  const rel = path.relative(SRC_DIR, filePath);
  for (const layer of LAYERS) {
    if (rel.startsWith(layer.dir + '/') || rel.startsWith(layer.dir + path.sep)) {
      return layer;
    }
  }
  return null;
}

function resolveImportLayer(importPath: string): typeof LAYERS[number] | null {
  // Handle @/* alias
  const normalized = importPath.replace(/^@\//, '');
  for (const layer of LAYERS) {
    if (normalized.startsWith(layer.dir + '/') || normalized === layer.dir) {
      return layer;
    }
  }
  return null;
}

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dataconnect-generated') continue;
      files.push(...getAllTsFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkDependencyDirection(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  const sourceLayer = getLayer(filePath);
  if (!sourceLayer) return violations;

  const importRegex = /^import\s+.*from\s+['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(importRegex);
    if (!match) continue;

    const importPath = match[1];
    // Only check @/ imports (internal project imports)
    if (!importPath.startsWith('@/')) continue;

    const targetLayer = resolveImportLayer(importPath);
    if (!targetLayer) continue;

    if (targetLayer.rank > sourceLayer.rank) {
      violations.push({
        file: path.relative(SRC_DIR, filePath),
        line: i + 1,
        message: `${sourceLayer.name} (rank ${sourceLayer.rank}) imports ${targetLayer.name} (rank ${targetLayer.rank}): "${importPath}"`,
      });
    }
  }

  return violations;
}

function checkFileSize(filePath: string, lines: string[]): Violation[] {
  if (lines.length > MAX_LINES) {
    return [{
      file: path.relative(SRC_DIR, filePath),
      line: 0,
      message: `File has ${lines.length} lines (max: ${MAX_LINES})`,
    }];
  }
  return [];
}

// --- Hardcoded secrets detection ---

const SECRET_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /['"]AIza[0-9A-Za-z_-]{35}['"]/, description: 'Firebase/Google API key' },
  { pattern: /['"][0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com['"]/, description: 'Google OAuth client ID' },
  { pattern: /['"]sk-[a-zA-Z0-9]{20,}['"]/, description: 'OpenAI API key' },
  { pattern: /['"]ghp_[a-zA-Z0-9]{36,}['"]/, description: 'GitHub personal access token' },
  { pattern: /['"]glpat-[a-zA-Z0-9_-]{20,}['"]/, description: 'GitLab access token' },
  { pattern: /['"]xox[bpors]-[a-zA-Z0-9-]+['"]/, description: 'Slack token' },
  { pattern: /['"](pk|sk)_(test|live)_[a-zA-Z0-9]{20,}['"]/, description: 'Stripe key' },
  { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/, description: 'Hardcoded password' },
  { pattern: /secret\s*[:=]\s*['"][^'"]{8,}['"]/, description: 'Hardcoded secret' },
];

// Files allowed to reference env vars (not actual secrets)
const SECRET_CHECK_IGNORE = ['lib/firebase.ts'];

function checkHardcodedSecrets(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  const rel = path.relative(SRC_DIR, filePath);

  if (SECRET_CHECK_IGNORE.some(ignored => rel === ignored || rel === ignored.replace(/\//g, path.sep))) {
    return violations;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
    // Skip lines that read from env vars (these are OK)
    if (line.includes('import.meta.env') || line.includes('process.env')) continue;

    for (const { pattern, description } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          message: `Hardcoded ${description} detected. Use environment variables instead.`,
        });
        break; // one violation per line is enough
      }
    }
  }
  return violations;
}

function getAllPythonFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'venv' || entry.name === '__pycache__' || entry.name === '.venv') continue;
      files.push(...getAllPythonFiles(fullPath));
    } else if (entry.name.endsWith('.py')) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkPythonFile(filePath: string, lines: string[]): { violations: Violation[]; sizeWarnings: Violation[] } {
  const rel = path.relative(PYTHON_DIR, filePath);
  const violations: Violation[] = [];
  const sizeWarnings: Violation[] = [];

  // Secret scan (reuses same patterns)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('#')) continue;
    if (line.includes('os.environ') || line.includes('os.getenv')) continue;
    for (const { pattern, description } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: `functions-python/${rel}`,
          line: i + 1,
          message: `Hardcoded ${description} detected. Use environment variables instead.`,
        });
        break;
      }
    }
  }

  // File size
  if (lines.length > MAX_LINES) {
    sizeWarnings.push({
      file: `functions-python/${rel}`,
      line: 0,
      message: `File has ${lines.length} lines (max: ${MAX_LINES})`,
    });
  }

  return { violations, sizeWarnings };
}

// --- Main ---
const files = getAllTsFiles(SRC_DIR);
const allViolations: Violation[] = [];
const sizeWarnings: Violation[] = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  allViolations.push(...checkDependencyDirection(filePath, lines));
  allViolations.push(...checkHardcodedSecrets(filePath, lines));
  sizeWarnings.push(...checkFileSize(filePath, lines));
}

// Scan Python codebase
const pyFiles = getAllPythonFiles(PYTHON_DIR);
for (const filePath of pyFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const { violations, sizeWarnings: pySize } = checkPythonFile(filePath, lines);
  allViolations.push(...violations);
  sizeWarnings.push(...pySize);
}

// Report
let hasErrors = false;

if (allViolations.length > 0) {
  hasErrors = true;
  console.error('\n\x1b[31m✗ Dependency direction violations:\x1b[0m\n');
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line} — ${v.message}`);
  }
}

if (sizeWarnings.length > 0) {
  console.warn('\n\x1b[33m⚠ File size warnings:\x1b[0m\n');
  for (const w of sizeWarnings) {
    console.warn(`  ${w.file} — ${w.message}`);
  }
}

if (!hasErrors && sizeWarnings.length === 0) {
  console.log('\n\x1b[32m✓ Architecture checks passed\x1b[0m\n');
}

if (hasErrors) {
  process.exit(1);
}
