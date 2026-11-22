import { describe, it, expect, beforeAll } from 'vitest';
import { seedSandbox } from '@/db/seed';
import { getSandboxSettings, setSandboxSettings } from '@/lib/settings';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

describe('Database Layer and Sandbox Isolation', () => {
  const TEST_SANDBOX_A = 'TEST_A';
  const TEST_SANDBOX_B = 'TEST_B';

  beforeAll(async () => {
    await seedSandbox(TEST_SANDBOX_A, 'Test Sandbox A');
    await seedSandbox(TEST_SANDBOX_B, 'Test Sandbox B');
  });

  it('seeds 3 existing customers for a sandbox', async () => {
    const customersA = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.sandboxId, TEST_SANDBOX_A));

    expect(customersA.length).toBe(3);

    const phoneOwner = customersA.find((c: any) => c.phoneNumber === '0911111111');
    expect(phoneOwner).toBeDefined();

    const cccdOwner = customersA.find((c: any) => c.idNumber === '001090000003');
    expect(cccdOwner).toBeDefined();
    expect(cccdOwner?.fullName).toBe('HOANG VAN GIANG');
  });

  it('keeps data isolated between sandboxes', async () => {
    // Modify sandbox A setting
    await setSandboxSettings(TEST_SANDBOX_A, {
      profile: 'reference',
      today: '2026-12-01',
      dropAfterCoreCommit: true,
      coreDown: false,
    });

    const settingsA = await getSandboxSettings(TEST_SANDBOX_A);
    const settingsB = await getSandboxSettings(TEST_SANDBOX_B);

    expect(settingsA.profile).toBe('reference');
    expect(settingsA.today).toBe('2026-12-01');
    expect(settingsA.dropAfterCoreCommit).toBe(true);

    // Sandbox B must remain unchanged
    expect(settingsB.profile).toBe('training');
    expect(settingsB.today).toBe('2026-11-23');
    expect(settingsB.dropAfterCoreCommit).toBe(false);
  });
});
