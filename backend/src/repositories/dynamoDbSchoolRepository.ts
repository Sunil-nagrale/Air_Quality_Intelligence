/**
 * DynamoDbSchoolRepository
 * 
 * Production AWS DynamoDB adapter implementing ISchoolRepository targeting the
 * AQ_SchoolPlanner table defined in infrastructure/lib/backend-stack.ts.
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
  SchoolProfile,
  SchoolPolicy,
  SchoolActivity,
  SchoolAgeGroup,
  SchoolCampus,
} from '../types';
import { auditRepository } from './auditRepository';

export interface ISchoolRepository {
  saveSchoolProfile(profile: SchoolProfile): Promise<SchoolProfile>;
  getSchoolProfile(schoolId: string): Promise<SchoolProfile | null>;
  saveSchoolPolicy(policy: SchoolPolicy, modifiedBy: string): Promise<SchoolPolicy>;
  getSchoolPolicies(schoolId: string): Promise<SchoolPolicy[]>;
  getSchoolPolicy(schoolId: string, ageGroup: SchoolAgeGroup): Promise<SchoolPolicy | null>;
  saveSchoolActivity(activity: SchoolActivity, actorId: string): Promise<SchoolActivity>;
  getSchoolActivity(activityId: string, schoolId?: string): Promise<SchoolActivity | null>;
  listActivitiesBySchool(schoolId: string, filterDate?: string, limit?: number): Promise<SchoolActivity[]>;
  listActivitiesForSchool(
    schoolId: string,
    options?: { campusId?: string; date?: string; ageGroup?: SchoolAgeGroup; limit?: number }
  ): Promise<SchoolActivity[]>;
  saveCampus(campus: SchoolCampus, actorId: string): Promise<SchoolCampus>;
  getCampus?(campusId: string): Promise<SchoolCampus | null>;
  listCampuses(schoolId: string): Promise<SchoolCampus[]>;
  getCampuses(schoolId: string): Promise<SchoolCampus[]>;
  recordAdminDecision(
    activityId: string,
    schoolId: string,
    decision: any,
    actorId: string
  ): Promise<SchoolActivity | null>;
  recordDecision(
    activityId: string,
    schoolId: string,
    decision: any,
    actorId: string
  ): Promise<SchoolActivity>;
  deleteActivity(activityId: string, schoolId: string, actorId: string): Promise<boolean>;
  getAllProfiles(): SchoolProfile[] | Promise<SchoolProfile[]>;
  getAllActivities(): SchoolActivity[] | Promise<SchoolActivity[]>;
  clear(): void;
}

export class DynamoDbSchoolRepository implements ISchoolRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(
    tableName = process.env.SCHOOL_TABLE || 'AQ_SchoolPlanner',
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

  // --- School Profile ---
  async saveSchoolProfile(profile: SchoolProfile): Promise<SchoolProfile> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `SCHOOL#${profile.schoolId}`,
          SK: 'PROFILE',
          GSI1PK: 'SCHOOLS_ALL',
          GSI1SK: `NAME#${profile.institutionName.toLowerCase()}`,
          ...profile,
        },
      })
    );
    return profile;
  }

  async getSchoolProfile(schoolId: string): Promise<SchoolProfile | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `SCHOOL#${schoolId}`,
          SK: 'PROFILE',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, ...profile } = res.Item;
    return profile as SchoolProfile;
  }

  // --- School Policies ---
  async saveSchoolPolicy(policy: SchoolPolicy, modifiedBy: string): Promise<SchoolPolicy> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `SCHOOL#${policy.schoolId}`,
          SK: `POLICY#${policy.ageGroup}`,
          ...policy,
        },
      })
    );

    await auditRepository.recordEvent({
      entityType: 'POLICY',
      entityId: `${policy.schoolId}#${policy.ageGroup}`,
      actorId: modifiedBy,
      actorRole: 'SCHOOL_ADMIN',
      action: 'SCHOOL_POLICY_UPDATED',
      newState: policy,
    });

    return policy;
  }

  async getSchoolPolicies(schoolId: string): Promise<SchoolPolicy[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `SCHOOL#${schoolId}`,
          ':prefix': 'POLICY#',
        },
      })
    );
    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, ...policy } = item;
      return policy as SchoolPolicy;
    });
  }

  async getSchoolPolicy(schoolId: string, ageGroup: SchoolAgeGroup): Promise<SchoolPolicy | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `SCHOOL#${schoolId}`,
          SK: `POLICY#${ageGroup}`,
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, ...policy } = res.Item;
    return policy as SchoolPolicy;
  }

  // --- Campuses ---
  async saveCampus(campus: SchoolCampus, actorId: string): Promise<SchoolCampus> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `SCHOOL#${campus.schoolId}`,
          SK: `CAMPUS#${campus.campusId}`,
          ...campus,
        },
      })
    );
    return campus;
  }

  async getCampuses(schoolId: string): Promise<SchoolCampus[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `SCHOOL#${schoolId}`,
          ':prefix': 'CAMPUS#',
        },
      })
    );
    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, ...campus } = item;
      return campus as SchoolCampus;
    });
  }

  // --- School Activities ---
  async saveSchoolActivity(activity: SchoolActivity, actorId: string): Promise<SchoolActivity> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `SCHOOL#${activity.schoolId}`,
          SK: `ACTIVITY#${activity.activityId}`,
          GSI1PK: `SCHOOL#${activity.schoolId}`,
          GSI1SK: `DATE#${activity.scheduledDate}#${activity.activityId}`,
          ...activity,
        },
      })
    );
    return activity;
  }

  async getSchoolActivity(activityId: string, schoolId: string): Promise<SchoolActivity | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `SCHOOL#${schoolId}`,
          SK: `ACTIVITY#${activityId}`,
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, ...activity } = res.Item;
    return activity as SchoolActivity;
  }

  async listActivitiesForSchool(
    schoolId: string,
    options?: { campusId?: string; date?: string; ageGroup?: SchoolAgeGroup; limit?: number }
  ): Promise<SchoolActivity[]> {
    // Bounded query enforcing tenant boundary
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `SCHOOL#${schoolId}`,
          ':prefix': 'ACTIVITY#',
        },
        Limit: options?.limit || 50,
      })
    );

    if (!res.Items) return [];
    let activities = res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...activity } = item;
      return activity as SchoolActivity;
    });

    if (options?.campusId) {
      activities = activities.filter(a => a.campusId === options.campusId);
    }
    if (options?.date) {
      activities = activities.filter(a => a.scheduledDate === options.date);
    }
    if (options?.ageGroup) {
      activities = activities.filter(a => a.ageGroup === options.ageGroup);
    }

    return activities;
  }

  async listActivitiesBySchool(
    schoolId: string,
    filterDate?: string,
    limit = 50
  ): Promise<SchoolActivity[]> {
    return this.listActivitiesForSchool(schoolId, { date: filterDate, limit });
  }

  async listCampuses(schoolId: string): Promise<SchoolCampus[]> {
    return this.getCampuses(schoolId);
  }

  async getCampus(campusId: string): Promise<SchoolCampus | null> {
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': `CAMPUS#${campusId}`,
        },
      })
    );
    if (!res.Items || res.Items.length === 0) return null;
    const { PK, SK, ...campus } = res.Items[0];
    return campus as SchoolCampus;
  }

  async recordAdminDecision(
    activityId: string,
    schoolId: string,
    decision: any,
    actorId: string
  ): Promise<SchoolActivity | null> {
    return this.recordDecision(activityId, schoolId, decision, actorId);
  }

  async recordDecision(
    activityId: string,
    schoolId: string,
    decision: any,
    actorId: string
  ): Promise<SchoolActivity> {
    const existing = await this.getSchoolActivity(activityId, schoolId);
    if (!existing) {
      throw new Error(`School activity ${activityId} not found`);
    }

    const updated: SchoolActivity = {
      ...existing,
      administratorDecision: decision,
      requiresAdminSignOff: false,
      adminSignOff: {
        isSignedOff: true,
        signedOffBy: decision.decidedBy,
        decisionNotes: decision.notes,
        signedOffAt: decision.decidedAt,
      },
      updatedAt: new Date().toISOString(),
    };

    return await this.saveSchoolActivity(updated, actorId);
  }

  async deleteActivity(activityId: string, schoolId: string, actorId: string): Promise<boolean> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `SCHOOL#${schoolId}`,
          SK: `ACTIVITY#${activityId}`,
        },
      })
    );
    return true;
  }

  // --- Scheduled Task Support Queries ---
  async getAllProfiles(): Promise<SchoolProfile[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :all',
        ExpressionAttributeValues: {
          ':all': 'SCHOOLS_ALL',
        },
      })
    );
    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...profile } = item;
      return profile as SchoolProfile;
    });
  }

  async getAllActivities(): Promise<SchoolActivity[]> {
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': 'ACTIVITY#',
        },
        Limit: 100,
      })
    );
    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...activity } = item;
      return activity as SchoolActivity;
    });
  }

  clear(): void {
    // In-memory no-op for DynamoDB
  }
}
