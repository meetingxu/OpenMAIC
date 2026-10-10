import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Reports file names and line numbers only; never echoes a credential.
const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
const forbidden =
  /(^|\/)(?:\.env(?:\..+)?|server-providers(?:-.+)?\.ya?ml|secrets\/.*|[^/]+\.(?:pem|key|p12|pfx))$/i;
const signatures = [
  /\bsk-(?:cp-|proj-|ant-)?[A-Za-z0-9_-]{32,}\b/,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{30,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
let failed = false;
for (const file of files) {
  if (forbidden.test(file) && !file.endsWith('.example')) {
    console.error(`Forbidden credential file: ${file}`);
    failed = true;
    continue;
  }
  let content;
  try {
    content = readFileSync(file);
  } catch {
    continue;
  }
  if (content.includes(0)) continue;
  const lines = content.toString('utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (signatures.some((pattern) => pattern.test(lines[i]))) {
      console.error(`Possible credential: ${file}:${i + 1}`);
      failed = true;
    }
  }
}
console.log(
  `Checked ${files.length} Git-visible files; ${failed ? 'review required' : 'no matching credential signatures'}. This does not scan history or all credential formats.`,
);
process.exitCode = failed ? 1 : 0;
