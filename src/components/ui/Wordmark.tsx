export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-3xl font-bold leading-none tracking-tight text-ketchup ${className}`}
    >
      <span>Cookout</span>
      <span className="text-mustard">.</span>
    </span>
  );
}
