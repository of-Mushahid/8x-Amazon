#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

function readRecords(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  return lines.filter((line, index) => line && index < lines.length - 1).map(JSON.parse);
}

function entry(kind, num, session, timestamp, model, text) {
  return `[LOG_ENTRY type=${kind} num=${num} session=${session.slice(0, 8)}]\ntimestamp: ${timestamp}\nmodel: ${model}\n\n${text}\n\n\n`;
}

async function capture(hook) {
  if (!['Stop', 'UserPromptSubmit'].includes(hook.hook_event_name)) return;
  if (!/^[a-zA-Z0-9-]+$/.test(hook.session_id || '')) throw new Error('Invalid session ID');
  const file = hook.transcript_path || path.join(os.homedir(), '.qoder/projects', hook.cwd.replace(/[:\\/]/g, '-'), `${hook.session_id}.jsonl`);
  if (!fs.existsSync(file)) return;
  const records = readRecords(file);
  const prompts = records.filter(r => r.type === 'user' && r.origin?.kind === 'human' && typeof r.humanInput?.text === 'string');
  if (!prompts.length) return;
  const relative = path.relative(root, path.resolve(hook.cwd));
  const inside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  const canary = prompts[0].humanInput.text.startsWith('CAPTURE TEST — 8x assignment, Mushahid Ahmed\n');
  if (!inside && !canary) return;
  const stateDir = path.join(root, '.git/agent-capture');
  fs.mkdirSync(stateDir, { recursive: true });
  const lock = path.join(stateDir, `${hook.session_id}.lock`);
  let acquired = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { fs.mkdirSync(lock); acquired = true; break; }
    catch (error) { if (error.code !== 'EEXIST') throw error; await delay(50); }
  }
  if (!acquired) throw new Error('Capture lock timeout');
  try {
    const first = prompts[0];
    const time = new Date(first.timestamp).toISOString();
    const output = path.join(root, '.agent-logs', `${time.slice(0, 10)}_${time.slice(11, 19).replace(/:/g, '-')}_${hook.session_id}.md`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const statePath = path.join(stateDir, `${hook.session_id}.json`);
    let state;
    if (fs.existsSync(statePath)) state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    else {
      // Historical entries stay untouched, including errors from earlier capture versions.
      const old = fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '';
      const count = Number(old.match(/^total_exchanges: (\d+)$/m)?.[1] || 0);
      state = { prompts: prompts.slice(0, count).map(p => p.uuid), responses: prompts.slice(0, count).map(p => p.uuid), hash: digest(old) };
    }
    let content = fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '';
    if (digest(content) !== state.hash) throw new Error('Existing capture changed outside append pipeline');
    const prompt = prompts.at(-1);
    const index = records.indexOf(prompt);
    const model = prompt.businessModelKey || records.slice(0, index + 1).findLast(r => r.type === 'runtime-config')?.model || 'not-exposed';
    if (!content) content = `---\nsession_id: ${hook.session_id}\ndate: ${time.slice(0, 10)}\nauthor: of-Mushahid\nmodel: ${model}\ntool: qoder\nproject: 8x-Amazon\ntotal_exchanges: 0\nfirst_prompt_time: ${time}\nlast_prompt_time: ${time}\n---\n\n# Session Log - ${time.slice(0, 10)}\n\nSession: \`${hook.session_id.slice(0, 8)}\` | Project: \`8x-Amazon\` | Author: \`of-Mushahid\`\n\n---\n\n`;
    if (!state.prompts.includes(prompt.uuid)) {
      state.prompts.push(prompt.uuid);
      content += entry('PROMPT', state.prompts.length, hook.session_id, new Date(prompt.timestamp).toISOString(), model, prompt.humanInput.text);
    }
    if (hook.hook_event_name === 'Stop' && typeof hook.last_assistant_message === 'string' && !state.responses.includes(prompt.uuid)) {
      const last = records.slice(index + 1).findLast(r => r.type === 'assistant' && r.message?.content?.some(c => c.type === 'text' && hook.last_assistant_message.includes(c.text)));
      content += entry('RESPONSE', state.prompts.indexOf(prompt.uuid) + 1, hook.session_id, new Date(last?.timestamp || Date.now()).toISOString(), last?.message?.model || model, hook.last_assistant_message);
      state.responses.push(prompt.uuid);
    }
    // Only the summary metadata changes; the entry body is append-only.
    content = content.replace(/^total_exchanges: \d+$/m, `total_exchanges: ${state.prompts.length}`).replace(/^last_prompt_time: .*$/m, `last_prompt_time: ${new Date(prompt.timestamp).toISOString()}`);
    fs.writeFileSync(output, content);
    state.hash = digest(content);
    fs.writeFileSync(statePath, JSON.stringify(state));
  } finally { fs.rmdirSync(lock); }
}

if (require.main === module) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => capture(JSON.parse(input)).catch(error => { console.error(error.message); process.exitCode = 1; }));
}
module.exports = { entry, readRecords, capture };
