import { cn } from "@nordprint/ui";

/**
 * A deliberately small Markdown renderer.
 *
 * Guides use headings, paragraphs, lists, tables, bold, inline code and links
 * — that is the whole vocabulary, and it is what this supports. A full
 * Markdown pipeline plus a sanitiser is ~80 kB of dependencies for a handful
 * of guide pages, and every one of those dependencies is a place for an
 * injection bug to live.
 *
 * Safety model: nothing is ever passed to `dangerouslySetInnerHTML`. The input
 * is parsed into React elements, so a guide containing `<script>` renders as
 * the literal text `<script>` rather than executing. That holds even if a
 * future CMS lets a less-trusted author write the content.
 */
export function Markdown({
  content,
  className,
}: {
  readonly content: string;
  readonly className?: string;
}): React.JSX.Element {
  return <div className={cn("space-y-5", className)}>{renderBlocks(content)}</div>;
}

function renderBlocks(content: string): React.JSX.Element[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.JSX.Element[] = [];

  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    // Heading
    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const text = heading[2]!;
      const classes = {
        2: "mt-10 text-2xl font-bold tracking-tight",
        3: "mt-8 text-xl font-semibold tracking-tight",
        4: "mt-6 text-base font-semibold",
      }[level as 2 | 3 | 4];

      blocks.push(
        level === 2 ? (
          <h2 key={key++} className={classes}>
            {inline(text)}
          </h2>
        ) : level === 3 ? (
          <h3 key={key++} className={classes}>
            {inline(text)}
          </h3>
        ) : (
          <h4 key={key++} className={classes}>
            {inline(text)}
          </h4>
        )
      );
      index += 1;
      continue;
    }

    // Table
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        rows.push(lines[index]!);
        index += 1;
      }
      blocks.push(<Table key={key++} rows={rows} />);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul
          key={key++}
          className="ml-5 list-disc space-y-1.5 text-ink-soft marker:text-line-strong"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="leading-relaxed">
              {inline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol
          key={key++}
          className="ml-5 list-decimal space-y-1.5 text-ink-soft marker:text-ink-faint"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="leading-relaxed">
              {inline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph — consume until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? "").trim().length > 0 &&
      !/^(#{2,4}\s|[-*]\s|\d+\.\s|\|)/.test(lines[index] ?? "")
    ) {
      paragraph.push(lines[index]!);
      index += 1;
    }

    blocks.push(
      <p key={key++} className="leading-relaxed text-ink-soft">
        {inline(paragraph.join(" "))}
      </p>
    );
  }

  return blocks;
}

function Table({ rows }: { rows: string[] }): React.JSX.Element {
  const parse = (row: string): string[] =>
    row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const header = parse(rows[0] ?? "");
  // The second row is the alignment separator; it carries no content.
  const body = rows.slice(2).map(parse);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {header.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className="border-b border-line-strong p-2.5 text-left font-semibold text-ink"
              >
                {inline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-line p-2.5 text-ink-soft">
                  {inline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Inline formatting: `**bold**`, `` `code` `` and `[text](href)`.
 *
 * Links are restricted to http(s) and site-relative paths, so a `javascript:`
 * URL in content can never become a live link.
 */
function inline(text: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern).filter((part) => part.length > 0);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[0.875em] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const label = link[1]!;
      const href = link[2]!;
      const safe = /^https?:\/\//i.test(href) || href.startsWith("/");
      if (!safe) return <span key={index}>{label}</span>;

      const external = href.startsWith("http");
      return (
        <a
          key={index}
          href={href}
          className="text-accent underline-offset-2 hover:underline"
          {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
        >
          {label}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
