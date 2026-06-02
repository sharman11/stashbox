import { Redirect } from 'expo-router';

/**
 * Placeholder for the "More" tab.
 *
 * The tab's button is overridden in app/(tabs)/_layout.tsx — tapping it
 * opens a slide-up sheet rather than navigating to this screen. We only
 * have a file here so expo-router can register the route.
 *
 * If anyone deep-links to /more directly (shouldn't happen via the tab
 * bar), bounce them to home rather than rendering a blank screen.
 */
export default function MorePlaceholder() {
  return <Redirect href="/" />;
}
