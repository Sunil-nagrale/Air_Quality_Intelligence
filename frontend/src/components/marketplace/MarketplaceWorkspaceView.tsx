import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Truck,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  DollarSign,
  MapPin,
  Sparkles,
  ShieldCheck,
  Scale,
  Factory,
  Info,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  AlertTriangle,
  FileText,
  User,
  Building2,
  ArrowUpDown,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  AlertBanner,
  StatSummary,
  DataTable,
  FormField,
  Input,
  Modal,
} from '../ui';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { apiClient } from '../../services/apiClient';
import { cognitoAuth } from '../../services/cognitoAuth';
import type {
  AppRoute,
  ParaliListingItem,
  BuyerProfileItem,
  OfferItem,
  CollectionItem,
  MatchResultItem,
  EnvironmentalImpactSummary,
} from '../../types';

interface MarketplaceWorkspaceViewProps {
  onNavigate: (route: AppRoute) => void;
  initialMode?: 'public' | 'farmer' | 'buyer';
}

const DEFAULT_LCA_IMPACT: EnvironmentalImpactSummary = {
  totalQuantityListedTons: 950,
  totalQuantityMatchedTons: 950,
  totalQuantityAcceptedTons: 750,
  totalQuantityCollectedTons: 748,
  totalQuantityVerifiedTons: 348,
  co2eAvoidedTonsEstimate: null,
  pm25AvoidedKgEstimate: null,
  emissionsValidationStatus: 'UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION',
  stubbleFiresAvertedEstimate: null,
  burningAversionValidationStatus: 'UNAVAILABLE_UNESTABLISHED_BURNING_BASELINE',
  farmerIncomeGeneratedInr: 1462500,
  calculationMethodologyNotes:
    'Direct physical quantities (tonnes listed, accepted, collected, and verified) are auditable from weighbridge slips. Avoided emissions estimates (CO2e and PM2.5) and stubble burning prevention claims are strictly withheld as unavailable pending validated batch-specific lifecycle emission factors and empirical satellite fire baseline verification.',
  isDemoAggregate: true,
};

