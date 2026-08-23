import { brand, palette, siteConfig } from "@nordprint/config";

/**
 * Transactional e-mail templates in the NordPrint brand.
 *
 * Plain, table-free HTML with inline styles: e-mail clients are hostile to
 * modern CSS, and a receipt that renders wrong in Outlook is a support ticket.
 * Every template also produces a text part — some customers, and every spam
 * filter, read that one.
 */

export const EMAIL_TEMPLATES = {
  ORDER_PLACED: "order-placed",
  PAYMENT_CAPTURED: "payment-captured",
  ORDER_SHIPPED: "order-shipped",
  ORDER_REFUNDED: "order-refunded",
  PASSWORD_RESET: "password-reset",
} as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];

export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

interface OrderLineData {
  title: string;
  variantTitle?: string | null;
  quantity: number;
  total: string;
}

export interface EmailData {
  customerName?: string | null;
  orderDisplayId?: number | string;
  orderUrl?: string;
  lines?: OrderLineData[];
  subtotal?: string;
  shipping?: string;
  discount?: string;
  total?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrierName?: string | null;
  refundAmount?: string;
  resetUrl?: string;
  [key: string]: unknown;
}

const shell = (title: string, body: string): string => `
<div style="margin:0;padding:24px 12px;background:${palette.paper};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${palette.ink};">
  <div style="max-width:560px;margin:0 auto;background:${palette.white};border:1px solid ${palette.fog};border-radius:12px;overflow:hidden;">
    <div style="padding:20px 24px;border-bottom:1px solid ${palette.fog};">
      <span style="font-size:18px;font-weight:700;letter-spacing:-0.01em;">${brand.name}</span>
      <span style="font-size:13px;color:${palette.slate};margin-left:8px;">${brand.tagline}</span>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${title}</h1>
      ${body}
    </div>
    <div style="padding:16px 24px;border-top:1px solid ${palette.fog};font-size:12px;color:${palette.slate};line-height:1.6;">
      ${brand.legalName} · CVR ${siteConfig.cvr}<br>
      ${siteConfig.address.street}, ${siteConfig.address.postalCode} ${siteConfig.address.city}<br>
      <a href="mailto:${siteConfig.supportEmail}" style="color:${palette.aurora};">${siteConfig.supportEmail}</a>
    </div>
  </div>
</div>`;

const button = (href: string, label: string): string =>
  `<a href="${href}" style="display:inline-block;background:${palette.aurora};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>`;

const linesTable = (lines: OrderLineData[]): string => `
<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
  <tbody>
    ${lines
      .map(
        (line) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${palette.fog};">
        ${escapeHtml(line.title)}${line.variantTitle ? `<br><span style="color:${palette.slate};font-size:13px;">${escapeHtml(line.variantTitle)}</span>` : ""}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid ${palette.fog};text-align:center;color:${palette.slate};white-space:nowrap;">${line.quantity} stk.</td>
      <td style="padding:8px 0;border-bottom:1px solid ${palette.fog};text-align:right;white-space:nowrap;">${escapeHtml(line.total)}</td>
    </tr>`
      )
      .join("")}
  </tbody>
</table>`;

const totals = (data: EmailData): string => `
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
  <tbody>
    ${row("Subtotal", data.subtotal)}
    ${data.discount ? row("Rabat", `− ${data.discount}`) : ""}
    ${row("Fragt", data.shipping)}
    <tr>
      <td style="padding:10px 0 0;font-weight:700;">I alt</td>
      <td style="padding:10px 0 0;text-align:right;font-weight:700;">${escapeHtml(data.total ?? "")}</td>
    </tr>
  </tbody>
