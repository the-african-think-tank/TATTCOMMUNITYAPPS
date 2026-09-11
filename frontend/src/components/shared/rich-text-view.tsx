"use client";

import React, { useMemo } from "react";

interface RichTextViewProps {
  content?: string | null | undefined;
  fallbackText?: string | undefined;
  className?: string | undefined;
}

/**
 * Strips malicious tags, script injections, and unsafe attributes.
 */
function sanitizeHtml(html: string): string {
  if (!html) return "";

  // 1. Strip script, iframe, object, embed, form, input, button, textarea, style, meta, link tags
  let cleaned = html.replace(
    /<(script|iframe|object|embed|form|input|button|textarea|style|meta|link)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi,
    ""
  );

  // Strip self-closing or unclosed forbidden tags
  cleaned = cleaned.replace(
    /<(script|iframe|object|embed|form|input|button|textarea|style|meta|link)[^>]*\/?>/gi,
    ""
  );

  // 2. Strip inline event handlers (onload, onclick, onerror, onmouseover, etc.)
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

  // 3. Strip dangerous href protocols (javascript:, data:text/html, vbscript:)
  cleaned = cleaned.replace(
    /href\s*=\s*(['"])\s*(?:javascript|data|vbscript):.*?\1/gi,
    'href="#"'
  );

  // 4. Ensure all links open safely in a new tab
  cleaned = cleaned.replace(/<a\b([^>]*)>/gi, (_match, attrs) => {
    let cleanAttrs = attrs;
    if (!/target\s*=/i.test(cleanAttrs)) {
      cleanAttrs += ' target="_blank"';
    }
    if (!/rel\s*=/i.test(cleanAttrs)) {
      cleanAttrs += ' rel="noopener noreferrer"';
    }
    return `<a ${cleanAttrs.trim()}>`;
  });

  return cleaned.trim();
}

/**
 * Checks whether a given string contains HTML markup tags.
 */
export function hasHtmlTags(str?: string | null): boolean {
  if (!str) return false;
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * Renders HTML rich text content safely with responsive typography,
 * or gracefully falls back to formatted plain text if no HTML tags exist.
 */
export const RichTextView: React.FC<RichTextViewProps> = ({
  content,
  fallbackText = "The employer has not provided a detailed description.",
  className = "",
}) => {
  const isHtml = useMemo(() => hasHtmlTags(content), [content]);

  const sanitized = useMemo(() => {
    if (!content || !isHtml) return "";
    return sanitizeHtml(content);
  }, [content, isHtml]);

  if (!content || !content.trim()) {
    return (
      <p className={`text-tatt-gray italic text-sm ${className}`}>
        {fallbackText}
      </p>
    );
  }

  if (!isHtml) {
    return (
      <div className={`rich-text-content whitespace-pre-line text-sm leading-relaxed text-foreground/80 ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={`rich-text-content text-sm leading-relaxed text-foreground/80 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
