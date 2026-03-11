#!/usr/bin/env node
/**
 * Debug: brace balance in renderer.js from start of renderToCanvas to line 1816.
 * Writes NDJSON to .cursor/debug-8307d3.log for hypothesis evaluation.
 */
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '.cursor', 'debug-8307d3.log');
const rendererPath = path.join(__dirname, 'src', 'renderer.js');

const content = fs.readFileSync(rendererPath, 'utf8');
const lines = content.split('\n');

// renderToCanvas starts at line 49 (index 48). Check up to line 1816 (index 1815).
let balance = 0;
const entries = [];
const startLine = 49;
const endLine = 1816;

for (let i = 0; i < lines.length && i < endLine; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  for (const c of line) {
    if (c === '{') balance++;
    if (c === '}') balance--;
  }
  if (lineNum === 49 || lineNum === 1803 || lineNum === 1807 || lineNum === 1808 || lineNum === 1815) {
    entries.push({
      sessionId: '8307d3',
      hypothesisId: lineNum === 1808 && balance !== 0 ? 'A' : lineNum === 1808 ? 'E' : 'balance',
      location: `renderer.js:${lineNum}`,
      message: 'Brace balance after line',
      data: { lineNum, balance, lineTrim: line.trim().slice(0, 60) },
      timestamp: Date.now()
    });
  }
}

const payload = {
  sessionId: '8307d3',
  runId: 'brace-check',
  hypothesisId: 'A_E',
  location: 'diagnose-renderer.js',
  message: 'Brace balance from line 49 to 1815',
  data: { balanceAt1815: balance, startLine, endLine, entries: entries.map(e => e.data) },
  timestamp: Date.now()
};

fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.appendFileSync(logPath, JSON.stringify(payload) + '\n');
entries.forEach(e => { fs.appendFileSync(logPath, JSON.stringify(e) + '\n'); });
console.log('Balance at line 1815:', balance);
console.log('Log written to', logPath);
