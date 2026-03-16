import { z } from 'zod/v4';
import { MIN_DISTANCE_METERS, MAX_DISTANCE_METERS } from '@/utils/constants';

export const coordinateSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export const generateRouteSchema = z.object({
  start: coordinateSchema,
  targetDistance: z.number().min(MIN_DISTANCE_METERS).max(MAX_DISTANCE_METERS),
  alternatives: z.number().min(1).max(5).default(3),
});

export type GenerateRouteInput = z.infer<typeof generateRouteSchema>;
