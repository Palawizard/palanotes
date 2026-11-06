import type { Db } from '../src/client';
import { createTestDb as create, createTestUser } from '../src/testing';

export const TEST_DB = 'palanotes_test_db';

export function createTestDb(): Db {
  return create(TEST_DB);
}

export { createTestUser };
