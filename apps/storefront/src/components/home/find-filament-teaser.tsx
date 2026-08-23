import { LinkButton, TechLabel } from "@nordprint/ui";
import { PRINT_INTENT_LABELS } from "@nordprint/types";

/**
 * "Find dit filament" teaser.
 *
 * The intent labels are the same constants the wizard and the recommendation
 * engine use, so the promise here matches what step 2 actually offers.
 */
export function FindFilamentTeaser(): React.JSX.Element {
  const intents = Object.values(PRINT_INTENT_LABELS).slice(0, 6);

  return (
    <section className="overflow-hidden rounded-2xl bg-surface-inverse text-ink-inverse">
      <div className="grid-plate-inverse">
        <div className="grid gap-8 p-8 md:grid-cols-2 md:items-center md:p-12">
          <div>
            <TechLabel className="text-white/50">Guidet valg</TechLabel>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Find dit filament
            </h2>
            <p className="mt-3 max-w-md leading-relaxed text-white/70">
              Fire spørgsmål om din printer, hvad du skal printe, og hvad der er vigtigst.
              Så foreslår vi 3-6 ruller — og fortæller hvorfor.
            </p>
            <LinkButton
              href="/find-filament"
              size="lg"
              className="mt-6 bg-white text-ink hover:bg-white/90"
            >
              Start
            </LinkButton>
          </div>

          <ol className="space-y-2.5">
            {[
              "Hvilken printer har du?",
              "Hvad vil du printe?",
              "Hvad er vigtigst?",
              "Ønsket farve",
            ].map((question, index) => (
              <li
                key={question}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-xs">
                  {index + 1}
                </span>
                <span className="text-sm text-white/85">{question}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-white/10 px-8 py-4 md:px-12">
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-white/45">
            {intents.map((intent) => (
              <span key={intent}>{intent}</span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
