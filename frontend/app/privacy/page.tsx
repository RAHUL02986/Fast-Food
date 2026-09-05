import InfoPageLayout from '@/components/InfoPageLayout';

export default function PrivacyPolicyPage() {
  return (
    <InfoPageLayout
      eyebrow="Privacy policy"
      title="Your privacy matters to us."
      description="We collect and use information only to improve your experience and support the services you use on Quick Food."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <img
              src="https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80"
              alt="Privacy and secure food ordering"
              className="h-72 w-full object-cover"
            />
          </div>

          <div className="space-y-5 text-gray-700 leading-7">
            <p>
              We collect information you provide directly, such as your contact details, delivery information, account preferences,
              and order history. We also use limited technical data to improve site performance and security.
            </p>
            <p>
              This information is used to process orders, support reservations, personalize your experience, and ensure the
              platform remains safe and reliable. We do not sell personal data to third parties.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-lg font-bold text-gray-900">What we collect</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">Account details, preferences, order history, and limited technical activity.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-lg font-bold text-gray-900">How we use it</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">To process orders, support bookings, improve the platform, and protect you.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-lg font-bold text-gray-900">Your control</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">You can review, update, or request corrections to your data anytime.</p>
          </div>
        </div>
      </div>
    </InfoPageLayout>
  );
}
