export interface BackupApiCandidate<T> {
  name: string;
  request: () => Promise<T>;
}

export interface FailoverResult<T> {
  provider: string;
  data: T;
  attempts: number;
}

export async function executeWithFailover<T>(candidates: BackupApiCandidate<T>[]): Promise<FailoverResult<T>> {
  if (!candidates.length) {
    throw new Error('No API candidates configured');
  }

  const errors: string[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];

    try {
      const data = await candidate.request();
      return {
        provider: candidate.name,
        data,
        attempts: index + 1,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      errors.push(`${candidate.name}: ${message}`);
    }
  }

  throw new Error(`All providers failed. ${errors.join(' | ')}`);
}
