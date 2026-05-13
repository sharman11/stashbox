import { FAQ } from '@/components/FAQ';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { Personas } from '@/components/Personas';
import { StashSpots } from '@/components/StashSpots';
import { Stats } from '@/components/Stats';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <Personas />
      <StashSpots />
      <FAQ />
      <Footer />
    </main>
  );
}
