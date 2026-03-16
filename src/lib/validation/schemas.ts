import { z } from 'zod/v4';
import { MIN_DISTANCE_METERS, MAX_DISTANCE_METERS } from '@/utils/constants';

export const coordinateSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

/**
 * Preference weight schema — integers 0–10, all optional (defaults to 5).
 * Weights are normalized to sum 1.0 in calculateOverall(); users see whole numbers.
 */
const preferencesSchema = z
  .object({
    flatnessWeight: z.number().int().min(0).max(10).default(5),
    healthWeight: z.number().int().min(0).max(10).default(5),
    safetyWeight: z.number().int().min(0).max(10).default(5),
    sidewalkWeight: z.number().int().min(0).max(10).default(5),
    scenicWeight: z.number().int().min(0).max(10).default(0), // reserved, Phase 4
  })
  .default({
    flatnessWeight: 5,
    healthWeight: 5,
    safetyWeight: 5,
    sidewalkWeight: 5,
    scenicWeight: 0,
  });

export const generateRouteSchema = z.object({
  start: coordinateSchema,
  targetDistance: z.number().min(MIN_DISTANCE_METERS).max(MAX_DISTANCE_METERS),
  alternatives: z.number().min(1).max(5).default(3),
  preferences: preferencesSchema,
});

export type GenerateRouteInput = z.infer<typeof generateRouteSchema>;
