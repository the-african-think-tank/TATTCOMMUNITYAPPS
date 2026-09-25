import posthog, { isPostHogConfigured } from './posthog';

export interface AnalyticsUser {
  id: string;
  email?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  role?: string | undefined;
  systemRole?: string | undefined;
  communityTier?: string | undefined;
  chapterId?: string | null | undefined;
  chapterName?: string | null | undefined;
  chapterCode?: string | null | undefined;
  location?: string | null | undefined;
  countryOfResidence?: string | null | undefined;
}

export interface AnalyticsJob {
  id: string;
  title: string;
  companyName?: string | undefined;
  company?: string | undefined;
  category?: string | undefined;
  location?: string | undefined;
  type?: string | undefined;
  applicationUrl?: string | null | undefined;
  link?: string | null | undefined;
  externalUrl?: string | null | undefined;
}

export interface AnalyticsEventItem {
  id: string;
  title: string;
  category?: string | undefined;
  isPaid?: boolean | undefined;
  price?: number | undefined;
}

export interface AnalyticsResourceItem {
  id: string;
  title: string;
  fileType?: string | undefined;
  accessTier?: string | undefined;
}


export const analytics = {
  /**
   * Identify an authenticated user and attach user properties
   */
  identify: (user: AnalyticsUser): void => {
    if (!isPostHogConfigured || typeof window === 'undefined' || !user?.id) return;

    posthog.identify(user.id, {
      email: user.email,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      system_role: user.systemRole,
      community_tier: user.communityTier,
      chapter_id: user.chapterId,
      chapter_name: user.chapterName,
      chapter_code: user.chapterCode,
      location: user.location,
      country: user.countryOfResidence,
    });
  },

  /**
   * Reset user identity upon logout
   */
  reset: (): void => {
    if (!isPostHogConfigured || typeof window === 'undefined') return;
    posthog.reset();
  },

  /**
   * Track arbitrary custom event with properties
   */
  track: (eventName: string, properties?: Record<string, unknown>): void => {
    if (!isPostHogConfigured || typeof window === 'undefined') return;
    posthog.capture(eventName, properties);
  },

  // ─── AUTH & ONBOARDING (Subtask 1218395705627321) ──────────────────────────
  trackSignUp: (props: { method?: string; joinAs?: string; tier?: string }): void => {
    analytics.track('User Signed Up', {
      method: props.method || 'email',
      join_as: props.joinAs,
      tier: props.tier || 'FREE',
    });
  },

  trackPlanSelected: (props: { plan: string; billingCycle?: string; price?: number }): void => {
    analytics.track('Plan Selected', {
      plan: props.plan,
      billing_cycle: props.billingCycle,
      price: props.price,
    });
  },

  trackOnboardingStep: (props: { step: number; stepName: string }): void => {
    analytics.track('Onboarding Step Completed', {
      step_number: props.step,
      step_name: props.stepName,
    });
  },

  trackOnboardingCompleted: (): void => {
    analytics.track('Onboarding Completed');
  },

  // ─── JOB INTERACTIONS (Subtask 1218395705627311) ───────────────────────────
  trackJobViewed: (job: AnalyticsJob, user?: AnalyticsUser | null): void => {
    analytics.track('Job Viewed', {
      job_id: job.id,
      job_title: job.title,
      company: job.companyName || job.company,
      category: job.category,
      location: job.location,
      employment_type: job.type,
      user_id: user?.id,
      user_tier: user?.communityTier,
    });
  },

  trackJobApplyClicked: (job: AnalyticsJob, user?: AnalyticsUser | null): void => {
    analytics.track('Job Apply Clicked', {
      job_id: job.id,
      job_title: job.title,
      company: job.companyName || job.company,
      apply_url: job.externalUrl || job.applicationUrl || job.link,
      category: job.category,
      location: job.location,
      user_id: user?.id,
      user_tier: user?.communityTier,
    });
  },


  // ─── MEMBERSHIP UPGRADE & CONVERSIONS (Subtask 1218395705627313) ────────────
  trackUpgradePageViewed: (currentTier?: string): void => {
    analytics.track('Upgrade Page Viewed', {
      current_tier: currentTier,
    });
  },

  trackCheckoutInitiated: (props: {
    tier: string;
    billingCycle: string;
    amount?: number;
  }): void => {
    analytics.track('Checkout Initiated', {
      target_tier: props.tier,
      billing_cycle: props.billingCycle,
      amount: props.amount,
    });
  },

  trackPremiumGateEncountered: (props: { feature: string; userTier?: string }): void => {
    analytics.track('Premium Gate Encountered', {
      feature: props.feature,
      user_tier: props.userTier,
    });
  },

  // ─── COMMUNITY ASSETS: EVENTS & RESOURCES (Subtask 1218395705627313) ────────
  trackEventViewed: (event: AnalyticsEventItem, user?: AnalyticsUser | null): void => {
    analytics.track('Event Viewed', {
      event_id: event.id,
      title: event.title,
      category: event.category,
      is_paid: event.isPaid,
      price: event.price,
      user_id: user?.id,
      user_tier: user?.communityTier,
    });
  },

  trackEventRSVP: (
    event: AnalyticsEventItem,
    ticketType?: string,
    user?: AnalyticsUser | null
  ): void => {
    analytics.track('Event RSVP Clicked', {
      event_id: event.id,
      title: event.title,
      ticket_type: ticketType,
      user_id: user?.id,
      user_tier: user?.communityTier,
    });
  },

  trackResourceViewed: (
    resource: AnalyticsResourceItem,
    user?: AnalyticsUser | null
  ): void => {
    analytics.track('Resource Viewed', {
      resource_id: resource.id,
      title: resource.title,
      file_type: resource.fileType,
      access_tier: resource.accessTier,
      user_id: user?.id,
      user_tier: user?.communityTier,
    });
  },

  trackResourceDownloaded: (
    resource: AnalyticsResourceItem,
    user?: AnalyticsUser | null
  ): void => {
    analytics.track('Resource Downloaded', {
      resource_id: resource.id,
      title: resource.title,
      file_type: resource.fileType,
      access_tier: resource.accessTier,
      user_id: user?.id,
      user_tier: user?.communityTier,
    });
  },
};

export default analytics;
