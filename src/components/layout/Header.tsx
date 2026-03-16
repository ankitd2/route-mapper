import Link from 'next/link';

export function Header() {
  return (
    <header className="flex h-14 items-center bg-slate-900 px-4">
      <Link href="/" className="flex items-center gap-2.5 text-lg font-bold text-white">
        {/* Route/path icon — two dots connected by a curved path */}
        <svg
          className="h-6 w-6 text-emerald-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="5" r="2" />
          <path d="M7 19h4a6 6 0 0 0 6-6V7" />
        </svg>
        <span>
          Route<span className="text-emerald-400">Mapper</span>
        </span>
      </Link>
      <nav className="ml-auto flex items-center gap-4">
        <Link
          href="/explore"
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          Explore
        </Link>
      </nav>
    </header>
  );
}
