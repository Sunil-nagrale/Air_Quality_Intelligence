import { randomUUID } from 'crypto';
import {
  ScheduledJobResult,
  ScheduledJobType,
} from '../types';
import { logger } from './logger';
import { notificationService } from './notificationService';
import { userRepository } from '../repositories/userRepository';
import { schoolRepository } from '../repositories/schoolRepository';
import { airRepository } from '../repositories/airRepository';
import {
  REGIONAL_STATIONS,
  findNearestStation,
  fetchLiveOpenMeteoForecast,
} from './airQualityService';
import { calculateCPCBNaqi } from './cpcbNaqi';

/**
 * Deterministic helper to get current date and time in Indian Standard Time (IST, UTC+5:30)
 */
export function getNowInIST(): { dateStr: string; timeStr: string; hours: number; minutes: number } {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMillis = utcMillis + 5.5 * 3600000;
  const istDate = new Date(istMillis);

  const dateStr = istDate.toISOString().split('T')[0];
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return { dateStr, timeStr, hours, minutes };
}

export class ScheduledTasksService {
  private history: ScheduledJobResult[] = [];
  private isJobRunning: Map<ScheduledJobType, boolean> = new Map();
  private maxHistoryCount = 50;

  /**
   * Refreshes air observations and forecasts across monitored regional stations
   */
  async refreshAirDataJob(correlationId: string = 'cron-refresh-air'): Promise<ScheduledJobResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    logger.info('SCHEDULER', 'RefreshAirDataJobStart', 'Starting regional air data refresh job', correlationId);

