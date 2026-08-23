"use client";

type Props = {
  lat?: number;
  lng?: number;
  address?: string;
  ownerHint?: boolean;
};

function Fallback({ address, ownerHint }: { address?: string; ownerHint?: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-4">
      <div className="flex items-start gap-3">
        <i className="fa-solid fa-map-pin text-text-light w-5 mt-0.5" aria-hidden />
        <p className="text-sm">{address ?? "Location not set"}</p>
      </div>
      {ownerHint && (
        <p className="mt-2 text-[11px] text-text-light">
          Set your location in Restaurant Studio so customers can find you.
        </p>
      )}
    </div>
  );
}

export default function LocationMap({ lat, lng, address, ownerHint }: Props) {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return <Fallback address={address} ownerHint={ownerHint} />;
  }

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-line">
        <iframe
          title="Restaurant location"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.004}%2C${lat - 0.0025}%2C${lng + 0.004}%2C${lat + 0.0025}&layer=mapnik&marker=${lat}%2C${lng}`}
          className="w-full h-44 border-0"
          loading="lazy"
        />
      </div>
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noopener"
        className="inline-block mt-2 text-xs text-primary font-semibold"
      >
        Open in Google Maps →
      </a>
    </div>
  );
}
