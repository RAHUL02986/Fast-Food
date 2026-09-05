'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Star, BadgeCheck, Quote } from 'lucide-react';
import { reviewAPI } from '@/lib/api';
import type { FeaturedReview } from '@/types';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

export default function ReviewsSlider() {
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(0);

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const pageSize = viewportWidth === 0 ? 3 : viewportWidth < 768 ? 1 : viewportWidth < 1024 ? 2 : 3;
  const pages = Array.from({ length: Math.ceil(reviews.length / pageSize) }, (_, index) =>
    reviews.slice(index * pageSize, index * pageSize + pageSize)
  );

  const safeIndex = (i: number) => (pages.length === 0 ? 0 : (i + pages.length) % pages.length);

  useEffect(() => {
    let mounted = true;
    reviewAPI
      .getFeaturedReviews({ limit: 10 })
      .then((res) => {
        if (mounted) setReviews(res.data || []);
      })
      .catch((err) => console.error('Error fetching reviews:', err));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (paused || pages.length <= 1) return;
    const t = setInterval(() => setActive((a) => safeIndex(a + 1)), 5000);
    return () => clearInterval(t);
  }, [paused, pages.length]);

  if (reviews.length === 0) return null;

  const go = (dir: number) => setActive((a) => safeIndex(a + dir));

  return (
    <section className="mb-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">What our customers say</h2>
            <p className="text-gray-600 mt-1">Real reviews from real orders — trust, delivered.</p>
          </div>
          {pages.length > 1 && (
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => go(-1)}
                aria-label="Previous review"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next review"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div
          className="overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {pages.map((page, pageIndex) => (
              <div key={`review-page-${pageIndex}`} className="w-full shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {page.map((review) => (
                    <div key={review._id} className="h-full">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10 h-full">
                        <Quote size={32} className="text-orange-200 mb-4" />
                        <div className="mb-4">
                          <Stars rating={review.rating} />
                        </div>
                        <p className="text-lg text-gray-800 leading-relaxed mb-6">“{review.comment}”</p>
                        <div className="flex items-center gap-3">
                          {review.avatar ? (
                            <img
                              src={review.avatar}
                              alt={review.customerName}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold">
                              {review.customerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900">{review.customerName}</span>
                              <BadgeCheck size={16} className="text-green-500" />
                            </div>
                            <p className="text-sm text-gray-500">
                              {review.restaurantName
                                ? `Ordered from ${review.restaurantName}`
                                : 'Verified order'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {pages.length > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            {pages.map((_, i) => (
              <button
                key={`page-dot-${i}`}
                onClick={() => setActive(i)}
                aria-label={`Go to review page ${i + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  i === active ? 'w-7 bg-orange-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
