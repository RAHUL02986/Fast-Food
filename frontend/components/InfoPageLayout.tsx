import Link from 'next/link';
import { CustomerNav } from '@/components/Navs';

export default function InfoPageLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f1ed] text-gray-900">
      <CustomerNav />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">      

        <section className="rounded-[28px] border border-gray-200 bg-[#f8f7f5] p-6 shadow-[0_12px_30px_rgba(17,24,39,0.04)] sm:p-8 lg:p-10">
          <div className=" text-start max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">{eyebrow}</p>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-gray-900 sm:text-4xl lg:text-[3rem]">{title}</h1>
            {description ? <p className="text-start mt-4 max-w-2xl text-base leading-7 text-gray-600">{description}</p> : null}
          </div>

          <div className="mt-8 border-t border-gray-200 pt-8">{children}</div>
        </section>
      </main>
    </div>
  );
}
