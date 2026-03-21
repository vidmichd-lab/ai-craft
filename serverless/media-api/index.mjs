import { randomUUID } from 'node:crypto';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REQUIRED_ENV_VARS = ['MEDIA_BUCKET'];
const DEFAULT_ALLOWED_ORIGINS = [
  'https://aicrafter.ru',
  'https://www.aicrafter.ru',
  'https://ai-craft.website.yandexcloud.net',
  'https://bbatcmo4t42t8vmcrqka.containers.yandexcloud.net',
  'http://localhost:8000',
  'http://localhost:8001'
];
const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/webp',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'font/woff2'
];
const DEFAULT_URL_TTL_SECONDS = 900;
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_MANIFEST_ITEMS = 500;
const LIST_PAGE_SIZE = 200;
const INSECURE_DEFAULT_MUTATION_TOKEN = 'change-me-media-token';

const getEnv = (name, fallback = '') => {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const splitCsv = (value, fallback = []) => {
  if (!value) return [...fallback];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const ensureTrailingSlash = (value) => {
  if (!value) return '';
  return value.endsWith('/') ? value : `${value}/`;
};

const config = {
  mediaBucket: getEnv('MEDIA_BUCKET'),
  mediaPublicPrefix: ensureTrailingSlash(getEnv('MEDIA_PUBLIC_PREFIX', 'published/')),
  mediaDraftPrefix: ensureTrailingSlash(getEnv('MEDIA_DRAFT_PREFIX', 'drafts/')),
  mediaUrlTtlSeconds: Number.parseInt(getEnv('MEDIA_URL_TTL_SECONDS', String(DEFAULT_URL_TTL_SECONDS)), 10) || DEFAULT_URL_TTL_SECONDS,
  mediaSignedGets: getEnv('MEDIA_SIGNED_GETS', 'true').toLowerCase() !== 'false',
  mediaPublicBaseUrl: getEnv('MEDIA_PUBLIC_BASE_URL'),
  allowedOrigins: splitCsv(getEnv('MEDIA_ALLOWED_ORIGINS'), DEFAULT_ALLOWED_ORIGINS),
  allowedMimeTypes: splitCsv(getEnv('MEDIA_ALLOWED_MIME_TYPES'), DEFAULT_ALLOWED_MIME_TYPES),
  maxFileSizeBytes: Number.parseInt(getEnv('MEDIA_MAX_FILE_SIZE_BYTES', String(DEFAULT_MAX_FILE_SIZE_BYTES)), 10) || DEFAULT_MAX_FILE_SIZE_BYTES,
  mutationToken: getEnv('MEDIA_MUTATION_TOKEN', ''),
  s3Endpoint: getEnv('S3_ENDPOINT', 'https://storage.yandexcloud.net'),
  region: getEnv('AWS_REGION', 'ru-central1')
};

const client = new S3Client({
  region: config.region,
  endpoint: config.s3Endpoint
});

const inferOrigin = (event) => {
  const headers = event?.headers || {};
  return headers.origin || headers.Origin || '';
};

const resolveCorsOrigin = (origin) => {
  if (!origin) return config.allowedOrigins[0] || '*';
  if (config.allowedOrigins.includes('*')) return '*';
  return config.allowedOrigins.includes(origin) ? origin : config.allowedOrigins[0] || '*';
};

const buildHeaders = (origin, extra = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Media-Api-Token',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Max-Age': '3600',
  ...extra
});

const json = (statusCode, payload, origin, extraHeaders = {}) => ({
  statusCode,
  headers: buildHeaders(origin, extraHeaders),
  body: JSON.stringify(payload)
});

const toErrorBody = (message, details = {}) => ({
  ok: false,
  error: message,
  ...details
});

const ensureEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((name) => !getEnv(name));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

const isProductionRuntime = () => getEnv('NODE_ENV', 'development') === 'production';

const ensureSecureMutationConfig = () => {
  if (!isProductionRuntime()) return;
  if (!config.mutationToken || config.mutationToken === INSECURE_DEFAULT_MUTATION_TOKEN) {
    throw new Error('MEDIA_MUTATION_TOKEN must be configured for mutation routes in production');
  }
};

const parseBody = (event) => {
  if (!event?.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  if (!raw) return {};
  return JSON.parse(raw);
};

const sanitizeSegment = (value, { allowDots = false } = {}) => {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input) return '';

  const pattern = allowDots ? /[^a-zA-Z0-9._-]+/g : /[^a-zA-Z0-9_-]+/g;
  return input
    .replace(pattern, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
};

const normalizeLogicalPath = (value) => {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input) return [];

  return input
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) => sanitizeSegment(segment, { allowDots: false }))
    .filter(Boolean);
};

