import { Logo } from './Logo';
import { Mascot } from './Mascot';

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0A1F18] py-10 text-white/65 sm:py-12">
      <Mascot
        pose="footer-wave"
        alt=""
        className="pointer-events-none absolute -bottom-2 right-5 hidden w-24 drop-shadow-xl lg:block lg:w-28"
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo className="text-white" />
          <p className="mt-3 max-w-sm text-sm text-white/55 leading-relaxed">
            A daily habit for the cash you save offline. Built with care, not VC.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <a href="/privacy" className="min-h-9 hover:text-white transition">
            Privacy
          </a>
          <a href="/terms" className="min-h-9 hover:text-white transition">
            Terms
          </a>
          <a
            href="mailto:sharmancm11@gmail.com"
            className="min-h-9 hover:text-white transition"
          >
            sharmancm11@gmail.com
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-5 text-xs text-white/40 sm:px-6">
        © {new Date().getFullYear()} Stashbox. All rights reserved.
      </p>
    </footer>
  );
}
