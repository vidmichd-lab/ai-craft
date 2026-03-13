import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const outputDir = path.resolve(process.argv[2] || 'dist');

const releaseVersion = process.env.RELEASE_VERSION || 'dev';
const buildTime = new Date().toISOString();
const workspaceApiBaseUrl = (process.env.WORKSPACE_API_BASE_URL || '').trim();
const mediaManifestUrl = (process.env.MEDIA_REMOTE_MANIFEST_URL || '').trim();
const mediaBaseUrl = (process.env.MEDIA_REMOTE_BASE_URL || '').trim();

const copyTargets = [
  'index.html',
  'styles.css',
  'sw.js',
  'config.json',
  'sizes-config.json',
  'assets',
  'fav',
  'font',
  'logo',
  'src'
];

const ensureDir = async (targetPath) => {
  await mkdir(path.dirname(targetPath), { recursive: true });
};

const copyTarget = async (relativePath) => {
  const sourcePath = path.join(rootDir, relativePath);
  const destinationPath = path.join(outputDir, relativePath);
  await ensureDir(destinationPath);
  await cp(sourcePath, destinationPath, {
    recursive: true,
    force: true,
    filter: (source) => !source.endsWith('.DS_Store')
  });
};

const rewriteIndexHtml = async () => {
  const indexPath = path.join(outputDir, 'index.html');
  let html = await readFile(indexPath, 'utf8');

  html = html.replace(
    /window\.APP_VERSION\s*=\s*'[^']*';/,
    `window.APP_VERSION = '${releaseVersion}';`
  );
  html = html.replace(
    /window\.APP_BUILD_TIME\s*=\s*[^;]*;/,
    `window.APP_BUILD_TIME = '${buildTime}';`
  );
  html = html.replace(
    /href="fav\/favicon\.png(?:\?v=[^"]*)?"/,
    `href="fav/favicon.png?v=${encodeURIComponent(releaseVersion)}"`
  );
  html = html.replace(
    /src="assets\/logo\.svg(?:\?v=[^"]*)?"/,
    `src="assets/logo.svg?v=${encodeURIComponent(releaseVersion)}"`
  );

  await writeFile(indexPath, html, 'utf8');
};

const rewriteConfig = async () => {
  const configPath = path.join(outputDir, 'config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));

  if (workspaceApiBaseUrl) {
    config.workspaceApi = {
      ...(config.workspaceApi && typeof config.workspaceApi === 'object' ? config.workspaceApi : {}),
      enabled: true,
      baseUrl: workspaceApiBaseUrl
    };
  }

  if (mediaManifestUrl || mediaBaseUrl) {
    const mediaSources = config.mediaSources && typeof config.mediaSources === 'object'
      ? config.mediaSources
      : {};
    const remote = mediaSources.remote && typeof mediaSources.remote === 'object'
      ? mediaSources.remote
      : {};

    config.mediaSources = {
      ...mediaSources,
      remote: {
        ...remote,
        ...(mediaManifestUrl ? { manifestUrl: mediaManifestUrl } : {}),
        ...(mediaBaseUrl ? { baseUrl: mediaBaseUrl } : {})
      }
    };
  }

  config.release = {
    version: releaseVersion,
    buildTime
  };

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
};

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const target of copyTargets) {
  await copyTarget(target);
}

await rewriteIndexHtml();
await rewriteConfig();
