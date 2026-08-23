import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils";
import type { Logger, NotificationTypes } from "@medusajs/framework/types";
import { EMAIL_TEMPLATES, renderEmail, type EmailData, type EmailTemplate } from "./templates";

interface ResendOptions {
  apiKey: string;
  fromEmail: string;
  replyTo?: string;
  channels?: string[];
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Transactional e-mail through Resend.
 *
 * The provider is a thin transport: subject and markup come from
 * `templates.ts`, which is shared with any future provider (Postmark, SMTP).
 * Swapping ESP means writing another ~60-line class, not rewriting the mails.
 */
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static override identifier = "resend";

  protected readonly logger_: Logger;
  protected readonly options_: ResendOptions;

  static override validateOptions(options: Record<string, unknown>): void {
    if (!options.apiKey) {
      throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Resend mangler apiKey");
    }
    if (!options.fromEmail) {
      throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Resend mangler fromEmail");
    }
  }

  constructor(container: { logger: Logger }, options: ResendOptions) {
    super();
    this.logger_ = container.logger;
    this.options_ = options;
  }

  override async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!isKnownTemplate(notification.template)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Ukendt e-mailskabelon: ${notification.template}`
      );
    }

    const rendered = renderEmail(notification.template, (notification.data ?? {}) as EmailData);

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.options_.fromEmail,
        to: [notification.to],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        ...(this.options_.replyTo ? { reply_to: this.options_.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      // The recipient address is intentionally not logged: it is personal data
      // and an e-mail failure does not need it to be diagnosed.
      this.logger_.error(
        `[email] Resend afviste ${notification.template}: ${response.status} ${detail.slice(0, 200)}`
      );
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "E-mailen kunne ikke sendes");
    }

    const body = (await response.json()) as { id?: string };
    return { id: body.id };
  }
}

function isKnownTemplate(template: string): template is EmailTemplate {
  return Object.values(EMAIL_TEMPLATES).includes(template as EmailTemplate);
}

export default ResendNotificationProviderService;
