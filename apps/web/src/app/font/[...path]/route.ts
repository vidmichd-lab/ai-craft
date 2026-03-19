import { serveLegacyFile } from '@/server/legacy-files';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return serveLegacyFile(`font/${path.join('/')}`);
}
