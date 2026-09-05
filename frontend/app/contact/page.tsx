import InfoPageLayout from '@/components/InfoPageLayout';

export default function ContactPage() {
  return (
    <InfoPageLayout
      eyebrow="Contact"
      title="We’re here to help."
      description="Need support with an order, reservation, or general enquiry? We’re ready to assist."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <img
              src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80"
              alt="Customer support team"
              className="h-72 w-full object-cover"
            />
          </div>

          <div className="space-y-5 text-gray-700 leading-7">
            <p>
              Whether you need help with a food order, table booking, or a partnership question, our team is available to assist.
            </p>
            <p>
              We respond quickly to customer support requests and aim to make every conversation clear, friendly, and helpful.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Email</p>
            <p className="mt-2 text-gray-800">hello@quickfood.app</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Phone</p>
            <p className="mt-2 text-gray-800">+91 98765 43210</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Hours</p>
            <p className="mt-2 text-gray-800">Mon – Sun, 9 AM – 11 PM</p>
          </div>
        </div>
      </div>
    </InfoPageLayout>
  );
}
