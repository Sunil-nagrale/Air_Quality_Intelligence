import { userRepository } from '../repositories/userRepository';
import { schoolRepository } from '../repositories/schoolRepository';
import { marketplaceRepository } from '../repositories/marketplaceRepository';
import { airRepository } from '../repositories/airRepository';
import {
  UserProfile,
  HealthPreferences,
  ActivityPlan,
  AlertPreference,
  SchoolProfile,
  SchoolPolicy,
  SchoolActivity,
  ResidueListing,
  BuyerProfile,
  Offer,
  CollectionRecord,
} from '../types';

export class DemoSeedingService {
  /**
   * Idempotently seeds the 3 required demonstration personas into domain repositories.
   * If a record already exists, it is preserved unless forceOverwrite is explicitly specified.
   */
  async seedDemoData(forceOverwrite = false): Promise<{
    seededCounts: { users: number; policies: number; activities: number; listings: number; offers: number; collections: number };
  }> {
    let usersCount = 0;
    let policiesCount = 0;
    let activitiesCount = 0;
    let listingsCount = 0;
    let offersCount = 0;
    let collectionsCount = 0;

    // =========================================================================
    // 1. PERSONAL DEMO IDENTITY: parasnath@gmail.com (PERSONAL_USER)
    // =========================================================================
    const personalUserId = 'USER_DEMO_PARAS';
    const existingPersonal = await userRepository.getUserProfile(personalUserId);
    if (!existingPersonal || forceOverwrite) {
      const personalProfile: UserProfile = {
        userId: personalUserId,
        email: 'parasnath@gmail.com',
        name: 'Paras Nath',
        role: 'PERSONAL_USER',
        district: 'New Delhi',
        state: 'Delhi-NCR',
        isEmailVerified: true,
        isDemoUser: true,
        createdAt: '2026-10-10T08:00:00Z',
        updatedAt: '2026-10-10T08:00:00Z',
      };
      await userRepository.saveUserProfile(personalProfile);
      usersCount++;

      const healthPrefs: HealthPreferences = {
        userId: personalUserId,
        hasAsthma: true,
        hasCardiovascularCondition: false,
        isElderly: false,
        isChild: false,
        pregnancy: false,
        nonClinicalSensitivityWeight: 1.25,
        isOptionalConsentGiven: true,
        updatedAt: '2026-10-10T08:00:00Z',
      };
      await userRepository.saveHealthPreferences(healthPrefs);

      const alertPrefs: AlertPreference = {
        userId: personalUserId,
        emailAlertsEnabled: true,
        aqiThresholdAlert: 200,
        preferredNotificationChannel: 'EMAIL',
        caregiverConsentVerified: true,
        updatedAt: '2026-10-10T08:00:00Z',
      };
      await userRepository.saveAlertPreferences(alertPrefs);

      const activityPlan: ActivityPlan = {
        planId: 'PLAN_DEMO_01',
        userId: personalUserId,
        activityType: 'running',
        durationMinutes: 45,
        intensity: 'moderate',
        targetDate: '2026-10-15',
        locationName: 'Connaught Place, New Delhi',
        coordinates: { lat: 28.6289, lon: 77.2065 },
        rankedWindows: [
          {
            windowId: 'win_afternoon',
            startTime: '16:30',
            endTime: '17:15',
            predictedAQI: 132,
            predictedCategory: 'Moderate',
            dominantPollutant: 'PM10',
            rank: 1,
            suitabilityScore: 86,
            explanation: 'Optimal diurnal wind dispersion before evening temperature drops.',
            isInhalingRiskElevated: false,
            provenance: 'FORECAST',
          },
          {
            windowId: 'win_morning',
            startTime: '06:00',
            endTime: '06:45',
            predictedAQI: 222,
            predictedCategory: 'Poor',
            dominantPollutant: 'PM2.5',
            rank: 2,
            suitabilityScore: 42,
            explanation: 'Morning thermal inversion traps ground-level particulates.',
            isInhalingRiskElevated: true,
            provenance: 'FORECAST',
          },
        ],
        selectedWindow: {
          windowId: 'win_afternoon',
          startTime: '16:30',
          endTime: '17:15',
          predictedAQI: 132,
          predictedCategory: 'Moderate',
          dominantPollutant: 'PM10',
          rank: 1,
          suitabilityScore: 86,
          explanation: 'Optimal diurnal wind dispersion before evening temperature drops.',
          isInhalingRiskElevated: false,
          provenance: 'FORECAST',
        },
        status: 'ACTIVE',
        reminderEnabled: true,
        createdAt: '2026-10-10T08:30:00Z',
        updatedAt: '2026-10-10T08:30:00Z',
      };
      await userRepository.saveActivityPlan(activityPlan);
    }

    // =========================================================================
    // 2. SCHOOL DEMO IDENTITY: kvkailashahar@gmail.com (SCHOOL_ADMIN)
    // =========================================================================
    const schoolAdminId = 'USER_DEMO_KV_ADMIN';
    const schoolId = 'KV_KAILASHAHAR';
    const existingSchoolAdmin = await userRepository.getUserProfile(schoolAdminId);
    if (!existingSchoolAdmin || forceOverwrite) {
      const schoolAdminProfile: UserProfile = {
        userId: schoolAdminId,
        email: 'kvkailashahar@gmail.com',
        name: 'Principal Sharma',
        role: 'SCHOOL_ADMIN',
        institutionOrOrgName: 'Kendriya Vidyalaya Kailashahar',
        district: 'Delhi',
        state: 'Delhi-NCR',
        isEmailVerified: true,
        isDemoUser: true,
        createdAt: '2026-10-10T08:00:00Z',
        updatedAt: '2026-10-10T08:00:00Z',
      };
      await userRepository.saveUserProfile(schoolAdminProfile);
      usersCount++;

      const schoolProfile: SchoolProfile = {
        schoolId,
        institutionName: 'Kendriya Vidyalaya Kailashahar',
        district: 'Central Delhi',
        state: 'Delhi-NCR',
        coordinates: { lat: 28.6300, lon: 77.2100 },
        administratorEmail: 'kvkailashahar@gmail.com',
        administratorName: 'Principal Sharma',
        tenantId: 'TENANT_KV_4402',
        notificationPreferences: {
          parentBroadcastEnabled: true,
          staffAlertsEnabled: true,
          aqiAlertThreshold: 180,
          preferredChannel: 'EMAIL',
        },
        createdAt: '2026-10-10T08:00:00Z',
      };
      await schoolRepository.saveSchoolProfile(schoolProfile);

      await schoolRepository.saveCampus(
        {
          campusId: 'CAMP_KV_01',
          schoolId,
          campusName: 'Main Campus - Kailashahar',
          isMainCampus: true,
          district: 'Central Delhi',
          state: 'Delhi-NCR',
          coordinates: { lat: 28.6300, lon: 77.2100 },
          nearestStationId: 'DEL_01',
          totalStudents: 1250,
          contactPhone: '+91 11-2334-XXXX',
          createdAt: '2026-10-10T08:00:00Z',
          updatedAt: '2026-10-10T08:00:00Z',
        },
        schoolAdminId
      );

      await schoolRepository.saveCampus(
        {
          campusId: 'CAMP_KV_02',
          schoolId,
          campusName: 'Junior Wing & Sports Complex',
          isMainCampus: false,
          district: 'Central Delhi',
          state: 'Delhi-NCR',
          coordinates: { lat: 28.6350, lon: 77.2150 },
          nearestStationId: 'DEL_01',
          totalStudents: 480,
          contactPhone: '+91 11-2334-YYYY',
          createdAt: '2026-10-10T08:00:00Z',
          updatedAt: '2026-10-10T08:00:00Z',
        },
        schoolAdminId
      );

      const policyPrimary: SchoolPolicy = {
        policyId: 'POL_KV_PRIMARY',
        schoolId,
        ageGroup: 'primary',
        maxOutdoorAQI: 120,
        mandatoryIndoorAQI: 160,
        policySource: 'INSTITUTIONAL_DISCRETIONARY_COMMITTEE',
        governanceDisclaimer:
          'Activity thresholds are discretionary school policies established by the institutional safety committee, NOT statutory national regulatory standards.',
        modifiedAt: '2026-10-10T08:00:00Z',
        modifiedBy: schoolAdminId,
      };
      const policyMiddle: SchoolPolicy = {
        policyId: 'POL_KV_MIDDLE',
        schoolId,
        ageGroup: 'middle',
        maxOutdoorAQI: 160,
        mandatoryIndoorAQI: 200,
        policySource: 'INSTITUTIONAL_DISCRETIONARY_COMMITTEE',
        governanceDisclaimer:
          'Activity thresholds are discretionary school policies established by the institutional safety committee, NOT statutory national regulatory standards.',
        modifiedAt: '2026-10-10T08:00:00Z',
        modifiedBy: schoolAdminId,
      };
      const policySenior: SchoolPolicy = {
        policyId: 'POL_KV_SENIOR',
        schoolId,
        ageGroup: 'senior',
        maxOutdoorAQI: 200,
        mandatoryIndoorAQI: 250,
        policySource: 'INSTITUTIONAL_DISCRETIONARY_COMMITTEE',
        governanceDisclaimer:
          'Activity thresholds are discretionary school policies established by the institutional safety committee, NOT statutory national regulatory standards.',
        modifiedAt: '2026-10-10T08:00:00Z',
        modifiedBy: schoolAdminId,
      };

      await schoolRepository.saveSchoolPolicy(policyPrimary, schoolAdminId);
      await schoolRepository.saveSchoolPolicy(policyMiddle, schoolAdminId);
      await schoolRepository.saveSchoolPolicy(policySenior, schoolAdminId);
      policiesCount += 3;

      const schoolActivity: SchoolActivity = {
        activityId: 'ACT_KV_DEMO_01',
        schoolId,
        activityName: 'Junior Sports Day & 400m Heats',
        ageGroup: 'primary',
        scheduledDate: '2026-10-15',
        startTime: '08:30',
        endTime: '10:00',
        predictedAQI: 218,
        category: 'Poor',
        evaluationStatus: 'MANDATORY_INDOOR_REQUIRED',
        indoorAlternativeVenue: 'Multipurpose Indoor Badminton & Sports Hall',
        suggestedAlternativeWindow: '14:30 – 16:00 (estimated AQI ~148)',
        requiresAdminSignOff: true,
        adminSignOff: {
          isSignedOff: true,
          signedOffBy: 'Principal Sharma',
          decisionNotes: 'Relocate 400m race to indoor hall; outdoor sprint finals postponed to 14:30.',
          signedOffAt: '2026-10-10T09:00:00Z',
        },
        createdAt: '2026-10-10T08:30:00Z',
      };
      await schoolRepository.saveSchoolActivity(schoolActivity, schoolAdminId);
      activitiesCount++;

      const schoolActivity2: SchoolActivity = {
        activityId: 'ACT_KV_DEMO_02',
        schoolId,
        campusId: 'CAMP_KV_01',
        campusName: 'Main Campus - Kailashahar',
        activityName: 'Middle School Morning Football Practice',
        activityType: 'sports_day',
        ageGroup: 'middle',
        scheduledDate: '2026-10-16',
        startTime: '07:00',
        endTime: '08:15',
        predictedAQI: 142,
        category: 'Moderate',
        evaluationStatus: 'PRECAUTIONARY_OUTDOOR_PERMITTED',
        systemRecommendation: {
          status: 'PRECAUTIONARY_OUTDOOR_PERMITTED',
          reason: 'Predicted AQI (142) is within the middle school outdoor limit (160). Precautionary hydration recommended.',
          indoorAlternativeSuggested: false,
        },
        indoorAlternativeVenue: 'Indoor Gymnasium',
        requiresAdminSignOff: false,
        createdAt: '2026-10-10T08:35:00Z',
      };
      await schoolRepository.saveSchoolActivity(schoolActivity2, schoolAdminId);
      activitiesCount++;

      const schoolActivity3: SchoolActivity = {
        activityId: 'ACT_KV_DEMO_03',
        schoolId,
        campusId: 'CAMP_KV_02',
        campusName: 'Junior Wing & Sports Complex',
        activityName: 'Senior Cross-Country Relay',
        activityType: 'sports_day',
        ageGroup: 'senior',
        scheduledDate: '2026-10-17',
        startTime: '10:00',
        endTime: '11:30',
        predictedAQI: 265,
        category: 'Poor',
        evaluationStatus: 'MANDATORY_INDOOR_REQUIRED',
        systemRecommendation: {
          status: 'MANDATORY_INDOOR_REQUIRED',
          reason: 'Predicted AQI (265) exceeds senior outdoor limit (200). Mandatory indoor migration or postponement required.',
          indoorAlternativeSuggested: true,
          suggestedAlternativeWindow: '15:00 – 16:30 (estimated AQI ~165)',
        },
        indoorAlternativeVenue: 'Auditorium Complex',
        suggestedAlternativeWindow: '15:00 – 16:30 (estimated AQI ~165)',
        requiresAdminSignOff: true,
        createdAt: '2026-10-10T08:40:00Z',
      };
      await schoolRepository.saveSchoolActivity(schoolActivity3, schoolAdminId);
      activitiesCount++;
    }

    // =========================================================================
    // 3. FARMER DEMO IDENTITY: sunilnagrale@gmail.com (FARMER)
    // =========================================================================
    const farmerId = 'FARMER_SUNIL';
    const existingFarmer = await userRepository.getUserProfile(farmerId);
    if (!existingFarmer || forceOverwrite) {
      const farmerProfile: UserProfile = {
        userId: farmerId,
        email: 'sunilnagrale@gmail.com',
        name: 'Sardar Sunil Singh',
        role: 'FARMER',
        phoneNumberMasked: '+91 98765-XXXXX',
        district: 'Sangrur',
        state: 'Punjab',
        isEmailVerified: true,
        isDemoUser: true,
        createdAt: '2026-10-10T08:00:00Z',
        updatedAt: '2026-10-10T08:00:00Z',
      };
      await userRepository.saveUserProfile(farmerProfile);
      usersCount++;

      // Seed 5 Distinct Industrial Buyer Profiles
      const buyerPellets: BuyerProfile = {
        buyerId: 'BUYER_PUNJAB_PELLETS',
        buyerName: 'Malwa Bio-Pellet Fuels Pvt Ltd',
        organizationType: 'Biomass Pellet Manufacturer',
        district: 'Ludhiana',
        state: 'Punjab',
        coordinates: { lat: 30.9010, lon: 75.8573 },
        acceptedCrops: ['Paddy Straw (Non-Basmati)', 'Basmati Straw', 'Wheat Straw'],
        maxAcceptableMoisturePercent: 16.0,
        monthlyCapacityTons: 4500,
        maxHaulingRadiusKm: 75,
        offeredBasePricePerTonInr: 2150,
        isDemoData: true,
        createdAt: '2026-10-10T08:00:00Z',
      };
      const buyerBioCng: BuyerProfile = {
        buyerId: 'BUYER_PUNJAB_BIOCNG',
        buyerName: 'Verbio India Compressed Bio-CNG Refining Unit',
        organizationType: 'Bio-CNG / CBG Plant',
        district: 'Sangrur',
        state: 'Punjab',
        coordinates: { lat: 30.0820, lon: 75.8900 },
        acceptedCrops: ['Paddy Straw (Non-Basmati)', 'Basmati Straw'],
        maxAcceptableMoisturePercent: 18.0,
        monthlyCapacityTons: 8000,
        maxHaulingRadiusKm: 65,
        offeredBasePricePerTonInr: 2200,
        isDemoData: true,
        createdAt: '2026-10-10T08:00:00Z',
      };
      const buyerEthanol: BuyerProfile = {
        buyerId: 'BUYER_HARYANA_ETHANOL',
        buyerName: 'Indian Oil Panipat 2G Bio-Ethanol Refinery Complex',
        organizationType: '2G Bio-Ethanol Refinery',
        district: 'Panipat',
        state: 'Haryana',
        coordinates: { lat: 29.3909, lon: 76.9635 },
        acceptedCrops: ['Paddy Straw (Non-Basmati)', 'Basmati Straw'],
        maxAcceptableMoisturePercent: 15.0,
        monthlyCapacityTons: 12000,
        maxHaulingRadiusKm: 120,
        offeredBasePricePerTonInr: 2300,
        isDemoData: true,
        createdAt: '2026-10-10T08:00:00Z',
      };
      const buyerKriyaRef: BuyerProfile = {
        buyerId: 'BUYER_KRIYA_LABS_REF',
        buyerName: 'Agri-Pulp & Tableware (Academic Reference: Kriya Labs IIT Delhi)',
        organizationType: 'Pulp & Tableware Manufacturer (Ref: Kriya Labs IIT Delhi)',
        district: 'Patiala',
        state: 'Punjab',
        coordinates: { lat: 30.3400, lon: 76.3800 },
        acceptedCrops: ['Paddy Straw (Non-Basmati)'],
        maxAcceptableMoisturePercent: 14.0,
        monthlyCapacityTons: 800,
        maxHaulingRadiusKm: 90,
        offeredBasePricePerTonInr: 2450,
        isAcademicReference: true,
        isDemoData: true,
        createdAt: '2026-10-10T08:00:00Z',
      };
      const buyerAggregator: BuyerProfile = {
        buyerId: 'BUYER_HARYANA_AGGREGATOR',
        buyerName: 'Karnal Agro-Biomass Aggregation & Briquetting Hub',
        organizationType: 'Biomass Pellet Manufacturer',
        district: 'Karnal',
        state: 'Haryana',
        coordinates: { lat: 29.6857, lon: 76.9907 },
        acceptedCrops: ['Paddy Straw (Non-Basmati)', 'Basmati Straw', 'Mustard Stalk'],
        maxAcceptableMoisturePercent: 20.0,
        monthlyCapacityTons: 3500,
        maxHaulingRadiusKm: 50,
        offeredBasePricePerTonInr: 1950,
        isDemoData: true,
        createdAt: '2026-10-10T08:00:00Z',
      };

      await marketplaceRepository.saveBuyerProfile(buyerPellets);
      await marketplaceRepository.saveBuyerProfile(buyerBioCng);
      await marketplaceRepository.saveBuyerProfile(buyerEthanol);
      await marketplaceRepository.saveBuyerProfile(buyerKriyaRef);
      await marketplaceRepository.saveBuyerProfile(buyerAggregator);

      // Seed Residue Listings for Sunil
      const listing1: ResidueListing = {
        listingId: 'LIST_SANGRUR_01',
        farmerId,
        farmerName: 'Sardar Sunil Singh (Demo Account)',
        farmerPhoneMasked: '+91 98765-XXXXX',
        cropType: 'Paddy Straw (Non-Basmati)',
        district: 'Sangrur',
        state: 'Punjab',
        locationName: 'Dhuri Village, Sangrur',
        coordinates: { lat: 30.2440, lon: 75.8450 },
        quantityTons: 350,
        moisturePercent: 14.2,
        askingPricePerTonInr: 1850,
        balingType: 'Ex-Field Baled (Round/Square)',
        availableFromDate: '2026-10-15',
        availableUntilDate: '2026-11-05',
        status: 'ACCEPTED',
        isDemoData: true,
        createdAt: '2026-10-10T08:00:00Z',
        updatedAt: '2026-10-10T08:00:00Z',
      };
      const listing2: ResidueListing = {
        listingId: 'LIST_SANGRUR_02',
        farmerId,
        farmerName: 'Sardar Sunil Singh (Demo Account)',
        farmerPhoneMasked: '+91 98765-XXXXX',
        cropType: 'Basmati Straw',
        district: 'Sangrur',
        state: 'Punjab',
        locationName: 'Sunam Road, Sangrur',
        coordinates: { lat: 30.1250, lon: 75.8100 },
        quantityTons: 200,
        moisturePercent: 12.5,
        askingPricePerTonInr: 2100,
        balingType: 'Ex-Field Baled (Round/Square)',
        availableFromDate: '2026-10-18',
        availableUntilDate: '2026-11-10',
        status: 'LISTED',
        isDemoData: true,
        createdAt: '2026-10-10T08:15:00Z',
        updatedAt: '2026-10-10T08:15:00Z',
      };

      const existingListing1 = await marketplaceRepository.getListing(listing1.listingId);
      if (!existingListing1 || forceOverwrite) {
        await marketplaceRepository.saveListing(listing1, farmerId);
        listingsCount++;
      }

      const existingListing2 = await marketplaceRepository.getListing(listing2.listingId);
      if (!existingListing2 || forceOverwrite) {
        await marketplaceRepository.saveListing(listing2, farmerId);
        listingsCount++;
      }

      // Seed Offer for listing1 (Accepted)
      const existingOffer1 = await marketplaceRepository.getOffer('OFFER_SANGRUR_01');
      if (!existingOffer1 || forceOverwrite) {
        if (existingOffer1) {
          (marketplaceRepository as any).offers?.delete('OFFER_SANGRUR_01');
        }
        const offer1: Offer = {
          offerId: 'OFFER_SANGRUR_01',
          listingId: 'LIST_SANGRUR_01',
          buyerId: 'BUYER_PUNJAB_BIOCNG',
          farmerId,
          offeredPricePerTonInr: 1950,
          quantityTons: 350,
          status: 'ACCEPTED',
          buyerNotes: 'Commercial Bio-CNG off-take. Ex-field collection with 16T multi-axle trailers.',
          lastUpdatedTimestamp: '2026-10-10T09:00:00Z',
          isDemoData: true,
        };
        await marketplaceRepository.createOffer(offer1, 'BUYER_PUNJAB_BIOCNG');
        offersCount++;
      }

      // Seed Collection Record for offer1 (Verified milestone)
      const existingColl1 = await marketplaceRepository.getCollectionRecord('COLL_SANGRUR_01');
      if (!existingColl1 || forceOverwrite) {
        if (existingColl1) {
          (marketplaceRepository as any).collections?.delete('COLL_SANGRUR_01');
        }
        const collection1: CollectionRecord = {
          collectionId: 'COLL_SANGRUR_01',
          offerId: 'OFFER_SANGRUR_01',
          listingId: 'LIST_SANGRUR_01',
          buyerId: 'BUYER_PUNJAB_BIOCNG',
          farmerId,
          stage: 'VERIFIED',
          scheduledPickupDate: '2026-10-16',
          transporterName: 'Malwa Agri Logistics',
          vehicleRegistrationNumber: 'PB-13-AB-4455',
          fieldWeighbridgeGrossTons: 360,
          factoryWeighbridgeGrossTons: 358,
          verifiedNetTons: 348,
          certifiedMoisturePercent: 14.0,
          deliveryWeighbridgeSlipUrl: '/slips/weighbridge_sangrur_01.pdf',
          updatedAt: '2026-10-10T10:00:00Z',
          isDemoData: true,
        };
        await marketplaceRepository.createCollectionRecord(collection1, 'BUYER_PUNJAB_BIOCNG', 'BUYER');
        collectionsCount++;
      }
    }

    return {
      seededCounts: {
        users: usersCount,
        policies: policiesCount,
        activities: activitiesCount,
        listings: listingsCount,
        offers: offersCount,
        collections: collectionsCount,
      },
    };
  }
}

export const demoSeedingService = new DemoSeedingService();
