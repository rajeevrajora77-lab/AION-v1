import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ============================================================================
// COPY BUTTON — reusable clipboard component with feedback
// ============================================================================
function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-xs transition-all duration-200 ${
        copied
          ? 'text-green-400'
          : 'text-gray-400 hover:text-gray-200'
      } ${className}`}
      aria-label={copied ? 'Copied!' : label}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

// ============================================================================
// LINKIFY — auto-detect URLs in plain text (for user messages)
// ============================================================================
const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;

function Linkify({ children }) {
  if (typeof children !== 'string') return children;

  const parts = children.split(URL_REGEX);
  if (parts.length === 1) return children;

  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all"
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================
export default function MessageBubble({ message }) {
  const isAssistant = message.role === 'assistant';

  // --- User message ---
  if (!isAssistant) {
    return (
      <div className="flex w-full justify-end mb-6">
        <div className="bg-[#2f2f2f] text-[#ececec] rounded-2xl px-5 py-3.5 max-w-[85%] whitespace-pre-wrap text-[15.5px] leading-relaxed font-sans">
          <Linkify>{message.content}</Linkify>
        </div>
      </div>
    );
  }

  // --- Assistant message ---
  const renderContent = () => {
    if (message.type === 'image') {
      return <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>;
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            return !inline && match ? (
              <div className="my-4 rounded-lg overflow-hidden border border-[#333]">
                <div className="bg-[#2a2a2a] text-gray-400 text-xs px-4 py-2 uppercase font-medium flex justify-between items-center">
                  <span>{match[1]}</span>
                  <CopyButton text={codeString} label="Copy code" />
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="!m-0 !bg-[#1e1e1e]"
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : !inline ? (
              // Code block without language specified
              <div className="my-4 rounded-lg overflow-hidden border border-[#333]">
                <div className="bg-[#2a2a2a] text-gray-400 text-xs px-4 py-2 font-medium flex justify-between items-center">
                  <span>code</span>
                  <CopyButton text={codeString} label="Copy code" />
                </div>
                <pre className="!m-0 !bg-[#1e1e1e] p-4 overflow-x-auto">
                  <code className="text-[#e2e8f0] text-sm font-mono" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-[#2a2a2a] text-[#ddb990] px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>
                {children}
              </code>
            );
          },
          h1: ({ node, ...props }) => <h1 className="text-2xl font-semibold mt-6 mb-3 text-[#ececec]" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-3 text-[#ececec]" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-[#ececec]" {...props} />,
          p: ({ node, ...props }) => <p className="mb-4 text-[#ececec] text-[15.5px] leading-[1.65]" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="text-[#ececec] text-[15.5px]" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-600 pl-4 py-1 my-4 text-gray-300 bg-transparent rounded-r-lg" {...props} />,
          a: ({ node, ...props }) => <a className="text-[#ddb990] hover:text-[#e5cdae] underline underline-offset-2" rel="noopener noreferrer" target="_blank" {...props} />,
          table: ({ node, ...props }) => <div className="overflow-x-auto mb-4 border border-[#333] rounded-lg"><table className="w-full text-left border-collapse" {...props} /></div>,
          th: ({ node, ...props }) => <th className="border-b border-[#333] bg-[#2a2a2a] px-4 py-3 font-semibold text-[#ececec] text-sm" {...props} />,
          td: ({ node, ...props }) => <td className="border-b border-[#333] px-4 py-3 text-[#ececec] text-sm" {...props} />,
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex w-full justify-start gap-4 mb-8">
      {/* Assistant Avatar */}
      <div className="w-8 h-8 rounded-md bg-[#ddb990] flex items-center justify-center shrink-0 mt-1 shadow-sm">
        <svg fill="#1c1c1c" width="18" height="18" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="3"/></svg>
      </div>
      <div className="w-full md:max-w-[calc(100%-3rem)] font-sans overflow-hidden">
        {renderContent()}
        {/* Copy entire response button */}
        <div className="mt-2 flex items-center gap-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 group-hover:opacity-100"
          style={{ opacity: undefined }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
          onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
        >
          <CopyButton text={message.content} label="Copy response" className="px-2 py-1 rounded-md hover:bg-[#2a2a2a]" />
        </div>
      </div>
    </div>
  );
}
