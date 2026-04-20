const FACTS = [
  { emoji: '🐷', fact: 'The first piggy banks were made from "pygg" clay in the 15th century.' },
  { emoji: '💵', fact: 'Paper money was invented in China during the Tang Dynasty, over 1,000 years ago.' },
  { emoji: '🏦', fact: 'The word "bank" comes from the Italian "banca" — a bench where money was exchanged.' },
  { emoji: '🪙', fact: 'The first coins were minted in Lydia (modern Turkey) around 600 BC.' },
  { emoji: '💰', fact: 'If you save just ₹100 a day, you\'ll have ₹36,500 in a year.' },
  { emoji: '📈', fact: 'The 50/30/20 rule: 50% needs, 30% wants, 20% savings.' },
  { emoji: '🧮', fact: 'Compound interest was called the "eighth wonder of the world" by Einstein.' },
  { emoji: '🎯', fact: 'People who write down their goals are 42% more likely to achieve them.' },
  { emoji: '🌍', fact: 'There are over 180 currencies used around the world today.' },
  { emoji: '🏆', fact: 'The average millionaire has 7 streams of income.' },
  { emoji: '💡', fact: 'Saving even 1% more of your income can make a huge difference over time.' },
  { emoji: '🔑', fact: 'Warren Buffett bought his first stock at age 11.' },
  { emoji: '🐜', fact: 'Small consistent savings beat big occasional deposits every time.' },
  { emoji: '📱', fact: 'Digital savings apps help people save 2-3x more than manual methods.' },
  { emoji: '🎪', fact: 'The ₹500 note is the most used banknote in India.' },
  { emoji: '🌱', fact: 'Starting to save early is more important than how much you save.' },
  { emoji: '🧊', fact: 'The "freeze method": put your credit card in ice to avoid impulse buys.' },
  { emoji: '🎵', fact: 'Playing the "52-week challenge": save ₹1 week 1, ₹2 week 2... ₹52 week 52 = ₹1,378.' },
  { emoji: '🏠', fact: 'Financial experts recommend having 3-6 months of expenses as emergency savings.' },
  { emoji: '⏰', fact: 'It takes about 66 days to form a new habit. Keep saving daily!' },
];

export function getDailyFact(): { emoji: string; fact: string } {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return FACTS[dayOfYear % FACTS.length];
}

export function getDailyFacts(count: number): { emoji: string; fact: string }[] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const result: { emoji: string; fact: string }[] = [];
  for (let i = 0; i < count; i++) {
    result.push(FACTS[(dayOfYear + i) % FACTS.length]);
  }
  return result;
}
