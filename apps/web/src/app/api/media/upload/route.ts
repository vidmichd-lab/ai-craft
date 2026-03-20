import { requestPresignedUpload } from '@/server/media-api/client';
import { createRequestContext } from '@/server/http/request-context';
import { jsonResponse, toRouteErrorResponse } from '@/server/http/response';

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder1 = String(formData.get('folder1') || '').trim();
    const folder2 = String(formData.get('folder2') || '').trim();

    if (!(file instanceof File) || !folder1 || !folder2) {
      return jsonResponse(
        { error: 'file, folder1 and folder2 are required', errorCode: 'REQUEST_ERROR', requestId: context.requestId },
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

    return jsonResponse({ ok: true, uploaded: uploadPayload }, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Media upload failed', context);
  }
}
