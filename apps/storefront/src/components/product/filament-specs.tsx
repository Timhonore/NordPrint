import type { CompatibilityVerdict, FilamentSpec } from "@nordprint/types";
import { COMPATIBILITY_LABELS } from "@nordprint/types";
import { compatibilityTone, formatSpoolWeight } from "@nordprint/commerce";
import { Badge, Card, CardBody, RatingDots, SpecRow, TechLabel, cn } from "@nordprint/ui";
import { AlertIcon, CheckIcon, ThermometerIcon, XIcon } from "@/components/icons";

/**
 * The technical half of the product page: print settings, material properties
 * and compatibility.
 *
 * Everything here comes from the backend. Where a value is not documented the
 * row is omitted rather than filled with a dash or a guess — an invented
 * drying temperature is worse than no drying temperature.
 */
export function FilamentSpecs({
  spec,
  compatibility,
}: {
  readonly spec: FilamentSpec;
  readonly compatibility: CompatibilityVerdict | null;
}): React.JSX.Element {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <PrintSettings spec={spec} />
      <MaterialProperties spec={spec} />
      <Compatibility spec={spec} verdict={compatibility} />
      {spec.attributes.length > 0 ? <ExtraAttributes spec={spec} /> : null}
      <Datasheets spec={spec} />
    </div>
  );
}

function PrintSettings({ spec }: { spec: FilamentSpec }): React.JSX.Element {
  const nozzle = range(spec.nozzleTemperature.min, spec.nozzleTemperature.max, "°C");
  const bed = range(spec.bedTemperature.min, spec.bedTemperature.max, "°C");

  const drying =
    spec.drying.temperature !== null
      ? `${spec.drying.temperature} °C${
          spec.drying.durationHours !== null ? ` / ${spec.drying.durationHours} timer` : ""
        }`
      : null;

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center gap-2">
          <ThermometerIcon className="size-4 text-ink-faint" />
          <TechLabel>Printindstillinger</TechLabel>
        </div>
        <dl>
          {nozzle ? <SpecRow label="Dyse" value={nozzle} /> : null}
          {bed ? <SpecRow label="Printbed" value={bed} /> : null}
          {drying ? <SpecRow label="Tørring" value={drying} /> : null}
          {spec.maxVolumetricSpeed !== null ? (
            <SpecRow
              label="Maks. volumetrisk hastighed"
              value={`${spec.maxVolumetricSpeed} mm³/s`}
            />
          ) : null}
          {spec.heatResistanceC !== null ? (
            <SpecRow label="Varmebestandighed" value={`ca. ${spec.heatResistanceC} °C`} />
          ) : null}
        </dl>
      </CardBody>
    </Card>
  );
}

const RATING_LABELS: { key: keyof FilamentSpec["ratings"]; label: string }[] = [
  { key: "printability", label: "Printvenlighed" },
  { key: "strength", label: "Styrke" },
  { key: "flexibility", label: "Fleksibilitet" },
  { key: "heatResistance", label: "Varmebestandighed" },
  { key: "uvResistance", label: "UV-bestandighed" },
  { key: "layerAdhesion", label: "Lagbinding" },
];

