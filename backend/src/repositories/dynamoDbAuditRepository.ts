/**
 * DynamoDbAuditRepository
 * 
 * Production AWS DynamoDB adapter implementing IAuditRepository targeting the
 * AQ_UsersAndPlans table (partitioned under AUDIT#) defined in infrastructure/lib/backend-stack.ts.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { AuditEvent } from '../types';

export interface IAuditRepository {
  recordEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<AuditEvent>;
  getEventsForEntity(entityId: string): Promise<AuditEvent[]>;
  getEventsByActor(actorId: string): Promise<AuditEvent[]>;
  getAllEvents(): AuditEvent[] | Promise<AuditEvent[]>;
  clear(): void;
}

export class DynamoDbAuditRepository implements IAuditRepository {
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

  async recordEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<AuditEvent> {
    const fullEvent: AuditEvent = {
      ...event,
      eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `AUDIT#${fullEvent.entityId}`,
          SK: `EVENT#${fullEvent.timestamp}#${fullEvent.eventId}`,
          GSI1PK: `ACTOR#${fullEvent.actorId}`,
          GSI1SK: `EVENT#${fullEvent.timestamp}`,
          ...fullEvent,
        },
      })
    );

    return fullEvent;
  }

  async getEventsForEntity(entityId: string): Promise<AuditEvent[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `AUDIT#${entityId}`,
          ':skPrefix': 'EVENT#',
        },
        ScanIndexForward: false, // Newest first
      })
    );

    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...audit } = item;
      return audit as AuditEvent;
    });
  }

  async getEventsByActor(actorId: string): Promise<AuditEvent[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1skPrefix)',
        ExpressionAttributeValues: {
          ':gsi1pk': `ACTOR#${actorId}`,
          ':gsi1skPrefix': 'EVENT#',
        },
        ScanIndexForward: false,
      })
    );

    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...audit } = item;
      return audit as AuditEvent;
    });
  }

  async getAllEvents(): Promise<AuditEvent[]> {
    // Audit logs in DynamoDB are typically queried by entity or actor
    return [];
  }

  clear(): void {
    // In-memory no-op for DynamoDB
  }
}
