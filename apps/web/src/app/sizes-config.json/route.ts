import { serveLegacyFile } from '@/server/legacy-files';

export async function GET() {
  return serveLegacyFile('sizes-config.json');
}
