import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { demoSeedingService } from '../src/services/demoSeedingService';
import { userRepository } from '../src/repositories/userRepository';
import { schoolRepository } from '../src/repositories/schoolRepository';
import { marketplaceRepository } from '../src/repositories/marketplaceRepository';

describe('Demonstration Personas & Seeding Idempotency', () => {
  beforeEach(() => {
    userRepository.clear();
    schoolRepository.clear();
    marketplaceRepository.clear();
  });

  it('correctly seeds the 3 required frozen demonstration identities', async () => {
    const res = await demoSeedingService.seedDemoData();
    assert.strictEqual(res.seededCounts.users, 3);
    assert.strictEqual(res.seededCounts.policies, 3);
    assert.strictEqual(res.seededCounts.activities, 3);
    assert.strictEqual(res.seededCounts.listings, 2);
    assert.strictEqual(res.seededCounts.offers, 1);
    assert.strictEqual(res.seededCounts.collections, 1);

    // Verify 1: Citizen (Paras Nath)
    const paras = await userRepository.getUserProfileByEmail('parasnath@gmail.com');
    assert.ok(paras, 'Paras Nath profile must exist');
    assert.strictEqual(paras?.role, 'PERSONAL_USER');
    assert.strictEqual(paras?.isDemoUser, true);

    const parasHealth = await userRepository.getHealthPreferences('USER_DEMO_PARAS');
    assert.strictEqual(parasHealth?.hasAsthma, true);

    const parasPlans = await userRepository.listActivityPlansByUser('USER_DEMO_PARAS');
    assert.strictEqual(parasPlans.length, 1);
    assert.strictEqual(parasPlans[0].activityType, 'running');

    // Verify 2: School Administrator (Principal Sharma)
    const principal = await userRepository.getUserProfileByEmail('kvkailashahar@gmail.com');
    assert.ok(principal, 'Principal Sharma profile must exist');
    assert.strictEqual(principal?.role, 'SCHOOL_ADMIN');
    assert.strictEqual(principal?.isDemoUser, true);

    const kvPolicies = await schoolRepository.getSchoolPolicies('KV_KAILASHAHAR');
    assert.strictEqual(kvPolicies.length, 3, 'Must have primary, middle, senior policies');

    const primaryPolicy = await schoolRepository.getSchoolPolicy('KV_KAILASHAHAR', 'primary');
    assert.strictEqual(primaryPolicy?.maxOutdoorAQI, 120);
    assert.strictEqual(primaryPolicy?.mandatoryIndoorAQI, 160);

    // Verify 3: Stubble Farmer (Sunil Singh)
    const farmer = await userRepository.getUserProfileByEmail('sunilnagrale@gmail.com');
    assert.ok(farmer, 'Sunil Singh profile must exist');
    assert.strictEqual(farmer?.role, 'FARMER');
    assert.strictEqual(farmer?.district, 'Sangrur');

    const listings = await marketplaceRepository.listListings({ farmerId: 'FARMER_SUNIL' });
    assert.strictEqual(listings.length, 2);
    assert.ok(listings.every((l) => l.isDemoData === true));

    const offer = await marketplaceRepository.getOffer('OFFER_SANGRUR_01');
    assert.strictEqual(offer?.status, 'ACCEPTED');

    const collection = await marketplaceRepository.getCollectionRecord('COLL_SANGRUR_01');
    assert.strictEqual(collection?.stage, 'VERIFIED');
    assert.strictEqual(collection?.verifiedNetTons, 348);
  });

  it('guarantees idempotency: executing seedDemoData repeatedly does NOT duplicate records', async () => {
    // Run 1
    const run1 = await demoSeedingService.seedDemoData();
    assert.strictEqual(run1.seededCounts.users, 3);

    // Run 2 (without forceOverwrite)
    const run2 = await demoSeedingService.seedDemoData(false);
    assert.strictEqual(run2.seededCounts.users, 0, 'No duplicate users should be inserted');
    assert.strictEqual(run2.seededCounts.listings, 0, 'No duplicate listings should be inserted');

    // Verify totals remain exactly as originally seeded
    const allListings = await marketplaceRepository.listListings();
    assert.strictEqual(allListings.length, 2);
  });
});
