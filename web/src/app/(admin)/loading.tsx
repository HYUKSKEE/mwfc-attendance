export default function Loading() {
  return (
    <div className="grid animate-pulse items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true">
      <div className="h-[560px] rounded-lg border border-line bg-panel" />
      <div className="hidden h-64 rounded-lg border border-line bg-panel lg:block" />
    </div>
  );
}
