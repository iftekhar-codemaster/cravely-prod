export default function Loading() {
  return (
    <div className="px-4 pt-6">
      <div className="h-10 rounded-xl bg-gray-100 animate-pulse mb-6" />
      <div className="flex gap-4 overflow-hidden mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-[68px] h-[68px] rounded-full bg-gray-100 animate-pulse" />
            <div className="h-3 w-14 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
