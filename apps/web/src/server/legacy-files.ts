import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const REPO_ROOT = path.join(process.cwd(), '../..');

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const sanitizeRelativePath = (relativePath: string) => {
  const normalized = relativePath.replace(/^\/+/, '');
  if (!normalized || normalized.includes('\0')) {
    throw new Error('Invalid legacy path');
  }

  const resolved = path.normalize(normalized);
  if (resolved.startsWith('..')) {
    throw new Error('Path traversal is not allowed');
  }

  return resolved;
};

const getContentType = (filePath: string) => CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

export const serveLegacyFile = async (relativePath: string, options?: { injectLegacyHtmlShell?: boolean }) => {
  try {
    const safePath = sanitizeRelativePath(relativePath);
    const absolutePath = path.join(REPO_ROOT, safePath);

    if (options?.injectLegacyHtmlShell && safePath === 'index.html') {
      const html = await readFile(absolutePath, 'utf8');
      const injected = html.replace(
        '<head>',
        `<head><base href="/"><script>window.__DISABLE_SW__=true;window.__LEGACY_EMBEDDED__=true;</script>`
      );
      return new NextResponse(injected, {
        headers: {
          'Content-Type': getContentType(absolutePath),
          'Cache-Control': 'no-store'
        }
      });
    }

    const file = await readFile(absolutePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': getContentType(absolutePath),
        'Cache-Control': safePath.endsWith('.html') ? 'no-store' : 'public, max-age=300'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Legacy file not found' }, { status: 404 });
  }
};
