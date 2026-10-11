import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { isDynamoDbConfigured } from '../src/repositories/config';
import { RepositoryFactory } from '../src/repositories/repositoryFactory';
import { DynamoDbUserRepository } from '../src/repositories/dynamoDbUserRepository';
import { DynamoDbSchoolRepository } from '../src/repositories/dynamoDbSchoolRepository';
import { DynamoDbMarketplaceRepository } from '../src/repositories/dynamoDbMarketplaceRepository';
import { DynamoDbAirRepository } from '../src/repositories/dynamoDbAirRepository';
import { DynamoDbAuditRepository } from '../src/repositories/dynamoDbAuditRepository';
import { inMemoryMarketplaceRepository } from '../src/repositories/marketplaceRepository';
import { notificationService } from '../src/services/notificationService';

describe('Production Persistence, Repository Factory & Idempotency Safeguards (Prompt 10)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Configuration Detection & Factory Selection', () => {
    it('detects DynamoDB is not configured during standard local test runs', () => {
      delete process.env.USE_DYNAMODB;
      delete process.env.AWS_EXECUTION_ENV;
      delete process.env.USERS_TABLE;
      assert.strictEqual(isDynamoDbConfigured(), false);
    });

    it('detects DynamoDB configuration when USE_DYNAMODB is set to true', () => {
      process.env.USE_DYNAMODB = 'true';
      assert.strictEqual(isDynamoDbConfigured(), true);
    });

    it('detects DynamoDB configuration when AWS_EXECUTION_ENV is set (AWS Lambda)', () => {
      delete process.env.USE_DYNAMODB;
      process.env.NODE_ENV = 'production';
      process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';
      process.env.USERS_TABLE = 'AQ_UsersAndPlans';
      assert.strictEqual(isDynamoDbConfigured(), true);
    });

    it('detects DynamoDB configuration when USERS_TABLE is provided with NODE_ENV production', () => {
      delete process.env.USE_DYNAMODB;
      delete process.env.AWS_EXECUTION_ENV;
      process.env.NODE_ENV = 'production';
      process.env.USERS_TABLE = 'AQ_UsersAndPlans';
      assert.strictEqual(isDynamoDbConfigured(), true);
    });

    it('RepositoryFactory instantiates DynamoDB adapters when configured', () => {
      process.env.USE_DYNAMODB = 'true';
      const factory = new RepositoryFactory();

      const userRepo = factory.getUserRepository();
      assert.ok(userRepo instanceof DynamoDbUserRepository, 'Should instantiate DynamoDbUserRepository');

      const schoolRepo = factory.getSchoolRepository();
      assert.ok(schoolRepo instanceof DynamoDbSchoolRepository, 'Should instantiate DynamoDbSchoolRepository');

      const marketRepo = factory.getMarketplaceRepository();
      assert.ok(marketRepo instanceof DynamoDbMarketplaceRepository, 'Should instantiate DynamoDbMarketplaceRepository');

      const airRepo = factory.getAirRepository();
      assert.ok(airRepo instanceof DynamoDbAirRepository, 'Should instantiate DynamoDbAirRepository');

      const auditRepo = factory.getAuditRepository();
      assert.ok(auditRepo instanceof DynamoDbAuditRepository, 'Should instantiate DynamoDbAuditRepository');
    });
  });

  describe('2. DynamoDB Mock Client Command Construction & Key Conventions', () => {
    it('DynamoDbUserRepository constructs single-table PK/SK format', async () => {
      const capturedCommands: any[] = [];
      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          return {};
        },
      };

      const repo = new DynamoDbUserRepository('AQ_UsersAndPlans', mockDocClient as any);
      await repo.saveUserProfile({
        userId: 'USER_TEST_1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PERSONAL_USER',
        isEmailVerified: true,
        createdAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-10T00:00:00.000Z',
      });

      assert.strictEqual(capturedCommands.length, 1);
      const putItem = capturedCommands[0].input.Item;
      assert.strictEqual(putItem.PK, 'USER#USER_TEST_1');
      assert.strictEqual(putItem.SK, 'PROFILE');
      assert.strictEqual(putItem.GSI1PK, 'ROLE#PERSONAL_USER');
      assert.strictEqual(putItem.GSI1SK, 'EMAIL#test@example.com');
      assert.strictEqual(putItem.email, 'test@example.com');
    });

    it('DynamoDbSchoolRepository constructs tenant-isolated PK/SK format', async () => {
      const capturedCommands: any[] = [];
      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          return {};
        },
      };

      const repo = new DynamoDbSchoolRepository('AQ_SchoolPlanner', mockDocClient as any);
      await repo.saveSchoolActivity({
        activityId: 'ACT_SPORTS_1',
        schoolId: 'KV_DELHI_01',
        campusId: 'CAMPUS_MAIN',
        activityName: 'Morning Athletics',
        activityType: 'SPORTS_PRACTICE',
        ageGroup: 'middle',
        scheduledDate: '2026-10-11',
        startTime: '08:00',
        endTime: '09:30',
        indoorAlternativeVenue: 'Indoor Gymnasium',
        predictedAQI: 120,
        category: 'Moderate',
        evaluationStatus: 'PRECAUTIONARY_OUTDOOR_PERMITTED',
        requiresAdminSignOff: false,
        createdAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-10T00:00:00.000Z',
      }, 'ADMIN_ACTOR');

      assert.strictEqual(capturedCommands.length, 1);
      const putItem = capturedCommands[0].input.Item;
      assert.strictEqual(putItem.PK, 'SCHOOL#KV_DELHI_01');
      assert.strictEqual(putItem.SK, 'ACTIVITY#ACT_SPORTS_1');
      assert.strictEqual(putItem.GSI1PK, 'SCHOOL#KV_DELHI_01');
      assert.strictEqual(putItem.GSI1SK, 'DATE#2026-10-11#ACT_SPORTS_1');
    });

    it('DynamoDbMarketplaceRepository constructs bounded listing and offer keys', async () => {
      const capturedCommands: any[] = [];
      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);
      await repo.saveListing({
        listingId: 'LIST_PUNJAB_01',
        farmerId: 'FARMER_GURPREET',
        farmerName: 'Gurpreet Singh',
        farmerPhoneMasked: '+91 98765 *****',
        state: 'Punjab',
        district: 'Sangrur',
        locationName: 'Bhawanigarh Village',
        cropType: 'Paddy Straw (Non-Basmati)',
        quantityTons: 120,
        moisturePercent: 14,
        askingPricePerTonInr: 2200,
        balingType: 'Ex-Field Baled (Round/Square)',
        availableFromDate: '2026-10-12',
        availableUntilDate: '2026-10-25',
        status: 'LISTED',
        isDemoData: false,
        coordinates: { lat: 30.23, lon: 75.98 },
        createdAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-10T00:00:00.000Z',
      }, 'FARMER_GURPREET');

      assert.strictEqual(capturedCommands.length, 1);
      const putItem = capturedCommands[0].input.Item;
      assert.strictEqual(putItem.PK, 'LISTING#LIST_PUNJAB_01');
      assert.strictEqual(putItem.SK, 'METADATA');
      assert.strictEqual(putItem.GSI1PK, 'FARMER#FARMER_GURPREET');
      assert.strictEqual(putItem.GSI2PK, 'STATUS#LISTED');
    });

    it('DynamoDbAuditRepository writes single-table audit events to AQ_UsersAndPlans', async () => {
      const capturedCommands: any[] = [];
      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          return {};
        },
      };

      const repo = new DynamoDbAuditRepository('AQ_UsersAndPlans', mockDocClient as any);
      const event = await repo.recordEvent({
        entityType: 'OFFER',
        entityId: 'OFFER_AUDIT_123',
        actorId: 'ACTOR_BUYER_01',
        actorRole: 'BUYER',
        action: 'OFFER_ACCEPTED',
        metadata: { price: 2100 },
      });

      assert.strictEqual(capturedCommands.length, 1);
      const putItem = capturedCommands[0].input.Item;
      assert.strictEqual(putItem.PK, 'AUDIT#OFFER_AUDIT_123');
      assert.ok(putItem.SK.startsWith('EVENT#'));
      assert.strictEqual(putItem.GSI1PK, 'ACTOR#ACTOR_BUYER_01');
      assert.strictEqual(event.entityId, 'OFFER_AUDIT_123');
    });

    it('DynamoDbAirRepository constructs station snapshot and timestamped observation items', async () => {
      const capturedCommands: any[] = [];
      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          return {};
        },
      };

      const repo = new DynamoDbAirRepository('AQ_AirObservations', mockDocClient as any);
      await repo.saveObservation({
        stationId: 'STN_DELHI_ITO',
        stationName: 'ITO Monitoring Station',
        district: 'Central Delhi',
        state: 'Delhi',
        coordinates: { lat: 28.62, lon: 77.24 },
        agency: 'CPCB',
        aqi: 319,
        category: 'Very Poor',
        dominantPollutant: 'PM2.5',
        pollutants: { pm25: 145, pm10: 260 },
        observationTimestamp: '2026-10-10T12:00:00.000Z',
        sourceTimezone: 'Asia/Kolkata',
        provenance: 'MEASURED_OBSERVATION',
        isTelemetryAvailable: true,
      });

      // Saves both timestamped history and LATEST snapshot
      assert.strictEqual(capturedCommands.length, 2);
      const historyItem = capturedCommands[0].input.Item;
      assert.strictEqual(historyItem.PK, 'STATION#STN_DELHI_ITO');
      assert.strictEqual(historyItem.SK, 'OBS#2026-10-10T12:00:00.000Z');
      assert.strictEqual(historyItem.aqi, 319);

      const latestItem = capturedCommands[1].input.Item;
      assert.strictEqual(latestItem.PK, 'STATION#STN_DELHI_ITO');
      assert.strictEqual(latestItem.SK, 'LATEST');
    });

    it('DynamoDbMarketplaceRepository enforces attribute_not_exists conditional write on createOffer', async () => {
      const capturedCommands: any[] = [];
      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);
      await repo.createOffer({
        offerId: 'OFFER_COND_TEST',
        listingId: 'LISTING_1',
        buyerId: 'BUYER_1',
        farmerId: 'FARMER_1',
        offeredPricePerTonInr: 2100,
        quantityTons: 100,
        status: 'SUBMITTED',
        lastUpdatedTimestamp: '2026-10-10T00:00:00Z',
        isDemoData: false,
      }, 'BUYER_1');

      assert.ok(capturedCommands.length >= 1);
      const putCmd = capturedCommands[0];
      assert.strictEqual(putCmd.input.ConditionExpression, 'attribute_not_exists(PK)');
    });
  });

  describe('3. Durable Idempotency & Terminal Offer Protection', () => {
    it('notification service deduplicates requests with identical idempotencyKey', async () => {
      const idempotencyKey = `PROMPT10_IDEMP_${Date.now()}`;
      const firstRes = await notificationService.sendNotification({
        userId: 'USER_IDEMP_TEST',
        recipientEmail: 'idemp@example.com',
        type: 'PERSONAL_ALERT',
        channel: 'EMAIL',
        idempotencyKey,
        metadata: { aqi: 240 },
      });

      assert.strictEqual(firstRes.record.status, 'DELIVERED_SIMULATED');
      assert.strictEqual(firstRes.isDuplicateSuppressed, false);

      const duplicateRes = await notificationService.sendNotification({
        userId: 'USER_IDEMP_TEST',
        recipientEmail: 'idemp@example.com',
        type: 'PERSONAL_ALERT',
        channel: 'EMAIL',
        idempotencyKey,
        metadata: { aqi: 240 },
      });

      assert.strictEqual(duplicateRes.isDuplicateSuppressed, true);
      assert.strictEqual(duplicateRes.record.id, firstRes.record.id);
    });

    it('inMemoryMarketplaceRepository rejects mutating terminal offer states', async () => {
      inMemoryMarketplaceRepository.clear();
      const listing = await inMemoryMarketplaceRepository.saveListing({
        listingId: 'LIST_TERM_TEST',
        farmerId: 'FARMER_TEST',
        farmerName: 'Farmer',
        farmerPhoneMasked: '+91 98765 *****',
        state: 'Punjab',
        district: 'Sangrur',
        locationName: 'Test Field',
        cropType: 'Paddy Straw (Non-Basmati)',
        quantityTons: 50,
        moisturePercent: 14,
        askingPricePerTonInr: 2000,
        balingType: 'Loose Stubble',
        availableFromDate: '2026-10-12',
        availableUntilDate: '2026-10-25',
        status: 'LISTED',
        isDemoData: false,
        coordinates: { lat: 30.2, lon: 76.0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, 'FARMER_TEST');

      const offer = await inMemoryMarketplaceRepository.createOffer({
        offerId: 'OFFER_TERM_TEST',
        listingId: listing.listingId,
        buyerId: 'BUYER_TEST',
        farmerId: 'FARMER_TEST',
        offeredPricePerTonInr: 2100,
        quantityTons: 50,
        status: 'SUBMITTED',
        lastUpdatedTimestamp: new Date().toISOString(),
        isDemoData: false,
      }, 'BUYER_TEST');

      // Advance offer to ACCEPTED
      const accepted = await inMemoryMarketplaceRepository.respondToOffer(
        'OFFER_TERM_TEST',
        'ACCEPT',
        'FARMER_TEST',
        'FARMER'
      );
      assert.strictEqual(accepted.status, 'ACCEPTED');

      // Attempt to reject already ACCEPTED terminal offer must throw
      await assert.rejects(
        async () => {
          await inMemoryMarketplaceRepository.respondToOffer(
            'OFFER_TERM_TEST',
            'REJECT',
            'FARMER_TEST',
            'FARMER'
          );
        },
        /Cannot transition offer currently in terminal state/
      );
    });
  });

  describe('4. DynamoDbMarketplaceRepository Atomic Concurrency & Idempotency Safeguards', () => {
    it('constructs TransactWriteCommand with conditional capacity decrement on createCollectionRecord', async () => {
      const capturedCommands: any[] = [];
      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          if (cmd.input?.Key?.PK === 'OFFER#OFFER_DDB_CONC') {
            return {
              Item: {
                PK: 'OFFER#OFFER_DDB_CONC',
                SK: 'METADATA',
                offerId: 'OFFER_DDB_CONC',
                listingId: 'LIST_1',
                status: 'ACCEPTED',
                quantityTons: 300,
                remainingQuantityTons: 300,
                totalCollectedTons: 0,
              },
            };
          }
          if (cmd.input?.Key?.PK === 'COLL#COLL_DDB_1') {
            return { Item: undefined };
          }
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);
      await repo.createCollectionRecord(
        {
          collectionId: 'COLL_DDB_1',
          offerId: 'OFFER_DDB_CONC',
          listingId: 'LIST_1',
          buyerId: 'BUYER_1',
          farmerId: 'FARMER_1',
          transporterName: 'Malwa Express Logistics',
          vehicleRegistrationNumber: 'PB-10-XX-1234',
          stage: 'SCHEDULED',
          scheduledPickupDate: '2026-10-15',
          fieldWeighbridgeGrossTons: 200,
          updatedAt: '2026-10-11T00:00:00Z',
          isDemoData: false,
        },
        'BUYER_1',
        'BUYER'
      );

      // Verify that TransactWriteCommand was executed
      const transactCmd = capturedCommands.find(
        cmd => cmd.constructor.name === 'TransactWriteCommand' || cmd.input?.TransactItems
      );
      assert.ok(transactCmd, 'Expected TransactWriteCommand to be issued');
      const items = transactCmd.input.TransactItems;
      assert.strictEqual(items.length, 2);

      // Item 0: Atomic offer update with conditional remaining tonnage decrement
      const offerUpdate = items[0].Update;
      assert.strictEqual(offerUpdate.Key.PK, 'OFFER#OFFER_DDB_CONC');
      assert.strictEqual(
        offerUpdate.UpdateExpression,
        'SET remainingQuantityTons = remainingQuantityTons - :incomingTons, reservedQuantityTons = if_not_exists(reservedQuantityTons, :zero) + :incomingTons'
      );
      assert.strictEqual(
        offerUpdate.ConditionExpression,
        'attribute_exists(PK) AND #status = :accepted AND remainingQuantityTons >= :incomingTons'
      );
      assert.strictEqual(offerUpdate.ExpressionAttributeValues[':incomingTons'], 200);
      assert.strictEqual(offerUpdate.ExpressionAttributeValues[':zero'], 0);

      // Item 1: Put collection record conditioned on attribute_not_exists
      const colPut = items[1].Put;
      assert.strictEqual(colPut.Item.PK, 'COLL#COLL_DDB_1');
      assert.strictEqual(colPut.ConditionExpression, 'attribute_not_exists(PK)');
    });

    it('atomically maps TransactionCanceledException to Quantity integrity violation error and prevents partial writes', async () => {
      const mockDocClient = {
        send: async (cmd: any) => {
          if (cmd.input?.Key?.PK === 'OFFER#OFFER_DDB_EXCESS') {
            return {
              Item: {
                PK: 'OFFER#OFFER_DDB_EXCESS',
                SK: 'METADATA',
                offerId: 'OFFER_DDB_EXCESS',
                listingId: 'LIST_1',
                status: 'ACCEPTED',
                quantityTons: 300,
                remainingQuantityTons: 100, // Only 100T left
                totalCollectedTons: 200,
              },
            };
          }
          if (cmd.input?.Key?.PK === 'COLL#COLL_DDB_EXCESS') {
            return { Item: undefined };
          }
          if (cmd.input?.TransactItems) {
            const err: any = new Error('Transaction cancelled');
            err.name = 'TransactionCanceledException';
            err.CancellationReasons = [
              { Code: 'ConditionalCheckFailed', Message: 'The conditional request failed' },
              { Code: 'None' },
            ];
            throw err;
          }
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);
      await assert.rejects(
        async () => {
          await repo.createCollectionRecord(
            {
              collectionId: 'COLL_DDB_EXCESS',
              offerId: 'OFFER_DDB_EXCESS',
              listingId: 'LIST_1',
              buyerId: 'BUYER_1',
              farmerId: 'FARMER_1',
              transporterName: 'Malwa Express Logistics',
              vehicleRegistrationNumber: 'PB-10-XX-1234',
              stage: 'SCHEDULED',
              scheduledPickupDate: '2026-10-15',
              fieldWeighbridgeGrossTons: 200, // Attempting 200T when only 100T remain
              updatedAt: '2026-10-11T00:00:00Z',
              isDemoData: false,
            },
            'BUYER_1',
            'BUYER'
          );
        },
        /Quantity integrity violation: Cumulative collection tonnage exceeds accepted offer quantity/
      );
    });

    it('handles idempotent retry for duplicate collectionId cleanly without issuing duplicate transaction', async () => {
      let transactCount = 0;
      const existingCollectionItem = {
        PK: 'COLL#COLL_IDEMP_1',
        SK: 'METADATA',
        collectionId: 'COLL_IDEMP_1',
        offerId: 'OFFER_DDB_IDEMP',
        listingId: 'LIST_1',
        buyerId: 'BUYER_1',
        farmerId: 'FARMER_1',
        transporterName: 'Malwa Express Logistics',
        vehicleRegistrationNumber: 'PB-10-XX-1234',
        stage: 'SCHEDULED',
        scheduledPickupDate: '2026-10-15',
        fieldWeighbridgeGrossTons: 200,
        updatedAt: '2026-10-11T00:00:00Z',
        isDemoData: false,
      };

      const mockDocClient = {
        send: async (cmd: any) => {
          if (cmd.input?.Key?.PK === 'OFFER#OFFER_DDB_IDEMP') {
            return {
              Item: {
                PK: 'OFFER#OFFER_DDB_IDEMP',
                SK: 'METADATA',
                offerId: 'OFFER_DDB_IDEMP',
                listingId: 'LIST_1',
                status: 'ACCEPTED',
                quantityTons: 300,
                remainingQuantityTons: 100,
                totalCollectedTons: 200,
              },
            };
          }
          if (cmd.input?.Key?.PK === 'COLL#COLL_IDEMP_1') {
            return { Item: existingCollectionItem };
          }
          if (cmd.input?.TransactItems) {
            transactCount++;
            return {};
          }
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);

      // Identical parameters replay
      const replayed = await repo.createCollectionRecord(
        {
          collectionId: 'COLL_IDEMP_1',
          offerId: 'OFFER_DDB_IDEMP',
          listingId: 'LIST_1',
          buyerId: 'BUYER_1',
          farmerId: 'FARMER_1',
          transporterName: 'Malwa Express Logistics',
          vehicleRegistrationNumber: 'PB-10-XX-1234',
          stage: 'SCHEDULED',
          scheduledPickupDate: '2026-10-15',
          fieldWeighbridgeGrossTons: 200,
          updatedAt: '2026-10-11T00:00:00Z',
          isDemoData: false,
        },
        'BUYER_1',
        'BUYER'
      );

      assert.strictEqual(replayed.collectionId, 'COLL_IDEMP_1');
      assert.strictEqual(transactCount, 0, 'Must NOT issue duplicate TransactWriteCommand on idempotent replay');

      // Conflicting parameters with same ID must be rejected
      await assert.rejects(
        async () => {
          await repo.createCollectionRecord(
            {
              collectionId: 'COLL_IDEMP_1',
              offerId: 'OFFER_DDB_IDEMP',
              listingId: 'LIST_1',
              buyerId: 'BUYER_1',
              farmerId: 'FARMER_1',
              transporterName: 'Malwa Express Logistics',
              vehicleRegistrationNumber: 'PB-10-XX-1234',
              stage: 'SCHEDULED',
              scheduledPickupDate: '2026-10-15',
              fieldWeighbridgeGrossTons: 150, // Conflicting tonnage
              updatedAt: '2026-10-11T00:00:00Z',
              isDemoData: false,
            },
            'BUYER_1',
            'BUYER'
          );
        },
        /Quantity integrity violation: Collection with ID COLL_IDEMP_1 already exists with conflicting data/
      );
    });

    it('constructs TransactWriteCommand updating actualCollectedGrossTons on DELIVERED milestone without double-counting', async () => {
      const capturedCommands: any[] = [];
      let currentStage: any = 'IN_TRANSIT';
      let currentGross: number | undefined = undefined;

      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          if (cmd.input?.Key?.PK === 'COLL#COLL_DDB_DELIV') {
            return {
              Item: {
                PK: 'COLL#COLL_DDB_DELIV',
                SK: 'METADATA',
                collectionId: 'COLL_DDB_DELIV',
                offerId: 'OFFER_DDB_DELIV',
                listingId: 'LIST_1',
                stage: currentStage,
                fieldWeighbridgeGrossTons: 100,
                factoryWeighbridgeGrossTons: currentGross,
                updatedAt: '2026-10-11T00:00:00Z',
              },
            };
          }
          if (cmd.input?.Key?.PK === 'OFFER#OFFER_DDB_DELIV') {
            return {
              Item: {
                PK: 'OFFER#OFFER_DDB_DELIV',
                SK: 'METADATA',
                offerId: 'OFFER_DDB_DELIV',
                status: 'ACCEPTED',
                quantityTons: 300,
                remainingQuantityTons: 200,
                reservedQuantityTons: 100,
                actualCollectedGrossTons: 0,
                totalCollectedTons: 0,
              },
            };
          }
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);

      // 1. Deliver collection with 98T factory weighbridge (variance: 100 planned - 98 actual = 2T released)
      const delivered = await repo.updateCollectionMilestone(
        'COLL_DDB_DELIV',
        'DELIVERED',
        'BUYER_1',
        'BUYER',
        { factoryWeighbridgeGrossTons: 98 }
      );
      assert.strictEqual(delivered.stage, 'DELIVERED');
      assert.strictEqual(delivered.factoryWeighbridgeGrossTons, 98);

      const transactCmd = capturedCommands.find(
        cmd => cmd.constructor?.name === 'TransactWriteCommand' || cmd.input?.TransactItems
      );
      assert.ok(transactCmd, 'Expected TransactWriteCommand for DELIVERED milestone');
      const offerUpdate = transactCmd.input.TransactItems[0].Update;
      assert.ok(
        offerUpdate.UpdateExpression.includes('actualCollectedGrossTons'),
        'Must increment actualCollectedGrossTons on physical delivery'
      );
      assert.ok(
        offerUpdate.UpdateExpression.includes('releaseReserved'),
        'Must adjust reservation variance on weighbridge gross recording'
      );
      assert.strictEqual(offerUpdate.ExpressionAttributeValues[':deltaCollected'], 98);
      assert.strictEqual(offerUpdate.ExpressionAttributeValues[':releaseReserved'], 2);

      // 2. Retry identical delivery: deltas are 0, must NOT issue duplicate TransactWriteCommand
      currentStage = 'DELIVERED';
      currentGross = 98;
      const initialTransactCount = capturedCommands.filter(
        c => c.constructor?.name === 'TransactWriteCommand' || c.input?.TransactItems
      ).length;

      await repo.updateCollectionMilestone(
        'COLL_DDB_DELIV',
        'DELIVERED',
        'BUYER_1',
        'BUYER',
        { factoryWeighbridgeGrossTons: 98 }
      );

      const postTransactCount = capturedCommands.filter(
        c => c.constructor?.name === 'TransactWriteCommand' || c.input?.TransactItems
      ).length;
      assert.strictEqual(
        postTransactCount,
        initialTransactCount,
        'Idempotent delivery retry must not issue duplicate TransactWrite or double-count tonnage'
      );
    });

    it('constructs TransactWriteCommand releasing reserved capacity on CANCELLED milestone and prevents double-release on replay', async () => {
      const capturedCommands: any[] = [];
      let currentStage: any = 'SCHEDULED';

      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          if (cmd.input?.Key?.PK === 'COLL#COLL_DDB_CANCEL') {
            return {
              Item: {
                PK: 'COLL#COLL_DDB_CANCEL',
                SK: 'METADATA',
                collectionId: 'COLL_DDB_CANCEL',
                offerId: 'OFFER_DDB_CANCEL',
                listingId: 'LIST_1',
                stage: currentStage,
                fieldWeighbridgeGrossTons: 100,
                updatedAt: '2026-10-11T00:00:00Z',
              },
            };
          }
          if (cmd.input?.Key?.PK === 'OFFER#OFFER_DDB_CANCEL') {
            return {
              Item: {
                PK: 'OFFER#OFFER_DDB_CANCEL',
                SK: 'METADATA',
                offerId: 'OFFER_DDB_CANCEL',
                status: 'ACCEPTED',
                quantityTons: 300,
                remainingQuantityTons: 200,
                reservedQuantityTons: 100,
              },
            };
          }
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);

      // Cancel collection
      const cancelled = await repo.updateCollectionMilestone(
        'COLL_DDB_CANCEL',
        'CANCELLED',
        'BUYER_1',
        'BUYER'
      );
      assert.strictEqual(cancelled.stage, 'CANCELLED');

      const transactCmd = capturedCommands.find(
        cmd => cmd.constructor?.name === 'TransactWriteCommand' || cmd.input?.TransactItems
      );
      assert.ok(transactCmd, 'Expected TransactWriteCommand for cancellation');
      const offerUpdate = transactCmd.input.TransactItems[0].Update;
      assert.strictEqual(
        offerUpdate.UpdateExpression,
        'SET remainingQuantityTons = remainingQuantityTons + :releaseReserved, reservedQuantityTons = reservedQuantityTons - :releaseReserved'
      );
      assert.strictEqual(offerUpdate.ExpressionAttributeValues[':releaseReserved'], 100);

      // Retry cancel: deltas are 0, must not issue another TransactWrite
      currentStage = 'CANCELLED';
      const beforeCount = capturedCommands.filter(
        c => c.constructor?.name === 'TransactWriteCommand' || c.input?.TransactItems
      ).length;

      await repo.updateCollectionMilestone(
        'COLL_DDB_CANCEL',
        'CANCELLED',
        'BUYER_1',
        'BUYER'
      );

      const afterCount = capturedCommands.filter(
        c => c.constructor?.name === 'TransactWriteCommand' || c.input?.TransactItems
      ).length;
      assert.strictEqual(afterCount, beforeCount, 'Cancellation retry must not double-release capacity');
    });

    it('recovers idempotently from TransactionCanceledException on concurrent identical request without relying on CancellationReasons', async () => {
      let getCalls = 0;
      const committedItem = {
        PK: 'COLL#COLL_CONC_RACE',
        SK: 'METADATA',
        collectionId: 'COLL_CONC_RACE',
        offerId: 'OFFER_CONC_RACE',
        listingId: 'LIST_1',
        buyerId: 'BUYER_1',
        farmerId: 'FARMER_1',
        stage: 'SCHEDULED',
        fieldWeighbridgeGrossTons: 150,
        transporterName: 'Punjab Agro Logistics',
        vehicleRegistrationNumber: 'PB-11-AA-9999',
        scheduledPickupDate: '2026-10-15',
        updatedAt: '2026-10-11T00:00:00Z',
        isDemoData: false,
      };

      const mockDocClient = {
        send: async (cmd: any) => {
          if (cmd.input?.Key?.PK === 'OFFER#OFFER_CONC_RACE') {
            return {
              Item: {
                PK: 'OFFER#OFFER_CONC_RACE',
                SK: 'METADATA',
                offerId: 'OFFER_CONC_RACE',
                status: 'ACCEPTED',
                quantityTons: 300,
                remainingQuantityTons: 300,
                reservedQuantityTons: 0,
              },
            };
          }
          if (cmd.input?.Key?.PK === 'COLL#COLL_CONC_RACE') {
            getCalls++;
            // On first call before transact: item not yet committed
            // On second call during error handling: item was committed by the winner
            if (getCalls === 1) return { Item: undefined };
            return { Item: committedItem };
          }
          if (cmd.input?.TransactItems) {
            // Simulate transaction failure due to concurrent write without CancellationReasons metadata
            const err: any = new Error('Transaction cancelled');
            err.name = 'TransactionCanceledException';
            // CancellationReasons intentionally omitted / empty
            throw err;
          }
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);

      // Concurrent replay attempt must reread and converge cleanly
      const result = await repo.createCollectionRecord(
        {
          collectionId: 'COLL_CONC_RACE',
          offerId: 'OFFER_CONC_RACE',
          listingId: 'LIST_1',
          buyerId: 'BUYER_1',
          farmerId: 'FARMER_1',
          stage: 'SCHEDULED',
          fieldWeighbridgeGrossTons: 150,
          transporterName: 'Punjab Agro Logistics',
          vehicleRegistrationNumber: 'PB-11-AA-9999',
          scheduledPickupDate: '2026-10-15',
          updatedAt: '2026-10-11T00:00:00Z',
          isDemoData: false,
        },
        'BUYER_1',
        'BUYER'
      );

      assert.strictEqual(result.collectionId, 'COLL_CONC_RACE');
      assert.strictEqual(result.fieldWeighbridgeGrossTons, 150);
      assert.strictEqual(getCalls, 2, 'Must have re-read DynamoDB on transaction cancellation to converge idempotently');
    });

    it('constructs TransactWriteCommand distinguishing physical pickup gross vs plant delivered gross and preserves collected gross on gate rejection', async () => {
      const capturedCommands: any[] = [];
      let currentStage: any = 'LOADING';
      let currentPickupTons: number | undefined = 100;
      let currentDeliveredTons: number | undefined = undefined;
      let currentRejectedTons: number | undefined = undefined;

      const mockDocClient = {
        send: async (cmd: any) => {
          capturedCommands.push(cmd);
          if (cmd.input?.Key?.PK === 'COLL#COLL_DDB_PREC') {
            return {
              Item: {
                PK: 'COLL#COLL_DDB_PREC',
                SK: 'METADATA',
                collectionId: 'COLL_DDB_PREC',
                offerId: 'OFFER_DDB_PREC',
                listingId: 'LIST_PREC',
                stage: currentStage,
                fieldWeighbridgeGrossTons: currentPickupTons,
                physicalCollectionQuantityTons: currentPickupTons,
                physicalCollectionTimestamp: '2026-10-11T09:00:00Z',
                physicalCollectionSource: 'FARM_PORTABLE_SCALE',
                factoryWeighbridgeGrossTons: currentDeliveredTons,
                deliveredGrossTons: currentDeliveredTons,
                rejectedQuantityTons: currentRejectedTons,
                updatedAt: '2026-10-11T00:00:00Z',
              },
            };
          }
          if (cmd.input?.Key?.PK === 'OFFER#OFFER_DDB_PREC') {
            return {
              Item: {
                PK: 'OFFER#OFFER_DDB_PREC',
                SK: 'METADATA',
                offerId: 'OFFER_DDB_PREC',
                status: 'ACCEPTED',
                quantityTons: 400,
                remainingQuantityTons: 300,
                reservedQuantityTons: 100,
                actualCollectedGrossTons: 100,
                totalCollectedTons: 100,
                deliveredGrossTons: 0,
                rejectedQuantityTons: 0,
              },
            };
          }
          return {};
        },
      };

      const repo = new DynamoDbMarketplaceRepository('AQ_Marketplace', mockDocClient as any);

      // 1. Deliver collection with 98T plant weighbridge (transit discrepancy: 100 pickup - 98 plant = 2T transit loss)
      const delivered = await repo.updateCollectionMilestone(
        'COLL_DDB_PREC',
        'DELIVERED',
        'BUYER_1',
        'BUYER',
        {
          factoryWeighbridgeGrossTons: 98,
          deliveredGrossTons: 98,
          deliveryTimestamp: '2026-10-11T13:00:00Z',
        }
      );
      assert.strictEqual(delivered.stage, 'DELIVERED');
      assert.strictEqual(delivered.physicalCollectionQuantityTons, 100);
      assert.strictEqual(delivered.deliveredGrossTons, 98);
      assert.strictEqual(delivered.transitLossTons, 2, 'Exposes transit loss without overwriting raw measurements');

      const deliverTransact = capturedCommands.find(
        cmd => (cmd.constructor?.name === 'TransactWriteCommand' || cmd.input?.TransactItems) &&
               cmd.input.TransactItems[0].Update?.ExpressionAttributeValues[':deltaDelivered']
      );
      assert.ok(deliverTransact, 'Expected TransactWriteCommand for DELIVERED milestone with deltaDelivered');
      const deliverOfferUpdate = deliverTransact.input.TransactItems[0].Update;
      assert.ok(
        deliverOfferUpdate.UpdateExpression.includes('deliveredGrossTons'),
        'Must increment deliveredGrossTons on plant weighbridge receipt'
      );
      assert.strictEqual(deliverOfferUpdate.ExpressionAttributeValues[':deltaDelivered'], 98);
      assert.strictEqual(deliverOfferUpdate.ExpressionAttributeValues[':releaseReserved'], 2);

      // 2. Gate Rejection: biomass was physically collected from farm, so actualCollectedGrossTons must NOT be decremented
      capturedCommands.length = 0;
      currentStage = 'DELIVERED';
      currentDeliveredTons = 98;

      const rejected = await repo.updateCollectionMilestone(
        'COLL_DDB_PREC',
        'REJECTED',
        'BUYER_1',
        'BUYER',
        {
          cancellationReason: 'High moisture at receiving gate',
          exceptionType: 'REJECTED_AT_GATE',
          rejectionDisposition: 'RETURNED_TO_FARM',
          rejectedQuantityTons: 100,
        }
      );
      assert.strictEqual(rejected.stage, 'REJECTED');
      assert.strictEqual(rejected.exceptionType, 'REJECTED_AT_GATE');
      assert.strictEqual(rejected.rejectionDisposition, 'RETURNED_TO_FARM');

      const rejectTransact = capturedCommands.find(
        cmd => cmd.constructor?.name === 'TransactWriteCommand' || cmd.input?.TransactItems
      );
      assert.ok(rejectTransact, 'Expected TransactWriteCommand for gate rejection');
      const rejectOfferUpdate = rejectTransact.input.TransactItems[0].Update;

      assert.ok(
        !rejectOfferUpdate.UpdateExpression.includes('releaseCollected') &&
        !rejectOfferUpdate.UpdateExpression.includes('actualCollectedGrossTons = actualCollectedGrossTons -'),
        'CRITICAL: Gate rejection must NEVER erase recorded physical farm collection tonnage'
      );
      assert.ok(
        rejectOfferUpdate.UpdateExpression.includes('rejectedQuantityTons'),
        'Must increment rejectedQuantityTons on gate rejection'
      );
      assert.ok(
        rejectOfferUpdate.UpdateExpression.includes('releaseReserved'),
        'Must release plant reservation variance back to offer'
      );
      assert.strictEqual(rejectOfferUpdate.ExpressionAttributeValues[':deltaRejected'], 100);
      assert.strictEqual(rejectOfferUpdate.ExpressionAttributeValues[':releaseReserved'], 98);
    });
  });
});
