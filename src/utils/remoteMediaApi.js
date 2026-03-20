import { resolveMediaSources } from './mediaConfig.js';

const normalizeApiBaseUrl = (manifestUrl) => {
  if (!manifestUrl || typeof manifestUrl !== 'string') return '';

  try {
    const url = new URL(manifestUrl, window.location.origin);
    const normalizedPath = url.pathname.replace(/\/media\/manifest\/?$/, '');
    return `${url.origin}${normalizedPath}`;
  } catch {
    return '';
  }
};

const ensureRemoteEnabled = async () => {
  const mediaSources = await resolveMediaSources();
  const remote = mediaSources?.remote;

  if (!remote?.enabled || !remote.manifestUrl) {
    throw new Error('Remote media source is not configured');
  }

  return remote;
};

const parseErrorResponse = async (response) => {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const buildJsonRequestHeaders = (body) => {
  const headers = {
    Accept: 'application/json'
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'text/plain;charset=UTF-8';
  }

  return headers;
};

const normalizeTargetPath = (value) => {
  if (typeof value !== 'string') return '';

  const cleaned = value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');

  return cleaned;
};

export const getRemoteMediaApiBaseUrl = async () => {
  const remote = await ensureRemoteEnabled();
  return normalizeApiBaseUrl(remote.manifestUrl);
};

export const isRemoteMediaEnabled = async () => {
  const mediaSources = await resolveMediaSources();
  return mediaSources?.remote?.enabled === true && Boolean(mediaSources?.remote?.manifestUrl);
};

export const requestPresignedUpload = async ({
  targetPath = '',
  folder1,
  folder2,
  filename,
  contentType,
  fileSize,
  visibility = 'published'
}) => {
  const apiBaseUrl = await getRemoteMediaApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('Remote media API base URL is missing');
  }

  const response = await fetch(`${apiBaseUrl}/media/presign-upload`, {
    method: 'POST',
    headers: buildJsonRequestHeaders(true),
    body: JSON.stringify({
      targetPath: normalizeTargetPath(targetPath),
      folder1,
      folder2,
      filename,
      contentType,
      fileSize,
      visibility
    })
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.json();
};

export const uploadRemoteFile = async ({
  file,
  targetPath = '',
  folder1,
  folder2,
  visibility = 'published'
}) => {
  if (!(file instanceof File)) {
    throw new Error('uploadRemoteFile expects a File instance');
  }

  const presign = await requestPresignedUpload({
    targetPath,
    folder1,
    folder2,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    fileSize: file.size,
    visibility
  });

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: presign.method || 'PUT',
    headers: presign.headers || {},
    body: file
  });

  if (!uploadResponse.ok) {
    throw new Error(`Remote upload failed: HTTP ${uploadResponse.status}`);
  }

  return presign;
};

const sendRemoteMediaRequest = async (path, { method = 'GET', body } = {}) => {
  const apiBaseUrl = await getRemoteMediaApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('Remote media API base URL is missing');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: buildJsonRequestHeaders(body),
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.json();
};

export const deleteRemoteObject = async ({ key }) => {
  if (!key || typeof key !== 'string') {
    throw new Error('deleteRemoteObject requires a key');
  }

  return sendRemoteMediaRequest('/media/object', {
    method: 'DELETE',
    body: { key }
  });
};

export const createRemoteFolder = async ({ targetPath, visibility = 'published' }) => {
  const normalizedTargetPath = normalizeTargetPath(targetPath);
  if (!normalizedTargetPath) {
    throw new Error('createRemoteFolder requires a targetPath');
  }

  return sendRemoteMediaRequest('/media/folder', {
    method: 'POST',
    body: {
      targetPath: normalizedTargetPath,
      visibility
    }
  });
};

export const renameRemoteFolder = async ({ fromPath, toPath, visibility = 'published' }) => {
  const normalizedFromPath = normalizeTargetPath(fromPath);
  const normalizedToPath = normalizeTargetPath(toPath);
  if (!normalizedFromPath || !normalizedToPath) {
    throw new Error('renameRemoteFolder requires fromPath and toPath');
  }

  return sendRemoteMediaRequest('/media/folder/rename', {
    method: 'POST',
    body: {
      fromPath: normalizedFromPath,
      toPath: normalizedToPath,
      visibility
    }
  });
};

export const loadRemoteMediaManifest = async () => {
  const apiBaseUrl = await getRemoteMediaApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('Remote media API base URL is missing');
  }

  const response = await fetch(`${apiBaseUrl}/media/manifest`, {
    method: 'GET',
    headers: buildJsonRequestHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.json();
};

export const publishRemoteObject = async ({ key, visibility = 'published' }) => {
  if (!key || typeof key !== 'string') {
    throw new Error('publishRemoteObject requires a key');
  }

  return sendRemoteMediaRequest('/media/publish', {
    method: 'POST',
    body: { key, visibility }
  });
};
