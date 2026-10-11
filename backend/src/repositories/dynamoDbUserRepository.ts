/**
 * DynamoDbUserRepository
 * 
 * Production AWS DynamoDB adapter implementing IUserRepository targeting the
 * AQ_UsersAndPlans table defined in infrastructure/lib/backend-stack.ts.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  UserProfile,
  HealthPreferences,
  ActivityPlan,
  AlertPreference,
} from '../types';
import { auditRepository } from './auditRepository';

export interface IUserRepository {
  saveUserProfile(profile: UserProfile): Promise<UserProfile>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  getUserProfileByEmail(email: string): Promise<UserProfile | null>;
  saveHealthPreferences(prefs: HealthPreferences): Promise<HealthPreferences>;
  getHealthPreferences(userId: string): Promise<HealthPreferences | null>;
  saveActivityPlan(plan: ActivityPlan): Promise<ActivityPlan>;
  getActivityPlan(planId: string): Promise<ActivityPlan | null>;
  listActivityPlansByUser(userId: string, limit?: number): Promise<ActivityPlan[]>;
  deleteActivityPlan(userId: string, planId: string): Promise<boolean>;
  saveAlertPreferences(prefs: AlertPreference): Promise<AlertPreference>;
  getAlertPreferences(userId: string): Promise<AlertPreference | null>;
  saveCaregiverConsent(consent: any): Promise<any>;
  getCaregiverConsent(userId: string): Promise<any | null>;
  getAllAlertPreferences(): AlertPreference[] | Promise<AlertPreference[]>;
  getAllActivityPlans(): ActivityPlan[] | Promise<ActivityPlan[]>;
  getAllProfiles(): UserProfile[] | Promise<UserProfile[]>;
  clear(): void;
}

export class DynamoDbUserRepository implements IUserRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(
    tableName = process.env.USERS_TABLE || 'AQ_UsersAndPlans',
    client?: DynamoDBClient
  ) {
    this.tableName = tableName;
    if (client && typeof (client as any).send === 'function' && !(client as any).config) {
      this.docClient = client as any;
    } else {
      const baseClient =
        client || new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
      this.docClient = DynamoDBDocumentClient.from(baseClient, {
        marshallOptions: { removeUndefinedValues: true },
      });
    }
  }

  // --- User Profile ---
  async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const item = {
      PK: `USER#${profile.userId}`,
      SK: 'PROFILE',
      GSI1PK: `ROLE#${profile.role}`,
      GSI1SK: `EMAIL#${profile.email.toLowerCase()}`,
      ...profile,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    await auditRepository.recordEvent({
      entityType: 'USER',
      entityId: profile.userId,
      actorId: profile.userId,
      actorRole: profile.role,
      action: 'USER_PROFILE_SAVED',
      newState: { email: profile.email, role: profile.role },
    });

    return profile;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, ...profile } = res.Item;
    return profile as UserProfile;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    // Bounded query via GSI1 index
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1SK = :email',
        ExpressionAttributeValues: {
          ':email': `EMAIL#${email.toLowerCase()}`,
        },
        Limit: 1,
      })
    );
    if (!res.Items || res.Items.length === 0) return null;
    const { PK, SK, GSI1PK, GSI1SK, ...profile } = res.Items[0];
    return profile as UserProfile;
  }

  // --- Health Preferences (Non-Clinical) ---
  async saveHealthPreferences(prefs: HealthPreferences): Promise<HealthPreferences> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `USER#${prefs.userId}`,
          SK: 'HEALTH_PREF',
          ...prefs,
        },
      })
    );
    return prefs;
  }

  async getHealthPreferences(userId: string): Promise<HealthPreferences | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'HEALTH_PREF',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, ...prefs } = res.Item;
    return prefs as HealthPreferences;
  }

  // --- Activity Plans ---
  async saveActivityPlan(plan: ActivityPlan): Promise<ActivityPlan> {
    const item = {
      PK: `USER#${plan.userId}`,
      SK: `PLAN#${plan.planId}`,
      GSI1PK: `USER#${plan.userId}`,
      GSI1SK: `PLAN#${plan.targetDate}#${plan.planId}`,
      ...plan,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    await auditRepository.recordEvent({
      entityType: 'USER',
      entityId: plan.planId,
      actorId: plan.userId,
      actorRole: 'PERSONAL_USER',
      action: 'ACTIVITY_PLAN_SAVED',
      newState: {
        targetDate: plan.targetDate,
        activityType: plan.activityType,
      },
    });

    return plan;
  }

  async getActivityPlan(planId: string): Promise<ActivityPlan | null> {
    // If userId not known, query by planId across table or direct get
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1SK = :planSk',
        ExpressionAttributeValues: {
          ':planSk': `PLAN#${planId}`,
        },
        Limit: 1,
      })
    );
    if (!res.Items || res.Items.length === 0) return null;
    const { PK, SK, GSI1PK, GSI1SK, ...plan } = res.Items[0];
    return plan as ActivityPlan;
  }

  async listActivityPlansByUser(userId: string, limit = 20): Promise<ActivityPlan[]> {
    // Bounded query restricted to user partition
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':skPrefix': 'PLAN#',
        },
        ScanIndexForward: false, // Newest first
        Limit: limit,
      })
    );

    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...plan } = item;
      return plan as ActivityPlan;
    });
  }

  async deleteActivityPlan(userId: string, planId: string): Promise<boolean> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `PLAN#${planId}`,
        },
      })
    );
    return true;
  }

  // --- Alert Preferences ---
  async saveAlertPreferences(prefs: AlertPreference): Promise<AlertPreference> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `USER#${prefs.userId}`,
          SK: 'ALERT_PREF',
          GSI1PK: 'ALERTS_ACTIVE',
          GSI1SK: `USER#${prefs.userId}`,
          ...prefs,
        },
      })
    );
    return prefs;
  }

  async getAlertPreferences(userId: string): Promise<AlertPreference | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'ALERT_PREF',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, ...prefs } = res.Item;
    return prefs as AlertPreference;
  }

  // --- Caregiver Consent & Delegation ---
  async saveCaregiverConsent(consent: any): Promise<any> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `USER#${consent.userId}`,
          SK: 'CAREGIVER_CONSENT',
          ...consent,
        },
      })
    );

    await auditRepository.recordEvent({
      entityType: 'USER',
      entityId: consent.userId,
      actorId: consent.userId,
      actorRole: 'PERSONAL_USER',
      action: consent.consentGiven ? 'CAREGIVER_CONSENT_GRANTED' : 'CAREGIVER_CONSENT_REVOKED',
      newState: { caregiverEmail: consent.caregiverEmail },
    });

    return consent;
  }

  async getCaregiverConsent(userId: string): Promise<any | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'CAREGIVER_CONSENT',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, ...consent } = res.Item;
    return consent;
  }

  // --- Scheduled Task Support Queries ---
  async getAllAlertPreferences(): Promise<AlertPreference[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :active',
        ExpressionAttributeValues: {
          ':active': 'ALERTS_ACTIVE',
        },
      })
    );
    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...pref } = item;
      return pref as AlertPreference;
    });
  }

  async getAllActivityPlans(): Promise<ActivityPlan[]> {
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':skPrefix': 'PLAN#',
        },
        Limit: 100,
      })
    );
    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...plan } = item;
      return plan as ActivityPlan;
    });
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'SK = :profile',
        ExpressionAttributeValues: {
          ':profile': 'PROFILE',
        },
        Limit: 100,
      })
    );
    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...profile } = item;
      return profile as UserProfile;
    });
  }

  clear(): void {
    // In-memory no-op for DynamoDB
  }
}
