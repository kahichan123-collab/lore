export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const lg = size === "lg";
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className={`font-serif font-bold ${lg ? "text-5xl sm:text-6xl" : "text-2xl"}`}>古問</span>
      <span
        className={`font-sans font-medium uppercase text-ink-soft ${lg ? "mt-2 text-sm tracking-[0.6em] pl-[0.6em]" : "mt-1 text-[0.6rem] tracking-[0.45em] pl-[0.45em]"}`}
      >
        Lore
      </span>
    </span>
  );
}
