import { cp, stat } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const standaloneDirectory = path.join(projectRoot, '.next', 'standalone');
const standaloneServer = path.join(standaloneDirectory, 'server.js');

async function copyStandaloneStatic() {
  try {
    await stat(standaloneServer);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;

    // Vercel builds do not use Next.js standalone output.
    console.info('Skipping standalone static asset copy: .next/standalone/server.js was not generated.');
    return;
  }

  const staticDirectory = path.join(projectRoot, '.next', 'static');
  const standaloneStaticDirectory = path.join(standaloneDirectory, '.next', 'static');
  await stat(staticDirectory);
  await cp(staticDirectory, standaloneStaticDirectory, { recursive: true, force: true });

  console.info('Copied .next/static into .next/standalone/.next/static.');
}

await copyStandaloneStatic();
