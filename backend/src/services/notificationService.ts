import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'crypto';
import {
  NotificationChannel,
  NotificationDeliveryStats,
  NotificationRecord,
  NotificationStatus,
  NotificationType,
} from '../types';
import { logger } from './logger';

export interface SendNotificationInput {
  userId: string;
  recipientEmail?: string;
  type: NotificationType;
  channel?: NotificationChannel;
  subject?: string;
  message?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export interface NotificationSendResult {
  record: NotificationRecord;
  isDuplicateSuppressed: boolean;
  deliveryStatusMessage: string;
}

// Template generator for the 7 platform notification types
export function buildNotificationTemplate(
  type: NotificationType,
  recipient: string,
  metadata?: Record<string, any>
): { subject: string; bodyText: string; bodyHtml: string } {
  const m = metadata || {};

  switch (type) {
    case 'PERSONAL_ALERT': {
      const aqi = m.aqi ?? 220;
      const category = m.category ?? 'Poor';
      const location = m.locationName ?? 'Delhi-NCR';
      const subject = `[Air Quality Alert] ${category} Air Quality in ${location} (AQI: ${aqi})`;
      const bodyText = `Air Quality Alert for ${location}: Current regional index is ${aqi} (${category}), breaching your notification threshold of ${m.threshold ?? 200}. High cardiovascular activity outdoors is discouraged.`;
      const bodyHtml = `
<div style="font-family: sans-serif; max-width: 600px; padding: 20px; background-color: #F6F5EF; border: 1px solid #DCE9DF; border-radius: 8px;">
  <h2 style="color: #173F35; margin-top: 0;">Air Quality Precautionary Alert</h2>
  <p>Location: <strong>${location}</strong></p>
  <div style="background: #FFFFFF; padding: 16px; border-radius: 6px; border-left: 4px solid #C94B43; margin: 16px 0;">
    <div style="font-size: 24px; font-weight: bold; color: #173F35;">AQI ${aqi} &mdash; ${category}</div>
    <div style="color: #555555; margin-top: 4px;">Primary pollutant: ${m.dominantPollutant || 'PM2.5'}</div>
  </div>
  <p style="color: #333333;">The regional index has exceeded your configured alert threshold of ${m.threshold ?? 200}. Consider reducing strenuous outdoor physical exertion or shifting to an indoor facility.</p>
  <p style="font-size: 12px; color: #777777; margin-top: 24px;">Environmental Intelligence Platform &bull; Automated Telemetry Notification</p>
</div>`;
      return { subject, bodyText, bodyHtml };
    }

    case 'ACTIVITY_REMINDER': {
      const activity = m.activityType ?? 'Scheduled Activity';
      const windowStr = m.windowTime ?? 'Upcoming time slot';
      const aqi = m.predictedAQI ?? 140;
      const subject = `[Activity Reminder] ${activity} scheduled for ${windowStr}`;
      const bodyText = `Reminder for your planned ${activity} during ${windowStr}. Forecast AQI is ${aqi} (${m.category ?? 'Moderate'}). Hydration and sensible pacing are recommended.`;
      const bodyHtml = `
<div style="font-family: sans-serif; max-width: 600px; padding: 20px; background-color: #F6F5EF; border: 1px solid #DCE9DF; border-radius: 8px;">
  <h2 style="color: #173F35; margin-top: 0;">Activity Plan Reminder</h2>
  <p>Your planned activity: <strong>${activity}</strong></p>
  <p>Scheduled Window: <strong>${windowStr}</strong></p>
  <p>Expected AQI: <strong>${aqi} (${m.category ?? 'Moderate'})</strong></p>
  <p style="color: #333333;">Dispersion models indicate this window is favorable compared to later afternoon stagnation.</p>
  <p style="font-size: 12px; color: #777777; margin-top: 24px;">Personal Air Copilot &bull; Environmental Intelligence Platform</p>
</div>`;
      return { subject, bodyText, bodyHtml };
    }

    case 'CAREGIVER_ALERT': {
      const userName = m.userName ?? 'Your family member';
      const aqi = m.aqi ?? 235;
      const category = m.category ?? 'Poor';
      const subject = `[Caregiver Advisory] Elevated AQI (${aqi}) for ${userName}`;
      const bodyText = `Caregiver Notice: The regional air index for ${userName}'s area has reached ${aqi} (${category}). Precautionary indoor rest or protective measures are advised. Verified caregiver consent is on file.`;
      const bodyHtml = `
<div style="font-family: sans-serif; max-width: 600px; padding: 20px; background-color: #F6F5EF; border: 1px solid #DCE9DF; border-radius: 8px;">
  <h2 style="color: #173F35; margin-top: 0;">Caregiver Air Quality Advisory</h2>
  <p>Recipient: <strong>${recipient}</strong> (Verified Caregiver for ${userName})</p>
  <div style="background: #FFFFFF; padding: 16px; border-radius: 6px; border-left: 4px solid #E9A23B; margin: 16px 0;">
    <div style="font-size: 20px; font-weight: bold; color: #173F35;">Regional Index: ${aqi} (${category})</div>
  </div>
  <p style="color: #333333;">This notification is dispatched under verified consent. Precautionary mitigation: Ensure indoor air filtration is active and outdoor cardiovascular exertion is deferred.</p>
  <p style="font-size: 12px; color: #777777; margin-top: 24px;">Personal Air Copilot Caregiver Module &bull; Consent Verified</p>
</div>`;
      return { subject, bodyText, bodyHtml };
    }

    case 'SCHOOL_BROADCAST': {
      const institution = m.institutionName ?? 'School Campus';
      const directive = m.directive ?? 'Mandatory Indoor Physical Education Migration';
      const aqi = m.predictedAQI ?? 260;
      const subject = `[School Air Directive] ${directive} at ${institution}`;
      const bodyText = `School Air Safety Directive for ${institution}: Due to predicted AQI of ${aqi}, all outdoor activities are redirected to indoor facilities. Certified administrator sign-off is logged.`;
      const bodyHtml = `
<div style="font-family: sans-serif; max-width: 600px; padding: 20px; background-color: #F6F5EF; border: 1px solid #DCE9DF; border-radius: 8px;">
  <h2 style="color: #173F35; margin-top: 0;">Institutional Air Safety Directive</h2>
  <p>Campus: <strong>${institution}</strong></p>
  <p>Status: <strong>${directive}</strong></p>
  <p>Predicted Peak Index: <strong>${aqi}</strong></p>
  <p style="color: #333333;">Policy Action: Precautionary relocation to indoor gymnasiums and ventilated multipurpose halls.</p>
  <p style="font-size: 12px; color: #777777; margin-top: 24px;">School Air Safety Planner &bull; Multi-Campus Directive</p>
</div>`;
      return { subject, bodyText, bodyHtml };
    }

    case 'SCHOOL_CAREGIVER_NOTICE': {
      const schoolName = m.institutionName ?? 'School';
      const studentGroup = m.ageGroup ?? 'All Students';
      const action = m.actionTaken ?? 'Outdoor sports relocated to indoor auditorium';
      const subject = `[Parent Notice] ${schoolName} Air Quality Safeguards (${studentGroup})`;
      const bodyText = `Parent Notice from ${schoolName}: To protect student respiratory health, ${action}. Regular school departure schedules remain unchanged.`;
      const bodyHtml = `
<div style="font-family: sans-serif; max-width: 600px; padding: 20px; background-color: #F6F5EF; border: 1px solid #DCE9DF; border-radius: 8px;">
  <h2 style="color: #173F35; margin-top: 0;">Parent & Guardian Air Safety Update</h2>
  <p>School: <strong>${schoolName}</strong></p>
  <p>Cohort: <strong>${studentGroup}</strong></p>
  <p style="color: #333333;">Precautionary Step Taken: <strong>${action}</strong>.</p>
  <p style="color: #555555;">Student dismissal times and school transportation remain normal. High-efficiency indoor air purifiers are operating in campus halls.</p>
  <p style="font-size: 12px; color: #777777; margin-top: 24px;">School Air Safety System &bull; Environmental Intelligence</p>
</div>`;
      return { subject, bodyText, bodyHtml };
    }

    case 'MARKETPLACE_OFFER_UPDATE': {
      const offerId = m.offerId ?? 'OFFER_1';
      const crop = m.cropType ?? 'Paddy Straw';
      const price = m.pricePerTon ?? 1650;
      const status = m.status ?? 'SUBMITTED';
      const subject = `[Marketplace Offer] ${status}: ${crop} at ₹${price}/ton (ID: ${offerId})`;
      const bodyText = `Parali Marketplace update: Offer ${offerId} for ${crop} is now ${status}. Offered rate: ₹${price}/ton. Review or respond via the marketplace portal.`;
      const bodyHtml = `
<div style="font-family: sans-serif; max-width: 600px; padding: 20px; background-color: #F6F5EF; border: 1px solid #DCE9DF; border-radius: 8px;">
  <h2 style="color: #173F35; margin-top: 0;">Parali-to-Value Marketplace Offer</h2>
  <p>Offer Reference: <strong>${offerId}</strong></p>
  <p>Commodity: <strong>${crop}</strong></p>
  <p>Rate: <strong>₹${price} / Metric Ton</strong></p>
  <p>Status: <strong style="color: #173F35;">${status}</strong></p>
  <p style="font-size: 12px; color: #777777; margin-top: 24px;">Parali-to-Value Marketplace &bull; Northwest India Agricultural Supply Chain</p>
</div>`;
      return { subject, bodyText, bodyHtml };
    }

    case 'MARKETPLACE_LOGISTICS_UPDATE': {
      const collectionId = m.collectionId ?? 'COLL_1';
      const stage = m.stage ?? 'IN_TRANSIT';
      const netTons = m.verifiedNetTons ?? 16.5;
      const subject = `[Logistics Update] Parali Collection ${collectionId} &mdash; Stage: ${stage}`;
      const bodyText = `Parali Logistics Milestone: Collection ${collectionId} is currently ${stage}. Verified tonnage: ${netTons} MT. Weighbridge slips and moisture certification recorded.`;
      const bodyHtml = `
<div style="font-family: sans-serif; max-width: 600px; padding: 20px; background-color: #F6F5EF; border: 1px solid #DCE9DF; border-radius: 8px;">
  <h2 style="color: #173F35; margin-top: 0;">Logistics & Weighbridge Milestone</h2>
  <p>Collection ID: <strong>${collectionId}</strong></p>
  <p>Current Milestone: <strong>${stage}</strong></p>
  <p>Verified Net Weight: <strong>${netTons} Tons</strong></p>
  <p style="font-size: 12px; color: #777777; margin-top: 24px;">Parali-to-Value Traceability &bull; Northwest India Logistics Hub</p>
</div>`;
      return { subject, bodyText, bodyHtml };
    }
  }
}

export class NotificationService {
  private sesClient: SESClient | null = null;
  private senderEmail: string;
  private isSesEnabled: boolean;
  private region: string;

