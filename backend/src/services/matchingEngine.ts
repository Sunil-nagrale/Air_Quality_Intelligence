import {
  BuyerRequirement,
  CollectionMilestone,
  EnvironmentalImpactMetrics,
  MarketplaceOffer,
  ParaliListing,
  ParaliMatchResult,
} from '../types';

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Indicative freight cost in Northwest India (10-16T truck freight model)
// Base loading/unloading fee: INR 250/ton + INR 4.5/ton-km
export function calculateEstimatedFreightPerTonInr(distanceKm: number): number {
  const BASE_HANDLING_INR_PER_TON = 250;
  const TON_KM_RATE_INR = 4.5;
  return Math.round(BASE_HANDLING_INR_PER_TON + distanceKm * TON_KM_RATE_INR);
}

export function matchListingWithBuyer(
  listing: ParaliListing,
  buyer: BuyerRequirement
): ParaliMatchResult {
  const matchReasons: string[] = [];
  const disqualifyingFactors: string[] = [];
  let score = 100;

  // 1. Material Compatibility
  const isMaterialAccepted = buyer.acceptedCrops.includes(listing.cropType);
  if (!isMaterialAccepted) {
    score -= 60;
    disqualifyingFactors.push(`Buyer does not process ${listing.cropType}`);
  } else {
    matchReasons.push(`Exact crop compatibility: ${listing.cropType}`);
  }

  // 2. Moisture Constraint
  if (listing.moisturePercent > buyer.maxAcceptableMoisturePercent) {
    const excess = listing.moisturePercent - buyer.maxAcceptableMoisturePercent;
    score -= Math.min(30, excess * 5);
    disqualifyingFactors.push(
      `Listing moisture (${listing.moisturePercent}%) exceeds buyer maximum (${buyer.maxAcceptableMoisturePercent}%)`
    );
  } else {
    matchReasons.push(`Moisture within limits (${listing.moisturePercent}% vs max ${buyer.maxAcceptableMoisturePercent}%)`);
  }

  // 3. Distance & Logistics Radius
  const distanceKm = calculateHaversineDistanceKm(
    listing.coordinates.lat,
    listing.coordinates.lon,
    buyer.coordinates.lat,
    buyer.coordinates.lon
  );

  const freightPerTon = calculateEstimatedFreightPerTonInr(distanceKm);
  const netDeliveredCost = listing.askingPricePerTonInr + freightPerTon;

  if (distanceKm > buyer.maxHaulingRadiusKm) {
    score -= 40;
    disqualifyingFactors.push(
      `Distance (${distanceKm} km) exceeds buyer service radius (${buyer.maxHaulingRadiusKm} km)`
    );
  } else {
    matchReasons.push(`Within economical service radius (${distanceKm} km / max ${buyer.maxHaulingRadiusKm} km)`);
  }

  // 4. Delivered Price Comparison
  if (netDeliveredCost > buyer.offeredBasePricePerTonInr * 1.25) {
    score -= 20;
    disqualifyingFactors.push(
      `Net delivered price (INR ${netDeliveredCost}/t) is higher than buyer ceiling (INR ${buyer.offeredBasePricePerTonInr}/t)`
    );
  } else {
    matchReasons.push(`Economically viable delivered cost: INR ${netDeliveredCost}/t (Freight: INR ${freightPerTon}/t)`);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    listingId: listing.listingId,
    buyerId: buyer.buyerId,
    buyerName: buyer.buyerName,
    industryType: buyer.organizationType,
    compatibilityScore: finalScore,
    haulingDistanceKm: distanceKm,
    estimatedFreightPerTonInr: freightPerTon,
    netDeliveredCostPerTonInr: netDeliveredCost,
    matchReasons,
    disqualifyingFactors,
  };
}

