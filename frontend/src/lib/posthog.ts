import posthog from 'posthog-js';

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const isPostHogConfigured = Boolean(POSTHOG_KEY);

export function initPostHog(): void {
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is not set. Analytics tracking is disabled.');
    }
    return;
  }

  // Avoid re-initialization
  if (posthog.__loaded) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // Pageviews are tracked manually via App Router listener
    capture_pageleave: true,
    autocapture: true,
    person_profiles: 'identified_only',
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '.mask-text',
    },
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug(false); // set to true if verbose debugging desired
      }
    },
  });
}

export default posthog;
