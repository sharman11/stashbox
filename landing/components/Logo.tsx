export function Logo({
  className = '',
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold ${className}`}>
      {/* Plain <img> on purpose — Next/Image refuses raw SVGs by default
          for safety, and this asset is tiny enough that optimisation
          would add nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/stashbox-icon.svg"
        alt=""
        width={size}
        height={size}
        className="rounded-[7px]"
      />
      <span className="tracking-tight text-[17px]">Stashbox</span>
    </span>
  );
}
