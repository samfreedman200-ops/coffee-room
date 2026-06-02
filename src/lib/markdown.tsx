import React from "react";

/**
 * Lightweight, safe Markdown -> JSX renderer.
 * Supports: paragraphs, line breaks, **bold**, *italic*, `code`,
 *           [text](url), `> quote` lines, fenced ```code``` blocks,
 *           > headings via #, ##, ###.
 * Anything else is preserved as plaintext.
 *
 * We never use dangerouslySetInnerHTML — output is JSX, so React escapes.
 */

// Allow http(s) absolute, root-relative paths (but NOT protocol-relative
// `//evil.com`), anchors, and mailto. The `\/[^/]|\/$` clause rejects `//`.
const SAFE_URL = /^(https?:\/\/|\/[^/]|\/$|#|mailto:)/i;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  const push = (node: React.ReactNode) => {
    out.push(<React.Fragment key={`${keyPrefix}-${k++}`}>{node}</React.Fragment>);
  };

  while (i < text.length) {
    const remaining = text.slice(i);

    // `code` (inline)
    const codeM = /^`([^`\n]+)`/.exec(remaining);
    if (codeM) {
      push(
        <code className="px-1 py-0.5 rounded bg-line text-foreground text-[0.9em]">
          {codeM[1]}
        </code>,
      );
      i += codeM[0].length;
      continue;
    }

    // ![alt](url) images — must come before link parsing.
    const imgM = /^!\[([^\]\n]*)\]\(([^)\s]+)\)/.exec(remaining);
    if (imgM) {
      const url = imgM[2]!;
      const alt = imgM[1]!;
      if (SAFE_URL.test(url)) {
        push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            loading="lazy"
            className="my-2 rounded-md max-w-full h-auto"
          />,
        );
      } else {
        push(imgM[0]);
      }
      i += imgM[0].length;
      continue;
    }

    // [text](url) links
    const linkM = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(remaining);
    if (linkM) {
      const url = linkM[2]!;
      if (SAFE_URL.test(url)) {
        push(
          <a
            href={url}
            className="text-accent underline hover:opacity-80"
            target={url.startsWith("http") ? "_blank" : undefined}
            rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {renderInline(linkM[1]!, `${keyPrefix}-l${k}`)}
          </a>,
        );
      } else {
        push(linkM[0]);
      }
      i += linkM[0].length;
      continue;
    }

    // **bold**
    const boldM = /^\*\*([^*\n]+)\*\*/.exec(remaining);
    if (boldM) {
      push(<strong>{renderInline(boldM[1]!, `${keyPrefix}-b${k}`)}</strong>);
      i += boldM[0].length;
      continue;
    }

    // *italic*
    const italicM = /^\*([^*\n]+)\*/.exec(remaining);
    if (italicM) {
      push(<em>{renderInline(italicM[1]!, `${keyPrefix}-i${k}`)}</em>);
      i += italicM[0].length;
      continue;
    }

    // Bare URL autolink
    const urlM = /^https?:\/\/[^\s<>]+/.exec(remaining);
    if (urlM) {
      push(
        <a
          href={urlM[0]}
          className="text-accent underline hover:opacity-80"
          target="_blank"
          rel="noopener noreferrer"
        >
          {urlM[0]}
        </a>,
      );
      i += urlM[0].length;
      continue;
    }

    // Single line break (within a paragraph) preserved as <br/>
    if (remaining[0] === "\n") {
      push(<br />);
      i++;
      continue;
    }

    // Plain character (consume up to the next special token start)
    const next = remaining.search(/[`*\[\n!]|https?:\/\//);
    const chunkLen = next === -1 ? remaining.length : Math.max(1, next);
    push(remaining.slice(0, chunkLen));
    i += chunkLen;
  }

  return out;
}

export function Markdown({ text }: { text: string }) {
  // Split into blocks by blank lines, BUT keep fenced code blocks intact.
  const blocks: { kind: "code" | "text"; content: string; lang?: string }[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let buf: string[] = [];
  let inCode = false;
  let codeLang: string | undefined;
  let codeBuf: string[] = [];

  const flushText = () => {
    if (buf.length === 0) return;
    blocks.push({ kind: "text", content: buf.join("\n").trim() });
    buf = [];
  };
  const flushCode = () => {
    blocks.push({ kind: "code", content: codeBuf.join("\n"), lang: codeLang });
    codeBuf = [];
    codeLang = undefined;
  };

  for (const line of lines) {
    if (inCode) {
      if (/^```\s*$/.test(line)) {
        inCode = false;
        flushCode();
      } else {
        codeBuf.push(line);
      }
    } else {
      const fence = /^```\s*(\w*)\s*$/.exec(line);
      if (fence) {
        flushText();
        // Push buffered paragraph break boundary
        inCode = true;
        codeLang = fence[1] || undefined;
        continue;
      }
      if (line.trim() === "") {
        flushText();
      } else {
        buf.push(line);
      }
    }
  }
  flushText();
  if (inCode) flushCode();

  return (
    <div className="space-y-3">
      {blocks.map((b, idx) => {
        if (b.kind === "code") {
          return (
            <pre
              key={idx}
              className="p-3 rounded-md bg-line/40 text-xs leading-relaxed overflow-x-auto font-mono whitespace-pre"
            >
              <code>{b.content}</code>
            </pre>
          );
        }
        // Block patterns first.
        const heading = /^(#{1,3})\s+(.+)$/.exec(b.content);
        if (heading && !b.content.includes("\n")) {
          const level = heading[1]!.length;
          const inner = renderInline(heading[2]!, `h${idx}`);
          if (level === 1)
            return (
              <h2
                key={idx}
                className="text-xl font-medium tracking-tight mt-2"
              >
                {inner}
              </h2>
            );
          if (level === 2)
            return (
              <h3 key={idx} className="text-lg font-medium tracking-tight mt-2">
                {inner}
              </h3>
            );
          return (
            <h4
              key={idx}
              className="text-base font-medium tracking-tight mt-2"
            >
              {inner}
            </h4>
          );
        }

        // Block quote: every line starts with `> `
        if (b.content.split("\n").every((l) => l.startsWith(">"))) {
          const cleaned = b.content
            .split("\n")
            .map((l) => l.replace(/^>\s?/, ""))
            .join("\n");
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-line pl-3 text-muted italic"
            >
              {renderInline(cleaned, `q${idx}`)}
            </blockquote>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderInline(b.content, `p${idx}`)}
          </p>
        );
      })}
    </div>
  );
}
