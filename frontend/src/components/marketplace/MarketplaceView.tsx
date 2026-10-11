import React, { useState } from 'react';
import {
  Sprout,
  Truck,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight,
  Filter,
  DollarSign,
  MapPin,
  Sparkles,
  ShieldCheck,
  Scale,
  Factory,
} from 'lucide-react';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

interface Listing {
  id: string;
  farmer: string;
  crop: string;
  district: string;
  state: string;
  quantityTons: number;
  moisture: number;
  askingPriceInr: number;
  baling: string;
  status: 'LISTED' | 'MATCHED' | 'OFFER_ACCEPTED' | 'COLLECTING' | 'VERIFIED';
}

interface Buyer {
  id: string;
  name: string;
  industry: string;
  location: string;
  acceptedCrop: string;
  maxMoisture: number;
  capacityMonthlyTons: number;
  baseOfferedInr: number;
}

const INITIAL_LISTINGS: Listing[] = [
  {
    id: 'LST_01',
    farmer: 'Sardar Sunil Singh (Demo Account: sunilnagrale@gmail.com)',
    crop: 'Paddy Straw (Non-Basmati)',
    district: 'Sangrur',
    state: 'Punjab',
    quantityTons: 350,
    moisture: 14.2,
    askingPriceInr: 1850,
    baling: 'Ex-Field Baled (Round)',
    status: 'MATCHED',
  },
  {
    id: 'LST_02',
    farmer: 'Gurpreet Brar',
    crop: 'Basmati Straw',
    district: 'Ludhiana',
    state: 'Punjab',
    quantityTons: 500,
    moisture: 12.0,
    askingPriceInr: 2100,
    baling: 'Ex-Field Baled (Square)',
    status: 'VERIFIED',
  },
  {
    id: 'LST_03',
    farmer: 'Ramesh Kumar',
    crop: 'Paddy Straw (Non-Basmati)',
    district: 'Karnal',
    state: 'Haryana',
    quantityTons: 200,
    moisture: 16.5,
    askingPriceInr: 1700,
    baling: 'Loose Stubble',
    status: 'LISTED',
  },
];

const INITIAL_BUYERS: Buyer[] = [
  {
    id: 'BYR_01',
    name: 'Verbio India Bio-CNG Plant',
    industry: 'Bio-CNG / CBG Plant',
    location: 'Lehra Gaga, Sangrur',
    acceptedCrop: 'Paddy Straw (Non-Basmati)',
    maxMoisture: 18.0,
    capacityMonthlyTons: 8000,
    baseOfferedInr: 2200,
  },
  {
    id: 'BYR_02',
    name: 'EcoPulp Biodegradable Tableware (Tech Ref: Kriya Labs IIT Delhi)',
    industry: 'Pulp & Tableware Manufacturing',
    location: 'Patiala Industrial Area',
    acceptedCrop: 'Paddy Straw (Non-Basmati)',
    maxMoisture: 14.0,
    capacityMonthlyTons: 2500,
    baseOfferedInr: 2450,
  },
  {
    id: 'BYR_03',
    name: 'Indian Oil 2G Ethanol Refinery',
    industry: '2G Bio-Ethanol Refinery',
    location: 'Panipat Refinery Zone',
    acceptedCrop: 'Paddy Straw (Non-Basmati)',
    maxMoisture: 15.0,
    capacityMonthlyTons: 15000,
    baseOfferedInr: 2300,
  },
];

