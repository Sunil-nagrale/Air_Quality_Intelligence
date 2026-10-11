/**
 * Persistence Configuration
 * 
 * Determines whether DynamoDB production adapters or in-memory test doubles
 * are selected at runtime.
 */

export function isDynamoDbConfigured(): boolean {
  if (process.env.NODE_ENV === 'test') {
    // Tests use deterministic in-memory test doubles unless explicitly requested
    return process.env.USE_DYNAMODB === 'true';
  }

  // In AWS Lambda runtime, AWS_EXECUTION_ENV is injected by the Lambda container
  return (
    process.env.USE_DYNAMODB === 'true' ||
    Boolean(process.env.AWS_EXECUTION_ENV) ||
    Boolean(process.env.USERS_TABLE || process.env.MARKETPLACE_TABLE)
  );
}
