export default function Loading() {
  return (
    <div className="flex-col gap-6 p-4 animate-pulse w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex-col gap-2 w-1/3">
          <div className="h-8 bg-surface-hover rounded w-3/4"></div>
          <div className="h-4 bg-surface-hover rounded w-1/2"></div>
        </div>
        <div className="h-10 bg-surface-hover rounded w-32"></div>
      </div>
      <div className="h-40 bg-surface-hover rounded w-full mb-4"></div>
      <div className="h-40 bg-surface-hover rounded w-full mb-4"></div>
    </div>
  );
}
