export function LandingLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`lp-logo ${className}`.trim()}>
      Control<span className="lp-logo-plus">+</span>
    </span>
  );
}
