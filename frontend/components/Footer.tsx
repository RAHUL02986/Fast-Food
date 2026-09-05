import Link from 'next/link';
import BrandLogo from '@/components/Logo';

const footerLinks = {
  Explore: [
    { label: 'Home', href: '/' },
    { label: 'Restaurants', href: '/restaurants' },
    { label: 'Popular dishes', href: '/restaurants' },
  ],
  Company: [
    { label: 'About us', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Support', href: '/support' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms & Conditions', href: '/terms' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-[#f5f3ee]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <BrandLogo href="/" className="inline-flex items-center gap-3" imageClassName="h-[80px] w-[200px] rounded-md object-cover" />

            <p className="mt-5 max-w-md text-sm leading-6 text-gray-600">
              Discover your next favorite restaurant, book a table in seconds, and enjoy great meals delivered with ease.
            </p>

            <div className="mt-6 space-y-2 text-sm text-gray-600">
              <p>kapoorrahul304@gmail.com</p>
              <p>+91 78071 02986</p>
              <p>Mon–Sun • 9:00 AM – 11:00 PM</p>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-500">{title}</h3>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-orange-600">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-gray-200 pt-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Quick Food. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-orange-600">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-orange-600">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
