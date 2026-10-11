import test from 'node:test';
import assert from 'node:assert';
import {
  calculateHaversineDistanceKm,
  calculateEstimatedFreightPerTonInr,
  matchListingWithBuyer,
  computeEnvironmentalImpact,
} from '../src/services/matchingEngine';
import { BuyerRequirement, ParaliListing } from '../src/types';

test('calculateHaversineDistanceKm computes distance between Delhi and Gurugram accurately', () => {
  // Connaught Place: 28.6289, 77.2065; Gurugram Sec 51: 28.4282, 77.0722 (~25.8 km)
  const dist = calculateHaversineDistanceKm(28.6289, 77.2065, 28.4282, 77.0722);
  assert.ok(dist >= 22 && dist <= 28, `Distance was ${dist}`);
});

test('calculateEstimatedFreightPerTonInr computes base + distance rate', () => {
  const freight50km = calculateEstimatedFreightPerTonInr(50);
  // 250 + 50 * 4.5 = 475 INR/t
  assert.strictEqual(freight50km, 475);
});

test('matchListingWithBuyer scores compatible crop and penalizes moisture / distance excess', () => {
  const sampleListing: ParaliListing = {
    listingId: 'TEST_01',
    farmerId: 'F1',
    farmerName: 'Test Farmer',
    farmerPhoneMasked: '+91 99999-XXXXX',
    cropType: 'Paddy Straw (Non-Basmati)',
    district: 'Sangrur',
    state: 'Punjab',
    locationName: 'Sangrur Field',
    coordinates: { lat: 30.2440, lon: 75.8450 },
    quantityTons: 100,
    moisturePercent: 12.0,
    askingPricePerTonInr: 1800,
    balingType: 'Ex-Field Baled (Round/Square)',
    availableFromDate: '2026-10-15',
    availableUntilDate: '2026-11-05',
    status: 'LISTED',
    isDemoData: true,
    createdAt: '2026-10-10T00:00:00Z',
  };

  const sampleBuyer: BuyerRequirement = {
    buyerId: 'B1',
    buyerName: 'Bio-CNG Processor',
    organizationType: 'Bio-CNG / CBG Plant',
    district: 'Sangrur',
    state: 'Punjab',
    coordinates: { lat: 30.2000, lon: 75.8000 },
    acceptedCrops: ['Paddy Straw (Non-Basmati)'],
    maxAcceptableMoisturePercent: 15.0,
    monthlyCapacityTons: 5000,
    maxHaulingRadiusKm: 50,
    offeredBasePricePerTonInr: 2200,
    isDemoData: true,
  };

  const match = matchListingWithBuyer(sampleListing, sampleBuyer);
  assert.ok(match.compatibilityScore >= 80, `Score was ${match.compatibilityScore}`);
  assert.strictEqual(match.disqualifyingFactors.length, 0);
});

test('computeEnvironmentalImpact strictly bases emissions avoidance on verified quantities', () => {
  const impact = computeEnvironmentalImpact(
    [],
    [
      {
        offerId: 'O1',
        listingId: 'L1',
        buyerId: 'B1',
        farmerId: 'F1',
        offeredPricePerTonInr: 2000,
        quantityTons: 100,
        status: 'ACCEPTED',
        lastUpdatedTimestamp: '2026-10-10T00:00:00Z',
        isDemoData: true,
      },
    ],
    [
      {
        collectionId: 'C1',
        offerId: 'O1',
        listingId: 'L1',
        stage: 'VERIFIED',
        scheduledPickupDate: '2026-10-12',
        transporterName: 'Punjab Freight',
        vehicleRegistrationNumber: 'PB-11-A-1234',
        verifiedNetTons: 100,
        updatedAt: '2026-10-10T00:00:00Z',
        isDemoData: true,
      },
    ]
  );

  assert.strictEqual(impact.totalQuantityVerifiedTons, 100);
  assert.strictEqual(impact.co2eAvoidedTonsEstimate, null);
  assert.strictEqual(impact.pm25AvoidedKgEstimate, null);
  assert.strictEqual(impact.emissionsValidationStatus, 'UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION');
  assert.strictEqual(impact.stubbleFiresAvertedEstimate, null);
  assert.strictEqual(impact.burningAversionValidationStatus, 'UNAVAILABLE_UNESTABLISHED_BURNING_BASELINE');
  // 100 tons * 2000 INR = 200,000 INR
  assert.strictEqual(impact.farmerIncomeGeneratedInr, 200000);
});

