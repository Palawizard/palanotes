import { prepareTestDatabase } from '../src/testing';
import { TEST_DB } from './db';

export default async function setup(): Promise<void> {
  await prepareTestDatabase(TEST_DB);
}