export const MarketplaceWorkspaceView: React.FC<MarketplaceWorkspaceViewProps> = ({
  onNavigate,
  initialMode = 'public',
}) => {
  const [activeMode, setActiveMode] = useState<'public' | 'farmer' | 'buyer'>(initialMode);
  const [currentUserSession, setCurrentUserSession] = useState(cognitoAuth.getCurrentSession());

  // Data states
  const [listings, setListings] = useState<ParaliListingItem[]>([]);
  const [buyers, setBuyers] = useState<BuyerProfileItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [impact, setImpact] = useState<EnvironmentalImpactSummary>(DEFAULT_LCA_IMPACT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Freight Calculator states
  const [calcDistance, setCalcDistance] = useState<number>(45);
  const [calcTons, setCalcTons] = useState<number>(100);

  // Farmer Workspace states
  const [selectedListingForMatches, setSelectedListingForMatches] = useState<ParaliListingItem | null>(null);
  const [listingMatches, setListingMatches] = useState<MatchResultItem[]>([]);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Partial<ParaliListingItem> | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<Record<string, number>>({});
  const [counterNoteInput, setCounterNoteInput] = useState<Record<string, string>>({});

  // Buyer Workspace states
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfileItem | null>(null);
  const [buyerCropFilter, setBuyerCropFilter] = useState<string>('all');
  const [buyerDistrictFilter, setBuyerDistrictFilter] = useState<string>('all');
  const [buyerMaxMoistureFilter, setBuyerMaxMoistureFilter] = useState<number>(20);
  const [offerModalListing, setOfferModalListing] = useState<ParaliListingItem | null>(null);
  const [offerPriceInput, setOfferPriceInput] = useState<number>(1950);
  const [offerTonsInput, setOfferTonsInput] = useState<number>(100);
  const [offerNotesInput, setOfferNotesInput] = useState<string>('');

  // Unauthenticated Action Prompt Modal
  const [authRequiredModalOpen, setAuthRequiredModalOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState<string>('');

  useEffect(() => {
    setCurrentUserSession(cognitoAuth.getCurrentSession());
    loadAllMarketplaceData();
  }, [activeMode]);

  const loadAllMarketplaceData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch Listings
      const listingsRes = await apiClient.getListings().catch(() => ({ listings: [] }));
      if (listingsRes?.listings?.length) {
        setListings(listingsRes.listings);
        if (!selectedListingForMatches) {
          setSelectedListingForMatches(listingsRes.listings[0]);
        }
      }

      // 2. Fetch Buyers
      const buyersRes = await apiClient.getBuyers().catch(() => ({ buyers: [] }));
      if (buyersRes?.buyers?.length) {
        setBuyers(buyersRes.buyers);
      }

      // 3. Fetch Impact
      const impactRes = await apiClient.getMarketplaceImpact().catch(() => ({ impact: DEFAULT_LCA_IMPACT }));
      if (impactRes?.impact) {
        setImpact(impactRes.impact);
      }

      // 4. If authenticated, fetch Offers & Collections
      const session = cognitoAuth.getCurrentSession();
      if (session) {
        const offersRes = await apiClient.getOffers().catch(() => ({ offers: [] }));
        if (offersRes?.offers) setOffers(offersRes.offers);

        const collsRes = await apiClient.getCollections().catch(() => ({ collections: [] }));
        if (collsRes?.collections) setCollections(collsRes.collections);

        if (activeMode === 'buyer') {
          const profileRes = await apiClient.getBuyerProfile().catch(() => ({ profile: null }));
          if (profileRes?.profile) setBuyerProfile(profileRes.profile);
        }
      }
    } catch (err: any) {
      console.warn('Marketplace data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load matches when selected listing changes
  useEffect(() => {
    if (selectedListingForMatches && (activeMode === 'farmer' || activeMode === 'public')) {
      apiClient
        .getMatches({ listingId: selectedListingForMatches.listingId })
        .then((res) => {
          if (res?.matches) setListingMatches(res.matches);
        })
        .catch(() => {
          // If unauthenticated, compute mock matches locally
          computeLocalMatches(selectedListingForMatches);
        });
    }
  }, [selectedListingForMatches, activeMode]);

  const computeLocalMatches = (listing: ParaliListingItem) => {
    if (!buyers.length) return;
    const local = buyers.map((b) => {
      const matchReasons: string[] = [];
      const disqualifyingFactors: string[] = [];
      let score = 95;

      if (!b.acceptedCrops.includes(listing.cropType)) {
        score -= 60;
        disqualifyingFactors.push(`Buyer does not process ${listing.cropType}`);
      } else {
        matchReasons.push(`Exact crop compatibility: ${listing.cropType}`);
      }

      if (listing.moisturePercent > b.maxAcceptableMoisturePercent) {
        score -= 25;
        disqualifyingFactors.push(`Moisture (${listing.moisturePercent}%) exceeds ceiling (${b.maxAcceptableMoisturePercent}%)`);
      } else {
        matchReasons.push(`Moisture within acceptable limit (${listing.moisturePercent}%)`);
      }

      const dist = 32.5; // Indicative
      const freight = Math.round(250 + dist * 4.5);
      const delivered = listing.askingPricePerTonInr + freight;

      return {
        listingId: listing.listingId,
        buyerId: b.buyerId,
        buyerName: b.buyerName,
        industryType: b.organizationType,
        compatibilityScore: Math.max(10, score),
        haulingDistanceKm: dist,
        estimatedFreightPerTonInr: freight,
        netDeliveredCostPerTonInr: delivered,
        matchReasons,
        disqualifyingFactors,
      };
    });
    setListingMatches(local);
  };

  const requireAuthOrPrompt = (reason: string, action: () => void) => {
    const session = cognitoAuth.getCurrentSession();
    if (!session?.idToken) {
      setAuthPromptReason(reason);
      setAuthRequiredModalOpen(true);
      return;
    }
    action();
  };

  // Farmer Listing CRUD
  const handleSaveListing = async () => {
    if (!editingListing?.cropType || !editingListing?.quantityTons) return;

    requireAuthOrPrompt('publish agricultural residue listings', async () => {
      try {
        if (editingListing.listingId) {
          // Update
          const res = await apiClient.updateListing(editingListing.listingId, editingListing);
          setListings((prev) =>
            prev.map((l) => (l.listingId === editingListing.listingId ? res.listing : l))
          );
        } else {
          // Create
          const res = await apiClient.createListing({
            ...editingListing,
            district: editingListing.district || 'Sangrur',
            state: editingListing.state || 'Punjab',
            askingPricePerTonInr: editingListing.askingPricePerTonInr || 1850,
            moisturePercent: editingListing.moisturePercent || 14.0,
            balingType: editingListing.balingType || 'Ex-Field Baled (Round/Square)',
            availableFromDate: new Date().toISOString().split('T')[0],
            availableUntilDate: '2026-11-20',
          });
          setListings((prev) => [res.listing, ...prev]);
        }
        setIsListingModalOpen(false);
        setEditingListing(null);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to save listing');
      }
    });
  };

  const handleDeleteListing = async (listingId: string) => {
    requireAuthOrPrompt('cancel or delete listings', async () => {
      try {
        await apiClient.deleteListing(listingId);
        setListings((prev) => prev.filter((l) => l.listingId !== listingId));
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to delete listing');
      }
    });
  };

  // Offer Negotiation Handlers
  const handleRespondToOffer = async (
    offerId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER'
  ) => {
    requireAuthOrPrompt(`${action.toLowerCase()} binding commercial offers`, async () => {
      try {
        const counterPrice = counterPriceInput[offerId];
        const notes = counterNoteInput[offerId];
        const res = await apiClient.respondToOffer(offerId, action, {
          counterPrice,
          notes,
        });
        setOffers((prev) => prev.map((o) => (o.offerId === offerId ? res.offer : o)));
        loadAllMarketplaceData();
      } catch (err: any) {
        setErrorMessage(err.message || `Failed to ${action} offer`);
      }
    });
  };

  // Buyer Offer Submission
  const handleSubmitBuyerOffer = async () => {
    if (!offerModalListing) return;
    requireAuthOrPrompt('submit procurement offers to farmers', async () => {
      try {
        const res = await apiClient.createOffer({
          listingId: offerModalListing.listingId,
          offeredPricePerTonInr: offerPriceInput,
          quantityTons: offerTonsInput,
          buyerNotes: offerNotesInput,
        });
        setOffers((prev) => [res.offer, ...prev]);
        setOfferModalListing(null);
        setOfferNotesInput('');
        loadAllMarketplaceData();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to submit offer');
      }
    });
  };

  // Collection Milestone Advancement
  const handleAdvanceCollectionStage = async (
    collectionId: string,
    nextStage: 'LOADING' | 'IN_TRANSIT' | 'DELIVERED' | 'VERIFIED'
  ) => {
    requireAuthOrPrompt('advance collection logistics milestones', async () => {
      try {
        const details =
          nextStage === 'VERIFIED'
            ? {
                verifiedNetTons: 348,
                certifiedMoisturePercent: 14.0,
                deliveryWeighbridgeSlipUrl: '/slips/weighbridge_sample.pdf',
              }
            : undefined;

        const res = await apiClient.updateCollectionMilestone(collectionId, nextStage, details);
        setCollections((prev) =>
          prev.map((c) => (c.collectionId === collectionId ? res.collection : c))
        );
        loadAllMarketplaceData();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to update collection milestone');
      }
    });
  };

  // 16T Truck Freight Model calculation
  const baseFreightPerTon = 250;
  const haulingCostPerTon = 4.5 * calcDistance;
  const totalFreightPerTon = baseFreightPerTon + haulingCostPerTon;
  const totalHaulingCostInr = totalFreightPerTon * calcTons;

  const isDemoOrUnauthenticated = !currentUserSession?.idToken;

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sage-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-forest-900 transition mb-2"
          >
            &larr; Back to Platform Home
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-forest tracking-tight">
              Parali-to-Value Marketplace
            </h1>
            <ProvenanceBadge provenance="DEMO_DATA" detail="Demonstration Feed" />
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Deterministic bio-economy exchange matching agricultural residue with regional industrial processing plants.
          </p>
        </div>

        {/* 3-Way Mode Switcher Tabs */}
        <div className="flex items-center bg-ivory-200 p-1 rounded-2xl border border-ivory-300 shadow-inner self-start sm:self-auto">
          <button
            onClick={() => setActiveMode('public')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'public'
                ? 'bg-forest text-white shadow-sm'
                : 'text-gray-700 hover:text-forest'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
            <span>Public Overview</span>
          </button>

          <button
            onClick={() => setActiveMode('farmer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'farmer'
                ? 'bg-forest text-white shadow-sm'
                : 'text-gray-700 hover:text-forest'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>Farmer Workspace</span>
          </button>

          <button
            onClick={() => setActiveMode('buyer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'buyer'
                ? 'bg-forest text-white shadow-sm'
                : 'text-gray-700 hover:text-forest'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Buyer Workspace</span>
          </button>
        </div>
      </div>

      {/* Demonstration / Read-Only Notice Banner */}
      {isDemoOrUnauthenticated && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <ProvenanceBadge provenance="DEMO_DATA" detail="Interactive Sandbox" />
            <div className="text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>Public Demonstration Preview Mode (Read-Only)</span>
                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  Zero Cloud Cost
                </span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                You are currently exploring pre-seeded synthetic farmer listings, algorithmic industrial buyer matches, and logistics milestones.
                To create binding listings, negotiate contracts, or certify weighbridge slips, an authenticated Cognito session is required.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/sign-in')}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Sign In with Cognito
            </Button>
          </div>
        </div>
      )}

      {errorMessage && (
        <AlertBanner type="error" title="Action Error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </AlertBanner>
      )}

      {/* =========================================================================
          MODE 1: PUBLIC OVERVIEW (Economics, LCA accounting, Buyer references)
      ========================================================================= */}
      {activeMode === 'public' && (
        <div className="space-y-8">
          {/* Defensible Environmental Accounting Section */}
          <Card variant="default">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-forest-700 bg-sage-200 px-2.5 py-0.5 rounded-full">
                      LCA Tonnage Partitioning &amp; Certified Weighbridge Accounting
                    </span>
                  </div>
                  <CardTitle className="text-lg">Environmental Impact &amp; Diversion Ledger</CardTitle>
                  <CardDescription>
                    Rigorous accounting separating listed, matched, accepted, collected, and verified physical stubble quantities.
                  </CardDescription>
                </div>
                <Scale className="w-5 h-5 text-forest shrink-0" />
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* 5-Tier Partitioned Quantities Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">1. Listed Tonnage</span>
                  <span className="text-xl font-black text-forest">{impact.totalQuantityListedTons.toLocaleString()} t</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Ex-field declarations</span>
                </div>

                <div className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">2. Matched Tonnage</span>
                  <span className="text-xl font-black text-forest">{impact.totalQuantityMatchedTons.toLocaleString()} t</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Radius &amp; crop match</span>
                </div>

                <div className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">3. Accepted Offers</span>
                  <span className="text-xl font-black text-forest">{impact.totalQuantityAcceptedTons.toLocaleString()} t</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Binding buyer agreements</span>
                </div>

                <div className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">4. Collected Tonnage</span>
                  <span className="text-xl font-black text-forest">{impact.totalQuantityCollectedTons.toLocaleString()} t</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Transit &amp; delivered</span>
                </div>

                <div className="p-3 bg-sage-100 rounded-xl border border-sage-300 text-center">
                  <span className="text-[10px] font-bold text-forest-800 uppercase block">5. Verified Net Tons</span>
                  <span className="text-xl font-black text-forest-900">{impact.totalQuantityVerifiedTons.toLocaleString()} t</span>
                  <span className="text-[10px] text-forest-700 block mt-0.5">Certified weighbridge</span>
                </div>
              </div>

              {/* Economic & Regulatory Status Callout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-forest-50/50 rounded-2xl border border-forest/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">Farmer Direct Revenue (Verified)</span>
                    <span className="text-lg font-black text-forest">
                      ₹{impact.farmerIncomeGeneratedInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Counterfactual Fire Prevention:</span>
                    <span className="font-bold text-amber-800">Withheld (Unverified Baseline)</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Calculated strictly on physically verified weighbridge net tonnes. Fire prevention claims are withheld as physical collection alone does not prove counterfactual burning aversion without empirical satellite thermal verification.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5 text-xs text-amber-950">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold">Lifecycle Emissions Status: Pending Certification</span>
                  </div>
                  <div className="text-[11px] text-amber-900 leading-relaxed">
                    Status: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-[10px]">UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION</code>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    In compliance with platform data-provenance directives, derived avoided CO2e and PM2.5 emissions claims are withheld pending batch-specific third-party laboratory combustion analysis to prevent unverified environmental claims.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 16T Truck Freight Model Calculator */}
          <Card variant="default">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-forest-700 bg-sage-200 px-2.5 py-0.5 rounded-full">
                      Regional Transport Model: ₹250.00/t base loading + ₹4.50/t-km hauling
                    </span>
                  </div>
                  <CardTitle className="text-lg">Indicative Transport Freight Calculator</CardTitle>
                  <CardDescription>
                    Models logistics economics for agricultural multi-axle freight (10–16 ton payload standard).
                  </CardDescription>
                </div>
                <Truck className="w-5 h-5 text-forest shrink-0" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Haulage Distance (km)" helperText="Road transit distance between farm depot and off-taker gate">
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    value={calcDistance}
                    onChange={(e) => setCalcDistance(Math.max(1, Number(e.target.value)))}
                  />
                </FormField>

                <FormField label="Batch Quantity (Tons)" helperText="Total residue payload to transport">
                  <Input
                    type="number"
                    min="1"
                    max="2000"
                    value={calcTons}
                    onChange={(e) => setCalcTons(Math.max(1, Number(e.target.value)))}
                  />
                </FormField>
              </div>

              <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Freight Cost Per Ton</span>
                  <span className="text-lg font-black text-forest">₹{totalFreightPerTon.toFixed(2)} / ton</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Indicative Freight</span>
                  <span className="text-lg font-black text-forest">₹{totalHaulingCostInr.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Trips (16T Standard)</span>
                  <span className="text-lg font-black text-forest">{Math.ceil(calcTons / 16)} truckloads</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Public Listings Directory with Privacy Phone Masking */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-forest">Active Crop Residue Listings</h3>
                <p className="text-xs text-gray-500">
                  Public view with supplier contact masking to protect farmer privacy. Full contact details are revealed only to authorized counterparties upon accepted offers.
                </p>
              </div>
              <ProvenanceBadge provenance="DEMO_DATA" />
            </div>

            <DataTable
              data={listings}
              keyExtractor={(item) => item.listingId}
              columns={[
                {
                  key: 'cropType',
                  header: 'Residue & Variety',
                  render: (item) => (
                    <div>
                      <div className="font-bold text-forest">{item.cropType}</div>
                      <div className="text-[11px] text-gray-500">{item.balingType}</div>
                    </div>
                  ),
                },
                {
                  key: 'location',
                  header: 'Location',
                  render: (item) => (
                    <div>
                      <div className="font-bold text-gray-800">{item.district}, {item.state || 'Punjab'}</div>
                      <div className="text-[11px] text-gray-500">{item.locationName || 'Local Aggregation Depot'}</div>
                    </div>
                  ),
                },
                {
                  key: 'quantityTons',
                  header: 'Available Tonnage',
                  render: (item) => (
                    <span className="font-bold text-forest">{item.quantityTons} tons</span>
                  ),
                },
                {
                  key: 'moisturePercent',
                  header: 'Moisture',
                  render: (item) => (
                    <span
                      className={`font-bold ${
                        item.moisturePercent > 16 ? 'text-amber-700' : 'text-forest'
                      }`}
                    >
                      {item.moisturePercent}%
                    </span>
                  ),
                },
                {
                  key: 'askingPricePerTonInr',
                  header: 'Asking Price',
                  render: (item) => `₹${item.askingPricePerTonInr} / ton`,
                },
                {
                  key: 'contact',
                  header: 'Supplier Contact',
                  render: (item) => (
                    <div className="text-xs">
                      <div className="font-medium text-gray-700">{item.farmerName}</div>
                      <div className="font-mono text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        {item.farmerPhoneMasked || '+91 98XXX-XXXXX'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (item) => (
                    <Badge
                      variant={
                        item.status === 'VERIFIED'
                          ? 'success'
                          : item.status === 'ACCEPTED'
                          ? 'sage'
                          : item.status === 'IN_OFFER'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                    >
                      {item.status}
                    </Badge>
                  ),
                },
              ]}
            />
          </div>

          {/* 5 Distinct Industrial Buyer Categories with Academic Benchmark */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-forest">
                Regional Industrial Buyer Profiles (5 Utilization Categories)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Public procurement capacities, specifications, and academic technological benchmarks.
              </p>
            </div>

            <div className="p-3 bg-ivory-200/80 rounded-2xl border border-ivory-300 text-xs text-gray-700 leading-relaxed">
              <strong>Academic Reference Notice:</strong> Kriya Labs at IIT Delhi is cited solely as an academic research and technology benchmark for agri-pulp and biodegradable tableware manufacturing; reference does not constitute a commercial partnership, registered corporate buyer account, or binding off-take commitment.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {buyers.map((b) => (
                <Card key={b.buyerId} variant="default" className="flex flex-col justify-between">
                  <CardHeader className="space-y-1 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-forest-700 bg-sage-200 px-2 py-0.5 rounded-full uppercase">
                        {b.organizationType.split('(')[0]}
                      </span>
                      {b.isAcademicReference && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                          Academic Ref
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base pt-1">{b.buyerName}</CardTitle>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{b.district}, {b.state}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 text-xs text-gray-600 pt-1">
                    <div>
                      <strong>Accepted:</strong> {b.acceptedCrops.join(', ')}
                    </div>
                    <div>
                      <strong>Moisture Limit:</strong> &le; {b.maxAcceptableMoisturePercent}%
                    </div>
                    <div>
                      <strong>Hauling Radius:</strong> &le; {b.maxHaulingRadiusKm} km
                    </div>
                    <div>
                      <strong>Monthly Capacity:</strong> {b.monthlyCapacityTons.toLocaleString()} t/mo
                    </div>
                    <div className="font-bold text-forest pt-1">
                      Target Base Price: ₹{b.offeredBasePricePerTonInr} / ton
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 border-t border-gray-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setActiveMode('buyer');
                      }}
                    >
                      View Buyer Workspace
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 2: FARMER WORKSPACE (sunilnagrale@gmail.com / Sardar Sunil Singh)
      ========================================================================= */}
      {activeMode === 'farmer' && (
        <div className="space-y-8">
          {/* Farmer Profile Header */}
          <div className="p-5 bg-sage-50 rounded-3xl border border-sage-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center font-black text-lg">
                SS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-forest">Sardar Sunil Singh</h2>
                  <span className="text-[10px] font-bold bg-sage-200 text-forest px-2 py-0.5 rounded-full uppercase">
                    Verified Farmer (Demo)
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Sangrur District, Malwa Region, Punjab &bull; Linked Email: <span className="font-mono">sunilnagrale@gmail.com</span>
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingListing({
                  cropType: 'Paddy Straw (Non-Basmati)',
                  quantityTons: 250,
                  moisturePercent: 14.0,
                  askingPricePerTonInr: 1850,
                  balingType: 'Ex-Field Baled (Round/Square)',
                  district: 'Sangrur',
                  state: 'Punjab',
                  locationName: 'Dhuri Village Depot, Sangrur',
                  status: 'LISTED',
                });
                setIsListingModalOpen(true);
              }}
            >
              Create New Listing
            </Button>
          </div>

          {/* Farmer Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Active Listings</span>
              <span className="text-2xl font-black text-forest">
                {listings.filter((l) => l.farmerId === 'FARMER_SUNIL' || l.farmerName?.includes('Sunil')).length || 2}
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">550 total tons listed</span>
            </div>

            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Compatible Buyers</span>
              <span className="text-2xl font-black text-forest">{listingMatches.length || 5}</span>
              <span className="text-xs text-gray-500 block mt-0.5">Within 75 km radius</span>
            </div>

            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Offers Under Negotiation</span>
              <span className="text-2xl font-black text-amber-700">
                {offers.filter((o) => o.status === 'SUBMITTED' || o.status === 'COUNTERED').length || 1}
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">1 counter-offer active</span>
            </div>

            <div className="p-4 bg-sage-100 rounded-2xl border border-sage-300">
              <span className="text-[10px] font-bold text-forest-700 uppercase block">Verified Income (Slip Backed)</span>
              <span className="text-2xl font-black text-forest-900">₹6,78,600</span>
              <span className="text-xs text-forest-700 block mt-0.5">348 net tons verified</span>
            </div>
          </div>

          {/* My Listings & Matching Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Farmer's Listings */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-forest">My Farm Residue Lots</h3>
                <span className="text-xs text-gray-500">Select a lot to see algorithmic buyer matches</span>
              </div>

              <div className="space-y-3">
                {listings
                  .filter((l) => l.farmerId === 'FARMER_SUNIL' || l.farmerName?.includes('Sunil'))
                  .map((item) => (
                    <div
                      key={item.listingId}
                      onClick={() => setSelectedListingForMatches(item)}
                      className={`p-4 rounded-2xl border cursor-pointer transition ${
                        selectedListingForMatches?.listingId === item.listingId
                          ? 'border-forest bg-sage-50/60 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-sage-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-forest">{item.cropType}</span>
                            <Badge
                              variant={
                                item.status === 'VERIFIED'
                                  ? 'success'
                                  : item.status === 'ACCEPTED'
                                  ? 'sage'
                                  : item.status === 'IN_OFFER'
                                  ? 'warning'
                                  : 'default'
                              }
                              size="sm"
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.locationName} &bull; {item.balingType}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-forest">
                            {item.quantityTons} tons
                          </span>
                          <span className="text-xs text-gray-500 block">
                            ₹{item.askingPricePerTonInr}/t
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs">
                        <span className="text-gray-500">
                          Moisture: <strong>{item.moisturePercent}%</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-[11px] py-1 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingListing(item);
                              setIsListingModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-[11px] py-1 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteListing(item.listingId);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right 5 cols: Algorithmic Matches for Selected Listing */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-forest">Algorithmic Buyer Matches</h3>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>

              {selectedListingForMatches ? (
                <div className="space-y-3">
                  <div className="p-3 bg-sage-100 rounded-xl text-xs text-forest-900">
                    Matches calculated for: <strong>{selectedListingForMatches.cropType}</strong> ({selectedListingForMatches.quantityTons} t @ ₹{selectedListingForMatches.askingPricePerTonInr}/t)
                  </div>

                  {listingMatches.map((m) => (
                    <div key={m.buyerId} className="p-3.5 bg-white rounded-2xl border border-gray-200 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-forest text-xs">{m.buyerName}</div>
                          <span className="text-[10px] text-gray-500">{m.industryType}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-forest px-2 py-0.5 rounded bg-sage-200">
                            {m.compatibilityScore}% Match
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-ivory-100 p-2 rounded-xl text-gray-700">
                        <div>
                          Distance: <strong>{m.haulingDistanceKm} km</strong>
                        </div>
                        <div>
                          Freight: <strong>₹{m.estimatedFreightPerTonInr}/t</strong>
                        </div>
                        <div className="col-span-2">
                          Net Delivered: <strong>₹{m.netDeliveredCostPerTonInr}/t</strong>
                        </div>
                      </div>

                      {m.matchReasons.length > 0 && (
                        <div className="text-[11px] text-forest space-y-0.5">
                          {m.matchReasons.map((r, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-forest" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {m.disqualifyingFactors.length > 0 && (
                        <div className="text-[11px] text-red-700 space-y-0.5">
                          {m.disqualifyingFactors.map((df, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <X className="w-3 h-3 text-red-600" />
                              <span>{df}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-400 bg-ivory-100 rounded-2xl">
                  Select a listing on the left to see algorithmic compatibility
                </div>
              )}
            </div>
          </div>

          {/* Incoming Offers & Counter-Negotiations */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-forest">Commercial Offers &amp; Price Negotiations</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => (
                <Card key={offer.offerId} variant="default" className="space-y-3">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-forest">Offer #{offer.offerId}</span>
                      <Badge
                        variant={
                          offer.status === 'ACCEPTED'
                            ? 'success'
                            : offer.status === 'COUNTERED'
                            ? 'warning'
                            : offer.status === 'REJECTED'
                            ? 'danger'
                            : 'sage'
                        }
                        size="sm"
                      >
                        {offer.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm pt-1">
                      Target Lot: {offer.listingId} ({offer.quantityTons} tons)
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="p-3 bg-ivory-100 rounded-xl space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Buyer Offered Price:</span>
                        <strong className="text-forest text-sm">₹{offer.offeredPricePerTonInr} / ton</strong>
                      </div>
                      {offer.counterOfferPricePerTonInr && (
                        <div className="flex justify-between text-amber-900">
                          <span>Active Counter Price:</span>
                          <strong>₹{offer.counterOfferPricePerTonInr} / ton</strong>
                        </div>
                      )}
                      {offer.buyerNotes && (
                        <p className="text-gray-600 italic text-[11px] pt-1">
                          &ldquo;{offer.buyerNotes}&rdquo;
                        </p>
                      )}
                    </div>

                    {offer.status !== 'ACCEPTED' && offer.status !== 'REJECTED' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Counter Price (₹/t)"
                            value={counterPriceInput[offer.offerId] || ''}
                            onChange={(e) =>
                              setCounterPriceInput((prev) => ({
                                ...prev,
                                [offer.offerId]: Number(e.target.value),
                              }))
                            }
                            className="text-xs"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleRespondToOffer(offer.offerId, 'COUNTER')}
                          >
                            Counter
                          </Button>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => handleRespondToOffer(offer.offerId, 'ACCEPT')}
                          >
                            Accept Offer
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleRespondToOffer(offer.offerId, 'REJECT')}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Collection Logistics Tracking */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-forest">Collection Logistics &amp; Weighbridge Slips</h3>

            <div className="space-y-3">
              {collections.map((coll) => (
                <div key={coll.collectionId} className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-forest">Dispatch #{coll.collectionId}</span>
                        <Badge
                          variant={coll.stage === 'VERIFIED' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {coll.stage}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Carrier: {coll.transporterName} ({coll.vehicleRegistrationNumber}) &bull; Scheduled: {coll.scheduledPickupDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {coll.stage !== 'VERIFIED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            const next =
                              coll.stage === 'SCHEDULED'
                                ? 'LOADING'
                                : coll.stage === 'LOADING'
                                ? 'IN_TRANSIT'
                                : coll.stage === 'IN_TRANSIT'
                                ? 'DELIVERED'
                                : 'VERIFIED';
                            handleAdvanceCollectionStage(coll.collectionId, next);
                          }}
                        >
                          Advance to Next Stage
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Weighbridge verification data */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-ivory-100 p-3 rounded-xl text-xs text-gray-700">
                    <div>
                      Field Gross: <strong>{coll.fieldWeighbridgeGrossTons || 360} t</strong>
                    </div>
                    <div>
                      Factory Gross: <strong>{coll.factoryWeighbridgeGrossTons || 358} t</strong>
                    </div>
                    <div>
                      Verified Net: <strong>{coll.verifiedNetTons || 348} t</strong>
                    </div>
                    <div>
                      Certified Moisture: <strong>{coll.certifiedMoisturePercent || 14.0}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 3: INDUSTRIAL BUYER WORKSPACE (Procurement & Requirements)
      ========================================================================= */}
      {activeMode === 'buyer' && (
        <div className="space-y-8">
          {/* Buyer Facility Header */}
          <div className="p-5 bg-forest text-white rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-lg text-sage-200">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">Verbio India Bio-CNG Refining Unit</h2>
                  <span className="text-[10px] font-bold bg-sage-300 text-forest px-2 py-0.5 rounded-full uppercase">
                    Procurement Active
                  </span>
                </div>
                <p className="text-xs text-sage-200">
                  Lehra Gaga Facility, Sangrur &bull; Capacity: 8,000 tons/mo &bull; Logged In Buyer Profile
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="text-xs bg-white text-forest hover:bg-sage-100"
              onClick={() => {
                // Focus on discovery
                setBuyerCropFilter('Paddy Straw (Non-Basmati)');
              }}
            >
              Browse Qualified Lots
            </Button>
          </div>

          {/* Buyer Procurement Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Monthly Quota</span>
              <span className="text-2xl font-black text-forest">8,000 t</span>
              <span className="text-xs text-gray-500 block mt-0.5">Bio-CNG digester intake</span>
            </div>

            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Active Offers</span>
              <span className="text-2xl font-black text-forest">{offers.length || 2}</span>
              <span className="text-xs text-gray-500 block mt-0.5">Commercial negotiations</span>
            </div>

            <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">In-Transit Freight</span>
              <span className="text-2xl font-black text-amber-700">400 t</span>
              <span className="text-xs text-gray-500 block mt-0.5">Karnal freight carrier</span>
            </div>

            <div className="p-4 bg-sage-100 rounded-2xl border border-sage-300">
              <span className="text-[10px] font-bold text-forest-700 uppercase block">Delivered &amp; Verified</span>
              <span className="text-2xl font-black text-forest-900">348 t</span>
              <span className="text-xs text-forest-700 block mt-0.5">Slip verified at gate</span>
            </div>
          </div>

          {/* Quality Requirements & Procurement Ceiling Editor */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-base">Procurement Specifications &amp; Quality Parameters</CardTitle>
              <CardDescription>
                Criteria used by the algorithmic matching engine to rank and qualify agricultural straw lots.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Maximum Moisture Content (%)" helperText="Ceiling allowable before automated rejection">
                  <Input
                    type="number"
                    min="10"
                    max="25"
                    value={buyerMaxMoistureFilter}
                    onChange={(e) => setBuyerMaxMoistureFilter(Number(e.target.value))}
                  />
                </FormField>

                <FormField label="Maximum Hauling Radius (km)" helperText="Economical service radius for 16T truck freight">
                  <Input type="number" min="10" max="200" defaultValue="65" />
                </FormField>

                <FormField label="Base Price Ceiling (₹/ton)" helperText="Maximum benchmark price at plant gate">
                  <Input type="number" min="1000" max="3000" defaultValue="2200" />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Qualified Listing Discovery with Multi-Attribute Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-forest">Available Residue Lots in Service Radius</h3>
                <p className="text-xs text-gray-500">Filter by crop type, moisture, and district.</p>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <select
                  value={buyerCropFilter}
                  onChange={(e) => setBuyerCropFilter(e.target.value)}
                  className="text-xs border border-gray-300 rounded-xl px-2.5 py-1.5 bg-white text-gray-800"
                >
                  <option value="all">All Crops</option>
                  <option value="Paddy Straw (Non-Basmati)">Paddy Straw (Non-Basmati)</option>
                  <option value="Basmati Straw">Basmati Straw</option>
                </select>

                <select
                  value={buyerDistrictFilter}
                  onChange={(e) => setBuyerDistrictFilter(e.target.value)}
                  className="text-xs border border-gray-300 rounded-xl px-2.5 py-1.5 bg-white text-gray-800"
                >
                  <option value="all">All Districts</option>
                  <option value="Sangrur">Sangrur</option>
                  <option value="Ludhiana">Ludhiana</option>
                  <option value="Karnal">Karnal</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {listings
                .filter((l) => (buyerCropFilter === 'all' ? true : l.cropType === buyerCropFilter))
                .filter((l) => (buyerDistrictFilter === 'all' ? true : l.district === buyerDistrictFilter))
                .map((listing) => {
                  const estFreight = Math.round(250 + 35 * 4.5);
                  const netDelivered = listing.askingPricePerTonInr + estFreight;

                  return (
                    <div
                      key={listing.listingId}
                      className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-forest/40 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-forest text-sm">{listing.cropType}</span>
                            <Badge variant="sage" size="sm">
                              {listing.balingType}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {listing.locationName} &bull; Supplier: {listing.farmerName}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-forest">
                            {listing.quantityTons} tons
                          </span>
                          <span className="text-xs text-gray-500 block">
                            Asking: ₹{listing.askingPricePerTonInr}/t
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-ivory-100 p-2.5 rounded-xl text-xs text-gray-700">
                        <div>
                          Moisture: <strong>{listing.moisturePercent}%</strong>
                        </div>
                        <div>
                          Est. Distance: <strong>~35 km</strong>
                        </div>
                        <div>
                          Est. Freight: <strong>₹{estFreight}/t</strong>
                        </div>
                        <div>
                          Net Delivered: <strong>₹{netDelivered}/t</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-forest font-bold">
                          &check; Compatible with Bio-CNG digestion parameters
                        </span>

                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setOfferModalListing(listing);
                            setOfferPriceInput(listing.askingPricePerTonInr);
                            setOfferTonsInput(listing.quantityTons);
                          }}
                        >
                          Submit Off-Take Offer
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: Create / Edit Listing Modal (Farmer)
      ========================================================================= */}
      {isListingModalOpen && editingListing && (
        <Modal
          isOpen={isListingModalOpen}
          onClose={() => setIsListingModalOpen(false)}
          title={editingListing.listingId ? 'Edit Residue Listing' : 'Create New Crop Residue Listing'}
        >
          <div className="space-y-4">
            <FormField label="Residue / Crop Variety">
              <select
                value={editingListing.cropType || 'Paddy Straw (Non-Basmati)'}
                onChange={(e) =>
                  setEditingListing((prev) => ({ ...prev, cropType: e.target.value as any }))
                }
                className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white"
              >
                <option value="Paddy Straw (Non-Basmati)">Paddy Straw (Non-Basmati)</option>
                <option value="Basmati Straw">Basmati Straw</option>
                <option value="Wheat Straw">Wheat Straw</option>
                <option value="Mustard Stalk">Mustard Stalk</option>
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity (Tons)">
                <Input
                  type="number"
                  min="10"
                  max="5000"
                  value={editingListing.quantityTons || ''}
                  onChange={(e) =>
                    setEditingListing((prev) => ({ ...prev, quantityTons: Number(e.target.value) }))
                  }
                />
              </FormField>

              <FormField label="Moisture Content (%)" helperText="Max 25%">
                <Input
                  type="number"
                  min="5"
                  max="25"
                  step="0.1"
                  value={editingListing.moisturePercent || ''}
                  onChange={(e) =>
                    setEditingListing((prev) => ({
                      ...prev,
                      moisturePercent: Number(e.target.value),
                    }))
                  }
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Asking Price (₹/ton)">
                <Input
                  type="number"
                  min="500"
                  max="5000"
                  value={editingListing.askingPricePerTonInr || ''}
                  onChange={(e) =>
                    setEditingListing((prev) => ({
                      ...prev,
                      askingPricePerTonInr: Number(e.target.value),
                    }))
                  }
                />
              </FormField>

              <FormField label="Baling Type">
                <select
                  value={editingListing.balingType || 'Ex-Field Baled (Round/Square)'}
                  onChange={(e) =>
                    setEditingListing((prev) => ({ ...prev, balingType: e.target.value as any }))
                  }
                  className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="Ex-Field Baled (Round/Square)">Ex-Field Baled (Round/Square)</option>
                  <option value="Loose Stubble">Loose Stubble</option>
                  <option value="Ex-Depot Aggregated">Ex-Depot Aggregated</option>
                </select>
              </FormField>
            </div>

            <FormField label="Location / Farm Depot">
              <Input
                type="text"
                placeholder="Village or depot name"
                value={editingListing.locationName || ''}
                onChange={(e) =>
                  setEditingListing((prev) => ({ ...prev, locationName: e.target.value }))
                }
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="secondary" size="sm" onClick={() => setIsListingModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveListing}>
                Publish Listing
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 2: Submit Offer Modal (Buyer)
      ========================================================================= */}
      {offerModalListing && (
        <Modal
          isOpen={Boolean(offerModalListing)}
          onClose={() => setOfferModalListing(null)}
          title={`Submit Off-Take Offer: ${offerModalListing.cropType}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-sage-50 rounded-xl text-xs space-y-1">
              <div>
                Farmer / Lot: <strong>{offerModalListing.farmerName}</strong>
              </div>
              <div>
                Location: <strong>{offerModalListing.locationName}</strong>
              </div>
              <div>
                Farmer Asking Price: <strong>₹{offerModalListing.askingPricePerTonInr} / ton</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Offered Price (₹/ton)">
                <Input
                  type="number"
                  min="500"
                  max="5000"
                  value={offerPriceInput}
                  onChange={(e) => setOfferPriceInput(Number(e.target.value))}
                />
              </FormField>

              <FormField label="Requested Quantity (Tons)">
                <Input
                  type="number"
                  min="10"
                  max={offerModalListing.quantityTons}
                  value={offerTonsInput}
                  onChange={(e) => setOfferTonsInput(Number(e.target.value))}
                />
              </FormField>
            </div>

            <FormField label="Commercial Notes & Logistics Terms">
              <textarea
                rows={3}
                placeholder="E.g., 16T truck ex-field collection; weighbridge at plant gate."
                value={offerNotesInput}
                onChange={(e) => setOfferNotesInput(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white text-gray-800"
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="secondary" size="sm" onClick={() => setOfferModalListing(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSubmitBuyerOffer}>
                Submit Commercial Offer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 3: Authentication Required Prompt
      ========================================================================= */}
      {authRequiredModalOpen && (
        <Modal
          isOpen={authRequiredModalOpen}
          onClose={() => setAuthRequiredModalOpen(false)}
          title="Cognito Authentication Required"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Legally Binding Agricultural Transaction Guard</span>
              </div>
              <p className="leading-relaxed">
                To {authPromptReason}, you must be authenticated with a verified user identity.
                The public demonstration allows full exploratory preview, but legally binding agricultural off-take agreements require valid Cognito credentials.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setAuthRequiredModalOpen(false)}>
                Continue in Preview Mode
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setAuthRequiredModalOpen(false);
                  onNavigate('/sign-in');
                }}
              >
                Sign In with Cognito
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
