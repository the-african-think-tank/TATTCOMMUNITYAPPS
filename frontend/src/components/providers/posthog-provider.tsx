'use client';

import React, { useEffect } from 'react';
import { PostHogProvider as PHReactProvider } from 'posthog-js/react';
import posthog, { initPostHog, isPostHogConfigured } from '@/lib/posthog';
import { PostHogPageView } from './posthog-pageview';

export function PostHogProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  useEffect(() => {
    initPostHog();
  }, []);

  if (!isPostHogConfigured) {
    return <>{children}</>;
  }

  return (
    <PHReactProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHReactProvider>
  );
}
