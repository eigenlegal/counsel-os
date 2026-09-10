import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "../test/dom";
import {
  DocumentReader,
  practiceUsesMarkdown,
  readingParts,
  sourceUsesMarkdown,
} from "./DocumentReader";

afterEach(cleanup);
const imported =
  'Imported from plugin:practice/standards/notice.md. Pending review; no approval inferred.\r\n\r\n---\r\ncontent-version: "synthetic"\r\n---\r\n# Notice\r\n\r\nUse **written** notices.\r\n\r\n- Keep evidence.\r\n';
describe("workspace document reading", () => {
  test("formats imported Markdown, collapses metadata, and retains every saved character", () => {
    const { container } = render(<DocumentReader text={imported} markdown />);
    expect(screen.getByRole("heading", { name: "Notice" })).toBeTruthy();
    expect(container.querySelector("strong")?.textContent).toBe("written");
    expect(container.querySelector("li")?.textContent).toBe("Keep evidence.");
    expect(container.querySelector("details")?.open).toBe(false);
    expect(
      container.querySelector(".document-markdown")?.textContent,
    ).not.toContain("content-version");
    fireEvent.click(screen.getByRole("button", { name: "Saved text" }));
    expect(container.querySelector(".record-prose")?.textContent).toBe(
      imported,
    );
    expect(
      screen
        .getByRole("button", { name: "Saved text" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Reading view" }));
    expect(screen.getByRole("heading", { name: "Notice" })).toBeTruthy();
  });
  test("leaves plaintext punctuation and document extraction untouched", () => {
    const body = "# Not a heading\n*verbatim*\n<contract>literal</contract>";
    const { container } = render(
      <DocumentReader text={body} markdown={false} />,
    );
    expect(container.querySelector(".record-prose")?.textContent).toBe(body);
    expect(container.querySelector("h1")).toBeNull();
    expect(screen.queryByRole("button", { name: "Saved text" })).toBeNull();
    expect(
      sourceUsesMarkdown({ origin: "x.md", mediaType: "text/plain" }),
    ).toBe(false);
    expect(sourceUsesMarkdown({ origin: "plugin:x.md" })).toBe(true);
    expect(
      sourceUsesMarkdown({
        origin: "file:x",
        mediaType: "text/markdown; charset=utf-8",
      }),
    ).toBe(true);
    expect(
      sourceUsesMarkdown({
        origin: "file:x.docx",
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toBe(false);
    expect(practiceUsesMarkdown(imported)).toBe(true);
    expect(
      practiceUsesMarkdown(imported.replace("notice.md", "notice.docx")),
    ).toBe(false);
  });
  test("does not hide ordinary prose between rules or malformed frontmatter", () => {
    for (const text of [
      "---\nOrdinary paragraph.\n---\nNext.",
      "---\nkey: value\nNo closing fence",
      "A paragraph\n---\nkey: value\n---",
    ])
      expect(readingParts(text)).toEqual({ body: text, metadata: [] });
  });
  test("sanitizes hostile imported markup, links and remote embeds", () => {
    const { container } = render(
      <DocumentReader
        markdown
        text={
          '# Hello\n<script>bad()</script>\n<img src="https://example.invalid/tracker" onerror="bad()">\n\n[bad](javascript:bad)\n[authority](https://example.com/law)\n\n<p onclick="bad()">Readable</p>'
        }
      />,
    );
    expect(container.querySelector("script, img, [onclick]")).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(
      screen.getByRole("link", { name: "authority" }).getAttribute("rel"),
    ).toBe("noopener noreferrer");
    expect(screen.getByText("Readable")).toBeTruthy();
  });
});
