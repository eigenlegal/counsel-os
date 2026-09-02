/** The benchmark registry: every loader the import command knows. */
import { biglawBench } from './biglaw-bench';
import { contractNli } from './contract-nli';
import { cuad } from './cuad';
import { legalbench } from './legalbench';
import { maud } from './maud';
import type { BenchmarkId, BenchmarkLoader } from './types';

export const BENCHMARKS: readonly BenchmarkLoader[] = [legalbench, cuad, maud, contractNli, biglawBench];

export function benchmarkById(id: string): BenchmarkLoader | undefined {
  return BENCHMARKS.find(b => b.id === id);
}

export function isBenchmarkId(id: string): id is BenchmarkId {
  return benchmarkById(id) !== undefined;
}

export { NotRedistributableError } from './types';
export type { BenchmarkFile, BenchmarkFixtures, BenchmarkId, BenchmarkLoader, FetchOptions, ToFixturesOptions } from './types';
