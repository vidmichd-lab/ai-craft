import { serveLegacyFile } from '@/server/legacy-files';

export async function GET() {
  return serveLegacyFile('styles.css');
}
