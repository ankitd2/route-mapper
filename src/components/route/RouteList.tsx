'use client';

import type { ScoredRoute } from '@/types/route';
import { RouteCard } from './RouteCard';

interface RouteListProps {
  routes: ScoredRoute[];
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
}

export function RouteList({ routes, selectedIndex, onSelectRoute }: RouteListProps) {
  if (routes.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        {routes.length} Route{routes.length !== 1 ? 's' : ''} Generated
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
