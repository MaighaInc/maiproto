/**
 * Prisma seed — provisions a default tenant, organization, roles, permissions
 * and an admin user for local development.
 *
 * Usage: npm run db:seed  (from packages/database)
 */

import { PrismaClient, SubscriptionPlan } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await (scryptAsync as unknown as (p: string, s: string, len: number, opts: object) => Promise<Buffer>)(password, salt, 64, SCRYPT_PARAMS));
  return `${salt}:${derivedKey.toString('hex')}`;
}

const SYSTEM_PERMISSIONS: Array<{ resource: string; action: string; description: string }> = [
  // Receipts
  { resource: 'receipts', action: 'create', description: 'Upload receipts' },
  { resource: 'receipts', action: 'read', description: 'View receipts' },
  { resource: 'receipts', action: 'update', description: 'Edit receipts' },
  { resource: 'receipts', action: 'delete', description: 'Delete receipts' },
  { resource: 'receipts', action: 'export', description: 'Export receipts' },
  { resource: 'receipts', action: 'approve', description: 'Approve receipts' },
  // Vendors
  { resource: 'vendors', action: 'create', description: 'Create vendors' },
  { resource: 'vendors', action: 'read', description: 'View vendors' },
  { resource: 'vendors', action: 'update', description: 'Edit vendors' },
  { resource: 'vendors', action: 'delete', description: 'Delete vendors' },
  // Accounting
  { resource: 'accounting', action: 'read', description: 'View accounting data' },
  { resource: 'accounting', action: 'create', description: 'Create journal entries' },
  { resource: 'accounting', action: 'update', description: 'Edit journal entries' },
  { resource: 'accounting', action: 'post', description: 'Post journal entries' },
  // Reports
  { resource: 'reports', action: 'read', description: 'View reports' },
  { resource: 'reports', action: 'export', description: 'Export reports' },
  // Users
  { resource: 'users', action: 'read', description: 'View users' },
  { resource: 'users', action: 'create', description: 'Invite users' },
  { resource: 'users', action: 'update', description: 'Edit users' },
  { resource: 'users', action: 'delete', description: 'Remove users' },
  // Settings
  { resource: 'settings', action: 'read', description: 'View settings' },
  { resource: 'settings', action: 'update', description: 'Edit settings' },
  // Billing
  { resource: 'billing', action: 'read', description: 'View billing' },
  { resource: 'billing', action: 'update', description: 'Manage billing' },
  // Audit
  { resource: 'audit', action: 'read', description: 'View audit logs' },
];

const SYSTEM_ROLES = [
  {
    name: 'Owner',
    description: 'Full access to all resources',
    permissions: SYSTEM_PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  },
  {
    name: 'Admin',
    description: 'Manage organization settings and users',
    permissions: SYSTEM_PERMISSIONS.filter((p) => p.resource !== 'billing').map(
      (p) => `${p.resource}:${p.action}`,
    ),
  },
  {
    name: 'Accountant',
    description: 'Full access to receipts and accounting',
    permissions: [
      'receipts:create', 'receipts:read', 'receipts:update', 'receipts:delete',
      'receipts:export', 'receipts:approve', 'vendors:create', 'vendors:read',
      'vendors:update', 'accounting:read', 'accounting:create', 'accounting:update',
      'accounting:post', 'reports:read', 'reports:export',
    ],
  },
  {
    name: 'Reviewer',
    description: 'Review and approve receipts',
    permissions: ['receipts:read', 'receipts:approve', 'vendors:read', 'reports:read'],
  },
  {
    name: 'Submitter',
    description: 'Upload and submit receipts for approval',
    permissions: ['receipts:create', 'receipts:read', 'receipts:update', 'vendors:read'],
  },
  {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: ['receipts:read', 'vendors:read', 'reports:read'],
  },
];

