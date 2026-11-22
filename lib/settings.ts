import { db, schema } from './db';
import { eq, and } from 'drizzle-orm';
import { env } from './config';
import { PolicyProfile } from './core/policy';

export interface SandboxConfig {
  profile: PolicyProfile;
  today: string;
  dropAfterCoreCommit: boolean;
  coreDown: boolean;
}

export async function getSandboxSettings(sandboxId: string): Promise<SandboxConfig> {
  const defaults: SandboxConfig = {
    profile: env.DEFAULT_PROFILE,
    today: env.DEFAULT_TODAY,
    dropAfterCoreCommit: false,
    coreDown: false,
  };

  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.sandboxId, sandboxId));

    for (const row of rows) {
      if (row.key === 'profile') {
        defaults.profile = row.value === 'reference' ? 'reference' : 'training';
      } else if (row.key === 'today') {
        defaults.today = row.value;
      } else if (row.key === 'dropAfterCoreCommit') {
        defaults.dropAfterCoreCommit = row.value === 'true';
      } else if (row.key === 'coreDown') {
        defaults.coreDown = row.value === 'true';
      }
    }
  } catch {
    // If settings table not queried or connection failing, use defaults
  }

  return defaults;
}

export async function setSandboxSetting(
  sandboxId: string,
  key: string,
  value: string
): Promise<void> {
  await db
    .insert(schema.settings)
    .values({
      sandboxId,
      key,
      value,
    })
    .onConflictDoUpdate({
      target: [schema.settings.sandboxId, schema.settings.key],
      set: { value },
    });
}

export async function setSandboxSettings(
  sandboxId: string,
  updates: Partial<SandboxConfig>
): Promise<void> {
  const promises: Promise<void>[] = [];
  if (updates.profile !== undefined) {
    promises.push(setSandboxSetting(sandboxId, 'profile', updates.profile));
  }
  if (updates.today !== undefined) {
    promises.push(setSandboxSetting(sandboxId, 'today', updates.today));
  }
  if (updates.dropAfterCoreCommit !== undefined) {
    promises.push(
      setSandboxSetting(sandboxId, 'dropAfterCoreCommit', updates.dropAfterCoreCommit ? 'true' : 'false')
    );
  }
  if (updates.coreDown !== undefined) {
    promises.push(setSandboxSetting(sandboxId, 'coreDown', updates.coreDown ? 'true' : 'false'));
  }
  await Promise.all(promises);
}
