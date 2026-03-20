import { getMediaManifest } from '@/server/media-api/client';
import { flattenMediaManifest } from '@/server/media-api/manifest';
import { createRequestContext } from '@/server/http/request-context';
import { jsonResponse, toRouteErrorResponse } from '@/server/http/response';

export async function GET(request: Request) {
  const context = createRequestContext(request);
  try {
    const manifest = await getMediaManifest();
    const groups = flattenMediaManifest(manifest);
    return jsonResponse({ ok: true, groups }, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Media manifest fetch failed', context);
  }
}