function MaterialProperties({ spec }: { spec: FilamentSpec }): React.JSX.Element | null {
  const rows = RATING_LABELS.map((entry) => ({
    ...entry,
    value: spec.ratings[entry.key],
  })).filter((entry): entry is typeof entry & { value: number } => entry.value !== undefined);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardBody>
        <TechLabel className="mb-3 block">Materialeegenskaber</TechLabel>
        <div className="space-y-2.5">
          {rows.map((row) => (
            <RatingDots key={row.key} label={row.label} value={row.value} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function Compatibility({
  spec,
  verdict,
}: {
  spec: FilamentSpec;
  verdict: CompatibilityVerdict | null;
}): React.JSX.Element {
  const tone = verdict ? compatibilityTone(verdict.status) : "neutral";

  return (
    <Card>
      <CardBody>
        <TechLabel className="mb-3 block">Kompatibilitet</TechLabel>

        {verdict && verdict.printerDisplayName ? (
          <div
            className={cn(
              "mb-3 rounded-lg border px-3 py-2.5",
              tone === "positive" && "border-positive/25 bg-positive/5",
              tone === "caution" && "border-caution/25 bg-caution/5",
              tone === "negative" && "border-negative/25 bg-negative/5",
              tone === "neutral" && "border-line bg-surface-muted"
            )}
          >
            <p
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                tone === "positive" && "text-positive",
                tone === "caution" && "text-caution",
                tone === "negative" && "text-negative",
                tone === "neutral" && "text-ink-soft"
              )}
            >
              {tone === "positive" ? (
                <CheckIcon className="size-4 shrink-0" />
              ) : tone === "negative" ? (
                <XIcon className="size-4 shrink-0" />
              ) : (
                <AlertIcon className="size-4 shrink-0" />
              )}
              {COMPATIBILITY_LABELS[verdict.status]}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {verdict.printerDisplayName}
              {verdict.note ? ` — ${verdict.note}` : ""}
            </p>
          </div>
        ) : null}

        <dl>
          <SpecRow label="Bambu AMS" value={<TriState value={spec.amsCompatible} />} />
          <SpecRow label="AMS Lite" value={<TriState value={spec.amsLiteCompatible} />} />
          <SpecRow
            label="Hærdet dyse"
            value={spec.hardenedNozzleRecommended ? "Anbefales" : "Ikke nødvendig"}
          />
          <SpecRow
            label="Lukket kabinet"
            value={spec.enclosureRecommended ? "Anbefales" : "Ikke nødvendig"}
          />
          {spec.abrasive ? (
            <SpecRow label="Slibende" value={<Badge tone="caution">Ja</Badge>} />
          ) : null}
        </dl>
      </CardBody>
    </Card>
  );
}

/**
 * Renders a tri-state flag.
 *
 * `null` means the manufacturer has not documented it — which is different
 * from "no", and is shown as such.
 */
function TriState({ value }: { value: boolean | null }): React.JSX.Element {
  if (value === null) return <span className="text-ink-faint">Ikke oplyst</span>;
  return value ? (
    <span className="inline-flex items-center gap-1 text-positive">
      <CheckIcon className="size-3.5" /> Ja
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-ink-soft">
      <XIcon className="size-3.5" /> Nej
    </span>
  );
}

function ExtraAttributes({ spec }: { spec: FilamentSpec }): React.JSX.Element {
  const groups = new Map<string, typeof spec.attributes>();
  for (const attribute of spec.attributes) {
    const key = attribute.group ?? "Øvrige data";
    groups.set(key, [...(groups.get(key) ?? []), attribute]);
  }

  return (
    <Card>
      <CardBody>
        {[...groups.entries()].map(([group, attributes]) => (
          <div key={group} className="mb-4 last:mb-0">
            <TechLabel className="mb-3 block">{group}</TechLabel>
            <dl>
              {attributes.map((attribute) => (
                <SpecRow
                  key={attribute.key}
                  label={attribute.label}
                  value={formatAttribute(attribute.value, attribute.unit)}
                />
              ))}
            </dl>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function Datasheets({ spec }: { spec: FilamentSpec }): React.JSX.Element {
  return (
    <Card>
      <CardBody>
        <TechLabel className="mb-3 block">Specifikationer</TechLabel>
        <dl>
          <SpecRow label="Diameter" value={`${String(spec.diameterMm).replace(".", ",")} mm`} />
          <SpecRow
            label="Nettovægt"
            value={formatSpoolWeight(spec.netFilamentWeightG) ?? "—"}
          />
          {spec.grossWeightG !== null ? (
            <SpecRow label="Bruttovægt" value={`${spec.grossWeightG} g`} />
          ) : null}
          {spec.densityGCm3 !== null ? (
            <SpecRow label="Massefylde" value={`${String(spec.densityGCm3).replace(".", ",")} g/cm³`} />
          ) : null}
          {spec.spoolMaterial ? <SpecRow label="Spole" value={spec.spoolMaterial} /> : null}
        </dl>

        {spec.foodContactInformation ? (
          <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-relaxed text-ink-soft">
            {spec.foodContactInformation}
          </p>
        ) : null}

        {spec.technicalDatasheetUrl || spec.safetyDatasheetUrl ? (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {spec.technicalDatasheetUrl ? (
              <a
                href={spec.technicalDatasheetUrl}
                className="text-accent hover:underline"
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                Teknisk datablad (TDS)
              </a>
            ) : null}
            {spec.safetyDatasheetUrl ? (
              <a
                href={spec.safetyDatasheetUrl}
                className="text-accent hover:underline"
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                Sikkerhedsdatablad (SDS)
              </a>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function range(min: number | null, max: number | null, unit: string): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
  return `${min ?? max} ${unit}`;
}

function formatAttribute(
  value: string | number | boolean | null,
  unit: string | null | undefined
): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  const rendered = typeof value === "number" ? String(value).replace(".", ",") : value;
  return unit ? `${rendered} ${unit}` : rendered;
}
