import { prepareTestDatabase } from '@palanotes/db/testing';

export const TEST_DB = 'palanotes_test_worker';

export default async function setup(): Promise<void> {
  await prepareTestDatabase(TEST_DB);
}
