/**
 * DynamoDbAirRepository
 * 
 * Production AWS DynamoDB adapter implementing IAirRepository targeting the
 * AQ_AirObservations table defined in infrastructure/lib/backend-stack.ts.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  AirObservation,
  AirForecast,
  LocalAirEstimate,
  EnvironmentalContext,
} from '../types';

export interface IAirRepository {
  saveObservation(observation: AirObservation): Promise<AirObservation>;
  getLatestObservation(stationId: string): Promise<AirObservation | null>;
  getObservationHistory(stationId: string, hours?: number): Promise<AirObservation[]>;
  getObservationsByStationAndRange(
    stationId: string,
    startIso: string,
    endIso: string,
    pollutant?: any
  ): Promise<AirObservation[]>;
  saveForecast(forecast: AirForecast): Promise<AirForecast>;
  getForecast(lat: number, lon: number): Promise<AirForecast | null>;
  getLatestForecast(lat: number, lon: number): Promise<AirForecast | null>;
  saveEstimate(estimate: LocalAirEstimate): Promise<LocalAirEstimate>;
  saveLocalEstimate(estimate: LocalAirEstimate): Promise<LocalAirEstimate>;
  getEstimate(lat: number, lon: number): Promise<LocalAirEstimate | null>;
  saveWeatherContext(arg1: any, arg2: any, arg3?: any): Promise<any>;
  getWeatherContext(lat: number, lon: number): Promise<EnvironmentalContext | null>;
  getLatestWeatherContext(lat: number, lon: number): Promise<EnvironmentalContext | null>;
  getAllLatestObservations(): AirObservation[] | Promise<AirObservation[]>;
  clear(): void;
}

export class DynamoDbAirRepository implements IAirRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly defaultTtlDays = 7;

  constructor(
    tableName = process.env.AIR_TABLE || 'AQ_AirObservations',
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

  private computeTtlSeconds(days = this.defaultTtlDays): number {
    return Math.floor(Date.now() / 1000) + days * 86400;
  }

  // --- Air Observations ---
  async saveObservation(observation: AirObservation): Promise<AirObservation> {
    const ttl = this.computeTtlSeconds(14); // 14-day regulatory history retention

    // Save timestamped history entry
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `STATION#${observation.stationId}`,
          SK: `OBS#${observation.observationTimestamp}`,
          ttl,
          ...observation,
        },
      })
    );

    // Save/update latest snapshot for quick station lookups
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `STATION#${observation.stationId}`,
          SK: 'LATEST',
          ttl,
          ...observation,
        },
      })
    );

    return observation;
  }

  async getLatestObservation(stationId: string): Promise<AirObservation | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `STATION#${stationId}`,
          SK: 'LATEST',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, ttl, ...obs } = res.Item;
    return obs as AirObservation;
  }

  async getObservationHistory(stationId: string, hours = 24): Promise<AirObservation[]> {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startSk AND :endSk',
        ExpressionAttributeValues: {
          ':pk': `STATION#${stationId}`,
          ':startSk': `OBS#${cutoff}`,
          ':endSk': 'OBS#9999-99-99',
        },
        ScanIndexForward: false, // Newest first
      })
    );

    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, ttl, ...obs } = item;
      return obs as AirObservation;
    });
  }

  // --- Numerical Forecasts ---
  async saveForecast(forecast: AirForecast): Promise<AirForecast> {
    const coordKey = `${forecast.coordinates.lat.toFixed(4)}#${forecast.coordinates.lon.toFixed(4)}`;
    const ttl = this.computeTtlSeconds(3); // 72-hour forecast validity

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `FORECAST#${coordKey}`,
          SK: 'LATEST',
          ttl,
          ...forecast,
        },
      })
    );
    return forecast;
  }

  async getForecast(lat: number, lon: number): Promise<AirForecast | null> {
    const coordKey = `${lat.toFixed(4)}#${lon.toFixed(4)}`;
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `FORECAST#${coordKey}`,
          SK: 'LATEST',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, ttl, ...forecast } = res.Item;
    return forecast as AirForecast;
  }

  async getLatestForecast(lat: number, lon: number): Promise<AirForecast | null> {
    return this.getForecast(lat, lon);
  }

  // --- Local Estimates ---
  async saveEstimate(estimate: LocalAirEstimate): Promise<LocalAirEstimate> {
    const coordKey = `${estimate.coordinates.lat.toFixed(4)}#${estimate.coordinates.lon.toFixed(4)}`;
    const ttl = this.computeTtlSeconds(1); // 24-hour estimate cache

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `ESTIMATE#${coordKey}`,
          SK: 'LATEST',
          ttl,
          ...estimate,
        },
      })
    );
    return estimate;
  }

  async saveLocalEstimate(estimate: LocalAirEstimate): Promise<LocalAirEstimate> {
    return this.saveEstimate(estimate);
  }

  async getEstimate(lat: number, lon: number): Promise<LocalAirEstimate | null> {
    const coordKey = `${lat.toFixed(4)}#${lon.toFixed(4)}`;
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `ESTIMATE#${coordKey}`,
          SK: 'LATEST',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, ttl, ...est } = res.Item;
    return est as LocalAirEstimate;
  }

  // --- Weather Contexts ---
  async saveWeatherContext(arg1: any, arg2: any, arg3?: any): Promise<any> {
    let lat: number;
    let lon: number;
    let context: EnvironmentalContext;
    if (typeof arg1 === 'number') {
      lat = arg1;
      lon = arg2;
      context = arg3;
    } else {
      context = arg1;
      lat = arg2;
      lon = arg3;
    }

    const coordKey = `${lat.toFixed(4)}#${lon.toFixed(4)}`;
    const ttl = this.computeTtlSeconds(1);

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `WEATHER#${coordKey}`,
          SK: 'LATEST',
          ttl,
          ...context,
        },
      })
    );
    return context;
  }

  async getWeatherContext(lat: number, lon: number): Promise<EnvironmentalContext | null> {
    const coordKey = `${lat.toFixed(4)}#${lon.toFixed(4)}`;
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `WEATHER#${coordKey}`,
          SK: 'LATEST',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, ttl, ...weather } = res.Item;
    return weather as EnvironmentalContext;
  }

  async getLatestWeatherContext(lat: number, lon: number): Promise<EnvironmentalContext | null> {
    return this.getWeatherContext(lat, lon);
  }

  async getObservationsByStationAndRange(
    stationId: string,
    startIso: string,
    endIso: string,
    pollutant?: any
  ): Promise<AirObservation[]> {
    const history = await this.getObservationHistory(stationId, 72);
    return history.filter(obs => {
      const ts = obs.observationTimestamp;
      if (ts < startIso || ts > endIso) return false;
      if (pollutant && (!obs.pollutants || (obs.pollutants as any)[pollutant] === undefined)) return false;
      return true;
    });
  }

  async getAllLatestObservations(): Promise<AirObservation[]> {
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'SK = :latest AND begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
          ':latest': 'LATEST',
          ':prefix': 'STATION#',
        },
      })
    );
    if (!res.Items) return [];
    return res.Items.map(item => {
      const { PK, SK, ttl, ...obs } = item;
      return obs as AirObservation;
    });
  }

  clear(): void {
    // In-memory no-op for DynamoDB
  }
}
