#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const indexPath = path.join(repoRoot, 'index.html');

const args = process.argv.slice(2);
const command = args[0] || 'patch';

const indexSource = fs.readFileSync(indexPath, 'utf8');
const versionPattern = /window\.APP_VERSION\s*=\s*'(\d+)\.(\d+)\.(\d+)'/;
const match = indexSource.match(versionPattern);

if (!match) {
  console.error('Не удалось найти window.APP_VERSION в index.html');
  process.exit(1);
}

const currentVersion = match.slice(1, 4).map((part) => Number(part));
const currentVersionString = currentVersion.join('.');

if (command === '--current') {
  console.log(currentVersionString);
  process.exit(0);
}

const parseExplicitVersion = (value) => {
  const explicitMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!explicitMatch) return null;
  return explicitMatch.slice(1, 4).map((part) => Number(part));
};

const nextVersion = (() => {
  const explicitVersion = parseExplicitVersion(command);
  if (explicitVersion) return explicitVersion;

  const [major, minor, patch] = currentVersion;
  if (command === 'patch') return [major, minor, patch + 1];
  if (command === 'minor') return [major, minor + 1, 0];
  if (command === 'major') return [major + 1, 0, 0];

  console.error(`Неизвестная команда: ${command}`);
  console.error('Использование: node scripts/bump-version.mjs [patch|minor|major|X.Y.Z|--current]');
  process.exit(1);
})();

const nextVersionString = nextVersion.join('.');
const updatedIndex = indexSource.replace(versionPattern, `window.APP_VERSION = '${nextVersionString}'`);

if (updatedIndex === indexSource) {
  console.error('Версия не изменилась');
  process.exit(1);
}

fs.writeFileSync(indexPath, updatedIndex, 'utf8');

console.log(`APP_VERSION: ${currentVersionString} -> ${nextVersionString}`);
