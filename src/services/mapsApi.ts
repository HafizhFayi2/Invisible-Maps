import { NearbyPlace } from '../core/types/core';
import { getApiBaseUrl } from './config';

interface NearbySearchOptions {
  lat?: number;
  lng?: number;
  radius?: number;
}

export async function nearbySearch(
  keyword: string,
  options: NearbySearchOptions = {},
): Promise<NearbyPlace[]> {
  const base = getApiBaseUrl();
  const endpoint = new URL(`${base}/api/maps/nearby`);

  endpoint.searchParams.set('keyword', keyword);
  if (options.lat != null) endpoint.searchParams.set('lat', String(options.lat));
  if (options.lng != null) endpoint.searchParams.set('lng', String(options.lng));
  if (options.radius != null) endpoint.searchParams.set('radius', String(options.radius));

  try {
    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      throw new Error(`Maps API ${response.status}`);
    }

    const json = (await response.json()) as { data?: NearbyPlace[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}
