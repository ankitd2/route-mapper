export interface Coordinate {
  lng: number;
  lat: number;
}

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface ElevationPoint {
  lng: number;
  lat: number;
  elevation: number;
  distanceFromStart: number; // meters
}
