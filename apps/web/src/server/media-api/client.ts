import { env } from '@/server/env';

type JsonRecord = Record<string, unknown>;

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as JsonRecord;
  } catch {
    return null;
  }
};

const normalizeApiBaseUrl = (manifestUrl: string) => {
  const url = new URL(manifestUrl);
  const normalizedPath = url.pathname.replace(/\/media\/manifest\/?$/, '');
  return `${url.origin}${normalizedPath}`;
};

const buildHeaders = (body?: unknown) => ({
  Accept: 'application/json',
  ...(body !== undefined ? { 'Content-Type': 'text/plain;charset=UTF-8' } : {})
});

const requestMediaApi = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${normalizeApiBaseUrl(env.MEDIA_MANIFEST_URL)}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(init.body),
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    const error = new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return payload;
};

export const getMediaManifest = () => fetch(env.MEDIA_MANIFEST_URL, { cache: 'no-store' }).then(async (response) => {
  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
  }
  return payload;
});

export const requestPresignedUpload = (input: {
  folder1: string;
  folder2: string;
  filename: string;
  contentType: string;
  fileSize: number;
  visibility?: 'published' | 'draft';
}) =>
  requestMediaApi('/media/presign-upload', {
    method: 'POST',
    body: JSON.stringify(input)
  });

export const publishRemoteObject = (input: { key: string; visibility: 'published' | 'draft' }) =>
  requestMediaApi('/media/publish', {
    method: 'POST',
    body: JSON.stringify(input)
  });
