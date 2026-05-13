/** Avatar title that appears above the user's name on the profile. Updates
 *  automatically as their badge count grows. */

const LADDER: readonly { min: number; title: string }[] = [
  { min: 30, title: 'Savings Legend' },
  { min: 20, title: 'Wealth Wizard' },
  { min: 10, title: 'Money Master' },
  { min: 5, title: 'Smart Saver' },
  { min: 0, title: 'Saver' },
];

export function titleForBadgeCount(count: number): string {
  for (const tier of LADDER) {
    if (count >= tier.min) return tier.title;
  }
  return 'Saver';
}
