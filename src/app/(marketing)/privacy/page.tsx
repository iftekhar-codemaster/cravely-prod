import type { Metadata } from "next";
import { LANDING_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Cravely collects, uses and protects your data.",
  alternates: { canonical: `${LANDING_URL}/privacy` },
};

const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: "What we collect",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <b>Account info</b> — your name, email address and profile photo when
          you create an account.
        </li>
        <li>
          <b>Location</b> — only if you allow it, to show nearby restaurants.
          You can revoke this any time in your browser/device settings.
        </li>
        <li>
          <b>Activity</b> — dishes you view, like, or add to a package, to
          personalize recommendations.
        </li>
      </ul>
    ),
  },
  {
    h: "How we use it",
    body: (
      <p>
        Your data is used only to run Cravely: showing nearby kitchens,
        personalizing your feed, syncing your likes and packages across
        devices, and keeping accounts secure. We do not sell your personal
        data to anyone.
      </p>
    ),
  },
  {
    h: "What we don't do",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>No ads or ad trackers.</li>
        <li>No selling or renting of personal data.</li>
        <li>No location tracking without your explicit permission.</li>
      </ul>
    ),
  },
  {
    h: "Storage & security",
    body: (
      <p>
        Data is stored on Google Cloud (Firebase) infrastructure with
        access controlled by security rules. Passwords are handled exclusively
        by Firebase Authentication — Cravely never sees or stores them.
      </p>
    ),
  },
  {
    h: "Your choices",
    body: (
      <p>
        You can sign out any time. Location personalization can be turned off
        in the app. To request deletion of your account and its data, contact
        us and we will remove it.
      </p>
    ),
  },
  {
    h: "Contact",
    body: <p>Questions about privacy? Reach us on the WhatsApp/phone links inside the app.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-text-light">
        Short version: we collect the minimum needed to run the app, we never
        sell your data, and location is opt-in.
      </p>
      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-bold text-lg">{s.h}</h2>
            <div className="mt-2 text-sm text-text-light leading-relaxed">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
