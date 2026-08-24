import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ChatBubbleLeftRight } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Table, Tabs, Text, Textarea } from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../../../lib/admin-fetch";

/**
 * Review moderation.
 *
 * Nothing a customer writes is published until someone here approves it. That
 * is the whole reason this screen exists: the storefront only ever renders
 * reviews with status `approved`, so an unattended queue means no reviews at
 * all — never unvetted ones.
 *
 * Rejection takes an optional note. It is for us, not the customer: six months
 * later, "hvorfor blev den afvist?" is a question someone will ask.
 */

interface Review {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string;
  author_name: string | null;
  verified_purchase: boolean;
  status: "pending" | "approved" | "rejected";
  moderation_note: string | null;
  created_at: string;
}

type Queue = "pending" | "approved" | "rejected";

const QUEUE_LABEL: Record<Queue, string> = {
  pending: "Afventer",
  approved: "Godkendt",
  rejected: "Afvist",
};

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );

const ReviewModeration = () => {
  const [queue, setQueue] = useState<Queue>("pending");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (which: Queue) => {
    setStatus("loading");
    const result = await adminFetch<{ reviews: Review[] }>(
      `/admin/nordprint/reviews?status=${which}`
    );

    if (!result.ok) {
      setError(result.message);
      setStatus("error");
      return;
    }

    setError(null);
    setReviews(result.data.reviews);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load(queue);
  }, [load, queue]);

  const moderate = async (id: string, next: "approved" | "rejected"): Promise<void> => {
    setBusy(id);
    setError(null);

    const result = await adminFetch("/admin/nordprint/reviews", {
      method: "POST",
      body: { id, status: next, note: notes[id]?.trim() || null },
    });

    setBusy(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Drop it from the list rather than refetching: the moderator is working
    // down a queue and should not lose their place on every decision.
    setReviews((current) => current.filter((review) => review.id !== id));
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Anmeldelser</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Intet vises i butikken, før det er godkendt her.
          </Text>
        </div>
        {queue === "pending" && reviews.length > 0 ? (
          <Badge color="orange">{reviews.length} afventer</Badge>
        ) : null}
      </div>

      <div className="px-6 py-4">
        <Tabs value={queue} onValueChange={(value) => setQueue(value as Queue)}>
          <Tabs.List>
            {(Object.keys(QUEUE_LABEL) as Queue[]).map((key) => (
              <Tabs.Trigger key={key} value={key}>
                {QUEUE_LABEL[key]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </div>

      {error ? (
        <div className="px-6 pb-2">
          <Text className="text-ui-fg-error">{error}</Text>
        </div>
      ) : null}

      <div className="px-6 py-4">
        {status === "loading" ? (
          <Text className="text-ui-fg-subtle">Henter …</Text>
        ) : status === "error" ? (
          <Button variant="secondary" onClick={() => void load(queue)}>
            Prøv igen
          </Button>
        ) : reviews.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            {queue === "pending"
              ? "Køen er tom. Ingen anmeldelser venter på gennemlæsning."
              : `Ingen anmeldelser i "${QUEUE_LABEL[queue]}".`}
          </Text>
        ) : (
          <div className="-mx-6 overflow-x-auto px-6">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Anmeldelse</Table.HeaderCell>
                  <Table.HeaderCell>Vurdering</Table.HeaderCell>
                  <Table.HeaderCell>Køb</Table.HeaderCell>
                  {queue === "pending" ? <Table.HeaderCell>Handling</Table.HeaderCell> : null}
                  {queue === "rejected" ? <Table.HeaderCell>Note</Table.HeaderCell> : null}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {reviews.map((review) => (
                  <Table.Row key={review.id}>
                    <Table.Cell className="max-w-md">
                      {review.title ? (
                        <Text weight="plus" size="small">
                          {review.title}
                        </Text>
                      ) : null}
                      <Text size="small" className="whitespace-pre-wrap text-ui-fg-subtle">
                        {review.body}
                      </Text>
                      <Text size="xsmall" className="mt-1 text-ui-fg-muted">
                        {review.author_name ?? "Anonym"} · {formatDate(review.created_at)}
                      </Text>
                    </Table.Cell>

                    <Table.Cell>
                      <Badge size="2xsmall">{review.rating} / 5</Badge>
                    </Table.Cell>

                    <Table.Cell>
                      {review.verified_purchase ? (
                        <Badge size="2xsmall" color="green">
                          Verificeret
                        </Badge>
                      ) : (
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Ikke verificeret
                        </Text>
                      )}
                    </Table.Cell>

                    {queue === "pending" ? (
                      <Table.Cell>
                        <div className="flex min-w-64 flex-col gap-2">
                          <Textarea
                            rows={2}
                            placeholder="Intern note (valgfri)"
                            value={notes[review.id] ?? ""}
                            onChange={(event) =>
                              setNotes((current) => ({
                                ...current,
                                [review.id]: event.target.value,
                              }))
                            }
                          />
                          <div className="flex gap-2">
                            <Button
                              size="small"
                              disabled={busy === review.id}
                              onClick={() => void moderate(review.id, "approved")}
                            >
                              Godkend
                            </Button>
                            <Button
                              size="small"
                              variant="secondary"
                              disabled={busy === review.id}
                              onClick={() => void moderate(review.id, "rejected")}
                            >
                              Afvis
                            </Button>
                          </div>
                        </div>
                      </Table.Cell>
                    ) : null}

                    {queue === "rejected" ? (
                      <Table.Cell>
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {review.moderation_note ?? "—"}
                        </Text>
                      </Table.Cell>
                    ) : null}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Anmeldelser",
  icon: ChatBubbleLeftRight,
});

export default ReviewModeration;
