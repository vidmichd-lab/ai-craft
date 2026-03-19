import { serveLegacyFile } from '@/server/legacy-files';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const relativePath = path?.length ? path.join('/') : 'index.html';
  return serveLegacyFile(relativePath, { injectLegacyHtmlShell: relativePath === 'index.html' });
}
