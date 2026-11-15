export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`wordmark font-display text-[1.75rem] leading-none text-ketchup ${className}`}
    >
      <span>Cookout</span>
      <span className="text-mustard">.</span>
    </span>
  );
}
