import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-4 pt-20 pb-10 text-center">
      <div className="text-5xl text-primary mb-4">
        <i className="fa-solid fa-bowl-food" aria-hidden />
      </div>
      <h1 className="text-xl font-bold mb-2">Not on the menu</h1>
      <p className="text-sm text-text-light mb-6">
        The page or dish you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="inline-block bg-primary text-white px-6 py-2.5 rounded-full font-semibold"
      >
        Back to Home
      </Link>
    </div>
  );
}
