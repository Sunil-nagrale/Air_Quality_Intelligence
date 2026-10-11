import {
  ResidueListing,
  BuyerProfile,
  Offer,
  CollectionRecord,
  ListingStatus,
  OfferStatus,
  LogisticsStage,
  UserRole,
} from '../types';
import { auditRepository } from './auditRepository';

export interface IMarketplaceRepository {
  // Residue Listings
  saveListing(listing: ResidueListing, actorId: string): Promise<ResidueListing>;
  getListing(listingId: string): Promise<ResidueListing | null>;
  listListings(options?: {
    district?: string;
    cropType?: string;
    status?: ListingStatus;
    farmerId?: string;
    limit?: number;
  }): Promise<ResidueListing[]>;
  updateListing(listingId: string, updates: Partial<ResidueListing>, actorId: string): Promise<ResidueListing>;
  deleteListing(listingId: string, actorId: string): Promise<boolean>;

  // Industrial Buyers
  saveBuyerProfile(buyer: BuyerProfile): Promise<BuyerProfile>;
  getBuyerProfile(buyerId: string): Promise<BuyerProfile | null>;
  listBuyers(): Promise<BuyerProfile[]>;
  updateBuyerProfile(buyerId: string, updates: Partial<BuyerProfile>): Promise<BuyerProfile>;

  // Offers & Negotiations
  createOffer(offer: Offer, actorId: string): Promise<Offer>;
  respondToOffer(
    offerId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER',
    actorId: string,
    actorRole: UserRole,
    details?: { counterPrice?: number; notes?: string }
  ): Promise<Offer>;
  getOffer(offerId: string): Promise<Offer | null>;
  listOffersForListing(listingId: string): Promise<Offer[]>;
  listOffersByBuyer(buyerId: string): Promise<Offer[]>;
  listOffersForFarmer(farmerId: string): Promise<Offer[]>;

  // Logistics & Collections
  createCollectionRecord(
    collection: CollectionRecord,
    actorId: string,
    actorRole: UserRole
  ): Promise<CollectionRecord>;
  updateCollectionMilestone(
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
  ): Promise<CollectionRecord>;
  getCollectionRecord(collectionId: string): Promise<CollectionRecord | null>;
  listCollectionsForFarmer(farmerId: string): Promise<CollectionRecord[]>;
  listCollectionsForBuyer(buyerId: string): Promise<CollectionRecord[]>;
  listCollectionsForListing(listingId: string): Promise<CollectionRecord[]>;
  listCollectionsForOffer(offerId: string): Promise<CollectionRecord[]>;

  // In-Memory Inspection & Teardown
  getAllListings(): ResidueListing[];
  getAllOffers(): Offer[];
  getAllCollections(): CollectionRecord[];
  clear(): void;
}

/**
 * AsyncMutex ensures exclusive critical-section execution for in-memory operations
 * targeting a specific partition key / resource ID across concurrent async promises.
 */
class AsyncMutex {
  private mutex = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    let unlock: () => void;
    const next = new Promise<void>(resolve => {
      unlock = resolve;
    });
    const current = this.mutex;
    this.mutex = next;
    try {
      await current;
      return await fn();
    } finally {
      unlock!();
    }
  }
}

export class InMemoryMarketplaceRepository implements IMarketplaceRepository {
  private listings = new Map<string, ResidueListing>();
  private buyers = new Map<string, BuyerProfile>();
  private offers = new Map<string, Offer>();
  private collections = new Map<string, CollectionRecord>();
  private offerLocks = new Map<string, AsyncMutex>();

  private getOfferLock(offerId: string): AsyncMutex {
    let lock = this.offerLocks.get(offerId);
    if (!lock) {
      lock = new AsyncMutex();
      this.offerLocks.set(offerId, lock);
    }
    return lock;
  }

