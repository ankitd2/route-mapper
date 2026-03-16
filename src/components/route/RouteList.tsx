'use client';

import type { GeneratedRoute } from '@/types/route';
import { RouteCard } from './RouteCard';

interface RouteListProps {
  routes: GeneratedRoute[];
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
}

export function RouteList({ routes, selectedIndex, onSelectRoute }: RouteListProps) {
  if (routes.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">
        {routes.length} Route{routes.length !== 1 ? 's' : ''} Found
      </h3>
      {routes.map((route, index) => (
        <RouteCard
          key={route.id}
          route={route}
          index={index}
          isSelected={index === selectedIndex}
          onClick={() => onSelectRoute(index)}
        />
      ))}
    </div>
  );
}
