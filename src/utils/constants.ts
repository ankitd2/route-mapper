/** ORS routing API base URL (server-side only — key attached per-request) */
export const ORS_API_URL = 'https://api.openrouteservice.org';

/** OpenFreeMap vector tile style — no API key required, free forever */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Default map center and zoom (Boston) — used when geolocation is unavailable */
export const DEFAULT_CENTER: [number, number] = [-71.0589, 42.3601];
export const DEFAULT_ZOOM = 13;

/** Route distance bounds enforced by Zod schema and slider UI (meters) */
export const MIN_DISTANCE_METERS = 500; // ~0.3 mi
export const MAX_DISTANCE_METERS = 50_000; // ~31 mi
export const DEFAULT_DISTANCE_METERS = 5_000; // ~3.1 mi

/** Colors assigned to routes in order (blue, green, amber, red, purple) */
export const ROUTE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] as const;
