import Link from 'next/link';

export function Header() {
  return (
    <header className="flex h-14 items-center border-b border-gray-200 bg-white px-4">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
        <svg
          className="h-6 w-6 text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
        Route Mapper
      </Link>
      <nav className="ml-auto flex items-center gap-4">
        <Link
          href="/explore"
          className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          Explore
        </Link>
      </nav>
    </header>
  );
}