test('computeEnvironmentalImpact tracks all 5 quantity tiers and strictly refuses uncertified emissions and fire claims', () => {
  const listings: ParaliListing[] = [
    {
      listingId: 'L1',
      farmerId: 'F1',
      farmerName: 'Farmer 1',
      farmerPhoneMasked: '+91 98765-XXXXX',
      cropType: 'Paddy Straw (Non-Basmati)',
      district: 'Sangrur',
      state: 'Punjab',
      locationName: 'Field 1',
      coordinates: { lat: 30.2, lon: 75.8 },
      quantityTons: 500,
      moisturePercent: 12,
      askingPricePerTonInr: 1800,
      balingType: 'Ex-Field Baled (Round/Square)',
      availableFromDate: '2026-10-15',
      availableUntilDate: '2026-11-05',
      status: 'LISTED',
      isDemoData: true,
      createdAt: '2026-10-10T00:00:00Z',
    },
    {
      listingId: 'L2',
      farmerId: 'F2',
      farmerName: 'Farmer 2',
      farmerPhoneMasked: '+91 98765-XXXXX',
      cropType: 'Paddy Straw (Non-Basmati)',
      district: 'Patiala',
      state: 'Punjab',
      locationName: 'Field 2',
      coordinates: { lat: 30.3, lon: 76.4 },
      quantityTons: 200,
      moisturePercent: 13,
      askingPricePerTonInr: 1900,
      balingType: 'Ex-Field Baled (Round/Square)',
      availableFromDate: '2026-10-15',
      availableUntilDate: '2026-11-05',
      status: 'EXPIRED',
      isDemoData: true,
      createdAt: '2026-10-10T00:00:00Z',
    },
  ];

  const offers = [
    {
      offerId: 'O1',
      listingId: 'L1',
      buyerId: 'B1',
      farmerId: 'F1',
      offeredPricePerTonInr: 2100,
      quantityTons: 300,
      status: 'ACCEPTED' as const,
      lastUpdatedTimestamp: '2026-10-10T00:00:00Z',
      isDemoData: true,
    },
    {
      offerId: 'O2',
      listingId: 'L1',
      buyerId: 'B2',
      farmerId: 'F1',
      offeredPricePerTonInr: 2000,
      quantityTons: 100,
      status: 'SUBMITTED' as const,
      lastUpdatedTimestamp: '2026-10-10T00:00:00Z',
      isDemoData: true,
    },
  ];

  const collections = [
    {
      collectionId: 'C1',
      offerId: 'O1',
      listingId: 'L1',
      stage: 'DELIVERED' as const,
      scheduledPickupDate: '2026-10-12',
      transporterName: 'Punjab Freight',
      vehicleRegistrationNumber: 'PB-11-A-1234',
      factoryWeighbridgeGrossTons: 120,
      updatedAt: '2026-10-10T00:00:00Z',
      isDemoData: true,
    },
    {
      collectionId: 'C2',
      offerId: 'O1',
      listingId: 'L1',
      stage: 'VERIFIED' as const,
      scheduledPickupDate: '2026-10-13',
      transporterName: 'Punjab Freight',
      vehicleRegistrationNumber: 'PB-11-A-5678',
      factoryWeighbridgeGrossTons: 180,
      verifiedNetTons: 180,
      updatedAt: '2026-10-10T00:00:00Z',
      isDemoData: true,
    },
  ];

  const metrics = computeEnvironmentalImpact(listings, offers, collections);

  // Invariant hierarchy at reporting scope:
  // Verified (180) <= Collected (300) <= Accepted (300) <= Matched (500) <= Listed (700)
  assert.strictEqual(metrics.totalQuantityListedTons, 700);
  assert.strictEqual(metrics.totalQuantityMatchedTons, 500);
  assert.strictEqual(metrics.totalQuantityAcceptedTons, 300);
  assert.strictEqual(metrics.totalQuantityCollectedTons, 300);
  assert.strictEqual(metrics.totalQuantityVerifiedTons, 180);

  assert.ok(metrics.totalQuantityVerifiedTons <= metrics.totalQuantityCollectedTons);
  assert.ok(metrics.totalQuantityCollectedTons <= metrics.totalQuantityAcceptedTons);
  assert.ok(metrics.totalQuantityAcceptedTons <= metrics.totalQuantityMatchedTons);
  assert.ok(metrics.totalQuantityMatchedTons <= metrics.totalQuantityListedTons);

  // Environmental impact safeguards: CO2e and PM2.5 are strictly null
  assert.strictEqual(metrics.co2eAvoidedTonsEstimate, null);
  assert.strictEqual(metrics.pm25AvoidedKgEstimate, null);
  assert.strictEqual(metrics.emissionsValidationStatus, 'UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION');

  // Stubble burning prevention claims are strictly withheld (null)
  assert.strictEqual(metrics.stubbleFiresAvertedEstimate, null);
  assert.strictEqual(metrics.burningAversionValidationStatus, 'UNAVAILABLE_UNESTABLISHED_BURNING_BASELINE');

  // Revenue = 180 verified tons * 2100 INR/t = 378,000 INR
  assert.strictEqual(metrics.farmerIncomeGeneratedInr, 378000);
});

