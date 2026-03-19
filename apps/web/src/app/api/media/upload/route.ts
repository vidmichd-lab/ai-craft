import { NextResponse } from 'next/server';
import { requestPresignedUpload } from '@/server/media-api/client';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder1 = String(formData.get('folder1') || '').trim();
    const folder2 = String(formData.get('folder2') || '').trim();

    if (!(file instanceof File) || !folder1 || !folder2) {
      return NextResponse.json({ error: 'file, folder1 and folder2 are required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Presign response is invalid' }, { status: 502 });
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
      return NextResponse.json({ error: `Upload failed: HTTP ${uploadResponse.status}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, uploaded: uploadPayload });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Media upload failed' },
      { status }
    );
  }
}
