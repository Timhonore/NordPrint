import { TechLabel } from "@nordprint/ui";
import { NewsletterForm } from "./newsletter-form";

export function NewsletterSection(): React.JSX.Element {
  return (
    <section className="bg-surface-inverse text-ink-inverse">
      <div className="grid-plate-inverse">
        <div className="container-page grid gap-8 py-14 md:grid-cols-2 md:items-center">
          <div>
            <TechLabel className="text-white/50">Hold dig opdateret</TechLabel>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Nye materialer, før alle andre
            </h2>
            <p className="mt-3 max-w-md leading-relaxed text-white/70">
              Vi skriver kun, når der faktisk er noget: nye farver, nye materialer og guides, der
              løser et konkret problem.
            </p>
          </div>
          <NewsletterForm className="md:justify-self-end md:max-w-md" />
        </div>
      </div>
    </section>
  );
}
