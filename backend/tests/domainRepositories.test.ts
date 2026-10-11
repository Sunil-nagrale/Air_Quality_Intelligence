import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { userRepository } from '../src/repositories/userRepository';
import { schoolRepository } from '../src/repositories/schoolRepository';
import { marketplaceRepository } from '../src/repositories/marketplaceRepository';
import { auditRepository } from '../src/repositories/auditRepository';

describe('Domain Model Repositories & State Transitions', () => {
  beforeEach(() => {
    userRepository.clear();
    schoolRepository.clear();
    marketplaceRepository.clear();
    auditRepository.clear();
  });

  it('manages user profile, non-clinical health sensitivities, and activity plans', async () => {
    await userRepository.saveUserProfile({
      userId: 'USER_101',
      email: 'citizen@delhi.gov.in',
      name: 'Amit Sharma',
      role: 'PERSONAL_USER',
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const user = await userRepository.getUserProfile('USER_101');
    assert.strictEqual(user?.email, 'citizen@delhi.gov.in');

    // Health preferences
    await userRepository.saveHealthPreferences({
      userId: 'USER_101',
      hasAsthma: true,
      hasCardiovascularCondition: false,
      isElderly: false,
      isChild: false,
      pregnancy: false,
      nonClinicalSensitivityWeight: 1.25,
      isOptionalConsentGiven: true,
      updatedAt: new Date().toISOString(),
    });

    const health = await userRepository.getHealthPreferences('USER_101');
    assert.strictEqual(health?.hasAsthma, true);
    assert.strictEqual(health?.isOptionalConsentGiven, true);

    // Activity plan
    await userRepository.saveActivityPlan({
      planId: 'PLAN_101',
      userId: 'USER_101',
      activityType: 'walking',
      durationMinutes: 30,
      intensity: 'low',
      targetDate: '2026-10-18',
      locationName: 'Lodhi Garden, New Delhi',
      coordinates: { lat: 28.5933, lon: 77.2197 },
      rankedWindows: [],
      status: 'ACTIVE',
      reminderEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const plans = await userRepository.listActivityPlansByUser('USER_101');
    assert.strictEqual(plans.length, 1);
    assert.strictEqual(plans[0].locationName, 'Lodhi Garden, New Delhi');
  });

  it('enforces offer negotiation state machine and prevents invalid state transitions', async () => {
    // 1. Create a listing
    await marketplaceRepository.saveListing(
      {
        listingId: 'LST_001',
        farmerId: 'FARMER_01',
        farmerName: 'Harpreet Singh',
        farmerPhoneMasked: '+91 98XXX-XXXXX',
        cropType: 'Paddy Straw (Non-Basmati)',
        district: 'Sangrur',
        state: 'Punjab',
        locationName: 'Sunam',
        coordinates: { lat: 30.13, lon: 75.8 },
        quantityTons: 100,
        moisturePercent: 14.0,
        askingPricePerTonInr: 1800,
        balingType: 'Ex-Field Baled (Round/Square)',
        availableFromDate: '2026-10-15',
        availableUntilDate: '2026-11-01',
        status: 'LISTED',
        isDemoData: true,
        createdAt: new Date().toISOString(),
      },
      'FARMER_01'
    );

    // 2. Buyer submits offer
    const offer = await marketplaceRepository.createOffer(
      {
        offerId: 'OFF_001',
        listingId: 'LST_001',
        buyerId: 'BUYER_01',
        farmerId: 'FARMER_01',
        offeredPricePerTonInr: 1750,
        quantityTons: 100,
        status: 'SUBMITTED',
        lastUpdatedTimestamp: new Date().toISOString(),
        isDemoData: true,
      },
      'BUYER_01'
    );
    assert.strictEqual(offer.status, 'SUBMITTED');

    // Listing transitions to IN_OFFER
    const updatedListing = await marketplaceRepository.getListing('LST_001');
    assert.strictEqual(updatedListing?.status, 'IN_OFFER');

    // 3. Farmer counters offer
    const counteredOffer = await marketplaceRepository.respondToOffer(
      'OFF_001',
      'COUNTER',
      'FARMER_01',
      'FARMER',
      { counterPrice: 1780, notes: 'Min threshold for ex-field round bales' }
    );
    assert.strictEqual(counteredOffer.status, 'COUNTERED');
    assert.strictEqual(counteredOffer.counterOfferPricePerTonInr, 1780);

    // 4. Buyer accepts countered offer
    const acceptedOffer = await marketplaceRepository.respondToOffer(
      'OFF_001',
      'ACCEPT',
      'BUYER_01',
      'BUYER'
    );
    assert.strictEqual(acceptedOffer.status, 'ACCEPTED');

    // 5. Attempting to transition from terminal ACCEPTED status must be rejected
    await assert.rejects(
      async () => {
        await marketplaceRepository.respondToOffer('OFF_001', 'REJECT', 'FARMER_01', 'FARMER');
      },
      /Cannot transition offer currently in terminal state ACCEPTED/
    );

    // 6. Schedule collection on accepted offer
    const collection = await marketplaceRepository.createCollectionRecord(
      {
        collectionId: 'COL_001',
        offerId: 'OFF_001',
        listingId: 'LST_001',
        stage: 'SCHEDULED',
        scheduledPickupDate: '2026-10-20',
        transporterName: 'Punjab Green Fleet',
        vehicleRegistrationNumber: 'PB-11-AA-1234',
        updatedAt: new Date().toISOString(),
        isDemoData: true,
      },
      'BUYER_01',
      'BUYER'
    );
    assert.strictEqual(collection.stage, 'SCHEDULED');

    // 7. Verify collection at factory weighbridge
    const verifiedCol = await marketplaceRepository.updateCollectionMilestone(
      'COL_001',
      'VERIFIED',
      'BUYER_01',
      'BUYER',
      { verifiedNetTons: 98.5, certifiedMoisturePercent: 13.8 }
    );
    assert.strictEqual(verifiedCol.stage, 'VERIFIED');
    assert.strictEqual(verifiedCol.verifiedNetTons, 98.5);

    // Verify audit logs were produced
    const auditLogs = auditRepository.getAllEvents();
    assert.ok(auditLogs.length >= 5, 'Audit events must be recorded for every status transition');
  });
});
