// Placeholder while the question page loads.
export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-3xl animate-pulse px-4 py-16">
      <div className="h-1 rounded-full bg-line" />
      <div className="mx-auto mt-16 h-10 w-2/3 rounded bg-paper-deep" />
      <div className="mt-12 h-40 rounded-lg bg-paper-deep" />
    </div>
  );
}
