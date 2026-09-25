'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog, { isPostHogConfigured } from '@/lib/posthog';

function PageViewTracker(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isPostHogConfigured || typeof window === 'undefined') return;

    if (pathname) {
      let url = window.origin + pathname;
      const searchString = searchParams?.toString();
      if (searchString) {
        url += `?${searchString}`;
      }

      posthog.capture('$pageview', {
        $current_url: url,
        path: pathname,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogPageView(): React.ReactNode {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