const splitFileName = (value) => {
  const original = typeof value === 'string' ? value.trim() : '';
  if (!original) {
    return { basename: '', extension: '' };
  }

  const parts = original.split('.');
  if (parts.length === 1) {
    return {
      basename: sanitizeSegment(parts[0], { allowDots: false }),
      extension: ''
    };
  }

  const extension = sanitizeSegment(parts.pop(), { allowDots: false });
  const basename = sanitizeSegment(parts.join('.'), { allowDots: false });
  return { basename, extension };
};

const resolveTargetParts = ({ targetPath = '', folder1 = '', folder2 = '' } = {}) => {
  const targetParts = normalizeLogicalPath(targetPath);
  if (targetParts.length > 0) {
    if (targetParts[0] === 'logo' || targetParts[0] === 'font') {
      return targetParts;
    }
    if (targetParts[0] === 'assets') {
      return targetParts.length > 1 ? targetParts.slice(1) : ['assets'];
    }
    return targetParts;
  }

  const root = sanitizeSegment(folder1);
  const nested = sanitizeSegment(folder2);
  return [root, nested].filter(Boolean);
};

const buildObjectKey = ({ visibility, targetParts, filename }) => {
  const prefix = visibility === 'published' ? config.mediaPublicPrefix : config.mediaDraftPrefix;
  return `${prefix}${[...targetParts, filename].join('/')}`;
};

const detectVisibilityFromKey = (key) => {
  if (typeof key !== 'string') return null;
  if (key.startsWith(config.mediaPublicPrefix)) return 'published';
  if (key.startsWith(config.mediaDraftPrefix)) return 'draft';
  return null;
};

const parseObjectKey = (key, prefix) => {
  if (!key.startsWith(prefix)) return null;

  const relativePath = key.slice(prefix.length);
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const [rootName, ...rest] = parts;
  const fileName = rest[rest.length - 1];
  const nestedSegments = rest.slice(0, -1);

  return {
    rootName,
    folder1: rootName,
    folder2: nestedSegments[0] || '',
    nestedSegments,
    fileName,
    key,
    relativePath
  };
};

const inferMutationToken = (event) => {
  const headers = event?.headers || {};
  const direct = headers['x-media-api-token'] || headers['X-Media-Api-Token'] || '';
  if (direct) return String(direct).trim();

  const authorization = headers.authorization || headers.Authorization || '';
  const [scheme, token] = String(authorization).split(/\s+/, 2);
  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token.trim();
  }

  return '';
};

const authorizeMutation = (event, origin) => {
  ensureSecureMutationConfig();

  if (!config.mutationToken) {
    return null;
  }

  const token = inferMutationToken(event);
  if (!token) {
    return json(401, toErrorBody('Mutation token is required'), origin);
  }
  if (token !== config.mutationToken) {
    return json(403, toErrorBody('Invalid mutation token'), origin);
  }

  return null;
};

const inferDisplayName = (fileName) => {
  const base = fileName.replace(/\.[^.]+$/, '');
  const bgParts = base.split(', ');
  if (bgParts.length > 1) {
    const shape = bgParts[0]?.split('=')[1] || '';
    const inside = bgParts[1]?.split('=')[1] || '';
    const theme = bgParts[2]?.split('=')[1] || '';
    return `${shape} ${inside} ${theme}`.trim() || base;
  }
  return base;
};

const maybeBuildPublicUrl = (key) => {
  if (!config.mediaPublicBaseUrl) return '';
  try {
    return new URL(key, ensureTrailingSlash(config.mediaPublicBaseUrl)).href;
  } catch {
    return '';
  }
};

const createSignedGetUrl = async (key) => {
  if (config.mediaSignedGets) {
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.mediaBucket,
        Key: key
      }),
      { expiresIn: config.mediaUrlTtlSeconds }
    );
  }

  return maybeBuildPublicUrl(key);
};

