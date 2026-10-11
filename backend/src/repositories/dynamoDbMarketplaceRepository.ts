/**
 * DynamoDbMarketplaceRepository
 * 
 * Production AWS DynamoDB adapter implementing IMarketplaceRepository targeting the
 * AQ_Marketplace table defined in infrastructure/lib/backend-stack.ts.
 * 
 * In local development and automated testing under zero-cloud-cost mandates,
 * InMemoryMarketplaceRepository is utilized as the deterministic test double.
 * This class provides the production persistence implementation ready for AWS deployment.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  ResidueListing,
  BuyerProfile,
  Offer,
  CollectionRecord,
  ListingStatus,
  LogisticsStage,
  UserRole,
} from '../types';
import { IMarketplaceRepository } from './marketplaceRepository';
import { auditRepository } from './auditRepository';

export class DynamoDbMarketplaceRepository implements IMarketplaceRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(tableName = process.env.MARKETPLACE_TABLE_NAME || 'AQ_Marketplace', client?: DynamoDBClient) {
    this.tableName = tableName;
    if (client && typeof (client as any).send === 'function' && !(client as any).config) {
      this.docClient = client as any;
    } else {
      const baseClient = client || new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
      this.docClient = DynamoDBDocumentClient.from(baseClient, {
        marshallOptions: { removeUndefinedValues: true },
      });
    }
  }

  // --- Residue Listings ---
  async saveListing(listing: ResidueListing, actorId: string): Promise<ResidueListing> {
    const item = {
      PK: `LISTING#${listing.listingId}`,
      SK: 'METADATA',
      GSI1PK: `FARMER#${listing.farmerId}`,
      GSI1SK: `LISTING#${listing.createdAt}`,
      GSI2PK: `STATUS#${listing.status}`,
      GSI2SK: `DISTRICT#${listing.district.toUpperCase()}`,
      ...listing,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    await auditRepository.recordEvent({
      entityType: 'LISTING',
      entityId: listing.listingId,
      actorId,
      actorRole: 'FARMER',
      action: 'LISTING_SAVED_DYNAMODB',
      newState: { status: listing.status, quantityTons: listing.quantityTons },
    });

    return listing;
  }

  async getListing(listingId: string): Promise<ResidueListing | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `LISTING#${listingId}`,
          SK: 'METADATA',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...listing } = res.Item;
    return listing as ResidueListing;
  }

  async listListings(options?: {
    district?: string;
    cropType?: string;
    status?: ListingStatus;
    farmerId?: string;
    limit?: number;
  }): Promise<ResidueListing[]> {
    let items: any[] = [];

    if (options?.farmerId) {
      const res = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :fpk',
          ExpressionAttributeValues: {
            ':fpk': `FARMER#${options.farmerId}`,
          },
          Limit: options.limit ?? 50,
          ScanIndexForward: false,
        })
      );
      items = res.Items || [];
    } else {
      // General scan with filters for local query flexibility
      const res = await this.docClient.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: 'SK = :sk',
          ExpressionAttributeValues: {
            ':sk': 'METADATA',
          },
          Limit: options?.limit ?? 50,
        })
      );
      items = (res.Items || []).filter((item: any) => item.PK.startsWith('LISTING#'));
    }

    const cleaned = items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...listing } = item;
      return listing as ResidueListing;
    });

    return cleaned.filter(l => {
      if (options?.district && l.district.toLowerCase() !== options.district.toLowerCase()) return false;
      if (options?.cropType && l.cropType !== options.cropType) return false;
      if (options?.status && l.status !== options.status) return false;
      return true;
    });
  }

  async updateListing(
    listingId: string,
    updates: Partial<ResidueListing>,
    actorId: string
  ): Promise<ResidueListing> {
    const existing = await this.getListing(listingId);
    if (!existing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    const updated: ResidueListing = {
      ...existing,
      ...updates,
      listingId,
      farmerId: existing.farmerId,
      updatedAt: new Date().toISOString(),
    };

    return this.saveListing(updated, actorId);
  }

  async deleteListing(listingId: string, actorId: string): Promise<boolean> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `LISTING#${listingId}`,
          SK: 'METADATA',
        },
      })
    );

    await auditRepository.recordEvent({
      entityType: 'LISTING',
      entityId: listingId,
      actorId,
      actorRole: 'FARMER',
      action: 'LISTING_DELETED_DYNAMODB',
    });

    return true;
  }

  // --- Industrial Buyers ---
  async saveBuyerProfile(buyer: BuyerProfile): Promise<BuyerProfile> {
    const item = {
      PK: `BUYER#${buyer.buyerId}`,
      SK: 'PROFILE',
      GSI1PK: 'BUYERS_ALL',
      GSI1SK: buyer.buyerId,
      ...buyer,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    return buyer;
  }

  async getBuyerProfile(buyerId: string): Promise<BuyerProfile | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `BUYER#${buyerId}`,
          SK: 'PROFILE',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, ...profile } = res.Item;
    return profile as BuyerProfile;
  }

  async listBuyers(): Promise<BuyerProfile[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gpk',
        ExpressionAttributeValues: {
          ':gpk': 'BUYERS_ALL',
        },
      })
    );

    return (res.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, ...b } = item;
      return b as BuyerProfile;
    });
  }

  async updateBuyerProfile(buyerId: string, updates: Partial<BuyerProfile>): Promise<BuyerProfile> {
    const existing = await this.getBuyerProfile(buyerId);
    if (!existing) {
      throw new Error(`Buyer profile not found: ${buyerId}`);
    }

    const updated: BuyerProfile = {
      ...existing,
      ...updates,
      buyerId,
    };

    return this.saveBuyerProfile(updated);
  }

  // --- Offers & Negotiations ---
  async createOffer(offer: Offer, actorId: string): Promise<Offer> {
    const item = {
      PK: `OFFER#${offer.offerId}`,
      SK: 'METADATA',
      GSI1PK: `LISTING#${offer.listingId}`,
      GSI1SK: `OFFER#${offer.lastUpdatedTimestamp}`,
      GSI2PK: `BUYER#${offer.buyerId}`,
      GSI2SK: `OFFER#${offer.lastUpdatedTimestamp}`,
      ...offer,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );

    // Update listing status to IN_OFFER
    const listing = await this.getListing(offer.listingId);
    if (listing && (listing.status === 'LISTED' || listing.status === 'MATCHED')) {
      await this.updateListing(listing.listingId, { status: 'IN_OFFER' }, actorId);
    }

    await auditRepository.recordEvent({
      entityType: 'OFFER',
      entityId: offer.offerId,
      actorId,
      actorRole: 'BUYER',
      action: 'OFFER_SUBMITTED_DYNAMODB',
    });

    return offer;
  }

  async respondToOffer(
    offerId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER',
    actorId: string,
    actorRole: UserRole,
    details?: { counterPrice?: number; notes?: string }
  ): Promise<Offer> {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new Error(`Offer not found: ${offerId}`);
    }

    if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED' || offer.status === 'CANCELLED') {
      throw new Error(`Cannot transition offer currently in terminal state ${offer.status}`);
    }

    if (action === 'ACCEPT') {
      offer.status = 'ACCEPTED';
      (offer as any).remainingQuantityTons = offer.quantityTons;
      (offer as any).reservedQuantityTons = 0;
      (offer as any).actualCollectedGrossTons = 0;
      (offer as any).totalCollectedTons = 0;
      (offer as any).deliveredGrossTons = 0;
      (offer as any).rejectedQuantityTons = 0;
      (offer as any).verifiedNetTons = 0;
      const listing = await this.getListing(offer.listingId);
      if (listing) {
        await this.updateListing(listing.listingId, { status: 'ACCEPTED' }, actorId);
      }
    } else if (action === 'REJECT') {
      offer.status = 'REJECTED';
    } else if (action === 'COUNTER') {
      if (!details?.counterPrice || details.counterPrice <= 0) {
        throw new Error('Counter offer requires a positive counter price per ton.');
      }
      offer.status = 'COUNTERED';
      offer.counterOfferPricePerTonInr = details.counterPrice;
      if (details.notes) offer.buyerNotes = details.notes;
    }

    offer.lastUpdatedTimestamp = new Date().toISOString();

    const item = {
      PK: `OFFER#${offer.offerId}`,
      SK: 'METADATA',
      GSI1PK: `LISTING#${offer.listingId}`,
      GSI1SK: `OFFER#${offer.lastUpdatedTimestamp}`,
      GSI2PK: `BUYER#${offer.buyerId}`,
      GSI2SK: `OFFER#${offer.lastUpdatedTimestamp}`,
      ...offer,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_exists(PK) AND #status <> :acc AND #status <> :rej AND #status <> :can',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':acc': 'ACCEPTED',
          ':rej': 'REJECTED',
          ':can': 'CANCELLED',
        },
      })
    );

    return offer;
  }

  async getOffer(offerId: string): Promise<Offer | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `OFFER#${offerId}`,
          SK: 'METADATA',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...offer } = res.Item;
    return offer as Offer;
  }

  async listOffersForListing(listingId: string): Promise<Offer[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gpk',
        ExpressionAttributeValues: {
          ':gpk': `LISTING#${listingId}`,
        },
      })
    );
    return (res.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...o } = item;
      return o as Offer;
    });
  }

  async listOffersByBuyer(buyerId: string): Promise<Offer[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gpk',
        ExpressionAttributeValues: {
          ':gpk': `BUYER#${buyerId}`,
        },
      })
    );
    return (res.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...o } = item;
      return o as Offer;
    });
  }

  async listOffersForFarmer(farmerId: string): Promise<Offer[]> {
    const listings = await this.listListings({ farmerId });
    const allOffers: Offer[] = [];
    for (const listing of listings) {
      const offers = await this.listOffersForListing(listing.listingId);
      allOffers.push(...offers);
    }
    return allOffers;
  }

  // --- Collections & Logistics ---
  async createCollectionRecord(
    collection: CollectionRecord,
    actorId: string,
    actorRole: UserRole
  ): Promise<CollectionRecord> {
    const offer = await this.getOffer(collection.offerId);
    if (!offer) {
      throw new Error(`Offer not found: ${collection.offerId}`);
    }

    if (offer.status !== 'ACCEPTED') {
      throw new Error(`Cannot initiate collection on unaccepted offer. Current status: ${offer.status}`);
    }

    const incomingTons =
      collection.physicalCollectionQuantityTons ||
      collection.deliveredGrossTons ||
      collection.verifiedNetTons ||
      collection.factoryWeighbridgeGrossTons ||
      collection.fieldWeighbridgeGrossTons ||
      0;

    if (incomingTons > offer.quantityTons) {
      throw new Error(
        `Quantity integrity violation: Collection tonnage (${incomingTons} T) exceeds accepted offer quantity (${offer.quantityTons} T).`
      );
    }

    // Idempotency check: If this collectionId was already recorded
    const existing = await this.getCollectionRecord(collection.collectionId);
    if (existing) {
      const existingTons =
        existing.physicalCollectionQuantityTons ||
        existing.deliveredGrossTons ||
        existing.verifiedNetTons ||
        existing.factoryWeighbridgeGrossTons ||
        existing.fieldWeighbridgeGrossTons ||
        0;
      if (
        existing.offerId === collection.offerId &&
        existing.listingId === collection.listingId &&
        existingTons === incomingTons
      ) {
        return existing; // idempotent return
      }
      throw new Error(
        `Quantity integrity violation: Collection with ID ${collection.collectionId} already exists with conflicting data.`
      );
    }

    // Ensure offer has durable quantity counters initialized
    if ((offer as any).remainingQuantityTons === undefined) {
      const existingCollections = await this.listCollectionsForOffer(collection.offerId);
      const existingReservedTons = existingCollections.reduce(
        (sum, c) =>
          c.stage !== 'CANCELLED' && c.stage !== 'REJECTED'
            ? sum + (c.deliveredGrossTons || c.verifiedNetTons || c.factoryWeighbridgeGrossTons || c.physicalCollectionQuantityTons || c.fieldWeighbridgeGrossTons || 0)
            : sum,
        0
      );
      const existingCollectedTons = existingCollections.reduce(
        (sum, c) =>
          c.stage === 'LOADING' || c.stage === 'IN_TRANSIT' || c.stage === 'DELIVERED' || c.stage === 'VERIFIED' || c.stage === 'REJECTED'
            ? sum + (c.physicalCollectionQuantityTons || c.fieldWeighbridgeGrossTons || c.deliveredGrossTons || c.factoryWeighbridgeGrossTons || c.verifiedNetTons || 0)
            : sum,
        0
      );
      const initialRemaining = Math.max(0, offer.quantityTons - existingReservedTons);

      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: `OFFER#${collection.offerId}`,
            SK: 'METADATA',
          },
          UpdateExpression:
            'SET remainingQuantityTons = if_not_exists(remainingQuantityTons, :initRemaining), reservedQuantityTons = if_not_exists(reservedQuantityTons, :initReserved), totalCollectedTons = if_not_exists(totalCollectedTons, :initCollected), actualCollectedGrossTons = if_not_exists(actualCollectedGrossTons, :initCollected), deliveredGrossTons = if_not_exists(deliveredGrossTons, :zero), rejectedQuantityTons = if_not_exists(rejectedQuantityTons, :zero)',
          ExpressionAttributeValues: {
            ':initRemaining': initialRemaining,
            ':initReserved': existingReservedTons,
            ':initCollected': existingCollectedTons,
            ':zero': 0,
          },
        })
      );
    }

    const item = {
      PK: `COLL#${collection.collectionId}`,
      SK: 'METADATA',
      GSI1PK: `OFFER#${collection.offerId}`,
      GSI1SK: `STAGE#${collection.stage}`,
      GSI2PK: `FARMER#${collection.farmerId || 'UNKNOWN'}`,
      GSI2SK: `COLL#${collection.updatedAt}`,
      ...collection,
    };

    const hasPickupAtCreation =
      (collection.stage === 'LOADING' || collection.stage === 'IN_TRANSIT') &&
      (collection.physicalCollectionQuantityTons !== undefined || collection.fieldWeighbridgeGrossTons !== undefined);
    const isPhysicalDelivered = collection.stage === 'DELIVERED' || collection.stage === 'VERIFIED';
    const isVerified = collection.stage === 'VERIFIED';

    const pickupTons = hasPickupAtCreation
      ? collection.physicalCollectionQuantityTons || collection.fieldWeighbridgeGrossTons || incomingTons
      : 0;
    const deliveredTons = isPhysicalDelivered
      ? collection.deliveredGrossTons || collection.factoryWeighbridgeGrossTons || collection.verifiedNetTons || incomingTons
      : 0;
    const verifiedTons = isVerified ? collection.verifiedNetTons || 0 : 0;

    let offerUpdateExpression =
      'SET remainingQuantityTons = remainingQuantityTons - :incomingTons, reservedQuantityTons = if_not_exists(reservedQuantityTons, :zero) + :incomingTons';
    const expressionAttrVals: Record<string, any> = {
      ':accepted': 'ACCEPTED',
      ':incomingTons': incomingTons,
      ':zero': 0,
    };

    if (hasPickupAtCreation) {
      offerUpdateExpression +=
        ', actualCollectedGrossTons = if_not_exists(actualCollectedGrossTons, :zero) + :pickupTons, totalCollectedTons = if_not_exists(totalCollectedTons, :zero) + :pickupTons';
      expressionAttrVals[':pickupTons'] = pickupTons;
    } else if (isPhysicalDelivered) {
      offerUpdateExpression +=
        ', actualCollectedGrossTons = if_not_exists(actualCollectedGrossTons, :zero) + :deliveredTons, totalCollectedTons = if_not_exists(totalCollectedTons, :zero) + :deliveredTons, deliveredGrossTons = if_not_exists(deliveredGrossTons, :zero) + :deliveredTons';
      expressionAttrVals[':deliveredTons'] = deliveredTons;
    }
    if (isVerified && verifiedTons > 0) {
      offerUpdateExpression += ', verifiedNetTons = if_not_exists(verifiedNetTons, :zero) + :verifiedTons';
      expressionAttrVals[':verifiedTons'] = verifiedTons;
    }

    try {
      await this.docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: this.tableName,
                Key: {
                  PK: `OFFER#${collection.offerId}`,
                  SK: 'METADATA',
                },
                UpdateExpression: offerUpdateExpression,
                ConditionExpression:
                  'attribute_exists(PK) AND #status = :accepted AND remainingQuantityTons >= :incomingTons',
                ExpressionAttributeNames: {
                  '#status': 'status',
                },
                ExpressionAttributeValues: expressionAttrVals,
              },
            },
            {
              Put: {
                TableName: this.tableName,
                Item: item,
                ConditionExpression: 'attribute_not_exists(PK)',
              },
            },
          ],
        })
      );
    } catch (err: any) {
      if (
        err.name === 'TransactionCanceledException' ||
        (err.message && err.message.includes('ConditionalCheckFailed')) ||
        (err.CancellationReasons &&
          err.CancellationReasons.some((r: any) => r.Code === 'ConditionalCheckFailed'))
      ) {
        // Step 1: Check if duplicate collection was concurrently written
        const duplicateCheck = await this.getCollectionRecord(collection.collectionId);
        if (duplicateCheck) {
          const dupTons =
            duplicateCheck.physicalCollectionQuantityTons ||
            duplicateCheck.deliveredGrossTons ||
            duplicateCheck.verifiedNetTons ||
            duplicateCheck.factoryWeighbridgeGrossTons ||
            duplicateCheck.fieldWeighbridgeGrossTons ||
            0;
          if (
            duplicateCheck.offerId === collection.offerId &&
            duplicateCheck.listingId === collection.listingId &&
            dupTons === incomingTons
          ) {
            return duplicateCheck; // Concurrent identical request succeeded, return it
          }
          throw new Error(
            `Quantity integrity violation: Collection with ID ${collection.collectionId} already exists with conflicting data.`
          );
        }

        // Step 2: Collection does not exist, so the transaction failed due to offer condition
        const freshOffer = await this.getOffer(collection.offerId);
        if (!freshOffer || freshOffer.status !== 'ACCEPTED') {
          throw new Error(
            `Cannot initiate collection on unaccepted offer. Current status: ${freshOffer?.status || 'UNKNOWN'}`
          );
        }
        const remaining =
          (freshOffer as any).remainingQuantityTons ??
          Math.max(0, freshOffer.quantityTons - ((freshOffer as any).reservedQuantityTons || 0));
        if (remaining < incomingTons) {
          throw new Error(
            `Quantity integrity violation: Cumulative collection tonnage exceeds accepted offer quantity (${freshOffer.quantityTons} T).`
          );
        }
        throw new Error(
          `Quantity integrity violation: Cumulative collection tonnage exceeds accepted offer quantity (${offer.quantityTons} T).`
        );
      }
      throw err;
    }

    const listing = await this.getListing(collection.listingId);
    if (listing) {
      await this.updateListing(listing.listingId, { status: 'COLLECTING' }, actorId);
    }

    await auditRepository.recordEvent({
      entityType: 'COLLECTION',
      entityId: collection.collectionId,
      actorId,
      actorRole,
      action: 'COLLECTION_SCHEDULED_DYNAMODB',
      newState: { stage: collection.stage, scheduledDate: collection.scheduledPickupDate },
    });

    return collection;
  }

  async updateCollectionMilestone(
    collectionId: string,
    stage: LogisticsStage,
    actorId: string,
    actorRole: UserRole,
    details?: {
      fieldWeighbridgeGrossTons?: number;
      physicalCollectionQuantityTons?: number;
      physicalCollectionTimestamp?: string;
      physicalCollectionSource?: string;
      physicalCollectionEvidenceUrl?: string;
      factoryWeighbridgeGrossTons?: number;
      deliveredGrossTons?: number;
      deliveryTimestamp?: string;
      verifiedNetTons?: number;
      certifiedMoisturePercent?: number;
      slipUrl?: string;
      transporterName?: string;
      vehicleRegistrationNumber?: string;
      cancellationReason?: string;
      rejectedQuantityTons?: number;
      exceptionType?: 'CANCELLED_BEFORE_PICKUP' | 'REJECTED_AT_GATE' | 'QUALITY_REJECTED' | 'RETURNED' | 'TRANSIT_EXCEPTION';
      rejectionDisposition?: 'DISPOSED' | 'RETURNED_TO_FARM' | 'PENDING_ARBITRATION';
    }
  ): Promise<CollectionRecord> {
    const col = await this.getCollectionRecord(collectionId);
    if (!col) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const effectiveVerifiedNet = details?.verifiedNetTons ?? col.verifiedNetTons;
    const effectiveFactoryGross =
      details?.deliveredGrossTons ?? details?.factoryWeighbridgeGrossTons ?? col.deliveredGrossTons ?? col.factoryWeighbridgeGrossTons;
    const effectiveFieldGross =
      details?.physicalCollectionQuantityTons ?? details?.fieldWeighbridgeGrossTons ?? col.physicalCollectionQuantityTons ?? col.fieldWeighbridgeGrossTons;

    if (stage === 'VERIFIED') {
      if (effectiveVerifiedNet === undefined || effectiveVerifiedNet <= 0) {
        throw new Error('Quantity integrity violation: Verification requires certified weighbridge net tons.');
      }
    }

    const compGross = effectiveFactoryGross || effectiveFieldGross;
    if (compGross !== undefined && effectiveVerifiedNet !== undefined) {
      if (effectiveVerifiedNet > compGross) {
        throw new Error(
          `Quantity integrity violation: Verified net weight (${effectiveVerifiedNet} T) cannot exceed factory gross weight (${compGross} T).`
        );
      }
    }

    const oldStage = col.stage;
    const oldPickupRecorded =
      col.physicalCollectionQuantityTons !== undefined ||
      col.physicalCollectionTimestamp !== undefined;
    const oldPickupTons = oldPickupRecorded
      ? (col.physicalCollectionQuantityTons ?? col.fieldWeighbridgeGrossTons ?? 0)
      : 0;

    const oldDeliveredRecorded = oldStage === 'DELIVERED' || oldStage === 'VERIFIED';
    const oldDeliveredTons = oldDeliveredRecorded
      ? (col.deliveredGrossTons ?? col.factoryWeighbridgeGrossTons ?? 0)
      : 0;

    const oldVerifiedTons = oldStage === 'VERIFIED' ? (col.verifiedNetTons || 0) : 0;
    const oldRejectedTons = (oldStage === 'REJECTED' || col.exceptionType === 'REJECTED_AT_GATE') ? (col.rejectedQuantityTons || 0) : 0;

    const oldPlanned =
      col.verifiedNetTons ||
      col.deliveredGrossTons ||
      col.factoryWeighbridgeGrossTons ||
      col.physicalCollectionQuantityTons ||
      col.fieldWeighbridgeGrossTons ||
      0;

    let oldReserved = 0;
    if (oldStage !== 'CANCELLED' && oldStage !== 'REJECTED') {
      if (oldStage === 'VERIFIED') {
        oldReserved = col.verifiedNetTons || oldPlanned;
      } else if (oldDeliveredRecorded && oldDeliveredTons > 0) {
        oldReserved = oldDeliveredTons;
      } else {
        oldReserved = oldPlanned;
      }
    }

    const previousStage = col.stage;
    col.stage = stage;
    col.updatedAt = new Date().toISOString();

    if (details?.fieldWeighbridgeGrossTons !== undefined) col.fieldWeighbridgeGrossTons = details.fieldWeighbridgeGrossTons;
    if (details?.physicalCollectionQuantityTons !== undefined) col.physicalCollectionQuantityTons = details.physicalCollectionQuantityTons;
    else if (details?.fieldWeighbridgeGrossTons !== undefined && (stage === 'LOADING' || stage === 'IN_TRANSIT')) {
      col.physicalCollectionQuantityTons = details.fieldWeighbridgeGrossTons;
    }

    const isExplicitPickupProvided =
      details?.physicalCollectionQuantityTons !== undefined ||
      details?.fieldWeighbridgeGrossTons !== undefined ||
      details?.physicalCollectionSource !== undefined ||
      details?.physicalCollectionEvidenceUrl !== undefined;

    if (details?.physicalCollectionTimestamp) col.physicalCollectionTimestamp = details.physicalCollectionTimestamp;
    else if ((stage === 'LOADING' || stage === 'IN_TRANSIT') && isExplicitPickupProvided && !col.physicalCollectionTimestamp) {
      col.physicalCollectionTimestamp = new Date().toISOString();
    }
    if (details?.physicalCollectionSource) col.physicalCollectionSource = details.physicalCollectionSource;
    if (details?.physicalCollectionEvidenceUrl) col.physicalCollectionEvidenceUrl = details.physicalCollectionEvidenceUrl;
    else if (details?.slipUrl && (stage === 'LOADING' || stage === 'IN_TRANSIT')) {
      col.physicalCollectionEvidenceUrl = details.slipUrl;
    }

    if (details?.factoryWeighbridgeGrossTons !== undefined) col.factoryWeighbridgeGrossTons = details.factoryWeighbridgeGrossTons;
    if (details?.deliveredGrossTons !== undefined) col.deliveredGrossTons = details.deliveredGrossTons;
    else if (details?.factoryWeighbridgeGrossTons !== undefined) {
      col.deliveredGrossTons = details.factoryWeighbridgeGrossTons;
    }
    if (details?.deliveryTimestamp) col.deliveryTimestamp = details.deliveryTimestamp;
    else if (stage === 'DELIVERED' && !col.deliveryTimestamp) {
      col.deliveryTimestamp = new Date().toISOString();
    }

    const pickupGross = col.physicalCollectionQuantityTons ?? col.fieldWeighbridgeGrossTons;
    const plantGross = col.deliveredGrossTons ?? col.factoryWeighbridgeGrossTons;
    if (pickupGross !== undefined && plantGross !== undefined) {
      col.transitLossTons = Math.max(0, pickupGross - plantGross);
    }

    if (details?.verifiedNetTons !== undefined) col.verifiedNetTons = details.verifiedNetTons;
    if (details?.certifiedMoisturePercent !== undefined) col.certifiedMoisturePercent = details.certifiedMoisturePercent;
    if (details?.slipUrl) col.deliveryWeighbridgeSlipUrl = details.slipUrl;
    if (details?.transporterName) col.transporterName = details.transporterName;
    if (details?.vehicleRegistrationNumber) col.vehicleRegistrationNumber = details.vehicleRegistrationNumber;

    if (details?.cancellationReason) col.cancellationReason = details.cancellationReason;
    if (details?.exceptionType) col.exceptionType = details.exceptionType;
    else if (stage === 'CANCELLED' && !col.exceptionType) {
      col.exceptionType = col.physicalCollectionTimestamp ? 'RETURNED' : 'CANCELLED_BEFORE_PICKUP';
    } else if (stage === 'REJECTED' && !col.exceptionType) {
      col.exceptionType = 'REJECTED_AT_GATE';
    }

    if (details?.rejectionDisposition) col.rejectionDisposition = details.rejectionDisposition;
    else if (stage === 'REJECTED' && !col.rejectionDisposition) {
      col.rejectionDisposition = 'RETURNED_TO_FARM';
    }
    if (stage === 'REJECTED' && !col.rejectionTimestamp) {
      col.rejectionTimestamp = new Date().toISOString();
    }
    if (stage === 'REJECTED') {
      col.rejectedQuantityTons =
        details?.fieldWeighbridgeGrossTons ??
        col.rejectedQuantityTons ??
        (col.physicalCollectionQuantityTons ?? col.fieldWeighbridgeGrossTons ?? col.factoryWeighbridgeGrossTons ?? 0);
    }

    let newPickupTons = oldPickupTons;
    if (details?.physicalCollectionQuantityTons !== undefined || (details?.fieldWeighbridgeGrossTons !== undefined && isExplicitPickupProvided)) {
      newPickupTons = details.physicalCollectionQuantityTons ?? details.fieldWeighbridgeGrossTons!;
    }
    const hasExplicitPickup =
      (stage === 'LOADING' || stage === 'IN_TRANSIT' || stage === 'DELIVERED' || stage === 'VERIFIED' || stage === 'REJECTED') &&
      (oldPickupRecorded || isExplicitPickupProvided);

    let newDeliveredTons = 0;
    if (stage === 'DELIVERED' || stage === 'VERIFIED') {
      newDeliveredTons =
        details?.deliveredGrossTons ?? details?.factoryWeighbridgeGrossTons ?? col.deliveredGrossTons ?? col.factoryWeighbridgeGrossTons ?? 0;
      if (newDeliveredTons === 0 && newPickupTons > 0) {
        newDeliveredTons = newPickupTons;
      }
    }

    const newVerifiedTons = stage === 'VERIFIED' ? (details?.verifiedNetTons ?? col.verifiedNetTons ?? 0) : 0;

    let newRejectedTons = 0;
    if (stage === 'REJECTED' || details?.exceptionType === 'REJECTED_AT_GATE') {
      newRejectedTons =
        details?.rejectedQuantityTons ??
        details?.fieldWeighbridgeGrossTons ??
        col.physicalCollectionQuantityTons ??
        col.fieldWeighbridgeGrossTons ??
        col.factoryWeighbridgeGrossTons ??
        oldPickupTons ??
        oldPlanned;
    }

    const newPlanned =
      col.verifiedNetTons ||
      col.deliveredGrossTons ||
      col.factoryWeighbridgeGrossTons ||
      col.physicalCollectionQuantityTons ||
      col.fieldWeighbridgeGrossTons ||
      oldPlanned;

    let newReserved = 0;
    if (stage !== 'CANCELLED' && stage !== 'REJECTED') {
      if (stage === 'VERIFIED') {
        newReserved = newVerifiedTons > 0 ? newVerifiedTons : (newDeliveredTons > 0 ? newDeliveredTons : (newPickupTons || newPlanned));
      } else if (stage === 'DELIVERED') {
        newReserved = newDeliveredTons > 0 ? newDeliveredTons : (newPickupTons || newPlanned);
      } else {
        newReserved = newPickupTons > 0 ? newPickupTons : newPlanned;
      }
    }

    const deltaReserved = newReserved - oldReserved;
    let deltaCollected = 0;
    if (stage !== 'CANCELLED' && stage !== 'REJECTED') {
      if (hasExplicitPickup) {
        deltaCollected = newPickupTons - oldPickupTons;
      } else if ((stage === 'DELIVERED' || stage === 'VERIFIED') && !oldPickupRecorded) {
        deltaCollected = newDeliveredTons - oldDeliveredTons;
      }
    } else {
      deltaCollected = 0;
    }

    const deltaDelivered = newDeliveredTons - oldDeliveredTons;
    const deltaVerified = newVerifiedTons - oldVerifiedTons;
    const deltaRejected = newRejectedTons - oldRejectedTons;

    const item = {
      PK: `COLL#${col.collectionId}`,
      SK: 'METADATA',
      GSI1PK: `OFFER#${col.offerId}`,
      GSI1SK: `STAGE#${col.stage}`,
      GSI2PK: `FARMER#${col.farmerId || 'UNKNOWN'}`,
      GSI2SK: `COLL#${col.updatedAt}`,
      ...col,
    };

    if (deltaReserved !== 0 || deltaCollected !== 0 || deltaDelivered !== 0 || deltaVerified !== 0 || deltaRejected !== 0) {
      const setParts: string[] = [];
      const attrVals: Record<string, any> = { ':zero': 0 };

      if (deltaReserved > 0) {
        setParts.push('remainingQuantityTons = remainingQuantityTons - :deltaReserved');
        setParts.push('reservedQuantityTons = if_not_exists(reservedQuantityTons, :zero) + :deltaReserved');
        attrVals[':deltaReserved'] = deltaReserved;
      } else if (deltaReserved < 0) {
        setParts.push('remainingQuantityTons = remainingQuantityTons + :releaseReserved');
        setParts.push('reservedQuantityTons = reservedQuantityTons - :releaseReserved');
        attrVals[':releaseReserved'] = Math.abs(deltaReserved);
      }

      if (deltaCollected > 0) {
        setParts.push('actualCollectedGrossTons = if_not_exists(actualCollectedGrossTons, :zero) + :deltaCollected');
        setParts.push('totalCollectedTons = if_not_exists(totalCollectedTons, :zero) + :deltaCollected');
        attrVals[':deltaCollected'] = deltaCollected;
      } else if (deltaCollected < 0 && stage !== 'CANCELLED' && stage !== 'REJECTED') {
        setParts.push('actualCollectedGrossTons = actualCollectedGrossTons - :releaseCollected');
        setParts.push('totalCollectedTons = totalCollectedTons - :releaseCollected');
        attrVals[':releaseCollected'] = Math.abs(deltaCollected);
      }

      if (deltaDelivered > 0) {
        setParts.push('deliveredGrossTons = if_not_exists(deliveredGrossTons, :zero) + :deltaDelivered');
        attrVals[':deltaDelivered'] = deltaDelivered;
      } else if (deltaDelivered < 0) {
        setParts.push('deliveredGrossTons = deliveredGrossTons - :releaseDelivered');
        attrVals[':releaseDelivered'] = Math.abs(deltaDelivered);
      }

      if (deltaVerified > 0) {
        setParts.push('verifiedNetTons = if_not_exists(verifiedNetTons, :zero) + :deltaVerified');
        attrVals[':deltaVerified'] = deltaVerified;
      } else if (deltaVerified < 0) {
        setParts.push('verifiedNetTons = verifiedNetTons - :releaseVerified');
        attrVals[':releaseVerified'] = Math.abs(deltaVerified);
      }

      if (deltaRejected > 0) {
        setParts.push('rejectedQuantityTons = if_not_exists(rejectedQuantityTons, :zero) + :deltaRejected');
        attrVals[':deltaRejected'] = deltaRejected;
      } else if (deltaRejected < 0) {
        setParts.push('rejectedQuantityTons = rejectedQuantityTons - :releaseRejected');
        attrVals[':releaseRejected'] = Math.abs(deltaRejected);
      }

      const conditionExpr =
        deltaReserved > 0
          ? 'attribute_exists(PK) AND remainingQuantityTons >= :deltaReserved'
          : 'attribute_exists(PK)';

      try {
        await this.docClient.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Update: {
                  TableName: this.tableName,
                  Key: {
                    PK: `OFFER#${col.offerId}`,
                    SK: 'METADATA',
                  },
                  UpdateExpression: `SET ${setParts.join(', ')}`,
                  ConditionExpression: conditionExpr,
                  ExpressionAttributeValues: attrVals,
                },
              },
              {
                Put: {
                  TableName: this.tableName,
                  Item: item,
                  ConditionExpression: 'attribute_exists(PK)',
                },
              },
            ],
          })
        );
      } catch (err: any) {
        if (
          err.name === 'TransactionCanceledException' ||
          (err.message && err.message.includes('ConditionalCheckFailed'))
        ) {
          throw new Error(
            `Quantity integrity violation: Updated collection tonnage exceeds accepted offer quantity.`
          );
        }
        throw err;
      }
    } else {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: 'attribute_exists(PK)',
        })
      );
    }

    if (stage === 'VERIFIED') {
      const listing = await this.getListing(col.listingId);
      if (listing) {
        await this.updateListing(listing.listingId, { status: 'VERIFIED' }, actorId);
      }
    }

    await auditRepository.recordEvent({
      entityType: 'COLLECTION',
      entityId: col.collectionId,
      actorId,
      actorRole,
      action: `COLLECTION_STAGE_${stage}_DYNAMODB`,
      previousState: { stage: previousStage },
      newState: { stage: col.stage, verifiedNetTons: col.verifiedNetTons },
    });

    return col;
  }

  async getCollectionRecord(collectionId: string): Promise<CollectionRecord | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `COLL#${collectionId}`,
          SK: 'METADATA',
        },
      })
    );
    if (!res.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...c } = res.Item;
    return c as CollectionRecord;
  }

  async listCollectionsForFarmer(farmerId: string): Promise<CollectionRecord[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gpk',
        ExpressionAttributeValues: {
          ':gpk': `FARMER#${farmerId}`,
        },
      })
    );
    return (res.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...c } = item;
      return c as CollectionRecord;
    });
  }

  async listCollectionsForBuyer(buyerId: string): Promise<CollectionRecord[]> {
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'buyerId = :bid',
        ExpressionAttributeValues: {
          ':bid': buyerId,
        },
      })
    );
    return (res.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...c } = item;
      return c as CollectionRecord;
    });
  }

  async listCollectionsForListing(listingId: string): Promise<CollectionRecord[]> {
    const res = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'listingId = :lid',
        ExpressionAttributeValues: {
          ':lid': listingId,
        },
      })
    );
    return (res.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...c } = item;
      return c as CollectionRecord;
    });
  }

  async listCollectionsForOffer(offerId: string): Promise<CollectionRecord[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gpk',
        ExpressionAttributeValues: {
          ':gpk': `OFFER#${offerId}`,
        },
      })
    );
    return (res.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...c } = item;
      return c as CollectionRecord;
    });
  }

  // Fallbacks for testing helper methods
  getAllListings(): ResidueListing[] {
    return [];
  }
  getAllOffers(): Offer[] {
    return [];
  }
  getAllCollections(): CollectionRecord[] {
    return [];
  }
  clear(): void {}
}