  // --- Residue Listings ---
  async saveListing(listing: ResidueListing, actorId: string): Promise<ResidueListing> {
    const previous = this.listings.get(listing.listingId);
    this.listings.set(listing.listingId, listing);

    await auditRepository.recordEvent({
      entityType: 'LISTING',
      entityId: listing.listingId,
      actorId,
      actorRole: 'FARMER',
      action: previous ? 'LISTING_UPDATED' : 'LISTING_CREATED',
      previousState: previous ? { status: previous.status } : undefined,
      newState: { status: listing.status, quantityTons: listing.quantityTons },
    });

    return listing;
  }

  async getListing(listingId: string): Promise<ResidueListing | null> {
    return this.listings.get(listingId) || null;
  }

  async listListings(options?: {
    district?: string;
    cropType?: string;
    status?: ListingStatus;
    farmerId?: string;
    limit?: number;
  }): Promise<ResidueListing[]> {
    const results: ResidueListing[] = [];
    for (const listing of this.listings.values()) {
      if (options?.district && listing.district.toLowerCase() !== options.district.toLowerCase()) {
        continue;
      }
      if (options?.cropType && listing.cropType !== options.cropType) {
        continue;
      }
      if (options?.status && listing.status !== options.status) {
        continue;
      }
      if (options?.farmerId && listing.farmerId !== options.farmerId) {
        continue;
      }
      results.push(listing);
    }
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return results.slice(0, options?.limit ?? 50);
  }

