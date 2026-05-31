import { processScan } from '../engine/corePipeline';
import { ProcessScanInput, ProcessScanResult } from '../core/types/core';

export class ValidationQueue {
  private queue: ProcessScanInput[] = [];
  private processing = false;

  enqueue(job: ProcessScanInput): void {
    this.queue.push(job);
  }

  async processAll(): Promise<ProcessScanResult[]> {
    if (this.processing) return [];
    this.processing = true;

    const results: ProcessScanResult[] = [];

    while (this.queue.length > 0) {
      const nextJob = this.queue.shift();
      if (!nextJob) continue;
      const result = await processScan(nextJob);
      results.push(result);
    }

    this.processing = false;
    return results;
  }
}

export const validationQueue = new ValidationQueue();
