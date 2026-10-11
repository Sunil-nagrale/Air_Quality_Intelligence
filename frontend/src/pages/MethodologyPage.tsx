import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  Scale,
  CloudRain,
  School,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, AlertBanner } from '../components/ui';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { AppRoute } from '../types';

interface MethodologyPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const MethodologyPage: React.FC<MethodologyPageProps> = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState<'cpcb' | 'cams' | 'impact' | 'school'>('cpcb');

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
      {/* Header & Breadcrumb */}
      <div className="space-y-4">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 hover:text-forest-950 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="sage" size="md">Institutional Standards &amp; Governance</Badge>
          <Badge variant="outline" size="sm">MoEFCC &amp; CPCB 2014/2015</Badge>
          <Badge variant="outline" size="sm">Copernicus CAMS</Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-forest-950 tracking-tight">
          Scientific Methodology &amp; Data Transparency
        </h1>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-3xl">
          Detailed documentation of our mathematical indices, atmospheric modeling pipelines, life-cycle impact accounting protocols, and school safety governance policies.
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap gap-2 border-b border-ivory-300 pb-4">
        <button
          onClick={() => setActiveSection('cpcb')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'cpcb'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-ivory-300 hover:bg-ivory-100'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>1. CPCB NAQI Formulation</span>
        </button>

        <button
          onClick={() => setActiveSection('cams')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'cams'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-ivory-300 hover:bg-ivory-100'
          }`}
        >
          <CloudRain className="w-4 h-4" />
          <span>2. CAMS Atmospheric Modeling</span>
        </button>

        <button
          onClick={() => setActiveSection('impact')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'impact'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-ivory-300 hover:bg-ivory-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Environmental Impact Ledger</span>
        </button>

        <button
          onClick={() => setActiveSection('school')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'school'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-ivory-300 hover:bg-ivory-100'
          }`}
        >
          <School className="w-4 h-4" />
          <span>4. School Policy Governance</span>
        </button>
      </div>

      {/* SECTION 1: CPCB NAQI FORMULATION */}
      {activeSection === 'cpcb' && (
        <div className="space-y-6">
          <Card variant="default">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  National Air Quality Index (NAQI) Standard (MoEFCC &amp; CPCB 2014/2015)
                </CardTitle>
                <ProvenanceBadge provenance="MEASURED_OBSERVATION" detail="CPCB Official Standard" />
              </div>
              <CardDescription>
                Governed by the Central Pollution Control Board (CPCB) methodology for evaluating ambient criteria pollutants.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 text-sm text-gray-700">
              {/* Formula & Interpolation */}
              <div className="space-y-3">
                <h4 className="font-bold text-forest-950 text-base">A. Sub-Index Linear Interpolation Formula</h4>
                <p className="text-xs sm:text-sm leading-relaxed">
                  For each pollutant concentration <code className="bg-ivory-200 px-1 py-0.5 rounded text-forest-900 font-mono">C_p</code> falling within breakpoint range <code className="bg-ivory-200 px-1 py-0.5 rounded text-forest-900 font-mono">[B_lo, B_hi]</code> corresponding to index category <code className="bg-ivory-200 px-1 py-0.5 rounded text-forest-900 font-mono">[I_lo, I_hi]</code>:
                </p>

                <div className="p-4 bg-ivory-100/80 rounded-2xl border border-ivory-300 font-mono text-center text-xs sm:text-sm text-forest-950 font-bold overflow-x-auto">
                  I_p = I_lo + [ (I_hi - I_lo) / (B_hi - B_lo) ] × (C_p - B_lo)
                </div>

                <p className="text-xs text-gray-600">
                  The overall National Air Quality Index is determined by the maximum sub-index across all monitored criteria pollutants:
                </p>
                <div className="p-3 bg-ivory-100/80 rounded-xl border border-ivory-300 font-mono text-center text-xs text-forest-950 font-bold">
                  AQI = max( I_PM2.5, I_PM10, I_NO2, I_SO2, I_CO, I_O3 )
                </div>
              </div>

              {/* Breakpoint Table */}
              <div className="space-y-3 pt-4 border-t border-ivory-200">
                <h4 className="font-bold text-forest-950 text-base">B. Indian CPCB NAQI Breakpoint Reference Matrix</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-ivory-300 rounded-xl overflow-hidden">
                    <thead className="bg-forest-900 text-white font-bold">
                      <tr>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">AQI Range</th>
                        <th className="p-2.5">PM2.5 (24h)</th>
                        <th className="p-2.5">PM10 (24h)</th>
                        <th className="p-2.5">NO2 (24h)</th>
                        <th className="p-2.5">SO2 (24h)</th>
                        <th className="p-2.5">CO (8h, mg/m³)</th>
                        <th className="p-2.5">O3 (8h)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ivory-200 bg-white">
                      <tr className="bg-emerald-50/50">
                        <td className="p-2.5 font-bold text-emerald-800">Good</td>
                        <td className="p-2.5 font-bold">0 – 50</td>
                        <td className="p-2.5">0 – 30</td>
                        <td className="p-2.5">0 – 50</td>
                        <td className="p-2.5">0 – 40</td>
                        <td className="p-2.5">0 – 40</td>
                        <td className="p-2.5">0.0 – 1.0</td>
                        <td className="p-2.5">0 – 50</td>
                      </tr>
                      <tr className="bg-green-50/50">
                        <td className="p-2.5 font-bold text-green-800">Satisfactory</td>
                        <td className="p-2.5 font-bold">51 – 100</td>
                        <td className="p-2.5">31 – 60</td>
                        <td className="p-2.5">51 – 100</td>
                        <td className="p-2.5">41 – 80</td>
                        <td className="p-2.5">41 – 80</td>
                        <td className="p-2.5">1.1 – 2.0</td>
                        <td className="p-2.5">51 – 100</td>
                      </tr>
                      <tr className="bg-amber-50/50">
                        <td className="p-2.5 font-bold text-amber-900">Moderate</td>
                        <td className="p-2.5 font-bold">101 – 200</td>
                        <td className="p-2.5">61 – 90</td>
                        <td className="p-2.5">101 – 250</td>
                        <td className="p-2.5">81 – 180</td>
                        <td className="p-2.5">81 – 380</td>
                        <td className="p-2.5">2.1 – 10.0</td>
                        <td className="p-2.5">101 – 168</td>
                      </tr>
                      <tr className="bg-orange-50/50">
                        <td className="p-2.5 font-bold text-orange-900">Poor</td>
                        <td className="p-2.5 font-bold">201 – 300</td>
                        <td className="p-2.5">91 – 120</td>
                        <td className="p-2.5">251 – 350</td>
                        <td className="p-2.5">181 – 280</td>
                        <td className="p-2.5">381 – 800</td>
                        <td className="p-2.5">10.1 – 17.0</td>
                        <td className="p-2.5">169 – 208</td>
                      </tr>
                      <tr className="bg-red-50/50">
                        <td className="p-2.5 font-bold text-red-900">Very Poor</td>
                        <td className="p-2.5 font-bold">301 – 400</td>
                        <td className="p-2.5">121 – 250</td>
                        <td className="p-2.5">351 – 430</td>
                        <td className="p-2.5">281 – 400</td>
                        <td className="p-2.5">801 – 1600</td>
                        <td className="p-2.5">17.1 – 34.0</td>
                        <td className="p-2.5">209 – 748</td>
                      </tr>
                      <tr className="bg-stone-100">
                        <td className="p-2.5 font-bold text-stone-900">Severe</td>
                        <td className="p-2.5 font-bold">401 – 500+</td>
                        <td className="p-2.5">250+</td>
                        <td className="p-2.5">430+</td>
                        <td className="p-2.5">400+</td>
                        <td className="p-2.5">1600+</td>
                        <td className="p-2.5">34.0+</td>
                        <td className="p-2.5">748+</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Strict Missing Pollutant Rule */}
              <div className="space-y-3 pt-4 border-t border-ivory-200">
                <h4 className="font-bold text-forest-950 text-base">C. Mandatory Missing Data &amp; Minimum Criteria</h4>
                <AlertBanner type="warning" title="Minimum Pollutant Constraint">
                  Per official CPCB guidelines, an overall NAQI can <strong>only</strong> be calculated if at least <strong>3 criteria pollutants</strong> have valid measurements, and <strong>at least one of them is Particulate Matter (PM2.5 or PM10)</strong>.
                  <br />
                  If this condition is violated (e.g. only NO2 and SO2 are reporting), our system strictly returns <strong>Data Insufficient</strong>. The platform refuses to manufacture synthetic surrogate AQI numbers that could mislead citizens or school authorities.
                </AlertBanner>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 2: CAMS ATMOSPHERIC MODELING */}
      {activeSection === 'cams' && (
        <div className="space-y-6">
          <Card variant="default">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Copernicus Atmosphere Monitoring Service (CAMS) Forecasts
                </CardTitle>
                <ProvenanceBadge provenance="FORECAST" detail="0.1° (~11 km) Resolution" />
              </div>
              <CardDescription>
                European Centre for Medium-Range Weather Forecasts (ECMWF) atmospheric chemistry numerical models.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                While physical CAAQMS stations provide localized ground-truth measurements, forward-looking activity planning requires high-resolution atmospheric forecasting. The platform ingests <strong>Open-Meteo Air Quality APIs</strong> backed by the Copernicus CAMS European regional and global models.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-ivory-100/80 rounded-2xl border border-ivory-300 space-y-2">
                  <div className="font-bold text-forest-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-forest-700" />
                    Boundary Layer Inversion Physics
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Captures winter nighttime and early morning thermal inversions where cool, stagnant air traps crop-burning smoke and vehicular emissions near the surface, causing peak particulate concentrations between 06:00 and 09:00 IST.
                  </p>
                </div>

                <div className="p-4 bg-ivory-100/80 rounded-2xl border border-ivory-300 space-y-2">
                  <div className="font-bold text-forest-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-forest-700" />
                    Afternoon Convective Dispersion
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Captures solar surface heating raising the planetary boundary layer height (often up to 1,500m by 14:00 IST), diluting surface smoke and creating comparatively favorable windows for outdoor activity.
                  </p>
                </div>
              </div>

              <AlertBanner type="info" title="Forecast Distinction">
                Hourly numerical forecasts represent <strong>instantaneous model projections</strong>. They are always explicitly labeled with the blue <ProvenanceBadge provenance="FORECAST" /> badge and are never conflated with statutory 24-hour certified rolling station averages.
              </AlertBanner>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 3: ENVIRONMENTAL IMPACT LEDGER */}
      {activeSection === 'impact' && (
        <div className="space-y-6">
          <Card variant="default">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Parali Environmental Impact Accounting &amp; LCA Standards
                </CardTitle>
                <Badge variant="warning" size="sm">Verification Precondition</Badge>
              </div>
              <CardDescription>
                Auditable avoided emissions methodology for paddy stubble diversion across Northwest India.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 text-sm text-gray-700">
              <p className="leading-relaxed">
                Paddy residue burning across Punjab and Haryana releases severe quantities of Carbon Dioxide Equivalent (CO₂e) and fine particulate matter (PM2.5). When parali is diverted to industrial bio-CNG, 2G ethanol, bio-pellets, or biodegradable tableware (such as technologies developed at IIT Delhi Kriya Labs), emissions are mitigated.
              </p>

              <div className="space-y-3">
                <h4 className="font-bold text-forest-950 text-base">Standard Academic Baseline Emissions Factors</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
                    <span className="text-xs text-gray-500 font-bold block">Carbon Dioxide Equivalent</span>
                    <span className="text-2xl font-black text-forest-950">1.46 t CO₂e / ton</span>
                    <p className="text-xs text-gray-600 mt-1">
                      Avoided open-field combustion greenhouse gas emissions per ton of parali collected.
                    </p>
                  </div>

                  <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300">
                    <span className="text-xs text-gray-500 font-bold block">Fine Particulate Matter</span>
                    <span className="text-2xl font-black text-forest-950">3.00 kg PM2.5 / ton</span>
                    <p className="text-xs text-gray-600 mt-1">
                      Avoided hazardous primary aerosol emissions per ton of parali collected.
                    </p>
                  </div>
                </div>
              </div>

              <AlertBanner type="warning" title="Life Cycle Assessment (LCA) Certification Policy">
                <strong>Why uncertified impact claims are withheld:</strong>
                <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                  The platform adheres strictly to anti-greenwashing accounting standards. Literature coefficients are <strong>not</strong> displayed as certified impact until a consignment completes all five lifecycle stages and is accompanied by an <strong>official weighbridge delivery receipt</strong> and certified off-taker processing batch. Unverified marketplace listings display status: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">PENDING_BATCH_LCA_CERTIFICATION</code>.
                </p>
              </AlertBanner>

              {/* Hauling Freight Model */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-forest-950 text-base">Regional 16-Ton Truck Freight Model</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Hauling economics are calculated based on standard Northwest Indian agricultural logistics rates:
                </p>
                <div className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 font-mono text-xs text-forest-950 font-bold text-center">
                  Estimated Freight = ₹250.00 / ton (base loading/unloading) + [ ₹4.50 / ton-km × Hauling Distance (km) ]
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 4: SCHOOL POLICY GOVERNANCE */}
      {activeSection === 'school' && (
        <div className="space-y-6">
          <Card variant="default">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  School Air Safety Governance &amp; Administrative Hierarchy
                </CardTitle>
                <Badge variant="sage" size="sm">Institutional Policy</Badge>
              </div>
              <CardDescription>
                Distinction between statutory CAQM directives and institutional precautionary safety rules.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 text-sm text-gray-700">
              <p className="leading-relaxed">
                Protecting growing children from irreversible particulate lung damage requires transparent governance rules that separate institutional discretion from statutory law.
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-sage-50 border border-sage-300 rounded-2xl space-y-2">
                  <div className="font-bold text-forest-950 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-forest-700" />
                    Statutory Orders (CAQM GRAP Stage III &amp; IV)
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Under severe pollution episodes, the Commission for Air Quality Management (CAQM) issues binding closure or hybrid online learning mandates across Delhi-NCR. These are statutory government directives and take legal precedence over all school-level planning.
                  </p>
                </div>

                <div className="p-4 bg-ivory-100 border border-ivory-300 rounded-2xl space-y-2">
                  <div className="font-bold text-forest-950 flex items-center gap-2">
                    <School className="w-5 h-5 text-forest-700" />
                    Discretionary Institutional Policies
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Thresholds set within this platform (e.g. max outdoor AQI 120 for Primary students) represent <strong>precautionary institutional risk policies</strong> established by the school management and parent safety committees. They are not statutory national standards, but proactive risk-reduction thresholds.
                  </p>
                </div>
              </div>

              <AlertBanner type="error" title="Precautionary Uncertainty Rule">
                If campus station telemetry is offline, disconnected, or missing criteria pollutants, automated clearance for outdoor activities is <strong>strictly suspended</strong>. The system flags <strong>MANUAL ADMINISTRATIVE REVIEW REQUIRED</strong>, ensuring children are not exposed due to silent sensor failures.
              </AlertBanner>

              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-forest-950 text-base">Comparative Windows vs. Absolute Safety</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Our system evaluates candidate outdoor time slots (e.g. moving athletic practice from 08:30 to 14:30). A recommended window has <strong>comparatively lower particulate exposure</strong>, but the platform never claims or implies that air at AQI 150 is medically safe.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