  async updateListing(
    listingId: string,
    updates: Partial<ResidueListing>,
    actorId: string
  ): Promise<ResidueListing> {
    const existing = this.listings.get(listingId);
    if (!existing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    const previousState = { ...existing };
    const updated: ResidueListing = {
      ...existing,
      ...updates,
      listingId, // Immutable ID
      farmerId: existing.farmerId, // Immutable farmer
      updatedAt: new Date().toISOString(),
    };

    this.listings.set(listingId, updated);

    await auditRepository.recordEvent({
      entityType: 'LISTING',
      entityId: listingId,
      actorId,
      actorRole: 'FARMER',
      action: 'LISTING_UPDATED',
      previousState: { status: previousState.status, quantityTons: previousState.quantityTons },
      newState: { status: updated.status, quantityTons: updated.quantityTons },
    });

    return updated;
  }

  async deleteListing(listingId: string, actorId: string): Promise<boolean> {
    const existing = this.listings.get(listingId);
    if (!existing) {
      return false;
    }

    this.listings.delete(listingId);

    await auditRepository.recordEvent({
      entityType: 'LISTING',
      entityId: listingId,
      actorId,
      actorRole: 'FARMER',
      action: 'LISTING_DELETED',
      previousState: { status: existing.status, quantityTons: existing.quantityTons },
      newState: undefined,
    });

    return true;
  }

  // --- Industrial Buyers ---
  async saveBuyerProfile(buyer: BuyerProfile): Promise<BuyerProfile> {
    this.buyers.set(buyer.buyerId, buyer);
    return buyer;
  }

  async getBuyerProfile(buyerId: string): Promise<BuyerProfile | null> {
    return this.buyers.get(buyerId) || null;
  }

  async listBuyers(): Promise<BuyerProfile[]> {
    return Array.from(this.buyers.values());
  }

  async updateBuyerProfile(buyerId: string, updates: Partial<BuyerProfile>): Promise<BuyerProfile> {
    const existing = this.buyers.get(buyerId);
    if (!existing) {
      throw new Error(`Buyer profile not found: ${buyerId}`);
    }

    const updated: BuyerProfile = {
      ...existing,
      ...updates,
      buyerId, // Immutable ID
    };

    this.buyers.set(buyerId, updated);
    return updated;
  }

  // --- Offers & State Machine ---
  async createOffer(offer: Offer, actorId: string): Promise<Offer> {
    const listing = this.listings.get(offer.listingId);
    if (!listing) {
      throw new Error(`Cannot create offer for non-existent listing: ${offer.listingId}`);
    }

    if (this.offers.has(offer.offerId)) {
      throw new Error(`Offer already exists: ${offer.offerId}`);
    }

    this.offers.set(offer.offerId, offer);

    // Update listing status to IN_OFFER if currently LISTED or MATCHED
    if (listing.status === 'LISTED' || listing.status === 'MATCHED') {
      listing.status = 'IN_OFFER';
      this.listings.set(listing.listingId, listing);
    }

    await auditRepository.recordEvent({
      entityType: 'OFFER',
      entityId: offer.offerId,
      actorId,
      actorRole: 'BUYER',
      action: 'OFFER_SUBMITTED',
      newState: { offeredPrice: offer.offeredPricePerTonInr, quantity: offer.quantityTons },
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
    const offer = this.offers.get(offerId);
    if (!offer) {
      throw new Error(`Offer not found: ${offerId}`);
    }

    // Terminal states cannot transition
    if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED' || offer.status === 'CANCELLED') {
      throw new Error(`Cannot transition offer currently in terminal state ${offer.status}`);
    }

    const previousStatus = offer.status;

    if (action === 'ACCEPT') {
      offer.status = 'ACCEPTED';
      offer.remainingQuantityTons = offer.quantityTons;
      offer.reservedQuantityTons = 0;
      offer.actualCollectedGrossTons = 0;
      offer.totalCollectedTons = 0;
      offer.deliveredGrossTons = 0;
      offer.rejectedQuantityTons = 0;
      offer.verifiedNetTons = 0;
      const listing = this.listings.get(offer.listingId);
      if (listing) {
        listing.status = 'ACCEPTED';
        this.listings.set(listing.listingId, listing);
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
    this.offers.set(offer.offerId, offer);

    await auditRepository.recordEvent({
      entityType: 'OFFER',
      entityId: offer.offerId,
      actorId,
      actorRole,
      action: `OFFER_${action}ED`,
      previousState: { status: previousStatus },
      newState: { status: offer.status, counterPrice: offer.counterOfferPricePerTonInr },
    });

    return offer;
  }

  async getOffer(offerId: string): Promise<Offer | null> {
    return this.offers.get(offerId) || null;
  }

  async listOffersForListing(listingId: string): Promise<Offer[]> {
    const results: Offer[] = [];
    for (const offer of this.offers.values()) {
      if (offer.listingId === listingId) {
        results.push(offer);
      }
    }
    return results;
  }

  async listOffersByBuyer(buyerId: string): Promise<Offer[]> {
    const results: Offer[] = [];
    for (const offer of this.offers.values()) {
      if (offer.buyerId === buyerId) {
        results.push(offer);
      }
    }
    return results;
  }

  async listOffersForFarmer(farmerId: string): Promise<Offer[]> {
    const results: Offer[] = [];
    for (const offer of this.offers.values()) {
      if (offer.farmerId === farmerId) {
        results.push(offer);
      }
    }
    return results;
  }

  // --- Collections & Logistics ---
  async createCollectionRecord(
    collection: CollectionRecord,
    actorId: string,
    actorRole: UserRole
  ): Promise<CollectionRecord> {
    const lock = this.getOfferLock(collection.offerId);
    return lock.runExclusive(async () => {
      const offer = this.offers.get(collection.offerId);
      if (!offer) {
        throw new Error(`Offer not found: ${collection.offerId}`);
      }

      if (offer.status !== 'ACCEPTED') {
        throw new Error(`Cannot initiate collection on unaccepted offer. Current status: ${offer.status}`);
      }

      // Initialize counters on offer if needed
      if (offer.remainingQuantityTons === undefined) {
        offer.remainingQuantityTons = offer.quantityTons;
      }
      if (offer.reservedQuantityTons === undefined) {
        offer.reservedQuantityTons = 0;
      }
      if (offer.actualCollectedGrossTons === undefined) {
        offer.actualCollectedGrossTons = offer.totalCollectedTons || 0;
      }
      if (offer.totalCollectedTons === undefined) {
        offer.totalCollectedTons = offer.actualCollectedGrossTons;
      }
      if (offer.deliveredGrossTons === undefined) {
        offer.deliveredGrossTons = 0;
      }
      if (offer.rejectedQuantityTons === undefined) {
        offer.rejectedQuantityTons = 0;
      }
      if (offer.verifiedNetTons === undefined) {
        offer.verifiedNetTons = 0;
      }

      const incomingTons =
        collection.physicalCollectionQuantityTons ||
        collection.deliveredGrossTons ||
        collection.verifiedNetTons ||
        collection.factoryWeighbridgeGrossTons ||
        collection.fieldWeighbridgeGrossTons ||
        0;

      // Idempotency check: Handle duplicate collection ID cleanly
      if (this.collections.has(collection.collectionId)) {
        const existing = this.collections.get(collection.collectionId)!;
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
          return existing; // idempotent replay returns existing cleanly
        }
        throw new Error(
          `Quantity integrity violation: Collection with ID ${collection.collectionId} already exists with conflicting data.`
        );
      }

      // Check remaining capacity on accepted offer
      if (incomingTons > offer.remainingQuantityTons) {
        throw new Error(
          `Quantity integrity violation: Cumulative collection tonnage (${(offer.reservedQuantityTons || 0) + incomingTons} T) exceeds accepted offer quantity (${offer.quantityTons} T).`
        );
      }

      // Reserve capacity
      offer.remainingQuantityTons -= incomingTons;
      offer.reservedQuantityTons = (offer.reservedQuantityTons || 0) + incomingTons;

      // Physical collection vs delivery accounting at creation
      const hasPickupAtCreation =
        (collection.stage === 'LOADING' || collection.stage === 'IN_TRANSIT') &&
        (collection.physicalCollectionQuantityTons !== undefined || collection.fieldWeighbridgeGrossTons !== undefined);
      if (hasPickupAtCreation) {
        const pickupTons = collection.physicalCollectionQuantityTons || collection.fieldWeighbridgeGrossTons || incomingTons;
        offer.actualCollectedGrossTons = (offer.actualCollectedGrossTons || 0) + pickupTons;
        offer.totalCollectedTons = offer.actualCollectedGrossTons;
      } else if (collection.stage === 'DELIVERED' || collection.stage === 'VERIFIED') {
        const grossTons = collection.deliveredGrossTons || collection.factoryWeighbridgeGrossTons || collection.verifiedNetTons || incomingTons;
        offer.deliveredGrossTons = (offer.deliveredGrossTons || 0) + grossTons;
        if ((offer.actualCollectedGrossTons || 0) === 0) {
          offer.actualCollectedGrossTons = grossTons;
          offer.totalCollectedTons = grossTons;
        }
      }
      if (collection.stage === 'VERIFIED' && collection.verifiedNetTons) {
        offer.verifiedNetTons = (offer.verifiedNetTons || 0) + collection.verifiedNetTons;
      }

      offer.lastUpdatedTimestamp = new Date().toISOString();
      this.offers.set(offer.offerId, offer);

      this.collections.set(collection.collectionId, collection);

      const listing = this.listings.get(collection.listingId);
      if (listing) {
        listing.status = collection.stage === 'VERIFIED' ? 'VERIFIED' : 'COLLECTING';
        this.listings.set(listing.listingId, listing);
      }

      await auditRepository.recordEvent({
        entityType: 'COLLECTION',
        entityId: collection.collectionId,
        actorId,
        actorRole,
        action: 'COLLECTION_SCHEDULED',
        newState: { stage: collection.stage, scheduledDate: collection.scheduledPickupDate },
      });

      return collection;
    });
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
    const col = this.collections.get(collectionId);
    if (!col) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const lock = this.getOfferLock(col.offerId);
    return lock.runExclusive(async () => {
      const effectiveVerifiedNet = details?.verifiedNetTons ?? col.verifiedNetTons;
      const effectiveFactoryGross =
        details?.deliveredGrossTons ?? details?.factoryWeighbridgeGrossTons ?? col.deliveredGrossTons ?? col.factoryWeighbridgeGrossTons;
      const effectiveFieldGross =
        details?.physicalCollectionQuantityTons ?? details?.fieldWeighbridgeGrossTons ?? col.physicalCollectionQuantityTons ?? col.fieldWeighbridgeGrossTons;

      // Acceptance criterion 1: Verified net quantity increases only with required verification evidence
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

      const offer = this.offers.get(col.offerId);
      if (offer) {
        if (offer.remainingQuantityTons === undefined) offer.remainingQuantityTons = offer.quantityTons;
        if (offer.reservedQuantityTons === undefined) offer.reservedQuantityTons = 0;
        if (offer.actualCollectedGrossTons === undefined) offer.actualCollectedGrossTons = offer.totalCollectedTons || 0;
        if (offer.totalCollectedTons === undefined) offer.totalCollectedTons = offer.actualCollectedGrossTons;
        if (offer.deliveredGrossTons === undefined) offer.deliveredGrossTons = 0;
        if (offer.rejectedQuantityTons === undefined) offer.rejectedQuantityTons = 0;
        if (offer.verifiedNetTons === undefined) offer.verifiedNetTons = 0;

        // Old values on this collection
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

        // Old reservation held by this collection
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

        // Evaluate new pickup recording
        const isExplicitPickupDetailsProvided =
          details?.physicalCollectionQuantityTons !== undefined ||
          details?.physicalCollectionTimestamp !== undefined ||
          details?.physicalCollectionSource !== undefined ||
          details?.physicalCollectionEvidenceUrl !== undefined;

        let newPickupTons = oldPickupTons;
        if (details?.physicalCollectionQuantityTons !== undefined || (details?.fieldWeighbridgeGrossTons !== undefined && isExplicitPickupDetailsProvided)) {
          newPickupTons = details.physicalCollectionQuantityTons ?? details.fieldWeighbridgeGrossTons!;
        }
        const hasExplicitPickup =
          (stage === 'LOADING' || stage === 'IN_TRANSIT' || stage === 'DELIVERED' || stage === 'VERIFIED' || stage === 'REJECTED') &&
          (oldPickupRecorded || isExplicitPickupDetailsProvided);

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
          details?.verifiedNetTons ??
          details?.deliveredGrossTons ??
          details?.factoryWeighbridgeGrossTons ??
          details?.physicalCollectionQuantityTons ??
          details?.fieldWeighbridgeGrossTons ??
          oldPlanned;

        // New reservation held by this collection
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

        // Calculate deltas
        const deltaReserved = newReserved - oldReserved;

        // Physical collection delta
        let deltaCollected = 0;
        if (stage !== 'CANCELLED' && stage !== 'REJECTED') {
          if (hasExplicitPickup) {
            deltaCollected = newPickupTons - oldPickupTons;
          } else if ((stage === 'DELIVERED' || stage === 'VERIFIED') && !oldPickupRecorded) {
            deltaCollected = newDeliveredTons - oldDeliveredTons;
          }
        } else {
          // Post-pickup cancellation or gate rejection does NOT erase recorded physical collection tonnage
          deltaCollected = 0;
        }

        const deltaDelivered = newDeliveredTons - oldDeliveredTons;
        const deltaVerified = newVerifiedTons - oldVerifiedTons;
        const deltaRejected = newRejectedTons - oldRejectedTons;

        // Capacity accounting: Prevent reservations/collections from exceeding accepted offer quantity
        if (deltaReserved > 0) {
          if (offer.remainingQuantityTons < deltaReserved) {
            throw new Error(
              `Quantity integrity violation: Updated collection tonnage (${offer.reservedQuantityTons + deltaReserved} T) exceeds accepted offer quantity (${offer.quantityTons} T).`
            );
          }
          offer.remainingQuantityTons -= deltaReserved;
          offer.reservedQuantityTons += deltaReserved;
        } else if (deltaReserved < 0) {
          const release = Math.abs(deltaReserved);
          offer.remainingQuantityTons += release;
          offer.reservedQuantityTons = Math.max(0, offer.reservedQuantityTons - release);
        }

        if (deltaCollected > 0) {
          offer.actualCollectedGrossTons = (offer.actualCollectedGrossTons || 0) + deltaCollected;
          offer.totalCollectedTons = offer.actualCollectedGrossTons;
        } else if (deltaCollected < 0 && stage !== 'CANCELLED' && stage !== 'REJECTED') {
          offer.actualCollectedGrossTons = Math.max(0, (offer.actualCollectedGrossTons || 0) + deltaCollected);
          offer.totalCollectedTons = offer.actualCollectedGrossTons;
        }

        if (deltaDelivered !== 0) {
          offer.deliveredGrossTons = Math.max(0, (offer.deliveredGrossTons || 0) + deltaDelivered);
        }

        if (deltaVerified !== 0) {
          offer.verifiedNetTons = Math.max(0, (offer.verifiedNetTons || 0) + deltaVerified);
        }

        if (deltaRejected !== 0) {
          offer.rejectedQuantityTons = Math.max(0, (offer.rejectedQuantityTons || 0) + deltaRejected);
        }

        offer.lastUpdatedTimestamp = new Date().toISOString();
        this.offers.set(offer.offerId, offer);
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

      // Discrepancy calculation: Do not clamp or overwrite either measurement
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

      if (stage === 'VERIFIED') {
        const listing = this.listings.get(col.listingId);
        if (listing) {
          listing.status = 'VERIFIED';
          this.listings.set(listing.listingId, listing);
        }
      }

      this.collections.set(col.collectionId, col);

      await auditRepository.recordEvent({
        entityType: 'COLLECTION',
        entityId: col.collectionId,
        actorId,
        actorRole,
        action: `COLLECTION_STAGE_${stage}`,
        previousState: { stage: previousStage },
        newState: { stage: col.stage, verifiedNetTons: col.verifiedNetTons },
      });

      return col;
    });
  }

  async getCollectionRecord(collectionId: string): Promise<CollectionRecord | null> {
    return this.collections.get(collectionId) || null;
  }

  async listCollectionsForFarmer(farmerId: string): Promise<CollectionRecord[]> {
    const results: CollectionRecord[] = [];
    for (const col of this.collections.values()) {
      if (col.farmerId === farmerId) {
        results.push(col);
      }
    }
    return results;
  }

  async listCollectionsForBuyer(buyerId: string): Promise<CollectionRecord[]> {
    const results: CollectionRecord[] = [];
    for (const col of this.collections.values()) {
      if (col.buyerId === buyerId) {
        results.push(col);
      }
    }
    return results;
  }

  async listCollectionsForListing(listingId: string): Promise<CollectionRecord[]> {
    const results: CollectionRecord[] = [];
    for (const col of this.collections.values()) {
      if (col.listingId === listingId) {
        results.push(col);
      }
    }
    return results;
  }

  async listCollectionsForOffer(offerId: string): Promise<CollectionRecord[]> {
    const results: CollectionRecord[] = [];
    for (const col of this.collections.values()) {
      if (col.offerId === offerId) {
        results.push(col);
      }
    }
    return results;
  }

  getAllListings(): ResidueListing[] {
    return Array.from(this.listings.values());
  }

  getAllOffers(): Offer[] {
    return Array.from(this.offers.values());
  }

  getAllCollections(): CollectionRecord[] {
    return Array.from(this.collections.values());
  }

  clear(): void {
    this.listings.clear();
    this.buyers.clear();
    this.offers.clear();
    this.collections.clear();
    this.offerLocks.clear();
  }
}

// Preserve backwards-compatible class name
export class MarketplaceRepository extends InMemoryMarketplaceRepository {}

export const inMemoryMarketplaceRepository = new InMemoryMarketplaceRepository();

// Lazy/conditional selection of production DynamoDB repository in production
let _activeMarketplaceRepo: IMarketplaceRepository | null = null;
export function getMarketplaceRepository(): IMarketplaceRepository {
  if (!_activeMarketplaceRepo) {
    const { isDynamoDbConfigured } = require('./config');
    if (isDynamoDbConfigured()) {
      const { DynamoDbMarketplaceRepository } = require('./dynamoDbMarketplaceRepository');
      _activeMarketplaceRepo = new DynamoDbMarketplaceRepository();
    } else {
      _activeMarketplaceRepo = inMemoryMarketplaceRepository;
    }
  }
  return _activeMarketplaceRepo!;
}

export const marketplaceRepository: IMarketplaceRepository = new Proxy({} as IMarketplaceRepository, {
  get(_target, prop) {
    const instance = getMarketplaceRepository() as any;
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

