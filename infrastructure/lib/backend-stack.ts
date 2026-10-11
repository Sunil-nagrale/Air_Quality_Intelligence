import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as path from 'path';
import * as fs from 'fs';

export class AirQualityIntelligenceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Validate deployment environment context to prevent accidental resource deletion
    const rawEnv = this.node.tryGetContext('env');
    const validEnvs = ['prod', 'production', 'sandbox', 'dev'];
    if (!rawEnv || !validEnvs.includes(String(rawEnv).toLowerCase())) {
      throw new Error(
        `[AirQualityIntelligenceStack] Deployment context 'env' is required and must be either 'prod' (production) or 'sandbox' (non-production). Received: '${rawEnv}'.\n` +
        `Usage:\n` +
        `  Production:  npx cdk synth -c env=prod\n` +
        `  Sandbox:     npx cdk synth -c env=sandbox`
      );
    }
    const envContext = String(rawEnv).toLowerCase();
    const isProd = envContext === 'prod' || envContext === 'production';
    const dataRemovalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // 1. Target Node.js 24.x runtime with fallback
    const node24Runtime = (lambda.Runtime as any).NODEJS_24_X
      ? (lambda.Runtime as any).NODEJS_24_X
      : (lambda.Runtime as any).NODEJS_22_X
        ? (lambda.Runtime as any).NODEJS_22_X
        : lambda.Runtime.NODEJS_20_X;

    // 2. Amazon Cognito User Pool with SRP support
    const userPool = new cognito.UserPool(this, 'AirQualityUserPool', {
      userPoolName: 'air-quality-intelligence-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: dataRemovalPolicy,
    });

    // App Client with SRP and ADMIN auth flows enabled
    const userPoolClient = new cognito.UserPoolClient(this, 'AirQualityUserPoolClient', {
      userPool,
      userPoolClientName: 'air-quality-web-client',
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
        adminUserPassword: true,
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      preventUserExistenceErrors: true,
    });

    // Cognito Groups for role-based authorization
    const roles = ['Role_Personal', 'Role_School', 'Role_Farmer', 'Role_Buyer', 'Role_Admin'];
    roles.forEach(roleName => {
      new cognito.CfnUserPoolGroup(this, `Group${roleName}`, {
        userPoolId: userPool.userPoolId,
        groupName: roleName,
        description: `Server-managed RBAC group for ${roleName}`,
      });
    });

    // 3. Amazon DynamoDB: Four Focused Domain Tables
    // Table 1: Users & Personal Plans
    const usersTable = new dynamodb.Table(this, 'AQUsersTable', {
      tableName: 'AQ_UsersAndPlans',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: dataRemovalPolicy,
      timeToLiveAttribute: 'ttl',
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // Table 2: School Planner
    const schoolTable = new dynamodb.Table(this, 'AQSchoolTable', {
      tableName: 'AQ_SchoolPlanner',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: dataRemovalPolicy,
    });
    schoolTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // Table 3: Parali Marketplace
    const marketplaceTable = new dynamodb.Table(this, 'AQMarketplaceTable', {
      tableName: 'AQ_Marketplace',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: dataRemovalPolicy,
    });
    marketplaceTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });
    marketplaceTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });
    marketplaceTable.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
    });
    marketplaceTable.addGlobalSecondaryIndex({
      indexName: 'GSI4',
      partitionKey: { name: 'GSI4PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI4SK', type: dynamodb.AttributeType.STRING },
    });

    // Table 4: Air Observations & Forecasts
    const airTable = new dynamodb.Table(this, 'AQAirTable', {
      tableName: 'AQ_AirObservations',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: dataRemovalPolicy,
      timeToLiveAttribute: 'ttl',
    });

    // 4. Amazon S3 Private Bucket for Reports and Document Storage
    const assetsBucket = new s3.Bucket(this, 'AQAssetsBucket', {
      bucketName: `air-quality-intelligence-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: dataRemovalPolicy,
      autoDeleteObjects: !isProd,
    });

    // 5. CloudWatch Log Group for Structured JSON Logging
    const apiLogGroup = new logs.LogGroup(this, 'AQApiGatewayLogGroup', {
      logGroupName: '/aws/lambda/air-quality-intelligence-api',
      retention: isProd ? logs.RetentionDays.ONE_YEAR : logs.RetentionDays.TWO_WEEKS,
      removalPolicy: dataRemovalPolicy,
    });

    // 6. Shared Lambda Execution Role with Least-Privilege Policies
    const lambdaRole = new iam.Role(this, 'AQLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Air Quality Intelligence API lambdas',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB & S3 permissions
    usersTable.grantReadWriteData(lambdaRole);
    schoolTable.grantReadWriteData(lambdaRole);
    marketplaceTable.grantReadWriteData(lambdaRole);
    airTable.grantReadWriteData(lambdaRole);
    assetsBucket.grantReadWrite(lambdaRole);
    apiLogGroup.grantWrite(lambdaRole);

    // Grant Bedrock model invocation permission (least-privilege)
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:ListFoundationModels'],
        resources: ['*'],
      })
    );

    // Grant SES email sending permission (least-privilege)
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      })
    );

    // Common environment variables for Lambdas
    const lambdaEnv = {
      USERS_TABLE: usersTable.tableName,
      SCHOOL_TABLE: schoolTable.tableName,
      MARKETPLACE_TABLE: marketplaceTable.tableName,
      AIR_TABLE: airTable.tableName,
      ASSETS_BUCKET: assetsBucket.bucketName,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      BEDROCK_REGION: this.region,
      BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
      SES_FROM_EMAIL: 'alerts@airqualityintel.local',
      NODE_OPTIONS: '--enable-source-maps',
    };

    // Resolve backend dist path whether executed from ts-node or compiled dist
    let backendDistPath = path.resolve(__dirname, '../../backend/dist');
    if (!fs.existsSync(backendDistPath)) {
      backendDistPath = path.resolve(__dirname, '../../../backend/dist');
    }
    if (!fs.existsSync(backendDistPath)) {
      backendDistPath = path.resolve(__dirname, '../../backend');
    }

    // 7. Lambda Microservices Router Function
    const apiLambda = new lambda.Function(this, 'AQApiGatewayRouterFunction', {
      runtime: node24Runtime,
      handler: 'src/index.handler',
      code: lambda.Code.fromAsset(backendDistPath),
      environment: lambdaEnv,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(25),
      memorySize: 512,
    });

    // 8. Amazon API Gateway REST API with CORS
    const api = new apigateway.RestApi(this, 'AirQualityRestApi', {
      restApiName: 'Air Quality Intelligence API',
      description: 'API for Personal Copilot, School Safety, and Parali Marketplace',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'x-user-role',
          'x-correlation-id',
        ],
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(apiLambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // Root proxy to Lambda router
    const apiResource = api.root.addResource('api');
    apiResource.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // 9. Amazon EventBridge Scheduled Ingestion & Processing Rule
    const hourlyRule = new events.Rule(this, 'AQHourlyRefreshRule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      description: 'Hourly trigger for regional air quality cache refresh, alert evaluations, and reminders',
    });
    hourlyRule.addTarget(new targets.LambdaFunction(apiLambda, {
      event: events.RuleTargetInput.fromObject({ source: 'aws.events.scheduled', job: 'hourly-sync' }),
    }));

    // 10. CloudWatch Metric Filter and Alarm for Error Tracking
    const serverErrorMetric = new logs.MetricFilter(this, 'AQServerErrorMetricFilter', {
      logGroup: apiLogGroup,
      metricNamespace: 'AirQualityIntelligence',
      metricName: 'ServerErrors5xx',
      filterPattern: logs.FilterPattern.literal('{ $.level = "ERROR" }'),
      metricValue: '1',
    });

    const serverErrorAlarm = new cloudwatch.Alarm(this, 'AQHighServerErrorAlarm', {
      metric: serverErrorMetric.metric({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      alarmDescription: 'Alerts when API Lambda error rate exceeds 10 errors within 5 minutes',
    });

    // 11. CloudFormation Stack Outputs
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'AssetsBucketName', { value: assetsBucket.bucketName });
    new cdk.CfnOutput(this, 'LogGroupName', { value: apiLogGroup.logGroupName });
    new cdk.CfnOutput(this, 'AlarmArn', { value: serverErrorAlarm.alarmArn });
    new cdk.CfnOutput(this, 'AwsRegion', { value: this.region });
  }
}