  // In-memory persistent stores for notifications and idempotency cache
  private notifications: NotificationRecord[] = [];
  private idempotencyCache: Map<string, { timestamp: number; recordId: string }> = new Map();
  private cooldownMs: number = 60 * 60 * 1000; // 60 minutes cooldown for identical condition

  constructor(
    region: string = process.env.AWS_REGION || 'ap-south-1',
    senderEmail: string = process.env.SES_FROM_EMAIL || 'alerts@airqualityintel.local'
  ) {
    this.region = region;
    this.senderEmail = senderEmail;
    this.isSesEnabled = process.env.SES_ENABLED === 'true';
  }

  public isConfigured(): boolean {
    return this.isSesEnabled && Boolean(process.env.SES_FROM_EMAIL);
  }

  public getSenderEmail(): string {
    return this.senderEmail;
  }

  public isDynamoDbDurable(): boolean {
    if (process.env.NODE_ENV === 'test') {
      return process.env.USE_DYNAMODB === 'true';
    }
    return (
      process.env.USE_DYNAMODB === 'true' ||
      Boolean(process.env.AWS_EXECUTION_ENV && process.env.USERS_TABLE)
    );
  }

  private async acquireDurableIdempotencyLock(key: string, correlationId: string): Promise<boolean> {
    try {
      const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const tableName = process.env.USERS_TABLE || 'AQ_UsersAndPlans';
      const client = DynamoDBDocumentClient.from(
        new DynamoDBClient({ region: this.region })
      );
      const ttl = Math.floor(Date.now() / 1000) + Math.floor(this.cooldownMs / 1000);

      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: `IDEMP#${key}`,
            SK: 'LOCK',
            ttl,
            createdAt: new Date().toISOString(),
            correlationId,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );
      return true;
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        return false;
      }
      return true;
    }
  }

  private getClient(): SESClient {
    if (!this.sesClient) {
      this.sesClient = new SESClient({ region: this.region });
    }
    return this.sesClient;
  }


  /**
   * Dispatches a notification across the requested channel (or EMAIL + IN_APP).
   * Enforces caregiver consent, idempotency deduplication, and safe local simulation.
   */
  async sendNotification(input: SendNotificationInput): Promise<NotificationSendResult> {
    const correlationId = input.correlationId || `notif-${randomUUID().substring(0, 8)}`;
    const channel: NotificationChannel = input.channel || 'EMAIL';

    // 1. Caregiver Consent Safeguard
    if (input.type === 'CAREGIVER_ALERT') {
      const consentVerified = input.metadata?.caregiverConsentVerified === true;
      if (!consentVerified) {
        const errorMsg = 'CAREGIVER_DISPATCH_REJECTED: Explicit caregiver consent has not been verified.';
        logger.warn('NOTIFICATIONS', 'CaregiverConsentMissing', errorMsg, correlationId, {
          userId: input.userId,
          recipient: input.recipientEmail,
        });
        throw new Error(errorMsg);
      }
    }

    // 2. Idempotency Key Computation & Deduplication
    const idempotencyKey =
      input.idempotencyKey ||
      `${input.type}_${input.userId}_${input.recipientEmail || 'inapp'}_${JSON.stringify(input.metadata || {})}`;

    const cached = this.idempotencyCache.get(idempotencyKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.cooldownMs) {
      const existing = this.notifications.find(n => n.id === cached.recordId);
      if (existing) {
        logger.info(
          'NOTIFICATIONS',
          'DeduplicationSuppressed',
          `Notification suppressed by in-memory idempotency cooldown key: ${idempotencyKey}`,
          correlationId,
          { recordId: existing.id }
        );
        return {
          record: existing,
          isDuplicateSuppressed: true,
          deliveryStatusMessage: 'Notification suppressed as duplicate within active cooldown period.',
        };
      }
    }

    // Check durable distributed lock across serverless invocations if DynamoDB is configured
    if (this.isDynamoDbDurable()) {
      const lockAcquired = await this.acquireDurableIdempotencyLock(idempotencyKey, correlationId);
      if (!lockAcquired) {
        logger.info(
          'NOTIFICATIONS',
          'DurableDeduplicationSuppressed',
          `Notification suppressed by durable serverless distributed lock: ${idempotencyKey}`,
          correlationId
        );
        const placeholderRecord: NotificationRecord = {
          id: `DEDUP_${idempotencyKey}`,
          userId: input.userId,
          recipientEmail: input.recipientEmail,
          type: input.type,
          channel,
          status: 'SUBMITTED',
          subject: input.subject || 'Duplicate Alert Suppressed',
          bodyText: 'Duplicate notification suppressed by serverless distributed lock.',
          sentAt: new Date().toISOString(),
          isRead: true,
        };
        return {
          record: placeholderRecord,
          isDuplicateSuppressed: true,
          deliveryStatusMessage: 'Notification suppressed by durable serverless distributed lock.',
        };
      }
    }


    // 3. Build Templates
    const recipient = input.recipientEmail || `${input.userId}@in-app.local`;
    const template = buildNotificationTemplate(input.type, recipient, input.metadata);
    const subject = input.subject || template.subject;
    const bodyText = input.message || template.bodyText;
    const bodyHtml = template.bodyHtml;

    // 4. Delivery Status Determination
    let status: NotificationStatus = 'DELIVERED_SIMULATED';
    let deliveryMessage = 'Notification delivered in local simulation mode (zero cloud cost).';

    if (channel === 'EMAIL') {
      if (this.isConfigured()) {
        try {
          const command = new SendEmailCommand({
            Source: this.senderEmail,
            Destination: {
              ToAddresses: [recipient],
            },
            Message: {
              Subject: { Data: subject },
              Body: {
                Text: { Data: bodyText },
                Html: { Data: bodyHtml },
              },
            },
          });

          await this.getClient().send(command);
          status = 'SUBMITTED';
          deliveryMessage = `Successfully dispatched via Amazon SES to ${recipient}`;
          logger.info('NOTIFICATIONS', 'SESDispatchSuccess', deliveryMessage, correlationId, { recipient });
        } catch (err: any) {
          logger.warn(
            'NOTIFICATIONS',
            'SESDispatchFallback',
            `SES invocation failed, fallback to simulated delivery: ${err.message}`,
            correlationId,
            { error: err.message }
          );
          status = 'FAILED';
          deliveryMessage = `SES send failed: ${err.message}`;
        }
      } else {
        status = 'DELIVERED_SIMULATED';
        deliveryMessage = `SES unconfigured in local development. Notification successfully queued and simulated for ${recipient}.`;
        logger.info('NOTIFICATIONS', 'SimulatedEmailDelivered', deliveryMessage, correlationId, { recipient });
      }
    } else if (channel === 'IN_APP') {
      status = 'SUBMITTED';
      deliveryMessage = 'In-app notification saved and available in notifications center.';
    }

    // 5. Create & Store Record
    const record: NotificationRecord = {
      id: `NOTIF_${Date.now()}_${randomUUID().substring(0, 6)}`,
      userId: input.userId,
      recipientEmail: input.recipientEmail,
      type: input.type,
      channel,
      status,
      subject,
      bodyText,
      bodyHtml,
      idempotencyKey,
      sentAt: new Date().toISOString(),
      isRead: false,
      metadata: input.metadata,
    };

    this.notifications.push(record);
    this.idempotencyCache.set(idempotencyKey, { timestamp: now, recordId: record.id });

    return {
      record,
      isDuplicateSuppressed: false,
      deliveryStatusMessage: deliveryMessage,
    };
  }

  /**
   * Query notification history for a user with optional filtering
   */
  async getHistory(
    userId?: string,
    options?: { limit?: number; unreadOnly?: boolean }
  ): Promise<NotificationRecord[]> {
    let result = [...this.notifications];

    if (userId) {
      result = result.filter(n => n.userId === userId || n.userId === 'GLOBAL_BROADCAST');
    }

    if (options?.unreadOnly) {
      result = result.filter(n => !n.isRead);
    }

    // Return newest first
    result.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    const item = this.notifications.find(
      n => n.id === notificationId && (!userId || n.userId === userId)
    );
    if (item) {
      item.isRead = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    let count = 0;
    for (const n of this.notifications) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Aggregate delivery statistics for CloudWatch observability / diagnostics
   */
  getDeliveryStats(): NotificationDeliveryStats {
    const stats: NotificationDeliveryStats = {
      totalSent: this.notifications.length,
      deliveredSimulated: 0,
      submitted: 0,
      failed: 0,
      unconfigured: 0,
      byType: {},
    };

    for (const n of this.notifications) {
      if (n.status === 'DELIVERED_SIMULATED') stats.deliveredSimulated++;
      else if (n.status === 'SUBMITTED') stats.submitted++;
      else if (n.status === 'FAILED') stats.failed++;
      else if (n.status === 'UNCONFIGURED') stats.unconfigured++;

      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Test double / cleanup utility
   */
  clear(): void {
    this.notifications = [];
    this.idempotencyCache.clear();
  }
}

export const notificationService = new NotificationService();
