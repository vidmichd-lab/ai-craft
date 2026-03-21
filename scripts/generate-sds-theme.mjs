import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();

const firstExistingPath = async (paths, label) => {
  for (const candidate of paths.filter(Boolean)) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`Unable to locate ${label}. Checked: ${paths.filter(Boolean).join(', ')}`);
};

const colorDarkPath = await firstExistingPath(
  [
    process.env.SDS_DARK_TOKENS_PATH,
    path.join(rootDir, 'design/tokens/AI-Craft-Dark.tokens.json'),
    '/Users/vidmich/Downloads/Color/SDS Dark.tokens.json'
  ],
  'dark SDS tokens'
);

const colorLightPath = await firstExistingPath(
  [
    process.env.SDS_LIGHT_TOKENS_PATH,
    path.join(rootDir, 'design/tokens/AI-Craft-Light.tokens.json'),
    '/Users/vidmich/Downloads/Color/SDS Light.tokens.json'
  ],
  'light SDS tokens'
);

const sources = {
  colorDark: colorDarkPath,
  colorLight: colorLightPath,
  colorPrimitivesZip:
    process.env.SDS_COLOR_PRIMITIVES_ZIP || '/Users/vidmich/Downloads/Color Primitives.zip',
  sizeZip: process.env.SDS_SIZE_ZIP || '/Users/vidmich/Downloads/Size.zip',
  responsiveZip: process.env.SDS_RESPONSIVE_ZIP || '/Users/vidmich/Downloads/Responsive.zip',
  typographyPrimitivesZip:
    process.env.SDS_TYPOGRAPHY_PRIMITIVES_ZIP || '/Users/vidmich/Downloads/Typography Primitives.zip',
  typographyZip: process.env.SDS_TYPOGRAPHY_ZIP || '/Users/vidmich/Downloads/Typography.zip'
};

const outputPath = path.join(rootDir, 'packages/ui/src/sds-tokens.css');

const listZipEntries = async (zipPath) => {
  const { stdout } = await execFileAsync('unzip', ['-Z1', zipPath], {
    maxBuffer: 1024 * 1024 * 16
  });
  return stdout
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.endsWith('.json'));
};

const readZipJson = async (zipPath, entryName) => {
  const { stdout } = await execFileAsync('unzip', ['-p', zipPath, entryName], {
    maxBuffer: 1024 * 1024 * 16,
    encoding: 'utf8'
  });
  return JSON.parse(stdout);
};

const readSingleJsonFromZip = async (zipPath) => {
  const entries = await listZipEntries(zipPath);
  const first = entries[0];
  if (!first) {
    throw new Error(`No JSON entry found in ${zipPath}`);
  }
  return readZipJson(zipPath, first);
};

const readNamedJsonsFromZip = async (zipPath) => {
  const entries = await listZipEntries(zipPath);
  const result = new Map();
  for (const entry of entries) {
    const json = await readZipJson(zipPath, entry);
    result.set(path.basename(entry).replace(/\.tokens\.json$/i, '').replace(/\.json$/i, ''), json);
  }
  return result;
};

const formatAlphaHex = (hex, alpha = 1) => {
  const normalizedHex = String(hex || '').trim();
  if (!normalizedHex.startsWith('#')) return normalizedHex;
  const normalizedAlpha = Number.isFinite(alpha) ? alpha : 1;
  if (normalizedAlpha >= 0.999) return normalizedHex.toLowerCase();
  return `rgba(${parseInt(normalizedHex.slice(1, 3), 16)}, ${parseInt(normalizedHex.slice(3, 5), 16)}, ${parseInt(normalizedHex.slice(5, 7), 16)}, ${normalizedAlpha})`;
};

const fallbackVarName = (segments) =>
  `--sds-${segments
    .map((segment) =>
      String(segment)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .filter(Boolean)
    .join('-')}`;

const pathKey = (segments) => segments.map((item) => String(item).trim()).join(' > ');

const extractVarName = (node, trail) => {
  const maybeSyntax = node?.$extensions?.['com.figma.codeSyntax']?.WEB;
  const matchedVarName =
    typeof maybeSyntax === 'string' ? maybeSyntax.match(/var\((--[^)]+)\)/)?.[1] : '';
  return matchedVarName || fallbackVarName(trail);
};

const collectEntries = (node, trail = [], entries = []) => {
  if (!node || typeof node !== 'object') return entries;

  if (Object.prototype.hasOwnProperty.call(node, '$value')) {
    entries.push({
      trail,
      path: pathKey(trail),
      varName: extractVarName(node, trail),
      rawValue: node.$value,
      type: node.$type,
      scopes: node.$extensions?.['com.figma.scopes'] || [],
      aliasName: node.$extensions?.['com.figma.aliasData']?.targetVariableName || ''
    });
    return entries;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    collectEntries(value, [...trail, key], entries);
  }

  return entries;
};

const shouldUsePx = (entry) => {
  if (entry.varName.includes('font-weight')) return false;
  if (entry.varName.includes('responsive-scale')) return false;
  if (entry.varName.includes('font-style')) return false;
  if (entry.type === 'color') return false;
  return typeof entry.rawValue === 'number';
};

