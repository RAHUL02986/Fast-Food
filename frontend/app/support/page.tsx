import InfoPageLayout from '@/components/InfoPageLayout';

export default function SupportPage() {
  return (
    <InfoPageLayout
      eyebrow="Support"
      title="We’re here to support you."
      description="If something is not working as expected, our team can help with orders, bookings, and account issues."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-5 text-gray-700 leading-7">
            <p>
              We want every order and reservation to feel smooth and stress-free. If you’re facing a problem with a delivery,
              payment, booking, or account, we’re ready to help.
            </p>
            <p>
              Our support team works to resolve issues quickly so you can get back to enjoying great food with minimal hassle.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80"
              alt="Restaurant support desk"
              loading="lazy"
              decoding="async"
              className="h-68 w-full object-cover"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-orange-50 p-5">
            <h2 className="text-lg font-bold text-gray-900">Quick help</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
              <li>• Order status and delivery updates</li>
              <li>• Booking changes and cancellations</li>
              <li>• Refund and payment support</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-lg font-bold text-gray-900">Need a person?</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
              <li>• Email: hello@quickfood.app</li>
              <li>• Phone: +91 98765 43210</li>
              <li>• Response time: within 24 hours</li>
            </ul>
          </div>
        </div>
      </div>
    </InfoPageLayout>
  );
}
