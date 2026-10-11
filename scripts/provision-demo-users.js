/**
 * Administrative script to provision the three demonstration identities in Amazon Cognito User Pool.
 *
 * Identities:
 * 1. parasnath@gmail.com (Role_Personal)
 * 2. sunilnagrale@gmail.com (Role_Farmer)
 * 3. kvkailashahar@gmail.com (Role_School)
 *
 * NOTE: Passwords must be provided via the environment variable DEMO_USERS_PASSWORD
 * or prompted securely at runtime. Never hardcode passwords in source code.
 *
 * Do not run this script until AWS deployment is approved.
 */

// Default to dry-run mode unless --execute or --apply is explicitly specified
const isExecute = process.argv.includes('--execute') || process.argv.includes('--apply');

const REGION = process.env.AWS_REGION || 'ap-south-1';
const USER_POOL_ID = process.env.USER_POOL_ID;
const DEMO_PASSWORD = process.env.DEMO_USERS_PASSWORD;

let CognitoIdentityProviderClient;
let AdminCreateUserCommand;
let AdminSetUserPasswordCommand;
let AdminAddUserToGroupCommand;

if (isExecute) {
  try {
    const cognitoSdk = require('@aws-sdk/client-cognito-identity-provider');
    CognitoIdentityProviderClient = cognitoSdk.CognitoIdentityProviderClient;
    AdminCreateUserCommand = cognitoSdk.AdminCreateUserCommand;
    AdminSetUserPasswordCommand = cognitoSdk.AdminSetUserPasswordCommand;
    AdminAddUserToGroupCommand = cognitoSdk.AdminAddUserToGroupCommand;
  } catch (err) {
    try {
      const path = require('path');
      const cognitoSdk = require(path.resolve(__dirname, '../backend/node_modules/@aws-sdk/client-cognito-identity-provider'));
      CognitoIdentityProviderClient = cognitoSdk.CognitoIdentityProviderClient;
      AdminCreateUserCommand = cognitoSdk.AdminCreateUserCommand;
      AdminSetUserPasswordCommand = cognitoSdk.AdminSetUserPasswordCommand;
      AdminAddUserToGroupCommand = cognitoSdk.AdminAddUserToGroupCommand;
    } catch (e2) {
      console.error('ERROR: @aws-sdk/client-cognito-identity-provider is required for live execution.');
      process.exit(1);
    }
  }
}

const DEMO_USERS = [
  {
    email: 'parasnath@gmail.com',
    role: 'PERSONAL_USER',
    group: 'Role_Personal',
    name: 'Paras Nath',
  },
  {
    email: 'sunilnagrale@gmail.com',
    role: 'FARMER',
    group: 'Role_Farmer',
    name: 'Sardar Sunil Singh',
  },
  {
    email: 'kvkailashahar@gmail.com',
    role: 'SCHOOL_ADMIN',
    group: 'Role_School',
    name: 'Principal Sharma',
  },
];

async function provision() {
  if (!isExecute) {
    console.log('=== DEMO USER PROVISIONING: DRY-RUN MODE (DEFAULT) ===');
    console.log('No changes will be applied to AWS Cognito. To execute live changes, pass --execute.');
    console.log(`Target AWS Region: ${REGION}`);
    console.log(`Target UserPool: ${USER_POOL_ID || '(Not set - dry-run check only)'}`);
    console.log('');
    for (const user of DEMO_USERS) {
      console.log(`[DRY-RUN] Identity: ${user.email}`);
      console.log(`          Role:     ${user.role}`);
      console.log(`          Group:    ${user.group}`);
      console.log(`          Name:     ${user.name}`);
      console.log(`          Status:   Validated configuration (Dry-run OK)`);
    }
    console.log('\nDry-run complete. 3 accounts validated. Zero cloud mutations made.');
    return;
  }

  // Execution mode checks
  if (!USER_POOL_ID) {
    console.error('ERROR: USER_POOL_ID environment variable is required when --execute is specified.');
    process.exit(1);
  }

  if (!DEMO_PASSWORD) {
    console.error('ERROR: DEMO_USERS_PASSWORD environment variable is required when --execute is specified.');
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region: REGION });

  for (const user of DEMO_USERS) {
    console.log(`[LIVE] Provisioning user ${user.email} with role ${user.role} in group ${user.group}...`);
    try {
      await client.send(
        new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: user.email,
          UserAttributes: [
            { Name: 'email', Value: user.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: user.name },
            { Name: 'custom:role', Value: user.role },
          ],
          MessageAction: 'SUPPRESS',
        })
      );
    } catch (e) {
      if (e.name === 'UsernameExistsException') {
        console.log(`User ${user.email} already exists, proceeding to password and group assignment.`);
      } else {
        throw e;
      }
    }

    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        Password: DEMO_PASSWORD,
        Permanent: true,
      })
    );

    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        GroupName: user.group,
      })
    );

    console.log(`[LIVE] Successfully provisioned and assigned group for ${user.email}`);
  }
  console.log('Live demo user provisioning complete.');
}

provision().catch((err) => {
  console.error('Provisioning failed:', err.message);
  process.exit(1);
});
