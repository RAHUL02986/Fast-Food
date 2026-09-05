import InfoPageLayout from '@/components/InfoPageLayout';

export default function TermsPage() {
  return (
    <InfoPageLayout
      eyebrow="Terms & conditions"
      title="Please read our terms before using the platform."
      description="These terms explain the basic rules for using Quick Food and the services available through the platform."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-5 text-gray-700 leading-7">
            <p>
              By using Quick Food, you agree to use the platform responsibly and provide accurate account information. You must
              not use the service for unlawful, abusive, or fraudulent activity.
            </p>
            <p>
              Orders, bookings, and payments are subject to the restaurant or service provider’s availability and confirmation.
              Prices, menu details, and policies may vary by location and business.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <img
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80"
              alt="Dining and ordering scene"
              className="h-68 w-full object-cover"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-[#fffaf5] p-5">
            <h2 className="text-lg font-bold text-gray-900">User responsibility</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">Keep your account secure and provide accurate information.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-[#fffaf5] p-5">
            <h2 className="text-lg font-bold text-gray-900">Orders & bookings</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">Availability and policies are set by each restaurant and service provider.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-[#fffaf5] p-5">
            <h2 className="text-lg font-bold text-gray-900">Updates</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">We may revise these terms, and continued use means you accept the latest version.</p>
          </div>
        </div>
      </div>
    </InfoPageLayout>
  );
}
