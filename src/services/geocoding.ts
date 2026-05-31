/**
 * services/geocoding.ts
 * Nominatim geocoding (OpenStreetMap) for non-Google stack.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const NOMINATIM_UA = 'InvisibleMap/1.0 (contact: admin@invisible-map.local)';

export interface AddressComponents {
  streetNumber?: string;
  route?: string;
  sublocality?: string;
  locality?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  formattedAddress: string;
}

export interface GeocodingResult {
  coords: { lat: number; lng: number };
  address: AddressComponents;
  placeId: string;
}

type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type NominatimSearchResult = {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
};

function headers(): HeadersInit {
  return {
    'User-Agent': NOMINATIM_UA,
    'Accept-Language': 'id,en',
  };
}

function mapAddress(result: NominatimSearchResult): AddressComponents {
  const address = result.address ?? {};
  return {
    streetNumber: address.house_number,
    route: address.road,
    sublocality: address.neighbourhood ?? address.suburb,
    locality: address.city ?? address.town ?? address.county,
    province: address.state,
    postalCode: address.postcode,
    country: address.country,
    formattedAddress: result.display_name ?? '',
  };
}

function toCoords(result: NominatimSearchResult): { lat: number; lng: number } | null {
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Reverse geocode: coordinates to address components.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  _apiKey?: string,
): Promise<AddressComponents | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');

  try {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return null;
    const json = (await res.json()) as NominatimSearchResult;
    if (!json.display_name) return null;
    return mapAddress(json);
  } catch {
    return null;
  }
}

/**
 * Forward geocode: address string to coordinates + placeId.
 */
export async function forwardGeocode(
  address: string,
  _apiKey?: string,
): Promise<GeocodingResult | null> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'id');
  url.searchParams.set('limit', '1');

  try {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return null;

    const rows = (await res.json()) as NominatimSearchResult[];
    const first = rows[0];
    if (!first) return null;

    const coords = toCoords(first);
    if (!coords) return null;

    return {
      coords,
      address: mapAddress(first),
      placeId: String(first.place_id ?? ''),
    };
  } catch {
    return null;
  }
}

/**
 * Refine approximate coordinates by reverse + forward geocoding.
 */
export async function refineCoords(
  lat: number,
  lng: number,
  apiKey?: string,
): Promise<{ lat: number; lng: number }> {
  const result = await reverseGeocode(lat, lng, apiKey);
  if (!result?.formattedAddress) return { lat, lng };

  const refined = await forwardGeocode(result.formattedAddress, apiKey);
  return refined?.coords ?? { lat, lng };
}
