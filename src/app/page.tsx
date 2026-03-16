import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-blue-50 px-6">
      <div className="max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="10" r="3" />
              <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 6.9 8 11.7z" />
            </svg>
          </div>
        </div>

        <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900">Route Mapper</h1>
        <p className="mb-8 text-lg text-gray-600">
          Generate walking and running routes with elevation profiles, scenic scoring, and safety
          metrics. Just pick a start point and distance.
        </p>

        <Link
          href="/explore"
          className="inline-flex h-12 items-center rounded-full bg-blue-600 px-8 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
        >
          Start Exploring
        </Link>
      </div>
    </div>
  );
}
