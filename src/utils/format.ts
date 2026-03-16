/**
 * Imperial unit formatters.
 *
 * All distances are stored and computed in meters internally (ORS uses meters).
 * These functions convert to miles/feet for display only.
 * User is Boston-based; imperial is the default throughout the UI.
 */

const METERS_PER_MILE = 1609.344;
const METERS_PER_FOOT = 0.3048;

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

export function metersToFeet(meters: number): number {
  return meters / METERS_PER_FOOT;
}

/** Formats a distance for display: "3.1 mi" or "200 ft" for very short distances */
export function formatDistance(meters: number): string {
  const miles = metersToMiles(meters);
  if (miles < 0.1) {
    return `${Math.round(metersToFeet(meters))} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

/** Formats a duration for display: "45 min" or "2h 15m" */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/** Formats an elevation value for display: "1,050 ft" */
export function formatElevation(meters: number): string {
  return `${Math.round(metersToFeet(meters))} ft`;
}