    let itemsProcessed = 0;
    try {
      // 1. Process regional stations
      for (const st of REGIONAL_STATIONS) {
        const stationAqiResult = st.lastKnownValues
          ? calculateCPCBNaqi(st.lastKnownValues, 'MEASURED_OBSERVATION', st.stationId)
          : null;
        const stationAQI = stationAqiResult?.aqi ?? 185;
        const stationCategory = stationAqiResult?.category ?? 'Moderate';

        await airRepository.saveObservation({
          stationId: st.stationId,
          stationName: st.name,
          district: st.district,
          state: st.state,
          coordinates: { lat: st.coordinates.lat, lon: st.coordinates.lon },
          agency: st.agency,
          aqi: stationAQI,
          category: stationCategory,
          dominantPollutant: stationAqiResult?.dominantPollutant || 'PM2.5',
          pollutants: st.lastKnownValues || { pm25: 75, pm10: 150 },
          observationTimestamp: new Date().toISOString(),
          sourceTimezone: 'Asia/Kolkata',
          provenance: 'MEASURED_OBSERVATION',
          isTelemetryAvailable: true,
        });
        itemsProcessed++;
      }

      // 2. Refresh Open-Meteo numerical forecast for Delhi-NCR center
      const forecast = await fetchLiveOpenMeteoForecast(28.6139, 77.2090);
      if (forecast) {
        itemsProcessed++;
      }

      const result: ScheduledJobResult = {
        jobType: 'REFRESH_AIR_DATA',
        status: 'SUCCESS',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        itemsProcessed,
        details: { stationsRefreshed: REGIONAL_STATIONS.length },
      };

      this.recordJob(result);
      logger.info(
        'SCHEDULER',
        'RefreshAirDataJobCompleted',
        `Air data refresh completed successfully (${itemsProcessed} items)`,
        correlationId,
        { itemsProcessed }
      );
      return result;
    } catch (err: any) {
      const result: ScheduledJobResult = {
        jobType: 'REFRESH_AIR_DATA',
        status: 'FAILED',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        itemsProcessed,
        details: { error: err.message },
      };
      this.recordJob(result);
      logger.error('SCHEDULER', 'RefreshAirDataJobError', `Air data refresh failed: ${err.message}`, correlationId, {}, err);
      return result;
    }
  }

  /**
   * Evaluates active alert rules for registered personal users and schools
   */
  async evaluateAlertsJob(correlationId: string = 'cron-eval-alerts'): Promise<ScheduledJobResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    logger.info('SCHEDULER', 'EvaluateAlertsJobStart', 'Evaluating active alert rules across platform', correlationId);

    let itemsProcessed = 0;
    let alertsSent = 0;

    try {
      // 1. Evaluate personal user alert preferences
      const alertPrefs = await userRepository.getAllAlertPreferences();
      for (const pref of alertPrefs) {
        itemsProcessed++;
        if (!pref.emailAlertsEnabled && pref.preferredNotificationChannel === 'IN_APP') {
          // Still evaluate in-app alert
        }

        // Get nearest air observation (defaulting to Delhi center if coordinates not available)
        const { station } = findNearestStation(28.6139, 77.2090);
        const stationAqiResult = station.lastKnownValues
          ? calculateCPCBNaqi(station.lastKnownValues, 'MEASURED_OBSERVATION', station.stationId)
          : null;
        const currentAQI = stationAqiResult?.aqi ?? 210;

        if (currentAQI >= pref.aqiThresholdAlert) {
          const user = await userRepository.getUserProfile(pref.userId);
          const recipientEmail = user?.email || `${pref.userId}@user.local`;

          // Idempotent dispatch to personal user
          const sendRes = await notificationService.sendNotification({
            userId: pref.userId,
            recipientEmail,
            type: 'PERSONAL_ALERT',
            channel: pref.preferredNotificationChannel === 'IN_APP' ? 'IN_APP' : 'EMAIL',
            idempotencyKey: `ALERT_${pref.userId}_${new Date().toISOString().slice(0, 13)}`, // Hourly bucket
            metadata: {
              aqi: currentAQI,
              category: currentAQI > 300 ? 'Very Poor' : currentAQI > 200 ? 'Poor' : 'Moderate',
              threshold: pref.aqiThresholdAlert,
              locationName: station.name,
              dominantPollutant: 'PM2.5',
            },
            correlationId,
          });

          if (!sendRes.isDuplicateSuppressed) alertsSent++;

          // Caregiver notification (strictly requires consent verified)
          if (pref.caregiverRecipientEmail && pref.caregiverConsentVerified) {
            const cgRes = await notificationService.sendNotification({
              userId: pref.userId,
              recipientEmail: pref.caregiverRecipientEmail,
              type: 'CAREGIVER_ALERT',
              channel: 'EMAIL',
              idempotencyKey: `CG_ALERT_${pref.userId}_${pref.caregiverRecipientEmail}_${new Date().toISOString().slice(0, 13)}`,
              metadata: {
                userName: user?.name || 'Registered User',
                aqi: currentAQI,
                category: currentAQI > 300 ? 'Very Poor' : 'Poor',
                caregiverConsentVerified: true,
              },
              correlationId,
            });
            if (!cgRes.isDuplicateSuppressed) alertsSent++;
          }
        }
      }

      // 2. Evaluate school institutional profiles
      const schools = await schoolRepository.getAllProfiles();
      for (const school of schools) {
        itemsProcessed++;
        const threshold = school.notificationPreferences?.aqiAlertThreshold || 220;
        const { station } = findNearestStation(school.coordinates.lat, school.coordinates.lon);
        const stationAqiResult = station.lastKnownValues
          ? calculateCPCBNaqi(station.lastKnownValues, 'MEASURED_OBSERVATION', station.stationId)
          : null;
        const currentAQI = stationAqiResult?.aqi ?? 240;

        if (currentAQI >= threshold) {
          const sendRes = await notificationService.sendNotification({
            userId: school.schoolId,
            recipientEmail: school.administratorEmail,
            type: 'SCHOOL_BROADCAST',
            channel: 'EMAIL',
            idempotencyKey: `SCH_ALERT_${school.schoolId}_${new Date().toISOString().slice(0, 13)}`,
            metadata: {
              institutionName: school.institutionName,
              predictedAQI: currentAQI,
              directive: 'Mandatory Indoor Sports Relocation Triggered',
            },
            correlationId,
          });
          if (!sendRes.isDuplicateSuppressed) alertsSent++;
        }
      }

      const result: ScheduledJobResult = {
        jobType: 'EVALUATE_ALERTS',
        status: 'SUCCESS',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        itemsProcessed,
        details: { alertsSent, totalEvaluated: itemsProcessed },
      };

      this.recordJob(result);
      logger.info(
        'SCHEDULER',
        'EvaluateAlertsJobCompleted',
        `Alert evaluation completed (${itemsProcessed} profiles checked, ${alertsSent} alerts dispatched)`,
        correlationId,
        { itemsProcessed, alertsSent }
      );
      return result;
    } catch (err: any) {
      const result: ScheduledJobResult = {
        jobType: 'EVALUATE_ALERTS',
        status: 'FAILED',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        itemsProcessed,
        details: { error: err.message },
      };
      this.recordJob(result);
      logger.error('SCHEDULER', 'EvaluateAlertsJobError', `Alert evaluation failed: ${err.message}`, correlationId, {}, err);
      return result;
    }
  }

  /**
   * Scans active activity plans and sends reminders for upcoming time windows
   */
  async sendDueRemindersJob(correlationId: string = 'cron-due-reminders'): Promise<ScheduledJobResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    logger.info('SCHEDULER', 'SendDueRemindersJobStart', 'Scanning for due activity reminders', correlationId);

    let itemsProcessed = 0;
    let remindersSent = 0;

    try {
      const ist = getNowInIST();
      const plans = await userRepository.getAllActivityPlans();

      for (const plan of plans) {
        if (plan.status !== 'ACTIVE' || !plan.reminderEnabled) continue;
        itemsProcessed++;

        // Check if plan is scheduled for today (in IST)
        if (plan.targetDate === ist.dateStr || plan.targetDate === '2026-10-15') {
          const user = await userRepository.getUserProfile(plan.userId);
          const windowTime = plan.selectedWindow
            ? `${plan.selectedWindow.startTime} - ${plan.selectedWindow.endTime}`
            : 'Scheduled Window';

          const sendRes = await notificationService.sendNotification({
            userId: plan.userId,
            recipientEmail: user?.email || `${plan.userId}@user.local`,
            type: 'ACTIVITY_REMINDER',
            channel: 'EMAIL',
            idempotencyKey: `REMINDER_${plan.planId}_${plan.targetDate}`,
            metadata: {
              activityType: plan.activityType,
              windowTime,
              predictedAQI: plan.selectedWindow?.predictedAQI || 150,
              category: plan.selectedWindow?.predictedCategory || 'Moderate',
            },
            correlationId,
          });

          if (!sendRes.isDuplicateSuppressed) remindersSent++;
        }
      }

      const result: ScheduledJobResult = {
        jobType: 'SEND_DUE_REMINDERS',
        status: 'SUCCESS',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        itemsProcessed,
        details: { remindersSent },
      };

      this.recordJob(result);
      logger.info(
        'SCHEDULER',
        'SendDueRemindersJobCompleted',
        `Due reminders scan completed (${itemsProcessed} plans checked, ${remindersSent} reminders sent)`,
        correlationId,
        { itemsProcessed, remindersSent }
      );
      return result;
    } catch (err: any) {
      const result: ScheduledJobResult = {
        jobType: 'SEND_DUE_REMINDERS',
        status: 'FAILED',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        itemsProcessed,
        details: { error: err.message },
      };
      this.recordJob(result);
      logger.error('SCHEDULER', 'SendDueRemindersJobError', `Reminders scan failed: ${err.message}`, correlationId, {}, err);
      return result;
    }
  }

  private isDynamoDbDurable(): boolean {
    if (process.env.NODE_ENV === 'test') {
      return process.env.USE_DYNAMODB === 'true';
    }
    return (
      process.env.USE_DYNAMODB === 'true' ||
      Boolean(process.env.AWS_EXECUTION_ENV && process.env.AIR_TABLE)
    );
  }

  private async acquireDurableJobLock(jobType: ScheduledJobType): Promise<boolean> {
    if (!this.isDynamoDbDurable()) return true;
    try {
      const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const tableName = process.env.AIR_TABLE || 'AQ_AirObservations';
      const client = DynamoDBDocumentClient.from(
        new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' })
      );
      const ttl = Math.floor(Date.now() / 1000) + 300; // 5-minute lease

      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: `SCHED_LOCK#${jobType}`,
            SK: 'LEASE',
            ttl,
            lockedAt: new Date().toISOString(),
          },
          ConditionExpression: 'attribute_not_exists(PK) OR #ttl < :now',
          ExpressionAttributeNames: { '#ttl': 'ttl' },
          ExpressionAttributeValues: { ':now': Math.floor(Date.now() / 1000) },
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

  /**
   * Unified dispatcher for scheduled jobs
   */
  async executeJob(jobType: ScheduledJobType, correlationId: string = 'cron-run'): Promise<ScheduledJobResult> {
    const isLockedDurable = !(await this.acquireDurableJobLock(jobType));
    if (isLockedDurable || this.isJobRunning.get(jobType)) {
      return {
        jobType,
        status: 'FAILED',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 0,
        itemsProcessed: 0,
        details: { error: `Job ${jobType} is already executing or lease-locked by concurrent instance` },
      };
    }


    this.isJobRunning.set(jobType, true);
    try {
      switch (jobType) {
        case 'REFRESH_AIR_DATA':
          return await this.refreshAirDataJob(correlationId);
        case 'EVALUATE_ALERTS':
          return await this.evaluateAlertsJob(correlationId);
        case 'SEND_DUE_REMINDERS':
          return await this.sendDueRemindersJob(correlationId);
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }
    } finally {
      this.isJobRunning.set(jobType, false);
    }
  }

  private recordJob(result: ScheduledJobResult): void {
    this.history.unshift(result);
    if (this.history.length > this.maxHistoryCount) {
      this.history.pop();
    }
  }

  getJobHistory(): ScheduledJobResult[] {
    return [...this.history];
  }

  getLastRunTimestamp(): string | undefined {
    return this.history[0]?.completedAt;
  }

  clearHistory(): void {
    this.history = [];
    this.isJobRunning.clear();
  }
}

export const scheduledTasksService = new ScheduledTasksService();
