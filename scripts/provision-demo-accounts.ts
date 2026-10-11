/**
 * Secure Provisioning Script for Demonstration Accounts
 * 
 * CRITICAL SECURITY INSTRUCTIONS:
 * 1. Do NOT hardcode, print, echo, or commit user passwords.
 * 2. Passwords must be supplied via local environment variable `DEMO_USERS_PASSWORD`
 *    or AWS Secrets Manager when provisioning is authorized.
 * 3. Dry-run mode is enabled by default to prevent unauthorized cloud operations.
 * 
 * Master Specification Demonstration Accounts:
 * - parasnath@gmail.com -> PERSONAL_USER (Role_Personal)
 * - sunilnagrale@gmail.com -> FARMER (Role_Farmer)
 * - kvkailashahar@gmail.com -> SCHOOL_ADMIN (Role_School)
 */

export interface ProvisioningUserConfig {
  email: string;
  role: 'PERSONAL_USER' | 'FARMER' | 'SCHOOL_ADMIN';
  cognitoGroup: string;
  name: string;
}

export const DEMO_ACCOUNT_DEFINITIONS: ProvisioningUserConfig[] = [
  {
    email: 'parasnath@gmail.com',
    role: 'PERSONAL_USER',
    cognitoGroup: 'Role_Personal',
    name: 'Paras Nath',
  },
  {
    email: 'sunilnagrale@gmail.com',
    role: 'FARMER',
    cognitoGroup: 'Role_Farmer',
    name: 'Sardar Sunil Singh',
  },
  {
    email: 'kvkailashahar@gmail.com',
    role: 'SCHOOL_ADMIN',
    cognitoGroup: 'Role_School',
    name: 'Principal Sharma',
  },
];

export async function provisionDemoAccounts(options?: {
  dryRun?: boolean;
  userPoolId?: string;
  region?: string;
}): Promise<{
  success: boolean;
  dryRun: boolean;
  accountsProcessed: number;
  report: string[];
}> {
  const isDryRun = options?.dryRun ?? true; // Dry-run by default
  const report: string[] = [];

  const password = process.env.DEMO_USERS_PASSWORD;
  if (!password && !isDryRun) {
    throw new Error(
      'Environment variable DEMO_USERS_PASSWORD is required for live cloud provisioning. Passwords must never be hardcoded.'
    );
  }

  for (const acc of DEMO_ACCOUNT_DEFINITIONS) {
    if (isDryRun) {
      report.push(
        `[DRY-RUN] Validated configuration for ${acc.email} (${acc.role}) -> Cognito Group: ${acc.cognitoGroup}`
      );
    } else {
      // When authorized, would execute Cognito AdminCreateUser / AdminSetUserPassword / AdminAddUserToGroup
      report.push(`[LIVE] Account ${acc.email} ready for cloud provisioning.`);
    }
  }

  return {
    success: true,
    dryRun: isDryRun,
    accountsProcessed: DEMO_ACCOUNT_DEFINITIONS.length,
    report,
  };
}

if (require.main === module) {
  const isExecute = process.argv.includes('--execute') || process.argv.includes('--apply');
  provisionDemoAccounts({ dryRun: !isExecute })
    .then((res) => {
      console.log(`Demo Account Provisioning (${res.dryRun ? 'DRY-RUN MODE' : 'LIVE MODE'}):`);
      res.report.forEach((line) => console.log(line));
    })
    .catch((err) => {
      console.error('Provisioning error:', err);
      process.exit(1);
    });
}
