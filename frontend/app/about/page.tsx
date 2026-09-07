import InfoPageLayout from '@/components/InfoPageLayout';

export default function AboutPage() {
  return (
    <InfoPageLayout
      eyebrow="About us"
      title="We make dining simpler and more enjoyable."
      description="Quick Food helps people discover great meals, book tables easily, and enjoy better local food experiences without the usual hassle."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="space-y-5 text-gray-700 leading-7">
            <p>
              At Quick Food, we believe great food experiences should feel simple, trustworthy, and personal. We help diners
              discover restaurants they love, order with ease, and enjoy a smoother experience from start to finish.
            </p>
            <p>
              We partner with local restaurants that care about quality, service, and community. Our goal is to connect people
              and places in a way that feels helpful, transparent, and easy to use every time.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <img
              src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80"
              alt="Restaurant meal table"
              loading="lazy"
              decoding="async"
              className="h-64 w-full object-cover"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Local favorites', 'Handpicked restaurants serving great food, warm hospitality, and memorable dining moments.'],
            ['Easy ordering', 'Browse menus, reserve tables, and place orders with a smoother booking and checkout flow.'],
            ['Real community', 'We support small food businesses and help neighborhoods discover the places they love.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-[#fffaf5] p-5">
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </InfoPageLayout>
  );
}
