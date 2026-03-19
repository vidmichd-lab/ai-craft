import { NextResponse } from 'next/server';
import { env } from '@/server/env';

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'ai-craft-web',
    environment: env.NODE_ENV
  });
}
