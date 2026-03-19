import { NextResponse } from 'next/server';
import { getMediaManifest } from '@/server/media-api/client';
import { flattenMediaManifest } from '@/server/media-api/manifest';

export async function GET() {
  try {
    const manifest = await getMediaManifest();
    const groups = flattenMediaManifest(manifest);
    return NextResponse.json({ ok: true, groups });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Media manifest fetch failed' },
      { status }
    );
  }
}
