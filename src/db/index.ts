import { DbRepository } from './queries';

export function getDb(d1: D1Database): DbRepository {
  return new DbRepository(d1);
}

export * from './queries';