const resolveReferencePath = (rawValue) => {
  if (typeof rawValue !== 'string') return '';
  const match = rawValue.trim().match(/^\{(.+)\}$/);
  if (!match) return '';
  return pathKey(match[1].split('.').map((item) => item.trim()));
};

const formatValue = (entry, byPath) => {
  if (entry.rawValue && typeof entry.rawValue === 'object' && typeof entry.rawValue.hex === 'string') {
    return formatAlphaHex(entry.rawValue.hex, entry.rawValue.alpha);
  }

  const referencePath = resolveReferencePath(entry.rawValue);
  if (referencePath) {
    const target = byPath.get(referencePath);
    return target ? `var(${target.varName})` : String(entry.rawValue);
  }

  if (typeof entry.rawValue === 'number') {
    return shouldUsePx(entry) ? `${entry.rawValue}px` : String(entry.rawValue);
  }

  return String(entry.rawValue);
};

const renderBlock = (selector, vars) => {
  const lines = [...vars.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `  ${name}: ${value};`);
  return `${selector} {\n${lines.join('\n')}\n}\n`;
};

const addEntriesToMap = (entries, targetMap, prefix = '') => {
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  for (const entry of entries) {
    const varName = prefix
      ? entry.varName.startsWith('--sds-responsive-')
        ? entry.varName.replace(/^--sds-responsive-/, `--sds-${prefix}-`)
        : entry.varName.replace(/^--sds-/, `--sds-${prefix}-`)
      : entry.varName;
    targetMap.set(varName, formatValue(entry, byPath));
  }
};

const addResponsiveEntries = async () => {
  const jsons = await readNamedJsonsFromZip(sources.responsiveZip);
  const desktopEntries = collectEntries(jsons.get('Desktop'));
  const tabletEntries = collectEntries(jsons.get('Tablet'));
  const mobileEntries = collectEntries(jsons.get('Mobile'));

  const rootVars = new Map();
  const tabletVars = new Map();
  const mobileVars = new Map();
  const prefixedVars = new Map();

  addEntriesToMap(desktopEntries, rootVars);
  addEntriesToMap(tabletEntries, tabletVars);
  addEntriesToMap(mobileEntries, mobileVars);
  addEntriesToMap(desktopEntries, prefixedVars, 'responsive-desktop');
  addEntriesToMap(tabletEntries, prefixedVars, 'responsive-tablet');
  addEntriesToMap(mobileEntries, prefixedVars, 'responsive-mobile');

  const tabletWidth = tabletVars.get('--sds-responsive-device-width') || '768px';
  const mobileWidth = mobileVars.get('--sds-responsive-device-width') || '390px';

  return {
    rootVars,
    prefixedVars,
    tabletVars,
    mobileVars,
    tabletWidth,
    mobileWidth
  };
};

const colorDark = JSON.parse(await readFile(sources.colorDark, 'utf8'));
const colorLight = JSON.parse(await readFile(sources.colorLight, 'utf8'));
const colorPrimitives = await readSingleJsonFromZip(sources.colorPrimitivesZip);
const sizeTokens = await readSingleJsonFromZip(sources.sizeZip);
const typographyPrimitives = await readSingleJsonFromZip(sources.typographyPrimitivesZip);
const typographyTokens = await readSingleJsonFromZip(sources.typographyZip);
const responsive = await addResponsiveEntries();

const darkVars = new Map();
const lightVars = new Map();

addEntriesToMap(collectEntries(colorPrimitives), darkVars);
addEntriesToMap(collectEntries(sizeTokens), darkVars);
addEntriesToMap(collectEntries(typographyPrimitives), darkVars);
addEntriesToMap(collectEntries(typographyTokens), darkVars);
addEntriesToMap(collectEntries(colorDark), darkVars);
addEntriesToMap(collectEntries(colorPrimitives), lightVars);
addEntriesToMap(collectEntries(sizeTokens), lightVars);
addEntriesToMap(collectEntries(typographyPrimitives), lightVars);
addEntriesToMap(collectEntries(typographyTokens), lightVars);
addEntriesToMap(collectEntries(colorLight), lightVars);

for (const [name, value] of responsive.rootVars.entries()) {
  darkVars.set(name, value);
  lightVars.set(name, value);
}
for (const [name, value] of responsive.prefixedVars.entries()) {
  darkVars.set(name, value);
  lightVars.set(name, value);
}

const css = `/* Auto-generated by scripts/generate-sds-theme.mjs. Do not edit manually. */\n${renderBlock(':root', darkVars)}\n${renderBlock('[data-theme="light"]', lightVars)}\n@media (max-width: ${responsive.tabletWidth}) {\n${renderBlock('  :root', responsive.tabletVars)}}\n@media (max-width: ${responsive.mobileWidth}) {\n${renderBlock('  :root', responsive.mobileVars)}}`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, css, 'utf8');

console.log(`Generated ${outputPath}`);
