import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Badge, Button, Container, Heading, Input, Select, Text } from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../lib/admin-fetch";

/**
 * Printer compatibility on the product page in Medusa Admin.
 *
 * Compatibility is the claim customers act on before spending money, so it is
 * modelled with four states rather than a checkbox: compatible, incompatible,
 * conditional and unknown. "Unknown" is the default when no rule exists — the
 * storefront then says "kompatibilitet ikke bekræftet" rather than guessing,
 * and this widget is where that guess turns into a fact.
 *
 * A conditional rule must carry a note. The backend rejects one without, and
 * so does this form: "passer med forbehold" without saying which forbehold is
 * worse than saying nothing.
 */

type Status = "compatible" | "incompatible" | "conditional" | "unknown";

interface Rule {
  id: string;
  targetType: string;
  targetId: string;
  targetName: string;
  status: Status;
  note: string | null;
}

interface Target {
  targetType: "printer_model" | "printer_family" | "printer_brand";
  targetId: string;
  label: string;
  group: string;
}

const STATUS_LABEL: Record<Status, string> = {
  compatible: "Passer",
  incompatible: "Passer ikke",
  conditional: "Passer med forbehold",
  unknown: "Ikke bekræftet",
};

const STATUS_COLOR: Record<Status, "green" | "red" | "orange" | "grey"> = {
  compatible: "green",
  incompatible: "red",
  conditional: "orange",
  unknown: "grey",
};

const CompatibilityWidget = ({ data }: { data: { id: string; title: string } }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [target, setTarget] = useState("");
  const [ruleStatus, setRuleStatus] = useState<Status>("compatible");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [rulesResult, targetsResult] = await Promise.all([
      adminFetch<{ rules: Rule[] }>(
        `/admin/nordprint/compatibility?subjectId=${encodeURIComponent(data.id)}`
      ),
      adminFetch<{ targets: Target[] }>("/admin/nordprint/printers"),
    ]);

    if (!rulesResult.ok || !targetsResult.ok) {
      setError(rulesResult.ok ? "" : rulesResult.message);
      setStatus("error");
      return;
    }

    setRules(rulesResult.data.rules);
    setTargets(targetsResult.data.targets);
    setStatus("ready");
  }, [data.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (): Promise<void> => {
    const chosen = targets.find((entry) => `${entry.targetType}:${entry.targetId}` === target);

    if (!chosen) {
      setError("Vælg en printer, serie eller producent.");
      return;
    }

    if (ruleStatus === "conditional" && note.trim().length === 0) {
      setError('En betinget regel skal have en note, fx "Kræver hærdet dyse".');
      return;
    }

    setBusy(true);
    setError(null);

    const result = await adminFetch("/admin/nordprint/compatibility", {
      method: "POST",
      body: {
        subjectType: "product",
        subjectId: data.id,
        targetType: chosen.targetType,
        targetId: chosen.targetId,
        status: ruleStatus,
        note: note.trim() || null,
      },
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setTarget("");
    setNote("");
    setRuleStatus("compatible");
    await load();
  };

  const remove = async (id: string): Promise<void> => {
    setBusy(true);
    setError(null);

    const result = await adminFetch(`/admin/nordprint/compatibility?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Removing a rule returns the product to "ikke bekræftet" for that
    // printer, which is the honest state — not "passer ikke".
    setRules((current) => current.filter((rule) => rule.id !== id));
  };

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Printerkompatibilitet</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Uden en regel skriver butikken &quot;kompatibilitet ikke bekræftet&quot;. Den påstår
          aldrig noget, den ikke ved.
        </Text>
      </div>

      <div className="px-6 py-4">
        {status === "loading" ? (
          <Text className="text-ui-fg-subtle">Henter …</Text>
        ) : status === "error" ? (
          <Button variant="secondary" size="small" onClick={() => void load()}>
            Prøv igen
          </Button>
        ) : rules.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            Ingen regler endnu.
          </Text>
        ) : (
          <ul className="space-y-2">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text size="small" weight="plus">
                      {rule.targetName}
                    </Text>
                    <Badge size="2xsmall" color={STATUS_COLOR[rule.status]}>
                      {STATUS_LABEL[rule.status]}
                    </Badge>
                  </div>
                  {rule.note ? (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {rule.note}
                    </Text>
                  ) : null}
                </div>

                <Button
                  size="small"
                  variant="transparent"
                  disabled={busy}
                  onClick={() => void remove(rule.id)}
                >
                  Fjern
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {status === "ready" ? (
        <div className="space-y-3 px-6 py-4">
          <Heading level="h3">Tilføj regel</Heading>

          <Select value={target} onValueChange={setTarget}>
            <Select.Trigger>
              <Select.Value placeholder="Vælg printer, serie eller producent" />
            </Select.Trigger>
            <Select.Content>
              {targets.map((entry) => (
                <Select.Item
                  key={`${entry.targetType}:${entry.targetId}`}
                  value={`${entry.targetType}:${entry.targetId}`}
                >
                  {entry.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          <Select value={ruleStatus} onValueChange={(value) => setRuleStatus(value as Status)}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {(Object.keys(STATUS_LABEL) as Status[]).map((key) => (
                <Select.Item key={key} value={key}>
                  {STATUS_LABEL[key]}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          <Input
            placeholder={
              ruleStatus === "conditional" ? "Påkrævet, fx: Kræver hærdet dyse" : "Note (valgfri)"
            }
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          {error ? <Text className="text-ui-fg-error">{error}</Text> : null}

          <Button size="small" disabled={busy} onClick={() => void save()}>
            {busy ? "Gemmer …" : "Gem regel"}
          </Button>
        </div>
      ) : null}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
});

export default CompatibilityWidget;
