export interface BackupApiCandidate {
  name: string;
  request: () => Promise<any>;
}

export interface FailoverResult<T> {
  provider: string;
  data: T;
  attempts: number;
}

export async function executeWithFailover<T>(candidates: BackupApiCandidate[]): Promise<FailoverResult<T>> {
  if (!candidates.length) {
    throw new Error('No API candidates configured');
  }

  const errors: string[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];

    try {
      const response = await candidate.request();
      return {
        provider: candidate.name,
        data: response as T,
        attempts: i + 1,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      errors.push(`${candidate.name}: ${message}`);
    }
  }

  throw new Error(`All providers failed. ${errors.join(' | ')}`);
}
