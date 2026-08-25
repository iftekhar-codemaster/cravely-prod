import type { Metadata } from "next";
import { LANDING_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use Cravely.",
  alternates: { canonical: `${LANDING_URL}/terms` },
};

const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: "Using Cravely",
    body: (
      <p>
        Cravely is a free discovery platform for restaurants and dishes in
        Thakurgaon. You need an account only to like dishes, build packages,
        or manage a restaurant — browsing is open to everyone.
      </p>
    ),
  },
  {
    h: "Orders & prices",
    body: (
      <p>
        Cravely shows prices and availability provided by the restaurants.
        Orders are placed directly with the restaurant (call/WhatsApp) —
        Cravely is not a party to the order, does not process payments, and
        is not responsible for food quality, delivery, or disputes between
        you and a restaurant.
      </p>
    ),
  },
  {
    h: "Your content",
    body: (
      <p>
        Reviews, photos and other content you submit must be lawful and yours
        to share. Don&apos;t impersonate others, spam, or post misleading
        information. We may remove content that violates these terms.
      </p>
    ),
  },
  {
    h: "Restaurant partners",
    body: (
      <p>
        Restaurant accounts are responsible for the accuracy of their menus,
        prices, opening hours and photos. Cravely may verify listings and
        remove listings that mislead customers.
      </p>
    ),
  },
  {
    h: "Availability & changes",
    body: (
      <p>
        We work to keep Cravely available and accurate, but the service is
        provided &quot;as is&quot; without warranties. We may update the app and these
        terms; significant changes will be announced in the app.
      </p>
    ),
  },
  {
    h: "Contact",
    body: <p>Reach us on the WhatsApp/phone links inside the app.</p>,
  },
];

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-extrabold">Terms of Service</h1>
      <p className="mt-2 text-sm text-text-light">
        The short, readable version of the deal between you and Cravely.
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
