/**
 * BigLaw Bench (Harvey, 2024): the one benchmark written for the work a
 * firm bills — but published without a license. The repository has no
 * LICENSE file and its README says the full dataset is available by
 * contacting Harvey. With no grant to copy, the loader imports nothing:
 * it explains why and points at the repository. When a license appears,
 * `blb-core/core-samples.csv` (task, rubric) is the file to read.
 */
import { NotRedistributableError, type BenchmarkFile, type BenchmarkFixtures, type BenchmarkLoader } from './types';

export const biglawBench: BenchmarkLoader = {
  id: 'biglaw-bench',
  name: 'BigLaw Bench',
  url: 'https://github.com/harveyai/biglaw-bench',
  license: null,
  attribution: 'Harvey, "BigLaw Bench" (2024).',
  redistributable: false,
  reason: 'the repository publishes no license (no LICENSE file; the README says to contact Harvey for the full dataset), so nothing grants a local copy',
  tasks: [],

  async fetch(): Promise<BenchmarkFile[]> {
    throw new NotRedistributableError(this);
  },

  toFixtures(): BenchmarkFixtures {
    throw new NotRedistributableError(this);
  },
};
