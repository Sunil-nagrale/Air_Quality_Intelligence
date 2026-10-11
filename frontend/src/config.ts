/**
 * Frontend Application Configuration
 *
 * Canonical environment variables for AWS Serverless and AWS Amplify deployment.
 * Never place secrets in frontend variables (all VITE_* variables are bundled into client JS).
 */

export const config = {
  // Canonical API base URL (VITE_API_BASE_URL)
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_GATEWAY_URL || '/api',

  // Amazon Cognito configuration (public identifiers, zero secrets)
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
  },
};
