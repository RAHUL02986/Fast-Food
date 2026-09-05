/** Loading skeleton for the restaurant discovery page (filter bar + card grid). */
export default function RestaurantsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="h-9 w-80 max-w-full rounded-lg bg-gray-200 animate-pulse mb-8" />

        {/* filter bar skeleton */}
        <div className="bg-white p-6 rounded-lg shadow mb-8 flex gap-4 flex-wrap">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 min-w-[180px] space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>

        {/* result grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-48 bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-2/3 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
                <div className="flex gap-3 pt-2">
                  <div className="h-9 flex-1 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="h-9 flex-1 rounded-lg bg-gray-200 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
