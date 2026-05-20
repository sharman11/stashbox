import { FAQ } from '@/components/FAQ';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { LandingSplash } from '@/components/LandingSplash';
import { Nav } from '@/components/Nav';
import { Personas } from '@/components/Personas';
import { StashSpots } from '@/components/StashSpots';
import { Stats } from '@/components/Stats';

export default function HomePage() {
  return (
    <main>
      <LandingSplash />
      <Nav />
      {/* Hero + Stats fit within one viewport. The -mt-14 pulls the hero up
          under the sticky nav so its green shows through the transparent bar;
          the Hero pads its own content down to clear the nav. */}
      <div className="-mt-14 flex min-h-[100svh] flex-col">
        <Hero />
        <Stats />
      </div>
      <HowItWorks />
      <Features />
      <Personas />
      <StashSpots />
      <FAQ />
      <Footer />
    </main>
  );
}
