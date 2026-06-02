/**
 * Provider-agnostic observability: crash reporting (Sentry) + product
 * analytics (PostHog), behind one tiny API. Everything no-ops when the env
 * keys are absent, so the app runs unchanged in Expo Go and before you wire
 * the dashboards.
 *
 * Env:
 *   EXPO_PUBLIC_SENTRY_DSN       — enables Sentry crash reporting
 *   EXPO_PUBLIC_POSTHOG_KEY      — enables PostHog analytics
 *   EXPO_PUBLIC_POSTHOG_HOST     — optional, defaults to US cloud
 *
 * Note: full native crash symbolication / source maps also needs the
 * @sentry/react-native Expo config plugin + an auth token at build time
 * (run `npx @sentry/wizard -i reactNative`). Runtime capture works without it.
 */

import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

/** The funnel we care about: open → auth → upsell → paywall → subscribe. */
export type AnalyticsEvent =
  | 'app_opened'
  | 'auth_completed'
  | 'upsell_tapped'
  | 'paywall_viewed'
  | 'subscribe_completed';

/** JSON-serializable analytics properties (matches PostHog's accepted shape). */
export type AnalyticsProps = Record<string, string | number | boolean | null>;

let posthog: PostHog | null = null;
let started = false;

export function initObservability(): void {
  if (started) return;
  started = true;

  if (SENTRY_DSN) {
    try {
      Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.2 });
    } catch {
      /* never let observability crash the app */
    }
  }
  if (POSTHOG_KEY) {
    try {
      posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
    } catch {
      /* no-op */
    }
  }
}

export function identify(userId: string, props?: AnalyticsProps): void {
  if (SENTRY_DSN) {
    try {
      Sentry.setUser({ id: userId });
    } catch {
      /* no-op */
    }
  }
  try {
    posthog?.identify(userId, props);
  } catch {
    /* no-op */
  }
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  try {
    posthog?.capture(event, props);
  } catch {
    /* no-op */
  }
  if (!posthog && __DEV__) {
    console.log(`[analytics] ${event}`, props ?? '');
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (SENTRY_DSN) {
    try {
      Sentry.captureException(error, context ? { extra: context } : undefined);
      return;
    } catch {
      /* fall through to dev log */
    }
  }
  if (__DEV__) console.error('[captureError]', error, context ?? '');
}
