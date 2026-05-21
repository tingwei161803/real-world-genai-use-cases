const { execSync } = require('child_process');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
execSync('node data/merge.js', { cwd: ROOT, stdio: 'inherit' });

global.window = {};
require(path.join(ROOT, 'data', 'use-cases.js'));
const { USE_CASES, INDUSTRIES, AGENT_TYPES } = global.window;

assert(Array.isArray(USE_CASES) && USE_CASES.length > 0, 'USE_CASES empty');
assert(INDUSTRIES.length === 11, `INDUSTRIES ${INDUSTRIES.length}`);
assert(AGENT_TYPES.length === 6, `AGENT_TYPES ${AGENT_TYPES.length}`);

const indKeys = new Set(INDUSTRIES.map((x) => x.key));
const agKeys = new Set(AGENT_TYPES.map((x) => x.key));
const ids = new Set();
for (const u of USE_CASES) {
  assert(indKeys.has(u.industry), `bad industry ${u.industry}`);
  assert(agKeys.has(u.agentType), `bad agentType ${u.agentType}`);
  assert(u.summary && u.summary.en && u.summary.zh, `bad summary ${u.id}`);
  assert(Array.isArray(u.sources) && u.sources.length >= 1, `no sources ${u.id}`);
  assert(!ids.has(u.id), `dup id ${u.id}`);
  ids.add(u.id);
}
console.log('merge test ok:', USE_CASES.length, 'use cases');