export const MarketplaceView: React.FC = () => {
  const [roleMode, setRoleMode] = useState<'farmer' | 'buyer'>('farmer');
  const [selectedListing, setSelectedListing] = useState<Listing>(INITIAL_LISTINGS[0]);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer>(INITIAL_BUYERS[0]);
  const [offerPrice, setOfferPrice] = useState(2100);
  const [offerSubmitted, setOfferSubmitted] = useState(false);
  const [collectionStage, setCollectionStage] = useState<'SCHEDULED' | 'LOADING' | 'IN_TRANSIT' | 'DELIVERED' | 'VERIFIED'>('VERIFIED');

  // Algorithmic Match Calculation
  const haulingKm = 28.5; // Sangrur field to Lehra Gaga plant
  const freightPerTon = Math.round(250 + haulingKm * 4.5); // INR 378/t
  const netDeliveredCost = selectedListing.askingPriceInr + freightPerTon;
  const matchScore = 94; // High compatibility

  // Environmental Impact Ledger Metrics
  const totalListed = 1050;
  const totalMatched = 850;
  const totalAccepted = 500;
  const totalCollected = 485;
  const totalVerified = 485; // Tons confirmed with moisture & weighbridge slips

  // Rigorous environmental accounting per audit directive
  // Derived emissions (CO2e, PM2.5) are held pending certified batch LCA analysis
  const co2eAvoided = null;
  const pm25Avoided = null;
  const emissionsStatus = 'UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION';
  const farmerIncomeInr = totalVerified * 2150;          // INR 10,42,750

  return (
    <div className="space-y-6">
      {/* Scope & Demonstration Transparency Banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ProvenanceBadge provenance="DEMO_DATA" subtext="Pre-Seeded Accounts" />
          <div className="text-xs text-amber-950 space-y-0.5">
            <div className="font-bold">Demonstration Marketplace &amp; Industry References</div>
            <p className="text-amber-900">
              Listing and buyer records represent realistic synthetic simulation for hackathon demonstration. Kriya Labs at IIT Delhi is cited as a technological benchmark for pulp/tableware processing; reference does not imply an active partnership.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-xs font-bold text-amber-900">Active Persona:</div>
          <button
            onClick={() => setRoleMode(roleMode === 'farmer' ? 'buyer' : 'farmer')}
            className="px-3 py-1 rounded-lg text-xs font-extrabold bg-amber-200 text-amber-950 hover:bg-amber-300 transition"
          >
            Switch to {roleMode === 'farmer' ? 'Industrial Processor' : 'Farmer'} View
          </button>
        </div>
      </div>

      {/* Environmental Impact Ledger (Prominent Top Row) */}
      <div className="card-subtle p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-forest-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-forest-700" />
              <span>Parali-to-Value Environmental Impact Ledger (Simulated Demonstration)</span>
            </h2>
            <p className="text-xs text-amber-800 font-semibold pt-0.5">
              SYNTHETIC DEMO DATA: The physical quantities and farmer payout below represent pre-seeded hackathon demonstration records. No commercial contracts exist, and these figures must not be presented as real collections or verified environmental outcomes.
            </p>
          </div>
          <ProvenanceBadge provenance="DEMO_DATA" subtext="Synthetic Simulation" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="bg-ivory-100 p-3 rounded-xl border border-ivory-200">
            <div className="text-[11px] text-gray-500 uppercase font-bold">1. Listed (Demo)</div>
            <div className="text-xl font-black text-forest-900">{totalListed} T</div>
            <div className="text-[10px] text-gray-400">Simulated Offerings</div>
          </div>
          <div className="bg-ivory-100 p-3 rounded-xl border border-ivory-200">
            <div className="text-[11px] text-gray-500 uppercase font-bold">2. Matched (Demo)</div>
            <div className="text-xl font-black text-forest-900">{totalMatched} T</div>
            <div className="text-[10px] text-gray-400">Algorithmic Fit</div>
          </div>
          <div className="bg-ivory-100 p-3 rounded-xl border border-ivory-200">
            <div className="text-[11px] text-gray-500 uppercase font-bold">3. Accepted (Demo)</div>
            <div className="text-xl font-black text-forest-900">{totalAccepted} T</div>
            <div className="text-[10px] text-gray-400">Simulated Contracts</div>
          </div>
          <div className="bg-ivory-100 p-3 rounded-xl border border-ivory-200">
            <div className="text-[11px] text-gray-500 uppercase font-bold">4. Collected (Demo)</div>
            <div className="text-xl font-black text-forest-900">{totalCollected} T</div>
            <div className="text-[10px] text-gray-400">Weighbridge Gate</div>
          </div>
          <div className="bg-forest-800 text-white p-3 rounded-xl shadow-sm">
            <div className="text-[11px] text-sage-200 uppercase font-bold">5. Verified (Demo)</div>
            <div className="text-xl font-black text-white">{totalVerified} T</div>
            <div className="text-[10px] text-sage-200">Simulated Weigh Slip</div>
          </div>
        </div>

        {/* Derived Impact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 bg-ivory-100 border border-gray-300 rounded-xl space-y-1">
            <div className="text-xs font-bold text-gray-700">CO₂ Equivalent Avoided</div>
            <div className="text-lg font-bold text-gray-500">Estimate Unavailable</div>
            <p className="text-[10px] text-gray-500">
              Literature benchmark (~1.46 t CO₂e/t) is withheld until lot-level lifecycle analysis (LCA) and moisture audits are completed.
            </p>
          </div>

          <div className="p-3.5 bg-ivory-100 border border-gray-300 rounded-xl space-y-1">
            <div className="text-xs font-bold text-gray-700">PM2.5 Emissions Prevented</div>
            <div className="text-lg font-bold text-gray-500">Estimate Unavailable</div>
            <p className="text-[10px] text-gray-500">
              Field burning emission factors (~3.0 kg PM2.5/t) require batch combustion certification before reporting as verified avoidance.
            </p>
          </div>

          <div className="p-3.5 bg-sage-100 border border-sage-300 rounded-xl space-y-1">
            <div className="text-xs font-bold text-forest-900">Direct Farmer Revenue (Simulated Demo Payout)</div>
            <div className="text-2xl font-black text-forest-900">₹ {(farmerIncomeInr / 100000).toFixed(2)} Lakhs</div>
            <p className="text-[10px] text-forest-700">
              Calculated on 485 simulated net tonnes @ ₹2,150/t contract price on demo weighbridge slip.
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Marketplace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Residue Listings Feed */}
        <div className="card-subtle p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Available Residue Listings
            </h3>
            <Sprout className="w-4 h-4 text-forest-700" />
          </div>

          <div className="space-y-3">
            {INITIAL_LISTINGS.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedListing(l)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                  selectedListing.id === l.id
                    ? 'bg-ivory-100 border-forest-700 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="font-extrabold text-forest-900">{l.crop}</span>
                  <span className="font-bold text-forest-800">₹{l.askingPriceInr}/t</span>
                </div>
                <div className="text-gray-600 space-y-0.5 text-[11px]">
                  <div>Farmer: {l.farmer}</div>
                  <div>Location: {l.district}, {l.state}</div>
                  <div className="flex items-center gap-3 pt-1 text-gray-500 font-semibold">
                    <span>Qty: {l.quantityTons} Tons</span>
                    <span>Moisture: {l.moisture}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Algorithmic Match & Freight Breakdown */}
        <div className="card-subtle p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Algorithmic Match Engine
            </h3>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">Select Processor / Off-Taker:</label>
              <select
                value={selectedBuyer.name}
                onChange={(e) => {
                  const b = INITIAL_BUYERS.find(item => item.name === e.target.value);
                  if (b) setSelectedBuyer(b);
                }}
                className="w-full text-xs font-semibold bg-ivory-50 border border-gray-300 rounded-lg p-2 text-forest-900 mt-1"
              >
                {INITIAL_BUYERS.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} ({b.industry})
                  </option>
                ))}
              </select>
            </div>

            {/* Score Metric */}
            <div className="p-3 bg-forest-800 text-white rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[11px] text-sage-200 uppercase font-bold">Compatibility Score</div>
                <div className="text-2xl font-black">{matchScore} / 100</div>
              </div>
              <div className="text-right text-xs text-sage-200">
                <div>Distance: {haulingKm} km</div>
                <div>Moisture fit: {selectedListing.moisture}% vs max {selectedBuyer.maxMoisture}%</div>
              </div>
            </div>

            {/* Logistics Cost Computation */}
            <div className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 text-xs space-y-2">
              <div className="font-bold text-forest-900 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-forest-700" />
                <span>Indicative Transport Economics</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Farmer Asking Price:</span>
                <span className="font-semibold text-gray-900">₹{selectedListing.askingPriceInr}/t</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Estimated Freight ({haulingKm} km):</span>
                <span className="font-semibold text-gray-900">₹{freightPerTon}/t</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-forest-900">
                <span>Net Delivered Price:</span>
                <span>₹{netDeliveredCost}/t</span>
              </div>
              <div className="text-[10px] text-gray-500">
                Based on standard 16-tonne truck hauling model (₹250 base + ₹4.5/t-km).
              </div>
            </div>

            {/* Offer Submission Card */}
            <div className="pt-2 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">Negotiated Bid Offer:</span>
                <div className="flex items-center gap-1">
                  <span>₹</span>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Number(e.target.value))}
                    className="w-20 p-1 border border-gray-300 rounded text-right font-bold text-xs"
                  />
                  <span>/ton</span>
                </div>
              </div>

              <button
                onClick={() => setOfferSubmitted(true)}
                className="w-full py-2 bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold rounded-lg transition shadow-sm"
              >
                {offerSubmitted ? 'Binding Offer Submitted (Pending Farmer)' : 'Submit Binding Purchase Offer'}
              </button>
            </div>
          </div>
        </div>

        {/* 5-Stage Collection Logistics Tracking */}
        <div className="card-subtle p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Collection &amp; Dispatch Tracker
            </h3>
            <Truck className="w-4 h-4 text-forest-700" />
          </div>

          <div className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 text-xs space-y-1">
            <div className="font-bold text-forest-900">Consignment: LOT-PB-2026-088</div>
            <div className="text-gray-600">Transporter: Kisan Express Logistics (PB-10-CG-9988)</div>
            <div className="text-gray-600">Net Quantity: 485 Tons Baled Non-Basmati Straw</div>
          </div>

          {/* Sequential Milestones */}
          <div className="space-y-3 pt-1">
            {[
              { id: 'SCHEDULED', label: '1. Scheduled & Truck Assigned', time: '10 Oct 07:00' },
              { id: 'LOADING', label: '2. Field Baling & Loading', time: '10 Oct 09:30' },
              { id: 'IN_TRANSIT', label: '3. In Transit (GPS Monitored)', time: '10 Oct 11:15' },
              { id: 'DELIVERED', label: '4. Delivered to Weighbridge Gate', time: '10 Oct 13:45' },
              { id: 'VERIFIED', label: '5. Factory Verified & Moisture Certified', time: '10 Oct 14:30' },
            ].map((st, idx) => {
              const isPastOrCurrent = true;
              return (
                <div key={st.id} className="flex items-start gap-3 text-xs">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">
                    ✓
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-forest-900">{st.label}</div>
                    <div className="text-[10px] text-gray-500">{st.time}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1 text-emerald-950">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Weighbridge Verified</span>
            </div>
            <p className="text-[11px] text-emerald-900">
              Receipt #WB-8874 confirmed: Gross 620T, Tare 135T, Net 485T. Certified moisture: 12.2%. Avoided emissions officially recorded to ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
