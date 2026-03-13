const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const deepMerge = (baseValue, overrideValue) => {
  if (overrideValue === undefined) {
    return cloneJson(baseValue);
  }

  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return cloneJson(overrideValue);
  }

  if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
    const merged = { ...baseValue };
    Object.keys(overrideValue).forEach((key) => {
      merged[key] = key in baseValue
        ? deepMerge(baseValue[key], overrideValue[key])
        : cloneJson(overrideValue[key]);
    });
    return merged;
  }

  return cloneJson(overrideValue);
};

const normalizeTeamKey = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const getRequestedTeamKey = () => {
  if (typeof window === 'undefined') return '';

  try {
    const url = new URL(window.location.href);
    return normalizeTeamKey(url.searchParams.get('team') || '');
  } catch {
    return '';
  }
};

export const getActiveTeamKey = () => {
  if (typeof window === 'undefined') return '';

  const explicit = normalizeTeamKey(window.__APP_CONFIG?.__meta?.activeTeam || '');
  if (explicit) return explicit;

  return getRequestedTeamKey();
};

export const getScopedStorageKey = (baseKey) => {
  const normalizedBaseKey = normalizeTeamKey(baseKey);
  if (!normalizedBaseKey) return '';

  const activeTeam = getActiveTeamKey();
  return activeTeam ? `${normalizedBaseKey}::team::${activeTeam}` : normalizedBaseKey;
};

export const resolveActiveAppConfig = (rawConfig) => {
  if (!isPlainObject(rawConfig)) {
    return null;
  }

  const config = cloneJson(rawConfig);
  const teamProfiles = isPlainObject(config.teamProfiles) ? config.teamProfiles : {};
  const requestedTeam = getRequestedTeamKey();
  const explicitDefaultTeam = normalizeTeamKey(config.defaultTeam || '');
  const activeTeam = requestedTeam || explicitDefaultTeam;
  const teamOverride = activeTeam && isPlainObject(teamProfiles[activeTeam]) ? teamProfiles[activeTeam] : null;

  const resolved = teamOverride ? deepMerge(config, teamOverride) : config;
  delete resolved.teamProfiles;

  resolved.__meta = {
    requestedTeam,
    defaultTeam: explicitDefaultTeam,
    activeTeam: teamOverride ? activeTeam : '',
    availableTeams: Object.keys(teamProfiles)
  };

  return resolved;
};
