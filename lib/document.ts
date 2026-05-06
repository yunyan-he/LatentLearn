import type { LearningDocument, Section } from "@/lib/types";

const headingPattern = /^(#{1,6})\s+(.+)$/gm;

export function parseMarkdownFile(name: string, content: string): LearningDocument {
  const structure = extractMarkdownSections(content);
  const title = structure[0]?.title ?? name.replace(/\.md$/i, "") ?? "未命名文档";

  return {
    type: "file",
    title,
    content: normalizeMarkdown(content),
    structure
  };
}

export function createTopicDocument(topic: string): LearningDocument {
  const cleaned = topic.trim();
  return {
    type: "topic",
    title: cleaned,
    content: `用户想学习的主题：${cleaned}`,
    structure: [
      {
        id: "topic-overview",
        title: cleaned,
        level: 1,
        content: cleaned
      }
    ]
  };
}

export function extractMarkdownSections(content: string): Section[] {
  const matches = [...content.matchAll(headingPattern)];

  if (matches.length === 0) {
    return [
      {
        id: "overview",
        title: "总览",
        level: 1,
        content: normalizeMarkdown(content)
      }
    ];
  }

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? content.length;
    return {
      id: slugify(match[2], index),
      title: match[2].trim(),
      level: match[1].length,
      content: normalizeMarkdown(content.slice(start, end))
    };
  });
}

export function sectionTitles(sections: Section[]): string {
  return sections.map((section) => `${"#".repeat(section.level)} ${section.title}`).join("\n");
}

export function selectRelevantDocumentContent(content: string, anchor?: string, maxLength = 7000): string {
  if (content.length <= maxLength) return content;
  if (!anchor) return `${content.slice(0, maxLength)}\n\n[文档已截断]`;

  const index = content.indexOf(anchor);
  if (index < 0) return `${content.slice(0, maxLength)}\n\n[文档已截断]`;

  const half = Math.floor(maxLength / 2);
  const start = Math.max(0, index - half);
  const end = Math.min(content.length, index + anchor.length + half);
  return `${start > 0 ? "[前文已截断]\n" : ""}${content.slice(start, end)}${end < content.length ? "\n[后文已截断]" : ""}`;
}

function normalizeMarkdown(content: string): string {
  return content.replace(/\r\n/g, "\n").trim();
}

function slugify(value: string, index: number): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return slug || `section-${index + 1}`;
}
