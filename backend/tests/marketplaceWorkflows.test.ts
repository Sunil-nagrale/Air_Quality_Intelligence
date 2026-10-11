import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handler } from '../src/index';
import { createTestJwt } from '../src/middleware/auth';
import { marketplaceRepository } from '../src/repositories/marketplaceRepository';
import { LOGISTICS_STAGE_LABELS } from '../src/types';
import {
  matchListingWithBuyer,
  computeEnvironmentalImpact,
  calculateEstimatedFreightPerTonInr,
  calculateHaversineDistanceKm,
} from '../src/services/matchingEngine';
import { APIGatewayProxyEvent } from 'aws-lambda';

function makeEvent(options: {
  method: string;
  path: string;
  body?: any;
  queryStringParameters?: Record<string, string>;
  token?: string;
}): APIGatewayProxyEvent {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  return {
    httpMethod: options.method,
    path: options.path,
    headers,
    queryStringParameters: options.queryStringParameters || null,
    body: options.body ? JSON.stringify(options.body) : null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  };
}

describe('Parali-to-Value Marketplace Workflows & Governance Safeguards (Prompt 8)', () => {
  const farmerSunilToken = createTestJwt({
    sub: 'FARMER_SUNIL',
    email: 'sunilnagrale@gmail.com',
    role: 'FARMER',
  });

  const farmerOtherToken = createTestJwt({
    sub: 'FARMER_OTHER',
    email: 'otherfarmer@punjab.in',
    role: 'FARMER',
  });

  const buyerBioCngToken = createTestJwt({
    sub: 'BUYER_PUNJAB_BIOCNG',
    email: 'buyer@punjabbioenergy.in',
    role: 'BUYER',
  });

  const buyerOtherToken = createTestJwt({
    sub: 'BUYER_OTHER',
    email: 'otherbuyer@pellets.in',
    role: 'BUYER',
  });

  const personalUserToken = createTestJwt({
    sub: 'USER_PERSONAL',
    email: 'personal@citizen.in',
    role: 'PERSONAL_USER',
  });

  const schoolAdminToken = createTestJwt({
    sub: 'USER_SCHOOL',
    email: 'school@edu.in',
    role: 'SCHOOL_ADMIN',
  });

  // ---------------------------------------------------------------------------
  // 1. Public Browsing & Counterparty Phone Masking Safeguards
  // ---------------------------------------------------------------------------
  it('GET /marketplace/listings anonymously masks supplier phone numbers', async () => {
    const event = makeEvent({ method: 'GET', path: '/marketplace/listings' });
    const res = await handler(event);
    assert.strictEqual(res.statusCode, 200);

    const data = JSON.parse(res.body);
    assert.ok(Array.isArray(data.listings));
    assert.ok(data.listings.length > 0);

    // Verify all listings for anonymous visitors have masked phone numbers
    for (const listing of data.listings) {
      assert.strictEqual(listing.isPhoneMasked, true);
      assert.match(listing.farmerPhoneMasked, /\+91 .*XX/);
    }
  });

  it('GET /marketplace/listings reveals unmasked phone only to listing owner or accepted counterparty', async () => {
    // 1. Owner view (Sunil Singh)
    const ownerEvent = makeEvent({
      method: 'GET',
      path: '/marketplace/listings',
      token: farmerSunilToken,
    });
    const ownerRes = await handler(ownerEvent);
    assert.strictEqual(ownerRes.statusCode, 200);
    const ownerData = JSON.parse(ownerRes.body);

    const sunilListing = ownerData.listings.find((l: any) => l.listingId === 'LIST_SANGRUR_01');
    assert.ok(sunilListing);
    assert.strictEqual(sunilListing.isPhoneMasked, false);

    // 2. Accepted counterparty view (BUYER_PUNJAB_BIOCNG has accepted offer on LIST_SANGRUR_01)
    const counterpartyEvent = makeEvent({
      method: 'GET',
      path: '/marketplace/listings',
      token: buyerBioCngToken,
    });
    const cpRes = await handler(counterpartyEvent);
    assert.strictEqual(cpRes.statusCode, 200);
    const cpData = JSON.parse(cpRes.body);

    const cpListing = cpData.listings.find((l: any) => l.listingId === 'LIST_SANGRUR_01');
    assert.ok(cpListing);
    assert.strictEqual(cpListing.isPhoneMasked, false);

    // 3. Unrelated buyer view (BUYER_OTHER has no accepted offer on LIST_SANGRUR_01)
    const strangerEvent = makeEvent({
      method: 'GET',
      path: '/marketplace/listings',
      token: buyerOtherToken,
    });
    const strangerRes = await handler(strangerEvent);
    const strangerData = JSON.parse(strangerRes.body);
    const strangerListing = strangerData.listings.find((l: any) => l.listingId === 'LIST_SANGRUR_01');
    assert.ok(strangerListing);
    assert.strictEqual(strangerListing.isPhoneMasked, true);
  });

  // ---------------------------------------------------------------------------
  // 2. Farmer Listing Management & Validation
  // ---------------------------------------------------------------------------
  it('POST /marketplace/listings validates required fields and moisture limits', async () => {
    // Rejects non-positive quantity
    const badQtyEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/listings',
      token: farmerSunilToken,
      body: {
        cropType: 'Paddy Straw (Non-Basmati)',
        quantityTons: 0,
      },
    });
    const badQtyRes = await handler(badQtyEvent);
    assert.strictEqual(badQtyRes.statusCode, 400);

    // Rejects moisture content exceeding 25%
    const highMoistureEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/listings',
      token: farmerSunilToken,
      body: {
        cropType: 'Paddy Straw (Non-Basmati)',
        quantityTons: 100,
        moisturePercent: 28.5,
      },
    });
    const highMoistureRes = await handler(highMoistureEvent);
    assert.strictEqual(highMoistureRes.statusCode, 400);
    assert.match(JSON.parse(highMoistureRes.body).message, /Moisture content cannot exceed 25%/);
  });

  it('POST, PUT, and DELETE /marketplace/listings allows farmer lifecycle with ownership protection', async () => {
    // 1. Create new draft listing
    const createEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/listings',
      token: farmerSunilToken,
      body: {
        cropType: 'Basmati Straw',
        quantityTons: 150,
        moisturePercent: 13.5,
        askingPricePerTonInr: 2200,
        balingType: 'Ex-Field Baled (Round/Square)',
        locationName: 'Sunam Farm Depot, Sangrur',
      },
    });
    const createRes = await handler(createEvent);
    assert.strictEqual(createRes.statusCode, 201);
    const created = JSON.parse(createRes.body).listing;
    assert.ok(created.listingId);
    assert.strictEqual(created.status, 'LISTED');

    // 2. Another farmer cannot modify this listing (403 Forbidden)
    const unauthorizedPut = makeEvent({
      method: 'PUT',
      path: `/marketplace/listings/${created.listingId}`,
      token: farmerOtherToken,
      body: { askingPricePerTonInr: 1500 },
    });
    const unauthPutRes = await handler(unauthorizedPut);
    assert.strictEqual(unauthPutRes.statusCode, 403);

    // 3. Owner updates asking price
    const updateEvent = makeEvent({
      method: 'PUT',
      path: `/marketplace/listings/${created.listingId}`,
      token: farmerSunilToken,
      body: { askingPricePerTonInr: 2150, quantityTons: 160 },
    });
    const updateRes = await handler(updateEvent);
    assert.strictEqual(updateRes.statusCode, 200);
    const updated = JSON.parse(updateRes.body).listing;
    assert.strictEqual(updated.askingPricePerTonInr, 2150);
    assert.strictEqual(updated.quantityTons, 160);

    // 4. Another farmer cannot delete this listing (403 Forbidden)
    const unauthorizedDel = makeEvent({
      method: 'DELETE',
      path: `/marketplace/listings/${created.listingId}`,
      token: farmerOtherToken,
    });
    const unauthDelRes = await handler(unauthorizedDel);
    assert.strictEqual(unauthDelRes.statusCode, 403);

    // 5. Owner deletes listing
    const deleteEvent = makeEvent({
      method: 'DELETE',
      path: `/marketplace/listings/${created.listingId}`,
      token: farmerSunilToken,
    });
    const deleteRes = await handler(deleteEvent);
    assert.strictEqual(deleteRes.statusCode, 200);
    assert.strictEqual(JSON.parse(deleteRes.body).success, true);
  });

  // ---------------------------------------------------------------------------
  // 3. Role Access Controls & Boundaries
  // ---------------------------------------------------------------------------
  it('enforces RBAC preventing personal users and school admins from marketplace actions', async () => {
    // Personal user cannot create listing
    const pListing = makeEvent({
      method: 'POST',
      path: '/marketplace/listings',
      token: personalUserToken,
      body: { cropType: 'Paddy Straw (Non-Basmati)', quantityTons: 100 },
    });
    const pListingRes = await handler(pListing);
    assert.strictEqual(pListingRes.statusCode, 403);

    // School admin cannot create offer
    const sOffer = makeEvent({
      method: 'POST',
      path: '/marketplace/offers',
      token: schoolAdminToken,
      body: { listingId: 'LIST_SANGRUR_01', offeredPricePerTonInr: 2000 },
    });
    const sOfferRes = await handler(sOffer);
    assert.strictEqual(sOfferRes.statusCode, 403);

    // Farmer cannot create offer (only buyers can submit offers)
    const fOffer = makeEvent({
      method: 'POST',
      path: '/marketplace/offers',
      token: farmerSunilToken,
      body: { listingId: 'LIST_SANGRUR_01', offeredPricePerTonInr: 2000 },
    });
    const fOfferRes = await handler(fOffer);
    assert.strictEqual(fOfferRes.statusCode, 403);
  });

  // ---------------------------------------------------------------------------
  // 4. Deterministic Algorithmic Matching & 16T Freight Calculation
  // ---------------------------------------------------------------------------
  it('calculates deterministic 16T truck freight and compatibility match scores', async () => {
    // 16T Freight Formula: ₹250/t base + ₹4.50/t-km
    const freight30km = calculateEstimatedFreightPerTonInr(30);
    assert.strictEqual(freight30km, 250 + 30 * 4.5); // ₹385/t

    const freight100km = calculateEstimatedFreightPerTonInr(100);
    assert.strictEqual(freight100km, 250 + 100 * 4.5); // ₹700/t

    // Match listing with Bio-CNG buyer
    const listing = await marketplaceRepository.getListing('LIST_SANGRUR_01');
    assert.ok(listing);
    const buyer = await marketplaceRepository.getBuyerProfile('BUYER_PUNJAB_BIOCNG');
    assert.ok(buyer);

    const match = matchListingWithBuyer(listing, buyer);
    assert.ok(match.compatibilityScore >= 80);
    assert.strictEqual(match.listingId, 'LIST_SANGRUR_01');
    assert.strictEqual(match.buyerId, 'BUYER_PUNJAB_BIOCNG');
    assert.ok(match.matchReasons.some((r) => r.includes('Exact crop compatibility')));
  });

  // ---------------------------------------------------------------------------
  // 5. Multi-Turn Offer Negotiation State Machine
  // ---------------------------------------------------------------------------
  it('manages offer lifecycle through SUBMITTED, COUNTERED, and ACCEPTED states with terminal protection', async () => {
    // 1. Buyer submits offer on LIST_SANGRUR_02
    const submitOfferEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/offers',
      token: buyerBioCngToken,
      body: {
        listingId: 'LIST_SANGRUR_02',
        offeredPricePerTonInr: 1900,
        quantityTons: 200,
        buyerNotes: 'Off-take for bio-gas digesters',
      },
    });
    const submitRes = await handler(submitOfferEvent);
    assert.strictEqual(submitRes.statusCode, 201);
    const offer = JSON.parse(submitRes.body).offer;
    assert.strictEqual(offer.status, 'SUBMITTED');
    assert.strictEqual(offer.offeredPricePerTonInr, 1900);

    // 2. Farmer counters offer with higher price
    const counterEvent = makeEvent({
      method: 'POST',
      path: `/marketplace/offers/${offer.offerId}/respond`,
      token: farmerSunilToken,
      body: {
        action: 'COUNTER',
        counterPrice: 2050,
        notes: 'Target lot is premium baled Basmati',
      },
    });
    const counterRes = await handler(counterEvent);
    assert.strictEqual(counterRes.statusCode, 200);
    const counteredOffer = JSON.parse(counterRes.body).offer;
    assert.strictEqual(counteredOffer.status, 'COUNTERED');
    assert.strictEqual(counteredOffer.counterOfferPricePerTonInr, 2050);

    // 3. Buyer accepts farmer's counter offer
    const acceptEvent = makeEvent({
      method: 'POST',
      path: `/marketplace/offers/${offer.offerId}/respond`,
      token: buyerBioCngToken,
      body: { action: 'ACCEPT' },
    });
    const acceptRes = await handler(acceptEvent);
    assert.strictEqual(acceptRes.statusCode, 200);
    const acceptedOffer = JSON.parse(acceptRes.body).offer;
    assert.strictEqual(acceptedOffer.status, 'ACCEPTED');

    // Listing is also transitioned to ACCEPTED
    const updatedListing = await marketplaceRepository.getListing('LIST_SANGRUR_02');
    assert.strictEqual(updatedListing?.status, 'ACCEPTED');

    // 4. Terminal State Guard: cannot transition an ACCEPTED offer
    const tryRejectEvent = makeEvent({
      method: 'POST',
      path: `/marketplace/offers/${offer.offerId}/respond`,
      token: farmerSunilToken,
      body: { action: 'REJECT' },
    });
    const tryRejectRes = await handler(tryRejectEvent);
    assert.strictEqual(tryRejectRes.statusCode, 500); // Throws domain state machine exception
  });

  // ---------------------------------------------------------------------------
  // 6. Collection Logistics & Weighbridge Milestones
  // ---------------------------------------------------------------------------
  it('tracks collection stages from SCHEDULED to VERIFIED with weighbridge data', async () => {
    // 1. Cannot create collection on an unaccepted offer
    const invalidCollEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        offerId: 'NON_EXISTENT_OFFER',
        listingId: 'LIST_SANGRUR_01',
      },
    });
    const invalidCollRes = await handler(invalidCollEvent);
    assert.strictEqual(invalidCollRes.statusCode, 500);

    // 2. Create dedicated listing and accepted offer with 380 T to test legitimate collection lifecycle
    const testListingId = `LIST_LOGISTICS_${Date.now()}`;
    await marketplaceRepository.saveListing(
      {
        listingId: testListingId,
        farmerId: 'FARMER_SUNIL',
        farmerName: 'Sardar Sunil Singh',
        farmerPhoneMasked: '+91 98765-XXXXX',
        cropType: 'Paddy Straw (Non-Basmati)',
        district: 'Sangrur',
        state: 'Punjab',
        locationName: 'Dhuri Village, Sangrur',
        coordinates: { lat: 30.244, lon: 75.845 },
        quantityTons: 400,
        moisturePercent: 14.0,
        askingPricePerTonInr: 1850,
        balingType: 'Ex-Field Baled (Round/Square)',
        availableFromDate: '2026-10-15',
        availableUntilDate: '2026-11-05',
        status: 'ACCEPTED',
        isDemoData: true,
        createdAt: new Date().toISOString(),
      },
      'FARMER_SUNIL'
    );

    const testOfferId = `OFFER_LOGISTICS_${Date.now()}`;
    await marketplaceRepository.createOffer(
      {
        offerId: testOfferId,
        listingId: testListingId,
        buyerId: 'BUYER_PUNJAB_BIOCNG',
        farmerId: 'FARMER_SUNIL',
        offeredPricePerTonInr: 1950,
        quantityTons: 380,
        status: 'ACCEPTED',
        lastUpdatedTimestamp: new Date().toISOString(),
        isDemoData: true,
      },
      'BUYER_PUNJAB_BIOCNG'
    );

    // 3. Create collection for accepted offer
    const collId = `COLL_TEST_${Date.now()}`;
    const createCollEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: collId,
        offerId: testOfferId,
        listingId: testListingId,
        transporterName: 'Malwa Express Logistics',
        vehicleRegistrationNumber: 'PB-13-XX-1234',
        scheduledPickupDate: '2026-10-20',
      },
    });
    const createCollRes = await handler(createCollEvent);
    assert.strictEqual(createCollRes.statusCode, 201);
    const coll = JSON.parse(createCollRes.body).collection;
    assert.strictEqual(coll.stage, 'SCHEDULED');

    // 4. Update milestone to IN_TRANSIT
    const transitEvent = makeEvent({
      method: 'PUT',
      path: `/marketplace/collections/${collId}`,
      token: buyerBioCngToken,
      body: {
        stage: 'IN_TRANSIT',
        fieldWeighbridgeGrossTons: 365,
      },
    });
    const transitRes = await handler(transitEvent);
    assert.strictEqual(transitRes.statusCode, 200);
    const transitColl = JSON.parse(transitRes.body).collection;
    assert.strictEqual(transitColl.stage, 'IN_TRANSIT');
    assert.strictEqual(transitColl.fieldWeighbridgeGrossTons, 365);

    // 5. Update milestone to VERIFIED with weighbridge slip
    const verifyEvent = makeEvent({
      method: 'PUT',
      path: `/marketplace/collections/${collId}`,
      token: buyerBioCngToken,
      body: {
        stage: 'VERIFIED',
        factoryWeighbridgeGrossTons: 362,
        verifiedNetTons: 350,
        certifiedMoisturePercent: 13.8,
        deliveryWeighbridgeSlipUrl: '/slips/wb_1234.pdf',
      },
    });
    const verifyRes = await handler(verifyEvent);
    assert.strictEqual(verifyRes.statusCode, 200);
    const verifiedColl = JSON.parse(verifyRes.body).collection;
    assert.strictEqual(verifiedColl.stage, 'VERIFIED');
    assert.strictEqual(verifiedColl.verifiedNetTons, 350);
    assert.strictEqual(verifiedColl.certifiedMoisturePercent, 13.8);

    // 6. Quantity Integrity Guard: reject over-collection exceeding accepted offer
    const overCollEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: `COLL_OVER_${Date.now()}`,
        offerId: testOfferId,
        listingId: testListingId,
        transporterName: 'Malwa Express Logistics',
        vehicleRegistrationNumber: 'PB-13-XX-9999',
        fieldWeighbridgeGrossTons: 50, // 350 + 50 = 400 > 380 accepted
      },
    });
    const overCollRes = await handler(overCollEvent);
    assert.strictEqual(overCollRes.statusCode, 400);
    const overCollBody = JSON.parse(overCollRes.body);
    assert.strictEqual(overCollBody.error, 'QUANTITY_INTEGRITY_VIOLATION');

    // 7. Quantity Integrity Guard: reject verified net weight exceeding gross weight
    const netOverGrossEvent = makeEvent({
      method: 'PUT',
      path: `/marketplace/collections/${collId}`,
      token: buyerBioCngToken,
      body: {
        stage: 'VERIFIED',
        factoryWeighbridgeGrossTons: 360,
        verifiedNetTons: 375, // net > gross violation
      },
    });
    const netOverGrossRes = await handler(netOverGrossEvent);
    assert.strictEqual(netOverGrossRes.statusCode, 400);
    const netOverGrossBody = JSON.parse(netOverGrossRes.body);
    assert.strictEqual(netOverGrossBody.error, 'QUANTITY_INTEGRITY_VIOLATION');
  });

  // ---------------------------------------------------------------------------
  // 7. Defensible LCA Environmental Accounting
  // ---------------------------------------------------------------------------
  it('GET /marketplace/impact strictly separates the 5 tonnages and marks emissions pending certification', async () => {
    const event = makeEvent({ method: 'GET', path: '/marketplace/impact' });
    const res = await handler(event);
    assert.strictEqual(res.statusCode, 200);

    const { impact } = JSON.parse(res.body);
    assert.ok(impact);

    // Verify strict separation of the 5 quantities
    assert.ok(typeof impact.totalQuantityListedTons === 'number');
    assert.ok(typeof impact.totalQuantityMatchedTons === 'number');
    assert.ok(typeof impact.totalQuantityAcceptedTons === 'number');
    assert.ok(typeof impact.totalQuantityCollectedTons === 'number');
    assert.ok(typeof impact.totalQuantityVerifiedTons === 'number');

    // Avoided emissions must remain null pending certification to prevent unsupported claims
    assert.strictEqual(impact.co2eAvoidedTonsEstimate, null);
    assert.strictEqual(impact.pm25AvoidedKgEstimate, null);
    assert.strictEqual(
      impact.emissionsValidationStatus,
      'UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION'
    );

    // Farmer income must be non-negative and based on accepted prices
    assert.ok(impact.farmerIncomeGeneratedInr >= 0);
    assert.ok(impact.calculationMethodologyNotes.includes('weighbridge slips'));
  });

  // ---------------------------------------------------------------------------
  // 8. Industrial Buyer Profiles (5 Utilization Categories)
  // ---------------------------------------------------------------------------
  it('GET /marketplace/buyers returns the 5 distinct categories with Kriya Labs marked as academic reference', async () => {
    const event = makeEvent({ method: 'GET', path: '/marketplace/buyers' });
    const res = await handler(event);
    assert.strictEqual(res.statusCode, 200);

    const { buyers } = JSON.parse(res.body);
    assert.ok(Array.isArray(buyers));
    assert.strictEqual(buyers.length, 5);

    // Check presence of distinct categories
    const categories = buyers.map((b: any) => b.organizationType);
    assert.ok(categories.some((c: string) => c.includes('Bio-CNG')));
    assert.ok(categories.some((c: string) => c.includes('Pellet')));
    assert.ok(categories.some((c: string) => c.includes('Ethanol')));
    assert.ok(categories.some((c: string) => c.includes('Pulp & Tableware')));

    // Check academic reference benchmark
    const kriyaRef = buyers.find((b: any) => b.buyerId === 'BUYER_KRIYA_LABS_REF');
    assert.ok(kriyaRef);
    assert.strictEqual(kriyaRef.isAcademicReference, true);
  });

  // ---------------------------------------------------------------------------
  // 9. Atomic Concurrency & Physical Quantity Invariant Enforcement
  // ---------------------------------------------------------------------------
  it('enforces atomic quantity limits under genuinely concurrent collection creation requests (300T accepted vs 2x 200T)', async () => {
    // 1. Create a listing for 300T
    const listingId = `LIST_CONC_${Date.now()}`;
    const listEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/listings',
      token: farmerSunilToken,
      body: {
        listingId,
        cropType: 'Paddy Straw (Non-Basmati)',
        quantityTons: 300,
        moisturePercent: 14.0,
        askingPricePerTonInr: 2200,
        balingType: 'Ex-Field Baled (Round/Square)',
        state: 'Punjab',
        district: 'Sangrur',
        locationName: 'Bhawanigarh Village',
        coordinates: { lat: 30.23, lon: 75.98 },
        availableFromDate: '2026-10-15',
        availableUntilDate: '2026-10-30',
      },
    });
    const listRes = await handler(listEvent);
    assert.strictEqual(listRes.statusCode, 201);

    // 2. Buyer submits offer for 300T
    const offerId = `OFFER_CONC_${Date.now()}`;
    const offerEvent = makeEvent({
      method: 'POST',
      path: '/marketplace/offers',
      token: buyerBioCngToken,
      body: {
        offerId,
        listingId,
        offeredPricePerTonInr: 2150,
        quantityTons: 300,
      },
    });
    const offerRes = await handler(offerEvent);
    assert.strictEqual(offerRes.statusCode, 201);

    // 3. Farmer accepts offer for 300T
    const acceptEvent = makeEvent({
      method: 'POST',
      path: `/marketplace/offers/${offerId}/respond`,
      token: farmerSunilToken,
      body: {
        action: 'ACCEPT',
      },
    });
    const acceptRes = await handler(acceptEvent);
    assert.strictEqual(acceptRes.statusCode, 200);

    // 4. Issue TWO genuinely concurrent requests attempting to collect 200T each
    const collId1 = `COLL_CONC_1_${Date.now()}`;
    const collId2 = `COLL_CONC_2_${Date.now()}`;

    const collReq1 = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: collId1,
        offerId,
        listingId,
        transporterName: 'Punjab Agro Logistics Fleet A',
        vehicleRegistrationNumber: 'PB-11-AA-1001',
        fieldWeighbridgeGrossTons: 200,
      },
    });

    const collReq2 = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: collId2,
        offerId,
        listingId,
        transporterName: 'Punjab Agro Logistics Fleet B',
        vehicleRegistrationNumber: 'PB-11-BB-2002',
        fieldWeighbridgeGrossTons: 200,
      },
    });

    // Execute both concurrently
    const [res1, res2] = await Promise.all([handler(collReq1), handler(collReq2)]);

    const statusCodes = [res1.statusCode, res2.statusCode].sort();
    // Exactly one must succeed (201) and exactly one must fail with quantity integrity violation (400)
    assert.deepStrictEqual(statusCodes, [201, 400]);

    const failedRes = res1.statusCode === 400 ? res1 : res2;
    const successRes = res1.statusCode === 201 ? res1 : res2;

    const failedBody = JSON.parse(failedRes.body);
    assert.strictEqual(failedBody.error, 'QUANTITY_INTEGRITY_VIOLATION');
    assert.ok(failedBody.message.includes('Cumulative collection tonnage'));

    const successBody = JSON.parse(successRes.body);
    const successfulCollId = successBody.collection.collectionId;
    assert.strictEqual(successBody.collection.fieldWeighbridgeGrossTons, 200);

    // 5. Idempotent Retry: Replaying the successful request with identical parameters returns cleanly
    const retryReq = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: successfulCollId,
        offerId,
        listingId,
        transporterName: 'Punjab Agro Logistics Fleet A',
        vehicleRegistrationNumber: 'PB-11-AA-1001',
        fieldWeighbridgeGrossTons: 200,
      },
    });
    const retryRes = await handler(retryReq);
    assert.strictEqual(retryRes.statusCode, 201);
    const retryBody = JSON.parse(retryRes.body);
    assert.strictEqual(retryBody.collection.collectionId, successfulCollId);

    // Verify stored collections under this offer: exactly 1 collection for 200T
    const offerCollections = await marketplaceRepository.listCollectionsForOffer(offerId);
    assert.strictEqual(offerCollections.length, 1);
    const totalCollected = offerCollections.reduce(
      (sum, c) => sum + (c.verifiedNetTons || c.factoryWeighbridgeGrossTons || c.fieldWeighbridgeGrossTons || 0),
      0
    );
    assert.strictEqual(totalCollected, 200);

    // 6. Subsequent valid collection for remaining 100T succeeds (200 + 100 = 300T)
    const collId3 = `COLL_CONC_3_${Date.now()}`;
    const collReq3 = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: collId3,
        offerId,
        listingId,
        transporterName: 'Punjab Agro Logistics Fleet C',
        vehicleRegistrationNumber: 'PB-11-CC-3003',
        fieldWeighbridgeGrossTons: 100,
      },
    });
    const res3 = await handler(collReq3);
    assert.strictEqual(res3.statusCode, 201);

    // 7. Subsequent collection attempting any additional tonnage (e.g. 10T) must fail
    const collId4 = `COLL_CONC_4_${Date.now()}`;
    const collReq4 = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: collId4,
        offerId,
        listingId,
        transporterName: 'Punjab Agro Logistics Fleet D',
        vehicleRegistrationNumber: 'PB-11-DD-4004',
        fieldWeighbridgeGrossTons: 10,
      },
    });
    const res4 = await handler(collReq4);
    assert.strictEqual(res4.statusCode, 400);
    const res4Body = JSON.parse(res4.body);
    assert.strictEqual(res4Body.error, 'QUANTITY_INTEGRITY_VIOLATION');

    // 8. Physical invariant: verified net <= collected gross <= accepted offer quantity <= matched <= listed
    const allColls = await marketplaceRepository.listCollectionsForOffer(offerId);
    assert.strictEqual(allColls.length, 2);
    const finalTotal = allColls.reduce(
      (sum, c) => sum + (c.verifiedNetTons || c.factoryWeighbridgeGrossTons || c.fieldWeighbridgeGrossTons || 0),
      0
    );
    assert.strictEqual(finalTotal, 300);
    assert.ok(finalTotal <= 300, 'Collected gross must never exceed accepted offer quantity');
  });

  it('POST /marketplace/collections handles concurrent identical requests idempotently with single record and single capacity reservation', async () => {
    // 1. Create a fresh listing and accepted offer for 300T
    const listingId = `LIST_IDEMP_${Date.now()}`;
    const listRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/listings',
        token: farmerSunilToken,
        body: {
          listingId,
          cropType: 'Paddy Straw (Non-Basmati)',
          quantityTons: 300,
          moisturePercent: 14.0,
          askingPricePerTonInr: 2200,
          balingType: 'Ex-Field Baled (Round/Square)',
          state: 'Punjab',
          district: 'Sangrur',
          locationName: 'Bhawanigarh Village',
          coordinates: { lat: 30.23, lon: 75.98 },
          availableFromDate: '2026-10-15',
          availableUntilDate: '2026-10-30',
        },
      })
    );
    assert.strictEqual(listRes.statusCode, 201);

    const offerId = `OFF_IDEMP_${Date.now()}`;
    const offerRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/offers',
        token: buyerBioCngToken,
        body: {
          offerId,
          listingId,
          offeredPricePerTonInr: 2150,
          quantityTons: 300,
        },
      })
    );
    assert.strictEqual(offerRes.statusCode, 201);

    const acceptRes = await handler(
      makeEvent({
        method: 'POST',
        path: `/marketplace/offers/${offerId}/respond`,
        token: farmerSunilToken,
        body: {
          action: 'ACCEPT',
        },
      })
    );
    assert.strictEqual(acceptRes.statusCode, 200);

    // 2. Prepare two identical requests with the SAME collectionId for 150T
    const sameCollectionId = `COLL_SAME_${Date.now()}`;
    const req1 = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: sameCollectionId,
        offerId,
        listingId,
        stage: 'SCHEDULED',
        scheduledPickupDate: '2026-10-26',
        transporterName: 'Malwa Express Logistics',
        vehicleRegistrationNumber: 'PB-11-XX-9001',
        fieldWeighbridgeGrossTons: 150,
      },
    });

    const req2 = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: sameCollectionId,
        offerId,
        listingId,
        stage: 'SCHEDULED',
        scheduledPickupDate: '2026-10-26',
        transporterName: 'Malwa Express Logistics',
        vehicleRegistrationNumber: 'PB-11-XX-9001',
        fieldWeighbridgeGrossTons: 150,
      },
    });

    // Execute concurrently
    const [res1, res2] = await Promise.all([handler(req1), handler(req2)]);

    assert.strictEqual(res1.statusCode, 201);
    assert.strictEqual(res2.statusCode, 201);

    const body1 = JSON.parse(res1.body);
    const body2 = JSON.parse(res2.body);
    assert.strictEqual(body1.collection.collectionId, sameCollectionId);
    assert.strictEqual(body2.collection.collectionId, sameCollectionId);

    // 3. Confirm exactly ONE durable record exists and capacity deducted exactly ONCE
    const collections = await marketplaceRepository.listCollectionsForOffer(offerId);
    assert.strictEqual(collections.length, 1);
    assert.strictEqual(collections[0].collectionId, sameCollectionId);
    assert.strictEqual(collections[0].fieldWeighbridgeGrossTons, 150);

    const updatedOffer = await marketplaceRepository.getOffer(offerId);
    assert.ok(updatedOffer);
    assert.strictEqual(updatedOffer.reservedQuantityTons, 150);
    assert.strictEqual(updatedOffer.remainingQuantityTons, 150);
    // Acceptance criterion 1: Scheduled collections do NOT increment collected tonnage
    assert.strictEqual(updatedOffer.actualCollectedGrossTons, 0);

    // 4. Conflicting replay with same collectionId but conflicting tonnage is rejected
    const conflictReq = makeEvent({
      method: 'POST',
      path: '/marketplace/collections',
      token: buyerBioCngToken,
      body: {
        collectionId: sameCollectionId,
        offerId,
        listingId,
        transporterName: 'Malwa Express Logistics',
        vehicleRegistrationNumber: 'PB-11-XX-9001',
        fieldWeighbridgeGrossTons: 100, // conflicting tonnage
      },
    });
    const conflictRes = await handler(conflictReq);
    assert.strictEqual(conflictRes.statusCode, 400);
    const conflictBody = JSON.parse(conflictRes.body);
    assert.strictEqual(conflictBody.error, 'QUANTITY_INTEGRITY_VIOLATION');
    assert.match(conflictBody.message, /already exists with conflicting data/);
  });

  it('tracks lifecycle counter progression across SCHEDULED, IN_TRANSIT, DELIVERED, retry, VERIFIED, and CANCELLED preserving invariants', async () => {
    // 1. Create listing and accepted offer for 400T
    const listingId = `LIST_LIFE_${Date.now()}`;
    const listRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/listings',
        token: farmerSunilToken,
        body: {
          listingId,
          cropType: 'Paddy Straw (Non-Basmati)',
          quantityTons: 400,
          moisturePercent: 14.0,
          askingPricePerTonInr: 2200,
          balingType: 'Ex-Field Baled (Round/Square)',
          state: 'Punjab',
          district: 'Sangrur',
          locationName: 'Bhawanigarh Village',
          coordinates: { lat: 30.23, lon: 75.98 },
          availableFromDate: '2026-10-15',
          availableUntilDate: '2026-10-30',
        },
      })
    );
    assert.strictEqual(listRes.statusCode, 201);

    const offerId = `OFF_LIFE_${Date.now()}`;
    const offerRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/offers',
        token: buyerBioCngToken,
        body: {
          offerId,
          listingId,
          offeredPricePerTonInr: 2150,
          quantityTons: 400,
        },
      })
    );
    assert.strictEqual(offerRes.statusCode, 201);

    const acceptRes = await handler(
      makeEvent({
        method: 'POST',
        path: `/marketplace/offers/${offerId}/respond`,
        token: farmerSunilToken,
        body: {
          action: 'ACCEPT',
        },
      })
    );
    assert.strictEqual(acceptRes.statusCode, 200);

    let offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.remainingQuantityTons, 400);
    assert.strictEqual(offer.reservedQuantityTons, 0);
    assert.strictEqual(offer.actualCollectedGrossTons, 0);
    assert.strictEqual(offer.verifiedNetTons, 0);

    // 2. Schedule Collection 1: 100T planned
    const collId1 = `COLL_LIFE_1_${Date.now()}`;
    const schedRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/collections',
        token: buyerBioCngToken,
        body: {
          collectionId: collId1,
          offerId,
          listingId,
          stage: 'SCHEDULED',
          scheduledPickupDate: '2026-10-26',
          transporterName: 'Malwa Agro Fleet',
          vehicleRegistrationNumber: 'PB-11-AA-5555',
          fieldWeighbridgeGrossTons: 100,
        },
      })
    );
    assert.strictEqual(schedRes.statusCode, 201);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.reservedQuantityTons, 100);
    assert.strictEqual(offer.remainingQuantityTons, 300);
    assert.strictEqual(offer.actualCollectedGrossTons, 0, 'SCHEDULED must not increment actual collected gross');
    assert.strictEqual(offer.verifiedNetTons, 0);

    // 3. Update Collection 1: IN_TRANSIT
    const transitRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'IN_TRANSIT',
        },
      })
    );
    assert.strictEqual(transitRes.statusCode, 200);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.reservedQuantityTons, 100);
    assert.strictEqual(offer.actualCollectedGrossTons, 0, 'IN_TRANSIT must not increment actual collected gross');

    // 4. Update Collection 1: DELIVERED with 98T factory weighbridge gross
    const deliverRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'DELIVERED',
          factoryWeighbridgeGrossTons: 98,
        },
      })
    );
    assert.strictEqual(deliverRes.statusCode, 200);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.actualCollectedGrossTons, 98, 'DELIVERED must record physical collected gross');
    assert.strictEqual(offer.reservedQuantityTons, 98, 'Reservation adjusts to actual weighbridge gross');
    assert.strictEqual(offer.remainingQuantityTons, 302, 'Unused planned tonnage variance released back to offer');
    assert.strictEqual(offer.verifiedNetTons, 0, 'DELIVERED without verification evidence has 0 verified net');

    // 5. Retry DELIVERED with identical details: must not double-count
    const deliverRetryRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'DELIVERED',
          factoryWeighbridgeGrossTons: 98,
        },
      })
    );
    assert.strictEqual(deliverRetryRes.statusCode, 200);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.actualCollectedGrossTons, 98, 'Delivery retry must NOT double-count tonnage');

    // 6. Update Collection 1: VERIFIED with 95T certified net weight
    const verifyRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'VERIFIED',
          verifiedNetTons: 95,
          certifiedMoisturePercent: 12.0,
          deliveryWeighbridgeSlipUrl: '/slips/weighbridge_life_01.pdf',
        },
      })
    );
    assert.strictEqual(verifyRes.statusCode, 200);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.verifiedNetTons, 95);
    assert.strictEqual(offer.actualCollectedGrossTons, 98);
    assert.strictEqual(offer.reservedQuantityTons, 95);
    assert.strictEqual(offer.remainingQuantityTons, 305);

    // Invariant check
    assert.ok(offer.verifiedNetTons <= offer.actualCollectedGrossTons);
    assert.ok(offer.actualCollectedGrossTons <= offer.quantityTons);

    // 7. Schedule Collection 2: 200T
    const collId2 = `COLL_LIFE_2_${Date.now()}`;
    const sched2Res = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/collections',
        token: buyerBioCngToken,
        body: {
          collectionId: collId2,
          offerId,
          listingId,
          stage: 'SCHEDULED',
          scheduledPickupDate: '2026-10-27',
          transporterName: 'Malwa Agro Fleet B',
          vehicleRegistrationNumber: 'PB-11-BB-6666',
          fieldWeighbridgeGrossTons: 200,
        },
      })
    );
    assert.strictEqual(sched2Res.statusCode, 201);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.reservedQuantityTons, 295); // 95 + 200
    assert.strictEqual(offer.remainingQuantityTons, 105); // 400 - 295

    // 8. Cancel Collection 2: Capacity must be released back to offer
    const cancelRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId2}`,
        token: buyerBioCngToken,
        body: {
          stage: 'CANCELLED',
        },
      })
    );
    assert.strictEqual(cancelRes.statusCode, 200);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.reservedQuantityTons, 95, 'Cancellation releases reserved capacity');
    assert.strictEqual(offer.remainingQuantityTons, 305, 'Remaining capacity restored');

    // 9. Retry CANCELLED on Collection 2: must not double-release
    const cancelRetryRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId2}`,
        token: buyerBioCngToken,
        body: {
          stage: 'CANCELLED',
        },
      })
    );
    assert.strictEqual(cancelRetryRes.statusCode, 200);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.remainingQuantityTons, 305, 'Cancellation retry must not double-release capacity');
    assert.strictEqual(offer.reservedQuantityTons, 95);
  });

  // ---------------------------------------------------------------------------
  // 8. Physical Farm Pickup vs. Plant Delivery Semantics, Discrepancy & Gate Rejection
  // ---------------------------------------------------------------------------
  it('enforces physical collection vs delivery semantics, exposes transitLossTons discrepancy, and safely handles post-pickup rejection', async () => {
    // 1. Setup 400T listing and accepted offer
    const listingId = `LST_PREC_${Date.now()}`;
    await marketplaceRepository.saveListing(
      {
        listingId,
        farmerId: 'FARMER_SUNIL',
        farmerName: 'Sunil Kumar',
        farmerPhoneMasked: '+91 98765 432XX',
        cropType: 'Paddy Straw (Non-Basmati)',
        district: 'Sangrur',
        state: 'Punjab',
        locationName: 'Dhuri Sector Farm',
        coordinates: { lat: 30.245, lon: 75.842 },
        quantityTons: 400,
        moisturePercent: 13.5,
        askingPricePerTonInr: 1800,
        balingType: 'Ex-Field Baled (Round/Square)',
        availableFromDate: '2026-10-25',
        availableUntilDate: '2026-11-15',
        status: 'LISTED',
        isDemoData: false,
        createdAt: new Date().toISOString(),
      },
      'FARMER_SUNIL'
    );

    const offerId = `OFF_PREC_${Date.now()}`;
    await marketplaceRepository.createOffer(
      {
        offerId,
        listingId,
        buyerId: 'BUYER_PUNJAB_BIOCNG',
        farmerId: 'FARMER_SUNIL',
        offeredPricePerTonInr: 1800,
        quantityTons: 400,
        status: 'SUBMITTED',
        lastUpdatedTimestamp: new Date().toISOString(),
        isDemoData: false,
      },
      'BUYER_PUNJAB_BIOCNG'
    );

    await marketplaceRepository.respondToOffer(
      offerId,
      'ACCEPT',
      'FARMER_SUNIL',
      'FARMER'
    );

    let offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.remainingQuantityTons, 400);
    assert.strictEqual(offer.reservedQuantityTons, 0);
    assert.strictEqual(offer.actualCollectedGrossTons, 0);
    assert.strictEqual(offer.deliveredGrossTons, 0);
    assert.strictEqual(offer.verifiedNetTons, 0);
    assert.strictEqual(offer.rejectedQuantityTons, 0);

    // 2. Collection 1 - Stage 1: SCHEDULED with 100T planned
    const collId1 = `COLL_PREC_1_${Date.now()}`;
    const schedRes = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/collections',
        token: buyerBioCngToken,
        body: {
          collectionId: collId1,
          offerId,
          listingId,
          stage: 'SCHEDULED',
          scheduledPickupDate: '2026-10-28',
          transporterName: 'Punjab Eco Logistics',
          vehicleRegistrationNumber: 'PB-11-XX-9001',
          fieldWeighbridgeGrossTons: 100,
        },
      })
    );
    assert.strictEqual(schedRes.statusCode, 201);
    assert.strictEqual(LOGISTICS_STAGE_LABELS['SCHEDULED'], '1. Scheduled & Truck Assigned');

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.reservedQuantityTons, 100, 'SCHEDULED reserves planned capacity');
    assert.strictEqual(offer.remainingQuantityTons, 300, 'Remaining capacity decremented by reservation');
    assert.strictEqual(offer.actualCollectedGrossTons, 0, 'SCHEDULED does not increment actual collected gross');
    assert.strictEqual(offer.deliveredGrossTons, 0, 'SCHEDULED does not increment delivered gross');
    assert.strictEqual(offer.verifiedNetTons, 0);
    assert.strictEqual(offer.rejectedQuantityTons, 0);

    // 3. Collection 1 - Stage 2: LOADING with explicit farm pickup event
    const pickupTimestamp = new Date().toISOString();
    const loadRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'LOADING',
          fieldWeighbridgeGrossTons: 100,
          physicalCollectionQuantityTons: 100,
          physicalCollectionTimestamp: pickupTimestamp,
          physicalCollectionSource: 'FARM_PORTABLE_SCALE',
          physicalCollectionEvidenceUrl: 'https://storage.airquality.local/evidence/farm_baling_01.pdf',
        },
      })
    );
    assert.strictEqual(loadRes.statusCode, 200);
    assert.strictEqual(LOGISTICS_STAGE_LABELS['LOADING'], '2. Field Baling & Loading');

    let col1 = (await marketplaceRepository.getCollectionRecord(collId1))!;
    assert.strictEqual(col1.stage, 'LOADING');
    assert.strictEqual(col1.physicalCollectionQuantityTons, 100);
    assert.strictEqual(col1.physicalCollectionSource, 'FARM_PORTABLE_SCALE');

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.reservedQuantityTons, 100);
    assert.strictEqual(offer.remainingQuantityTons, 300);
    assert.strictEqual(offer.actualCollectedGrossTons, 100, 'LOADING with explicit pickup records physical farm collection');
    assert.strictEqual(offer.deliveredGrossTons, 0, 'Physical collection is distinct from delivery receipt');

    // 4. Collection 1 - Stage 3: IN_TRANSIT
    const transitRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'IN_TRANSIT',
        },
      })
    );
    assert.strictEqual(transitRes.statusCode, 200);
    assert.strictEqual(LOGISTICS_STAGE_LABELS['IN_TRANSIT'], '3. In Transit (GPS Monitored)');

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.reservedQuantityTons, 100);
    assert.strictEqual(offer.remainingQuantityTons, 300);
    assert.strictEqual(offer.actualCollectedGrossTons, 100);
    assert.strictEqual(offer.deliveredGrossTons, 0);

    // 5. Collection 1 - Stage 4: DELIVERED to weighbridge gate with 98T plant receipt
    const deliveryTimestamp = new Date().toISOString();
    const deliverRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'DELIVERED',
          factoryWeighbridgeGrossTons: 98,
          deliveredGrossTons: 98,
          deliveryTimestamp,
        },
      })
    );
    assert.strictEqual(deliverRes.statusCode, 200);
    assert.strictEqual(LOGISTICS_STAGE_LABELS['DELIVERED'], '4. Delivered to Weighbridge Gate');

    col1 = (await marketplaceRepository.getCollectionRecord(collId1))!;
    assert.strictEqual(col1.physicalCollectionQuantityTons, 100, 'Farm pickup gross preserved independently');
    assert.strictEqual(col1.deliveredGrossTons, 98, 'Plant weighbridge gross recorded independently');
    assert.strictEqual(col1.transitLossTons, 2, 'Exposes transit loss discrepancy without clamping raw weights');

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.actualCollectedGrossTons, 100, 'Farm pickup gross not overwritten by plant receipt');
    assert.strictEqual(offer.deliveredGrossTons, 98, 'Plant weighbridge gross recorded separately');
    assert.strictEqual(offer.reservedQuantityTons, 98, 'Plant reservation adjusts to plant weighbridge measurement');
    assert.strictEqual(offer.remainingQuantityTons, 302, '2T transit variance released back to offer capacity');

    // Retry DELIVERED: deltas are 0, idempotent
    const deliverRetryRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'DELIVERED',
          factoryWeighbridgeGrossTons: 98,
          deliveredGrossTons: 98,
        },
      })
    );
    assert.strictEqual(deliverRetryRes.statusCode, 200);
    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.actualCollectedGrossTons, 100);
    assert.strictEqual(offer.deliveredGrossTons, 98);
    assert.strictEqual(offer.reservedQuantityTons, 98);
    assert.strictEqual(offer.remainingQuantityTons, 302);

    // 6. Collection 1 - Stage 5: VERIFIED with 95T certified net weight
    const verifyRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId1}`,
        token: buyerBioCngToken,
        body: {
          stage: 'VERIFIED',
          verifiedNetTons: 95,
          certifiedMoisturePercent: 12.0,
          deliveryWeighbridgeSlipUrl: '/slips/receipt_wb8874.pdf',
        },
      })
    );
    assert.strictEqual(verifyRes.statusCode, 200);
    assert.strictEqual(LOGISTICS_STAGE_LABELS['VERIFIED'], '5. Factory Verified & Moisture Certified');

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.verifiedNetTons, 95);
    assert.strictEqual(offer.deliveredGrossTons, 98);
    assert.strictEqual(offer.actualCollectedGrossTons, 100);
    assert.strictEqual(offer.reservedQuantityTons, 95);
    assert.strictEqual(offer.remainingQuantityTons, 305);
    // Invariant check
    assert.ok(offer.verifiedNetTons <= offer.deliveredGrossTons);
    assert.ok(offer.deliveredGrossTons <= offer.actualCollectedGrossTons);
    assert.ok(offer.actualCollectedGrossTons <= offer.quantityTons);

    // 7. Collection 2: Pre-pickup cancellation releases reservation once
    const collId2 = `COLL_PREC_2_${Date.now()}`;
    const sched2Res = await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/collections',
        token: buyerBioCngToken,
        body: {
          collectionId: collId2,
          offerId,
          listingId,
          stage: 'SCHEDULED',
          scheduledPickupDate: '2026-10-29',
          transporterName: 'Haryana Fleet Alpha',
          vehicleRegistrationNumber: 'HR-01-AA-1111',
          fieldWeighbridgeGrossTons: 50,
        },
      })
    );
    assert.strictEqual(sched2Res.statusCode, 201);
    const postSchedOffer = (await marketplaceRepository.getOffer(offerId))!;
    const reservedWithCol2 = postSchedOffer.reservedQuantityTons!;
    const remainingWithCol2 = postSchedOffer.remainingQuantityTons!;

    // Cancel before pickup
    const cancel2Res = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId2}`,
        token: buyerBioCngToken,
        body: {
          stage: 'CANCELLED',
          cancellationReason: 'Carrier truck breakdown before dispatch',
          exceptionType: 'CANCELLED_BEFORE_PICKUP',
        },
      })
    );
    assert.strictEqual(cancel2Res.statusCode, 200);
    const col2 = (await marketplaceRepository.getCollectionRecord(collId2))!;
    assert.strictEqual(col2.stage, 'CANCELLED');
    assert.strictEqual(col2.exceptionType, 'CANCELLED_BEFORE_PICKUP');

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.reservedQuantityTons, reservedWithCol2 - 50, 'Pre-pickup cancellation releases reservation');
    assert.strictEqual(offer.remainingQuantityTons, remainingWithCol2 + 50, 'Remaining capacity restored');
    assert.strictEqual(offer.actualCollectedGrossTons, 100, 'Pre-pickup cancellation does not touch collected gross');

    // Retry cancel: delta is 0, no double release
    const cancel2RetryRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId2}`,
        token: buyerBioCngToken,
        body: {
          stage: 'CANCELLED',
        },
      })
    );
    assert.strictEqual(cancel2RetryRes.statusCode, 200);
    const retryOffer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(retryOffer.remainingQuantityTons, offer.remainingQuantityTons);
    assert.strictEqual(retryOffer.reservedQuantityTons, offer.reservedQuantityTons);

    // 8. Collection 3: Post-pickup gate rejection does NOT erase physical collected tonnage
    const collId3 = `COLL_PREC_3_${Date.now()}`;
    await handler(
      makeEvent({
        method: 'POST',
        path: '/marketplace/collections',
        token: buyerBioCngToken,
        body: {
          collectionId: collId3,
          offerId,
          listingId,
          stage: 'SCHEDULED',
          scheduledPickupDate: '2026-10-30',
          transporterName: 'Malwa Haulers Express',
          vehicleRegistrationNumber: 'PB-10-CC-3333',
          fieldWeighbridgeGrossTons: 50,
        },
      })
    );

    // Physical farm baling & loading pickup: 50T
    await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId3}`,
        token: buyerBioCngToken,
        body: {
          stage: 'LOADING',
          fieldWeighbridgeGrossTons: 50,
          physicalCollectionQuantityTons: 50,
          physicalCollectionTimestamp: new Date().toISOString(),
          physicalCollectionSource: 'FARM_PORTABLE_SCALE',
        },
      })
    );

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.actualCollectedGrossTons, 150, 'Biomass physically baled and removed from farm increases collected gross to 150T');

    // Transport to plant gate
    await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId3}`,
        token: buyerBioCngToken,
        body: {
          stage: 'DELIVERED',
          factoryWeighbridgeGrossTons: 50,
          deliveredGrossTons: 50,
        },
      })
    );

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.deliveredGrossTons, 148, 'Delivered gross includes in-gate consignment before rejection');

    // Quality test fails at receiving plant (high moisture / foreign matter) -> Gate Rejection
    const rejectRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId3}`,
        token: buyerBioCngToken,
        body: {
          stage: 'REJECTED',
          cancellationReason: 'Moisture exceeded 22% and sand contamination detected',
          exceptionType: 'REJECTED_AT_GATE',
          rejectionDisposition: 'RETURNED_TO_FARM',
          rejectedQuantityTons: 50,
        },
      })
    );
    assert.strictEqual(rejectRes.statusCode, 200);

    const col3 = (await marketplaceRepository.getCollectionRecord(collId3))!;
    assert.strictEqual(col3.stage, 'REJECTED');
    assert.strictEqual(col3.exceptionType, 'REJECTED_AT_GATE');
    assert.strictEqual(col3.rejectionDisposition, 'RETURNED_TO_FARM');
    assert.strictEqual(col3.rejectedQuantityTons, 50);

    offer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(offer.rejectedQuantityTons, 50, 'Offer tracks rejected tonnage explicitly');
    assert.strictEqual(offer.actualCollectedGrossTons, 150, 'CRITICAL: Gate rejection does NOT erase recorded physical collection tonnage');
    assert.strictEqual(offer.deliveredGrossTons, 98, 'Unaccepted plant inventory delivered gross reversed to 98T');
    assert.strictEqual(offer.reservedQuantityTons, 95, 'Unaccepted plant inventory reservation released once');
    assert.strictEqual(offer.remainingQuantityTons, 305, 'Remaining capacity restored for replacement collection');

    // Retry rejection: deltas are 0, idempotent
    const rejectRetryRes = await handler(
      makeEvent({
        method: 'PATCH',
        path: `/marketplace/collections/${collId3}`,
        token: buyerBioCngToken,
        body: {
          stage: 'REJECTED',
          rejectedQuantityTons: 50,
        },
      })
    );
    assert.strictEqual(rejectRetryRes.statusCode, 200);

    const postRejectRetryOffer = (await marketplaceRepository.getOffer(offerId))!;
    assert.strictEqual(postRejectRetryOffer.actualCollectedGrossTons, 150);
    assert.strictEqual(postRejectRetryOffer.rejectedQuantityTons, 50);
    assert.strictEqual(postRejectRetryOffer.deliveredGrossTons, 98);
    assert.strictEqual(postRejectRetryOffer.remainingQuantityTons, 305);
    assert.strictEqual(postRejectRetryOffer.reservedQuantityTons, 95);
  });
});
