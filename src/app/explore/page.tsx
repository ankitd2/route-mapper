import { Header } from '@/components/layout/Header';
import { ExploreClient } from '@/components/explore/ExploreClient';

export default function ExplorePage() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <ExploreClient />
    </div>
  );
}
