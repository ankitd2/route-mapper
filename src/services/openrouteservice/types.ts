// ORS types use string literals ('Feature', 'LineString') rather than the GeoJSON
// generic types — no geojson imports needed here.

export interface ORSDirectionsRequest {
  coordinates: [number, number][];
  elevation?: string;
  extra_info?: string[];
  options?: {
    round_trip?: {
      length: number;
      points: number;
      seed: number;
    };
  };
  instructions?: boolean;
  geometry_simplify?: boolean;
}

export interface ORSDirectionsResponse {
  type: 'FeatureCollection';
  features: ORSRouteFeature[];
  bbox: [number, number, number, number, number, number]; // includes elevation
}

export interface ORSRouteFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number, number][]; // [lng, lat, elevation]
  };
  properties: {
    segments: ORSSegment[];
    summary: {
      distance: number;
      duration: number;
    };
    way_points: number[];
    ascent: number;
    descent: number;
  };
}

export interface ORSSegment {
  distance: number;
  duration: number;
  steps: ORSStep[];
  ascent: number;
  descent: number;
}

export interface ORSStep {
  distance: number;
  duration: number;
  type: number;
  instruction: string;
  name: string;
  way_points: [number, number];
}
