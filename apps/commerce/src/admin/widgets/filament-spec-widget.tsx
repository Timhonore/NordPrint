import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui";
import { useEffect, useState } from "react";
import type { FilamentSpec } from "@nordprint/types";

/**
 * Filament specification widget on the product page in Medusa Admin.
 *
 * Medusa's generic product form cannot express a filament datasheet — there is
 * nowhere to put a drying profile or an AMS flag. Rather than abusing metadata
 * (untyped, unindexed, unvalidated) this reads and writes the real
 * `filament_spec` record through `/admin/nordprint/filament/:productId`.
 *
 * The widget is read-focused: it shows what is registered and links to the
 * fields that need editing. Buyers spend far more time checking a spec than
 * changing one.
 */
type ProductProp = { id: string; title: string };

const FilamentSpecWidget = ({ data }: { data: ProductProp }) => {
  const [spec, setSpec] = useState<FilamentSpec | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/admin/nordprint/filament/${data.id}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("failed");
        const body = (await response.json()) as { spec: FilamentSpec | null };
        if (!cancelled) {
          setSpec(body.spec);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.id]);

  if (status === "loading") {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Filamentdata</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Indlæser …
          </Text>
        </div>
      </Container>
    );
  }

  if (status === "error") {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Filamentdata</Heading>
          <Text size="small" className="text-ui-fg-error mt-1">
            Kunne ikke hentes.
          </Text>
          <Button
            size="small"
            variant="secondary"
            className="mt-3"
            onClick={() => location.reload()}
          >
            Prøv igen
          </Button>
        </div>
      </Container>
    );
  }

  if (!spec) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Filamentdata</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Dette produkt har ingen filamentspecifikation. Opret én, hvis produktet er filament — så
            vises temperaturer, tørring og kompatibilitet i shoppen.
          </Text>
        </div>
      </Container>
    );
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Filamentdata</Heading>
        <div className="flex gap-2">
          <Badge size="2xsmall">{spec.material.toUpperCase()}</Badge>
          {spec.finish ? <Badge size="2xsmall">{spec.finish}</Badge> : null}
          {spec.abrasive ? (
            <Badge size="2xsmall" color="orange">
              Slibende
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-4">
        <Row label="Diameter" value={`${spec.diameterMm} mm`} />
        <Row label="Nettovægt" value={`${spec.netFilamentWeightG} g`} />
        <Row
          label="Dyse"
          value={formatRange(spec.nozzleTemperature.min, spec.nozzleTemperature.max, "°C")}
        />
        <Row
          label="Printbed"
          value={formatRange(spec.bedTemperature.min, spec.bedTemperature.max, "°C")}
        />
        <Row
          label="Tørring"
          value={
            spec.drying.temperature
              ? `${spec.drying.temperature} °C / ${spec.drying.durationHours ?? "?"} t`
              : "—"
          }
        />
        <Row
          label="Maks. flow"
          value={spec.maxVolumetricSpeed ? `${spec.maxVolumetricSpeed} mm³/s` : "—"}
        />
        <Row label="AMS" value={triState(spec.amsCompatible)} />
        <Row label="AMS Lite" value={triState(spec.amsLiteCompatible)} />
        <Row label="Hærdet dyse" value={spec.hardenedNozzleRecommended ? "Anbefales" : "Nej"} />
        <Row label="Lukket kabinet" value={spec.enclosureRecommended ? "Anbefales" : "Nej"} />
      </div>

      {spec.attributes.length > 0 ? (
        <div className="px-6 py-4">
          <Text size="small" weight="plus" className="mb-2">
            Øvrige egenskaber
          </Text>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {spec.attributes.map((attribute) => (
              <Row
                key={attribute.key}
                label={attribute.label}
                value={`${String(attribute.value)}${attribute.unit ? ` ${attribute.unit}` : ""}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Container>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="small" weight="plus">
      {value}
    </Text>
  </div>
);

const formatRange = (min: number | null, max: number | null, unit: string): string => {
  if (min === null && max === null) return "—";
  if (min !== null && max !== null) return `${min}–${max} ${unit}`;
  return `${min ?? max} ${unit}`;
};

/** `null` means undocumented, which is not the same as "no". */
const triState = (value: boolean | null): string =>
  value === null ? "Ikke oplyst" : value ? "Ja" : "Nej";

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
});

export default FilamentSpecWidget;
