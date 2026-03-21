import { z } from 'zod';
import { requireWorkspaceRoleSession } from '@/server/auth/request-session';
import { requestPresignedUpload } from '@/server/media-api/client';
import { createRequestContext } from '@/server/http/request-context';
import { jsonResponse, toRouteErrorResponse } from '@/server/http/response';

const folderSchema = z.string().trim().regex(/^[a-z0-9_-]{1,80}$/i, 'Invalid folder segment');
const allowedMimeTypes = new Set([
  'image/webp',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'font/woff2'
]);
const maxFileSizeBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const session = await requireWorkspaceRoleSession(request, ['admin', 'lead'], context);
    if (!session.ok) return session.response;

    const formData = await request.formData();
    const file = formData.get('file');
    const folder1 = folderSchema.parse(formData.get('folder1'));
    const folder2 = folderSchema.parse(formData.get('folder2'));

    if (!(file instanceof File) || !folder1 || !folder2) {
      return jsonResponse(
        { error: 'file, folder1 and folder2 are required', errorCode: 'REQUEST_ERROR', requestId: context.requestId },
        context,
        { status: 400 }
      );
    }
    if (!allowedMimeTypes.has(file.type || '')) {
      return jsonResponse(
        { error: 'Unsupported content type', errorCode: 'REQUEST_ERROR', requestId: context.requestId },
        context,
        { status: 400 }
      );
    }
    if (file.size > maxFileSizeBytes) {
      return jsonResponse(
        {
          error: 'File is too large',
          errorCode: 'REQUEST_ERROR',
          requestId: context.requestId,
          maxFileSizeBytes
        },
        context,
        { status: 400 }
      );
    }

    const presign = await requestPresignedUpload({
      folder1,
      folder2,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      visibility: 'published'
    });

    if (!presign || typeof presign !== 'object' || !('uploadUrl' in presign)) {
      return jsonResponse(
        { error: 'Presign response is invalid', errorCode: 'UPSTREAM_ERROR', requestId: context.requestId },
        context,
        { status: 502 }
      );
    }

    const uploadPayload = presign as {
      key?: string;
      visibility?: string;
      uploadUrl?: string;
      method?: string;
      headers?: HeadersInit;
    };

    const uploadResponse = await fetch(String(uploadPayload.uploadUrl || ''), {
      method: String(uploadPayload.method || 'PUT'),
      headers: uploadPayload.headers || {},
      body: file
    });

    if (!uploadResponse.ok) {
      return jsonResponse(
        {
          error: `Upload failed: HTTP ${uploadResponse.status}`,
          errorCode: 'UPSTREAM_ERROR',
          requestId: context.requestId
        },
        context,
        { status: 502 }
      );
    }

    return jsonResponse(
      {
        ok: true,
        uploaded: {
          key: uploadPayload.key || '',
          visibility: uploadPayload.visibility || 'published',
          name: file.name,
          size: file.size,
          folder1,
          folder2
        }
      },
      context
    );
  } catch (error) {
    return toRouteErrorResponse(error, 'Media upload failed', context);
  }
}
