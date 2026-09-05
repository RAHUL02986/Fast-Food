"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Route-level error boundary (Next.js App Router).
 * Catches render/data errors in any page under app/ and shows a friendly
 * recovery screen instead of a blank or crashed page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-4">
          <AlertTriangle className="text-red-500" size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-sm mb-6">
          We hit an unexpected error loading this page. Your data is safe — try again, or head
          back home.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-700 transition"
          >
            <RefreshCw size={15} /> Try again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 border-2 border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
          >
            <Home size={15} /> Go home
          </Link>
        </div>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="mt-4 text-xs text-gray-400 break-words">{error.message}</p>
        )}
      </div>
    </div>
  );
}
