import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';
import { env } from '../lib/config';

export async function seedSandbox(sandboxId: string, sandboxName = 'Sandbox Mặc định'): Promise<void> {
  // 1. Ensure sandbox record exists
  await db
    .insert(schema.sandboxes)
    .values({
      id: sandboxId,
      code: sandboxId,
      name: sandboxName,
    })
    .onConflictDoNothing();

  // 2. Clear old data for this sandbox
  await db.delete(schema.customers).where(eq(schema.customers.sandboxId, sandboxId));
  await db.delete(schema.accounts).where(eq(schema.accounts.sandboxId, sandboxId));
  await db.delete(schema.onboardingSessions).where(eq(schema.onboardingSessions.sandboxId, sandboxId));
  await db.delete(schema.phoneLocks).where(eq(schema.phoneLocks.sandboxId, sandboxId));
  await db.delete(schema.smsOutbox).where(eq(schema.smsOutbox.sandboxId, sandboxId));
  await db.delete(schema.apiLogs).where(eq(schema.apiLogs.sandboxId, sandboxId));
  await db.delete(schema.settings).where(eq(schema.settings.sandboxId, sandboxId));

  // 3. Reset sandbox settings
  await db.insert(schema.settings).values([
    { sandboxId, key: 'profile', value: env.DEFAULT_PROFILE },
    { sandboxId, key: 'today', value: env.DEFAULT_TODAY },
    { sandboxId, key: 'dropAfterCoreCommit', value: 'false' },
    { sandboxId, key: 'coreDown', value: 'false' },
  ]);

  // 4. Seed 3 existing customers (one owns phone 0911111111, one owns CCCD 001090000003)
  await db.insert(schema.customers).values([
    {
      sandboxId,
      cifNumber: '88001001',
      idNumber: '001088000001',
      fullName: 'NGUYEN HOANG NAM',
      dob: '1988-10-10',
      expiryDate: '2038-10-10',
      phoneNumber: '0911111111',
      email: 'nam.nh@example.com',
      address: '123 Pho Hue, Hai Ba Trung, Ha Noi',
      passwordHash: 'dummy_hash_1',
    },
    {
      sandboxId,
      cifNumber: '88001002',
      idNumber: '001090000003', // Persona P06
      fullName: 'HOANG VAN GIANG',
      dob: '1990-03-03',
      expiryDate: '2030-03-03',
      phoneNumber: '0922222222',
      email: 'giang.hv@example.com',
      address: '456 Le Duan, Da Nang',
      passwordHash: 'dummy_hash_2',
    },
    {
      sandboxId,
      cifNumber: '88001003',
      idNumber: '079095000005',
      fullName: 'TRAN THI MAI',
      dob: '1995-12-12',
      expiryDate: '2035-12-12',
      phoneNumber: '0933333333',
      email: 'mai.tt@example.com',
      address: '789 Nguyen Hue, Quan 1, TP Ho Chi Minh',
      passwordHash: 'dummy_hash_3',
    },
  ]);

  // 5. Seed 3 active CASA accounts
  await db.insert(schema.accounts).values([
    {
      sandboxId,
      accountNumber: '1903000000001',
      cifNumber: '88001001',
      product: 'CASA',
      status: 'ACTIVE',
      balance: 5000000,
    },
    {
      sandboxId,
      accountNumber: '1903000000002',
      cifNumber: '88001002',
      product: 'CASA',
      status: 'ACTIVE',
      balance: 12500000,
    },
    {
      sandboxId,
      accountNumber: '1903000000003',
      cifNumber: '88001003',
      product: 'CASA',
      status: 'ACTIVE',
      balance: 50000000,
    },
  ]);
}

// When executed directly via `npm run db:reset` or `tsx db/seed.ts`
if (require.main === module) {
  (async () => {
    try {
      console.log('Seeding DEMO01 sandbox...');
      await seedSandbox('DEMO01', 'Demo Sandbox (Khóa học)');
      console.log('✓ Seeding complete.');
      process.exit(0);
    } catch (err) {
      console.error('Seeding failed:', err);
      process.exit(1);
    }
  })();
}
