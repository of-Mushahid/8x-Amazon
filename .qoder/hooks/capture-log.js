#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME || process.env.USERPROFILE;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readStdin() {
  let payload = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) payload += chunk;
  return payload;
}

function parseJsonl(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split(/\r?\n/)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function projectSlugFor(cwd) {
  return cwd.replace(/[:\\/]/g, '-');
}

function findRepoRoot(cwd) {
  // The script lives at <repoRoot>/.qoder/hooks/capture-log.js.
  // Derive the repo root from __dirname so capture works even when a session's
  // cwd differs from the repo root (e.g. another Qoder chat session).
  const scriptRepoRoot = path.resolve(__dirname, '..', '..');
  if (fs.existsSync(path.join(scriptRepoRoot, '.git'))) return scriptRepoRoot;
  // Fall back to walking up from cwd.
  let dir = cwd;
  while (dir && dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return cwd;
}

function buildLog(sessionId, model, exchanges) {
  const firstPromptTime = exchanges[0]?.promptTime || new Date().toISOString();
  const lastPromptTime = exchanges[exchanges.length - 1]?.promptTime || firstPromptTime;
  const date = firstPromptTime.slice(0, 10);

  const header = `---
session_id: ${sessionId}
date: ${date}
author: of-Mushahid
model: ${model}
tool: qoder
project: 8x-Amazon
total_exchanges: ${exchanges.length}
first_prompt_time: ${firstPromptTime}
last_prompt_time: ${lastPromptTime}
---

# Session Log - ${date}

Session: \`${sessionId.slice(0, 8)}\` | Project: \`8x-Amazon\` | Author: \`of-Mushahid\`

---

`;

  const body = exchanges
    .map((ex, i) => {
      const num = i + 1;
      return `[LOG_ENTRY type=PROMPT num=${num} session=${sessionId.slice(0, 8)}]
timestamp: ${ex.promptTime}
model: ${model}

${ex.prompt}


[LOG_ENTRY type=RESPONSE num=${num} session=${sessionId.slice(0, 8)}]
timestamp: ${ex.responseTime || ''}
model: ${model}

${ex.response}
`;
    })
    .join('\n');

  return header + body;
}

async function main() {
  const payload = await readStdin();
  let hook = {};
  try {
    hook = JSON.parse(payload || '{}');
  } catch {
    hook = {};
  }

  const sessionId = hook.session_id;
  const cwd = hook.cwd;

  if (!sessionId) {
    console.error('No session_id in hook payload');
    process.exit(1);
  }

  const repoRoot = findRepoRoot(cwd || process.cwd());
  const slug = projectSlugFor(cwd || repoRoot);
  const jsonlPath = path.join(HOME, '.qoder', 'projects', slug, `${sessionId}.jsonl`);

  if (!fs.existsSync(jsonlPath)) {
    console.error(`Transcript not found: ${jsonlPath}`);
    process.exit(1);
  }

  // Allow the final assistant record to finish writing.
  await sleep(500);

  const records = parseJsonl(jsonlPath);

  let model = 'fast';
  const exchanges = [];
  let current = null;

  for (const rec of records) {
    if (rec.type === 'runtime-config' && rec.model) {
      model = rec.model;
      continue;
    }

    if (
      rec.type === 'user' &&
      rec.origin &&
      rec.origin.kind === 'human' &&
      rec.humanInput &&
      typeof rec.humanInput.text === 'string'
    ) {
      if (current) exchanges.push(current);
      current = {
        prompt: rec.humanInput.text,
        promptTime: rec.timestamp || rec.humanInput.timestamp,
        response: '',
        responseTime: null
      };
      continue;
    }

    if (rec.type === 'assistant' && current && rec.message && Array.isArray(rec.message.content)) {
      const textParts = rec.message.content
        .filter(c => c.type === 'text' && typeof c.text === 'string')
        .map(c => c.text);
      if (textParts.length) {
        if (current.response) current.response += '\n\n';
        current.response += textParts.join('\n\n');
        current.responseTime = rec.timestamp;
      }
    }
  }

  if (current) exchanges.push(current);

  if (!exchanges.length) {
    console.error('No exchanges found in transcript');
    process.exit(1);
  }

  const logsDir = path.join(repoRoot, '.agent-logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const firstPromptTime = exchanges[0].promptTime;
  const datePart = firstPromptTime.slice(0, 10);
  const timePart = firstPromptTime.slice(11, 19).replace(/:/g, '-');
  const fileName = `${datePart}_${timePart}_${sessionId}.md`;
  const filePath = path.join(logsDir, fileName);

  fs.writeFileSync(filePath, buildLog(sessionId, model, exchanges), 'utf8');
  console.log(`Captured ${exchanges.length} exchange(s) to ${filePath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