</table>`;

const row = (label: string, value?: string): string =>
  value
    ? `<tr><td style="padding:4px 0;color:${palette.slate};">${label}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(value)}</td></tr>`
    : "";

const greeting = (name?: string | null): string =>
  name ? `Hej ${escapeHtml(name.split(" ")[0] ?? name)}` : "Hej";

export function renderEmail(template: EmailTemplate, data: EmailData): RenderedEmail {
  switch (template) {
    case EMAIL_TEMPLATES.ORDER_PLACED: {
      const subject = `Tak for din ordre #${data.orderDisplayId ?? ""}`;
      return {
        subject,
        html: shell(
          "Vi har modtaget din ordre",
          `<p style="margin:0 0 12px;line-height:1.6;">${greeting(data.customerName)} — tak fordi du handler hos ${brand.name}. Vi går i gang med at pakke, så snart betalingen er godkendt.</p>
           ${data.lines ? linesTable(data.lines) : ""}
           ${totals(data)}
           ${data.orderUrl ? `<p style="margin:24px 0 0;">${button(data.orderUrl, "Se din ordre")}</p>` : ""}`
        ),
        text: [
          `${greeting(data.customerName)} — tak for din ordre #${data.orderDisplayId ?? ""}.`,
          ...(data.lines ?? []).map(
            (line) => `- ${line.title}${line.variantTitle ? ` (${line.variantTitle})` : ""} x${line.quantity}: ${line.total}`
          ),
          `I alt: ${data.total ?? ""}`,
          data.orderUrl ? `Se din ordre: ${data.orderUrl}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }

    case EMAIL_TEMPLATES.PAYMENT_CAPTURED:
      return {
        subject: `Betaling modtaget — ordre #${data.orderDisplayId ?? ""}`,
        html: shell(
          "Din betaling er gennemført",
          `<p style="margin:0 0 12px;line-height:1.6;">${greeting(data.customerName)} — vi har modtaget ${escapeHtml(data.total ?? "din betaling")}. Din ordre er nu på vej gennem lageret.</p>
           ${data.orderUrl ? `<p style="margin:24px 0 0;">${button(data.orderUrl, "Følg din ordre")}</p>` : ""}`
        ),
        text: `${greeting(data.customerName)} — vi har modtaget din betaling på ${data.total ?? ""}. Ordre #${data.orderDisplayId ?? ""}.`,
      };

    case EMAIL_TEMPLATES.ORDER_SHIPPED:
      return {
        subject: `Din ordre #${data.orderDisplayId ?? ""} er sendt`,
        html: shell(
          "Pakken er på vej",
          `<p style="margin:0 0 12px;line-height:1.6;">${greeting(data.customerName)} — din ordre er afsendt${data.carrierName ? ` med ${escapeHtml(data.carrierName)}` : ""}.</p>
           ${
             data.trackingNumber
               ? `<p style="margin:0 0 16px;line-height:1.6;">Pakkenummer: <strong>${escapeHtml(data.trackingNumber)}</strong></p>`
               : ""
           }
           ${data.trackingUrl ? `<p style="margin:24px 0 0;">${button(data.trackingUrl, "Følg pakken")}</p>` : ""}`
        ),
        text: `${greeting(data.customerName)} — din ordre #${data.orderDisplayId ?? ""} er afsendt. ${
          data.trackingNumber ? `Pakkenummer: ${data.trackingNumber}. ` : ""
        }${data.trackingUrl ?? ""}`,
      };

    case EMAIL_TEMPLATES.ORDER_REFUNDED:
      return {
        subject: `Refundering af ordre #${data.orderDisplayId ?? ""}`,
        html: shell(
          "Vi har refunderet dit køb",
          `<p style="margin:0 0 12px;line-height:1.6;">${greeting(data.customerName)} — vi har refunderet ${escapeHtml(data.refundAmount ?? "")}. Beløbet er typisk tilbage på din konto inden for 1-5 bankdage.</p>`
        ),
        text: `${greeting(data.customerName)} — vi har refunderet ${data.refundAmount ?? ""} for ordre #${data.orderDisplayId ?? ""}.`,
      };

    case EMAIL_TEMPLATES.PASSWORD_RESET:
      return {
        subject: `Nulstil din adgangskode hos ${brand.name}`,
        html: shell(
          "Nulstil din adgangskode",
          `<p style="margin:0 0 12px;line-height:1.6;">${greeting(data.customerName)} — klik nedenfor for at vælge en ny adgangskode. Linket udløber om 15 minutter.</p>
           ${data.resetUrl ? `<p style="margin:24px 0 0;">${button(data.resetUrl, "Vælg ny adgangskode")}</p>` : ""}
           <p style="margin:16px 0 0;font-size:13px;color:${palette.slate};line-height:1.6;">Har du ikke bedt om det? Så kan du roligt ignorere denne mail — din adgangskode er uændret.</p>`
        ),
        text: `Nulstil din adgangskode: ${data.resetUrl ?? ""} (linket udløber om 15 minutter).`,
      };
  }
}

/** Templates are ours, but the data in them is customer input. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
