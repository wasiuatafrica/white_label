export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { ensureLocalSchema, localPgliteDataDir } = await import('./db');
  const dataDir = localPgliteDataDir();
  if (dataDir) {
    console.info(`[db] Using PGlite at ${dataDir}`);
  }
  await ensureLocalSchema();
}