export function computeEnvironmentalImpact(
  listings: ParaliListing[],
  offers: MarketplaceOffer[],
  collections: CollectionMilestone[]
): EnvironmentalImpactMetrics {
  const totalQuantityListedTons = listings.length > 0
    ? listings.reduce((sum, l) => sum + (l.quantityTons || 0), 0)
    : offers.reduce((sum, o) => sum + (o.quantityTons || 0), 0);

  // Matched quantity: only eligible (non-expired) listings
  const eligibleListings = listings.filter(l => l.status !== 'EXPIRED');
  const matchedTonsFromListings = eligibleListings.reduce((sum, l) => sum + (l.quantityTons || 0), 0);
  const totalQuantityMatchedTons = listings.length > 0
    ? Math.min(totalQuantityListedTons, matchedTonsFromListings)
    : totalQuantityListedTons;

  // Accepted quantity: accepted offers, bounded by listing quantity at entity level
  const acceptedTonsByListing = new Map<string, number>();
  for (const o of offers.filter(o => o.status === 'ACCEPTED')) {
    const current = acceptedTonsByListing.get(o.listingId) || 0;
    acceptedTonsByListing.set(o.listingId, current + (o.quantityTons || 0));
  }
  let legitimateAcceptedTons = 0;
  for (const [listingId, acceptedTons] of acceptedTonsByListing.entries()) {
    const listing = listings.find(l => l.listingId === listingId);
    const maxAllowed = listing ? listing.quantityTons : acceptedTons;
    legitimateAcceptedTons += Math.min(maxAllowed, acceptedTons);
  }
  const totalQuantityAcceptedTons = Math.min(totalQuantityMatchedTons, legitimateAcceptedTons);

  // Collected quantity: consignments at DELIVERED or VERIFIED stage for accepted offers
  const collectedTonsByOffer = new Map<string, number>();
  for (const c of collections.filter(c => c.stage === 'DELIVERED' || c.stage === 'VERIFIED')) {
    const offer = offers.find(o => o.offerId === c.offerId && o.status === 'ACCEPTED');
    if (!offer) continue; // Unaccepted offers cannot produce legitimate collections
    const tons = c.physicalCollectionQuantityTons || c.deliveredGrossTons || c.verifiedNetTons || c.factoryWeighbridgeGrossTons || c.fieldWeighbridgeGrossTons || 0;
    const current = collectedTonsByOffer.get(c.offerId) || 0;
    collectedTonsByOffer.set(c.offerId, current + tons);
  }
  let legitimateCollectedTons = 0;
  for (const [offerId, collectedTons] of collectedTonsByOffer.entries()) {
    const offer = offers.find(o => o.offerId === offerId);
    const maxAllowed = offer ? offer.quantityTons : collectedTons;
    legitimateCollectedTons += Math.min(maxAllowed, collectedTons);
  }
  const totalQuantityCollectedTons = Math.min(totalQuantityAcceptedTons, legitimateCollectedTons);

  // Verified quantity: consignments at VERIFIED stage, bounded by collected gross weight and offer
  const verifiedTonsByOffer = new Map<string, number>();
  for (const c of collections.filter(c => c.stage === 'VERIFIED')) {
    const offer = offers.find(o => o.offerId === c.offerId && o.status === 'ACCEPTED');
    if (!offer) continue;
    const grossTons = c.deliveredGrossTons || c.factoryWeighbridgeGrossTons || c.physicalCollectionQuantityTons || c.verifiedNetTons || 0;
    const netTons = Math.min(grossTons, c.verifiedNetTons || 0);
    const current = verifiedTonsByOffer.get(c.offerId) || 0;
    verifiedTonsByOffer.set(c.offerId, current + netTons);
  }
  let legitimateVerifiedTons = 0;
  for (const [offerId, verifiedTons] of verifiedTonsByOffer.entries()) {
    const maxCollectedForOffer = collectedTonsByOffer.get(offerId) || 0;
    const offer = offers.find(o => o.offerId === offerId);
    const maxAllowed = Math.min(offer ? offer.quantityTons : verifiedTons, maxCollectedForOffer);
    legitimateVerifiedTons += Math.min(maxAllowed, verifiedTons);
  }
  const totalQuantityVerifiedTons = Math.min(totalQuantityCollectedTons, legitimateVerifiedTons);

  // Per audit directive: Literature emission factors (e.g. 1.46 t CO2e/t or 3.0 kg PM2.5/t)
  // are withheld pending certified batch-specific Lifecycle Analysis (LCA) and empirical testing.
  const co2eAvoidedTonsEstimate = null;
  const pm25AvoidedKgEstimate = null;

  // Stubble burning prevention claims: A listing, match, acceptance, collection, or weighbridge slip
  // alone does not prove that open-field burning was prevented without established counterfactual
  // baseline methodology (e.g. satellite thermal fire anomalies or pre-harvest declarations).
  // Therefore, stubble burning prevention is strictly withheld.
  const stubbleFiresAvertedEstimate = null;
  const burningAversionValidationStatus = 'UNAVAILABLE_UNESTABLISHED_BURNING_BASELINE';

  // Farmer revenue calculated strictly on verified quantities bounded by contract offer prices
  let farmerIncomeGeneratedInr = 0;
  for (const coll of collections.filter(c => c.stage === 'VERIFIED')) {
    const offer = offers.find(o => o.offerId === coll.offerId && o.status === 'ACCEPTED');
    if (offer && coll.verifiedNetTons) {
      const legitimateTons = Math.min(offer.quantityTons, coll.verifiedNetTons);
      farmerIncomeGeneratedInr += offer.offeredPricePerTonInr * legitimateTons;
    }
  }

  return {
    totalQuantityListedTons,
    totalQuantityMatchedTons,
    totalQuantityAcceptedTons,
    totalQuantityCollectedTons,
    totalQuantityVerifiedTons,
    co2eAvoidedTonsEstimate,
    pm25AvoidedKgEstimate,
    emissionsValidationStatus: 'UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION',
    farmerIncomeGeneratedInr,
    stubbleFiresAvertedEstimate,
    burningAversionValidationStatus,
    calculationMethodologyNotes:
      'Direct physical quantities (tonnes listed, accepted, collected, and verified) are auditable from weighbridge slips. Avoided emissions estimates (CO2e and PM2.5) and stubble-burning prevention claims are strictly withheld as unavailable pending validated batch-specific lifecycle emission factors and counterfactual satellite burn-scar verification.',
    isDemoAggregate: listings.some(l => l.isDemoData),
  };
}
