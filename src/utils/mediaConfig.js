import { getScopedStorageKey, resolveActiveAppConfig } from './appConfig.js';

const MEDIA_SOURCES_STORAGE_KEY = 'media-sources';

let configFromFilePromise = null;
let mediaConfigPromise = null;

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const safeParse = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeRemoteSource = (remote) => {
  if (!isPlainObject(remote)) {
    return {
      enabled: false,
      label: 'remote',
      manifestUrl: '',
      baseUrl: '',
      strategy: 'merge'
    };
  }

  const manifestUrl = typeof remote.manifestUrl === 'string' ? remote.manifestUrl.trim() : '';
  const baseUrl = typeof remote.baseUrl === 'string' ? remote.baseUrl.trim() : '';
  const enabled = remote.enabled === true && Boolean(manifestUrl);
  const strategy = remote.strategy === 'prefer' ? 'prefer' : 'merge';

  return {
    enabled,
    label: typeof remote.label === 'string' && remote.label.trim() ? remote.label.trim() : 'remote',
    manifestUrl,
    baseUrl,
    strategy
  };
};

const normalizeMediaSources = (rawConfig) => {
  if (!isPlainObject(rawConfig)) {
    return { remote: normalizeRemoteSource(null) };
  }

  return {
    remote: normalizeRemoteSource(rawConfig.remote)
  };
};

const readWindowConfig = () => {
  if (typeof window === 'undefined') return null;
  return normalizeMediaSources(window.APP_MEDIA_CONFIG);
};

const readStoredConfig = () => {
  if (typeof localStorage === 'undefined') return null;
  const parsed = safeParse(localStorage.getItem(getScopedStorageKey(MEDIA_SOURCES_STORAGE_KEY)));
  return normalizeMediaSources(parsed);
};

const loadConfigFileMediaSources = async () => {
  if (configFromFilePromise) return configFromFilePromise;

  configFromFilePromise = (async () => {
    try {
      const response = await fetch('/config.json', { cache: 'no-store' });
      if (!response.ok) return null;

      const rawConfig = await response.json();
      const config = resolveActiveAppConfig(rawConfig);
      if (typeof window !== 'undefined' && isPlainObject(config)) {
        window.__APP_CONFIG = config;
      }

      return normalizeMediaSources(config?.mediaSources);
    } catch {
      return null;
    }
  })();

  return configFromFilePromise;
};

export const getMediaSourcesStorageKey = () => MEDIA_SOURCES_STORAGE_KEY;

export const resolveMediaSources = async () => {
  if (mediaConfigPromise) return mediaConfigPromise;

  mediaConfigPromise = (async () => {
    const windowConfig = readWindowConfig();
    if (windowConfig?.remote?.enabled) {
      return windowConfig;
    }

    const storedConfig = readStoredConfig();
    if (storedConfig?.remote?.enabled) {
      return storedConfig;
    }

    const appConfig = typeof window !== 'undefined' ? normalizeMediaSources(window.__APP_CONFIG?.mediaSources) : null;
    if (appConfig?.remote?.enabled) {
      return appConfig;
    }

    const fileConfig = await loadConfigFileMediaSources();
    if (fileConfig?.remote?.enabled) {
      return fileConfig;
    }

    return normalizeMediaSources(null);
  })();

  return mediaConfigPromise;
};

export const resetMediaSourcesCache = () => {
  mediaConfigPromise = null;
  configFromFilePromise = null;
};
