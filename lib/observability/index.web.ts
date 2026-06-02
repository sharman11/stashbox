/**
 * Web shim for observability. Sentry/PostHog native SDKs don't run on web, so
 * these are no-ops (with a dev console fallback). Mirrors the native surface.
 */

export type AnalyticsEvent =
  | 'app_opened'
  | 'auth_completed'
  | 'upsell_tapped'
  | 'paywall_viewed'
  | 'subscribe_completed';

export function initObservability(): void {}

export function identify(_userId: string, _props?: Record<string, unknown>): void {}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (__DEV__) console.log(`[analytics:web] ${event}`, props ?? '');
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) console.error('[captureError:web]', error, context ?? '');
}
