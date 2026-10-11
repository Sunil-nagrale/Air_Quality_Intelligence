/**
 * Repository Composition Root & Factory
 * 
 * Enforces production persistence correctness:
 * - When running in production AWS Lambda (AWS_EXECUTION_ENV is set) or when USE_DYNAMODB is explicitly true,
 *   the composition root instantiates and selects the production DynamoDB adapters:
 *   DynamoDbUserRepository, DynamoDbSchoolRepository, DynamoDbMarketplaceRepository,
 *   DynamoDbAirRepository, and DynamoDbAuditRepository.
 * - In local test environments (e.g. NODE_ENV === 'test') or local standalone development without AWS,
 *   in-memory repositories serve as deterministic test doubles with zero cloud cost.
 */

import { isDynamoDbConfigured } from './config';
import { IUserRepository, DynamoDbUserRepository } from './dynamoDbUserRepository';
import { UserRepository } from './userRepository';
import { ISchoolRepository, DynamoDbSchoolRepository } from './dynamoDbSchoolRepository';
import { SchoolRepository } from './schoolRepository';
import { IMarketplaceRepository, InMemoryMarketplaceRepository } from './marketplaceRepository';
import { DynamoDbMarketplaceRepository } from './dynamoDbMarketplaceRepository';
import { IAirRepository, DynamoDbAirRepository } from './dynamoDbAirRepository';
import { AirRepository } from './airRepository';
import { IAuditRepository, DynamoDbAuditRepository } from './dynamoDbAuditRepository';
import { AuditRepository } from './auditRepository';

export class RepositoryFactory {
  private userRepoInstance?: IUserRepository;
  private schoolRepoInstance?: ISchoolRepository;
  private marketplaceRepoInstance?: IMarketplaceRepository;
  private airRepoInstance?: IAirRepository;
  private auditRepoInstance?: IAuditRepository;

  getUserRepository(): IUserRepository {
    if (!this.userRepoInstance) {
      this.userRepoInstance = isDynamoDbConfigured()
        ? new DynamoDbUserRepository()
        : new UserRepository();
    }
    return this.userRepoInstance;
  }

  getSchoolRepository(): ISchoolRepository {
    if (!this.schoolRepoInstance) {
      this.schoolRepoInstance = isDynamoDbConfigured()
        ? new DynamoDbSchoolRepository()
        : new SchoolRepository();
    }
    return this.schoolRepoInstance;
  }

  getMarketplaceRepository(): IMarketplaceRepository {
    if (!this.marketplaceRepoInstance) {
      this.marketplaceRepoInstance = isDynamoDbConfigured()
        ? new DynamoDbMarketplaceRepository()
        : new InMemoryMarketplaceRepository();
    }
    return this.marketplaceRepoInstance;
  }

  getAirRepository(): IAirRepository {
    if (!this.airRepoInstance) {
      this.airRepoInstance = isDynamoDbConfigured()
        ? new DynamoDbAirRepository()
        : new AirRepository();
    }
    return this.airRepoInstance;
  }

  getAuditRepository(): IAuditRepository {
    if (!this.auditRepoInstance) {
      this.auditRepoInstance = isDynamoDbConfigured()
        ? new DynamoDbAuditRepository()
        : new AuditRepository();
    }
    return this.auditRepoInstance;
  }

  resetForTests(): void {
    this.userRepoInstance = undefined;
    this.schoolRepoInstance = undefined;
    this.marketplaceRepoInstance = undefined;
    this.airRepoInstance = undefined;
    this.auditRepoInstance = undefined;
  }
}

export const repositoryFactory = new RepositoryFactory();
export { isDynamoDbConfigured };