test('computeEnvironmentalImpact clamps over-collection to preserve physical quantity invariants', () => {
  const listings: ParaliListing[] = [
    {
      listingId: 'L_CLAMP',
      farmerId: 'F_CLAMP',
      farmerName: 'Farmer Clamp',
      farmerPhoneMasked: '+91 98765-XXXXX',
      cropType: 'Paddy Straw (Non-Basmati)',
      district: 'Sangrur',
      state: 'Punjab',
      locationName: 'Field Clamp',
      coordinates: { lat: 30.2, lon: 75.8 },
      quantityTons: 200,
      moisturePercent: 12,
      askingPricePerTonInr: 1800,
      balingType: 'Ex-Field Baled (Round/Square)',
      availableFromDate: '2026-10-15',
      availableUntilDate: '2026-11-05',
      status: 'LISTED',
      isDemoData: true,
      createdAt: '2026-10-10T00:00:00Z',
    },
  ];

  const offers = [
    {
      offerId: 'O_CLAMP',
      listingId: 'L_CLAMP',
      buyerId: 'B_CLAMP',
      farmerId: 'F_CLAMP',
      offeredPricePerTonInr: 2000,
      quantityTons: 150, // Accepted is 150 tons
      status: 'ACCEPTED' as const,
      lastUpdatedTimestamp: '2026-10-10T00:00:00Z',
      isDemoData: true,
    },
  ];

  // Inconsistent fixture: attempts 280 tons collected against a 150 ton offer
  const overCollections = [
    {
      collectionId: 'C_OVER',
      offerId: 'O_CLAMP',
      listingId: 'L_CLAMP',
      stage: 'DELIVERED' as const,
      scheduledPickupDate: '2026-10-12',
      transporterName: 'Carrier',
      vehicleRegistrationNumber: 'PB-10-A-0001',
      factoryWeighbridgeGrossTons: 280,
      updatedAt: '2026-10-10T00:00:00Z',
      isDemoData: true,
    },
  ];

  const metrics = computeEnvironmentalImpact(listings, offers, overCollections);

  // Invariant enforced: collected cannot exceed accepted (150 tons)
  assert.strictEqual(metrics.totalQuantityAcceptedTons, 150);
  assert.strictEqual(metrics.totalQuantityCollectedTons, 150);
  assert.ok(metrics.totalQuantityCollectedTons <= metrics.totalQuantityAcceptedTons);
});