const listPublishedObjects = async ({ folder1Filter = '', folder2Filter = '' } = {}) => {
  const result = [];
  let continuationToken;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.mediaBucket,
      Prefix: config.mediaPublicPrefix,
      ContinuationToken: continuationToken,
      MaxKeys: LIST_PAGE_SIZE
    }));

    const contents = Array.isArray(response.Contents) ? response.Contents : [];
    for (const object of contents) {
      if (!object.Key || object.Key.endsWith('/')) continue;

      const parsed = parseObjectKey(object.Key, config.mediaPublicPrefix);
      if (!parsed) continue;
      if (folder1Filter && parsed.folder1 !== folder1Filter) continue;
      if (folder2Filter && parsed.folder2 !== folder2Filter) continue;

      result.push(object);
      if (result.length >= MAX_MANIFEST_ITEMS) {
        return result;
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return result;
};

const ensureFolderNode = (tree, segments = []) => {
  let current = tree;
  segments.forEach((segment) => {
    if (!current[segment] || typeof current[segment] !== 'object' || Array.isArray(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  });
  if (!Array.isArray(current.__files)) {
    current.__files = [];
  }
  return current;
};

const sortManifestTree = (node) => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;

  if (Array.isArray(node.__files)) {
    node.__files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }

  Object.entries(node).forEach(([key, value]) => {
    if (key === '__files') return;
    sortManifestTree(value);
  });
};

const buildManifest = async ({ rootFilter = '', firstNestedFilter = '' } = {}) => {
  const objects = await listPublishedObjects();
  const assets = {};

  for (const object of objects) {
    const parsed = parseObjectKey(object.Key, config.mediaPublicPrefix);
    if (!parsed) continue;
    if (rootFilter && parsed.rootName !== rootFilter) continue;
    if (firstNestedFilter && parsed.nestedSegments[0] !== firstNestedFilter) continue;

    if (!assets[parsed.rootName] || typeof assets[parsed.rootName] !== 'object' || Array.isArray(assets[parsed.rootName])) {
      assets[parsed.rootName] = {};
    }

    const targetNode = ensureFolderNode(assets[parsed.rootName], parsed.nestedSegments);
    if (parsed.fileName === '.keep') {
      continue;
    }

    const fileUrl = await createSignedGetUrl(object.Key);
    if (!fileUrl) continue;

    targetNode.__files.push({
      name: inferDisplayName(parsed.fileName),
      file: fileUrl,
      size: object.Size || 0,
      etag: object.ETag ? object.ETag.replace(/"/g, '') : '',
      lastModified: object.LastModified ? new Date(object.LastModified).toISOString() : null,
      key: object.Key
    });
  }

  Object.values(assets).forEach((rootNode) => sortManifestTree(rootNode));

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    expiresIn: config.mediaUrlTtlSeconds,
    assets
  };
};

const buildMetadata = ({ rootName, nestedPath, originalFilename, requestId }) => ({
  rootName,
  nestedPath,
  originalFilename,
  requestId
});

const handleManifest = async (event, origin) => {
  const params = event?.queryStringParameters || {};
  const rootFilter = sanitizeSegment(params.folder1 || params.root || '');
  const firstNestedFilter = sanitizeSegment(params.folder2 || params.folder || '');
  const payload = await buildManifest({ rootFilter, firstNestedFilter });
  return json(200, payload, origin);
};

const assertAllowedMimeType = (contentType) => {
  if (!contentType || !config.allowedMimeTypes.includes(contentType)) {
    throw new Error(`Unsupported content type: ${contentType || 'unknown'}`);
  }
};

const ensureObjectDoesNotExist = async (key) => {
  try {
    await client.send(new HeadObjectCommand({
      Bucket: config.mediaBucket,
      Key: key
    }));
    return true;
  } catch (error) {
    const statusCode = error?.$metadata?.httpStatusCode;
    if (statusCode === 404) return false;
    if (error?.name === 'NotFound') return false;
    throw error;
  }
};

const ensureManagedObjectKey = (key) => {
  const normalized = typeof key === 'string' ? key.trim() : '';
  const visibility = detectVisibilityFromKey(normalized);

  if (!normalized || !visibility) {
    throw new Error('Unsupported object key');
  }

  return {
    key: normalized,
    visibility
  };
};

const handlePresignUpload = async (event, origin) => {
  const body = parseBody(event);
  const targetParts = resolveTargetParts({
    targetPath: body.targetPath || body.path || '',
    folder1: body.folder1,
    folder2: body.folder2
  });
  const visibility = body.visibility === 'published' ? 'published' : 'draft';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
  const overwrite = body.overwrite === true;
  const maxFileSizeBytes = Number.isFinite(body.maxFileSizeBytes) ? Number(body.maxFileSizeBytes) : config.maxFileSizeBytes;
  const fileSize = Number.isFinite(body.fileSize) ? Number(body.fileSize) : null;

  if (targetParts.length === 0) {
    return json(400, toErrorBody('targetPath is required'), origin);
  }

  assertAllowedMimeType(contentType);

  if (fileSize !== null && fileSize > maxFileSizeBytes) {
    return json(400, toErrorBody('File is too large', {
      maxFileSizeBytes
    }), origin);
  }

  const fileParts = splitFileName(body.filename || '');
  if (!fileParts.basename) {
    return json(400, toErrorBody('filename is required'), origin);
  }

  const safeFilename = fileParts.extension
    ? `${fileParts.basename}.${fileParts.extension}`
    : fileParts.basename;
  const objectKey = buildObjectKey({
    visibility,
    targetParts,
    filename: safeFilename
  });

  if (!overwrite) {
    const exists = await ensureObjectDoesNotExist(objectKey);
    if (exists) {
      return json(409, toErrorBody('Object already exists', { key: objectKey }), origin);
    }
  }

  const requestId = randomUUID();
  const metadata = buildMetadata({
    rootName: targetParts[0] || '',
    nestedPath: targetParts.slice(1).join('/'),
    originalFilename: typeof body.filename === 'string' ? body.filename.trim() : safeFilename,
    requestId
  });

  const signedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.mediaBucket,
      Key: objectKey,
      ContentType: contentType,
      Metadata: metadata
    }),
    { expiresIn: config.mediaUrlTtlSeconds }
  );

  return json(200, {
    ok: true,
    method: 'PUT',
    uploadUrl: signedUrl,
    key: objectKey,
    headers: {
      'Content-Type': contentType
    },
    expiresIn: config.mediaUrlTtlSeconds,
    visibility,
    maxFileSizeBytes
  }, origin);
};