const DEFAULT_CHART_OF_ACCOUNTS = [
  // Assets
  { code: '1000', name: 'Cash', type: 'ASSET' as const },
  { code: '1010', name: 'Checking Account', type: 'ASSET' as const },
  { code: '1020', name: 'Savings Account', type: 'ASSET' as const },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET' as const },
  { code: '1500', name: 'Prepaid Expenses', type: 'ASSET' as const },
  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
  { code: '2100', name: 'Credit Cards Payable', type: 'LIABILITY' as const },
  { code: '2200', name: 'Sales Tax Payable', type: 'LIABILITY' as const },
  // Equity
  { code: '3000', name: 'Owner Equity', type: 'EQUITY' as const },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY' as const },
  // Revenue
  { code: '4000', name: 'Revenue', type: 'REVENUE' as const },
  // Expenses
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as const },
  { code: '6000', name: 'Meals & Entertainment', type: 'EXPENSE' as const },
  { code: '6100', name: 'Travel', type: 'EXPENSE' as const },
  { code: '6110', name: 'Airfare', type: 'EXPENSE' as const },
  { code: '6120', name: 'Hotel', type: 'EXPENSE' as const },
  { code: '6130', name: 'Car Rental', type: 'EXPENSE' as const },
  { code: '6200', name: 'Fuel', type: 'EXPENSE' as const },
  { code: '6300', name: 'Office Supplies', type: 'EXPENSE' as const },
  { code: '6400', name: 'Marketing & Advertising', type: 'EXPENSE' as const },
  { code: '6500', name: 'Software & Subscriptions', type: 'EXPENSE' as const },
  { code: '6600', name: 'Insurance', type: 'EXPENSE' as const },
  { code: '6700', name: 'Professional Services', type: 'EXPENSE' as const },
  { code: '6800', name: 'Utilities', type: 'EXPENSE' as const },
  { code: '6900', name: 'Payroll Expense', type: 'EXPENSE' as const },
  { code: '7000', name: 'Depreciation', type: 'EXPENSE' as const },
  { code: '7100', name: 'Interest Expense', type: 'EXPENSE' as const },
  { code: '7200', name: 'Taxes', type: 'EXPENSE' as const },
  { code: '7900', name: 'Miscellaneous Expense', type: 'EXPENSE' as const },
];

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding ReceiptFlow AI...');

  // 1. Permissions
  console.log('  → Upserting permissions...');
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: { description: perm.description },
      create: perm,
    });
  }

  // 2. Tenant
  console.log('  → Creating demo tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Demo Company',
      status: 'ACTIVE',
    },
  });

  // 3. Subscription
  await prisma.subscription.upsert({
    where: { stripeCustomerId: 'demo_stripe_customer' },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      status: 'ACTIVE',
      stripeCustomerId: 'demo_stripe_customer',
      receiptLimit: 10000,
      storageGbLimit: 100,
      userLimit: 25,
      organizationLimit: 5,
    },
  });

  // 4. System roles
  console.log('  → Creating system roles...');
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });

    // Assign permissions to role
    for (const permKey of roleDef.permissions) {
      const [resource, action] = permKey.split(':') as [string, string];
      const perm = await prisma.permission.findUnique({
        where: { resource_action: { resource, action } },
      });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
  }

  // 5. Admin user
  console.log('  → Creating admin user...');
  const adminPasswordHash = await hashPassword('Admin123!');
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.receiptflow.ai' } },
    update: { passwordHash: adminPasswordHash },
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.receiptflow.ai',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE',
    },
  });

  // 6. Organization
  console.log('  → Creating demo organization...');
  const org = await prisma.organization.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'demo-org' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Demo Organization',
      slug: 'demo-org',
      currency: 'USD',
      timezone: 'America/New_York',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  // 7. Link admin to org with Owner role
  const ownerRole = await prisma.role.findFirstOrThrow({
    where: { tenantId: tenant.id, name: 'Owner' },
  });

  const userOrg = await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: org.id } },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: org.id,
      tenantId: tenant.id,
      isDefault: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userOrgId_roleId: { userOrgId: userOrg.id, roleId: ownerRole.id } },
    update: {},
    create: { userOrgId: userOrg.id, roleId: ownerRole.id, grantedBy: adminUser.id },
  });

  // 8. Chart of Accounts
  console.log('  → Seeding chart of accounts...');
  for (const acct of DEFAULT_CHART_OF_ACCOUNTS) {
    await prisma.chartOfAccount.upsert({
      where: { organizationId_code: { organizationId: org.id, code: acct.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        organizationId: org.id,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        isSystem: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }

  // 9. Default expense categories
  console.log('  → Seeding expense categories...');
  const categoryDefs = [
    { name: 'Meals & Entertainment', code: 'MEALS', isTaxDeductible: true },
    { name: 'Travel', code: 'TRAVEL', isTaxDeductible: true },
    { name: 'Fuel', code: 'FUEL', isTaxDeductible: true },
    { name: 'Office Supplies', code: 'OFFICE', isTaxDeductible: true },
    { name: 'Marketing', code: 'MARKETING', isTaxDeductible: true },
    { name: 'Software', code: 'SOFTWARE', isTaxDeductible: true },
    { name: 'Insurance', code: 'INSURANCE', isTaxDeductible: true },
    { name: 'Professional Services', code: 'PROFESSIONAL', isTaxDeductible: true },
    { name: 'Utilities', code: 'UTILITIES', isTaxDeductible: true },
    { name: 'Miscellaneous', code: 'MISC', isTaxDeductible: false },
  ];

  for (const cat of categoryDefs) {
    await prisma.expenseCategory.upsert({
      where: { organizationId_code: { organizationId: org.id, code: cat.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        organizationId: org.id,
        name: cat.name,
        code: cat.code,
        isTaxDeductible: cat.isTaxDeductible,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }

  console.log('✅ Seed completed successfully');
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Demo Credentials
  Email:    admin@demo.receiptflow.ai
  Password: Admin123!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