const buildFolderPrefix = ({ visibility, targetParts }) => {
  const prefix = visibility === 'published' ? config.mediaPublicPrefix : config.mediaDraftPrefix;
  return `${prefix}${targetParts.join('/')}/`;
};

const listManagedObjectsByPrefix = async (prefix) => {
  const result = [];
  let continuationToken;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.mediaBucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: LIST_PAGE_SIZE
    }));

    const contents = Array.isArray(response.Contents) ? response.Contents : [];
    result.push(...contents.filter((item) => item?.Key));
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return result;
};

const handleCreateFolder = async (event, origin) => {
  const body = parseBody(event);
  const visibility = body.visibility === 'draft' ? 'draft' : 'published';
  const targetParts = resolveTargetParts({
    targetPath: body.targetPath || body.path || '',
    folder1: body.folder1,
    folder2: body.folder2
  });

  if (targetParts.length === 0) {
    return json(400, toErrorBody('targetPath is required'), origin);
  }

  const objectKey = `${buildFolderPrefix({ visibility, targetParts })}.keep`;
  await client.send(new PutObjectCommand({
    Bucket: config.mediaBucket,
    Key: objectKey,
    Body: '',
    ContentType: 'application/octet-stream'
  }));

  return json(200, {
    ok: true,
    key: objectKey,
    folder: targetParts.join('/'),
    visibility
  }, origin);
};

const handleRenameFolder = async (event, origin) => {
  const body = parseBody(event);
  const visibility = body.visibility === 'draft' ? 'draft' : 'published';
  const fromParts = resolveTargetParts({ targetPath: body.fromPath || '' });
  const toParts = resolveTargetParts({ targetPath: body.toPath || '' });

  if (fromParts.length === 0 || toParts.length === 0) {
    return json(400, toErrorBody('fromPath and toPath are required'), origin);
  }

  const sourcePrefix = buildFolderPrefix({ visibility, targetParts: fromParts });
  const destinationPrefix = buildFolderPrefix({ visibility, targetParts: toParts });
  const objects = await listManagedObjectsByPrefix(sourcePrefix);

  if (objects.length === 0) {
    return json(404, toErrorBody('Folder not found', { fromPath: fromParts.join('/') }), origin);
  }

  for (const object of objects) {
    const sourceKey = object.Key;
    const relativePath = sourceKey.slice(sourcePrefix.length);
    const destinationKey = `${destinationPrefix}${relativePath}`;

    await client.send(new CopyObjectCommand({
      Bucket: config.mediaBucket,
      CopySource: `${config.mediaBucket}/${sourceKey}`,
      Key: destinationKey
    }));

    await client.send(new DeleteObjectCommand({
      Bucket: config.mediaBucket,
      Key: sourceKey
    }));
  }

  return json(200, {
    ok: true,
    renamed: true,
    fromPath: fromParts.join('/'),
    toPath: toParts.join('/')
  }, origin);
};

const handleDeleteObject = async (event, origin) => {
  const body = parseBody(event);
  const managed = ensureManagedObjectKey(body.key);

  await client.send(new DeleteObjectCommand({
    Bucket: config.mediaBucket,
    Key: managed.key
  }));

  return json(200, {
    ok: true,
    deleted: true,
    key: managed.key,
    visibility: managed.visibility
  }, origin);
};

const swapObjectVisibility = (key, targetVisibility) => {
  const currentVisibility = detectVisibilityFromKey(key);
  if (!currentVisibility) {
    throw new Error('Unsupported object key');
  }

  if (currentVisibility === targetVisibility) {
    return { sourceKey: key, destinationKey: key, changed: false };
  }

  const currentPrefix = currentVisibility === 'published' ? config.mediaPublicPrefix : config.mediaDraftPrefix;
  const targetPrefix = targetVisibility === 'published' ? config.mediaPublicPrefix : config.mediaDraftPrefix;
  const relativePath = key.slice(currentPrefix.length);

  return {
    sourceKey: key,
    destinationKey: `${targetPrefix}${relativePath}`,
    changed: true
  };
};

const handlePublishObject = async (event, origin) => {
  const body = parseBody(event);
  const targetVisibility = body.visibility === 'draft' ? 'draft' : 'published';
  const managed = ensureManagedObjectKey(body.key);
  const move = swapObjectVisibility(managed.key, targetVisibility);

  if (move.changed) {
    await client.send(new CopyObjectCommand({
      Bucket: config.mediaBucket,
      CopySource: `${config.mediaBucket}/${move.sourceKey}`,
      Key: move.destinationKey
    }));

    await client.send(new DeleteObjectCommand({
      Bucket: config.mediaBucket,
      Key: move.sourceKey
    }));
  }

  return json(200, {
    ok: true,
    key: move.destinationKey,
    previousKey: move.sourceKey,
    visibility: targetVisibility,
    changed: move.changed
  }, origin);
};

const normalizePath = (event) => {
  const rawPath = event?.path || event?.rawPath || '/';
  return rawPath.replace(/\/+$/, '') || '/';
};

export const handler = async (event = {}) => {
  const origin = inferOrigin(event);

  try {
    ensureEnv();

    const method = (event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase();
    const path = normalizePath(event);

    if (method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: buildHeaders(origin),
        body: ''
      };
    }

    if (method === 'GET' && (path.endsWith('/media/manifest') || path === '/media/manifest')) {
      return await handleManifest(event, origin);
    }

    if (method === 'POST' && (path.endsWith('/media/presign-upload') || path === '/media/presign-upload')) {
      const authError = authorizeMutation(event, origin);
      if (authError) return authError;
      return await handlePresignUpload(event, origin);
    }

    if (method === 'POST' && (path.endsWith('/media/folder') || path === '/media/folder')) {
      const authError = authorizeMutation(event, origin);
      if (authError) return authError;
      return await handleCreateFolder(event, origin);
    }

    if (method === 'POST' && (path.endsWith('/media/folder/rename') || path === '/media/folder/rename')) {
      const authError = authorizeMutation(event, origin);
      if (authError) return authError;
      return await handleRenameFolder(event, origin);
    }

    if (method === 'DELETE' && (path.endsWith('/media/object') || path === '/media/object')) {
      const authError = authorizeMutation(event, origin);
      if (authError) return authError;
      return await handleDeleteObject(event, origin);
    }

    if (method === 'POST' && (path.endsWith('/media/publish') || path === '/media/publish')) {
      const authError = authorizeMutation(event, origin);
      if (authError) return authError;
      return await handlePublishObject(event, origin);
    }

    return json(404, toErrorBody('Route not found', { method, path }), origin);
  } catch (error) {
    console.error('media-api failure', error);
    return json(500, toErrorBody('Internal server error', {
      message: error instanceof Error ? error.message : String(error)
    }), origin);
  }
};

export const __private__ = {
  authorizeMutation,
  ensureSecureMutationConfig,
  inferMutationToken,
  parseObjectKey
};
