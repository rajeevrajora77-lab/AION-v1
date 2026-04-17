import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MessageBubble({ message }) {
  const isAssistant = message.role === 'assistant';

  if (!isAssistant) {
    return (
      <div className="flex w-full justify-end mb-6">
        <div className="bg-[#2f2f2f] text-[#ececec] rounded-2xl px-5 py-3.5 max-w-[85%] whitespace-pre-wrap text-[15.5px] leading-relaxed font-sans">
          {message.content}
        </div>
      </div>
    );
  }

  // Parse attached images
  const renderContent = () => {
    if (message.type === 'image') {
      return <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>;
    }
    
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="my-4 rounded-lg overflow-hidden border border-[#333]">
                <div className="bg-[#2a2a2a] text-gray-400 text-xs px-4 py-2 uppercase font-medium flex justify-between">
                  <span>{match[1]}</span>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="!m-0 !bg-[#1e1e1e]"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-[#2a2a2a] text-[#ddb990] px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>
                {children}
              </code>
            );
          },
          h1: ({node, ...props}) => <h1 className="text-2xl font-semibold mt-6 mb-3 text-[#ececec]" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-5 mb-3 text-[#ececec]" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-[#ececec]" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 text-[#ececec] text-[15.5px] leading-[1.65]" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="text-[#ececec] text-[15.5px]" {...props} />,
          strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-600 pl-4 py-1 my-4 text-gray-300 bg-transparent rounded-r-lg" {...props} />,
          a: ({node, ...props}) => <a className="text-[#ddb990] hover:text-[#e5cdae] underline underline-offset-2" rel="noopener noreferrer" target="_blank" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto mb-4 border border-[#333] rounded-lg"><table className="w-full text-left border-collapse" {...props} /></div>,
          th: ({node, ...props}) => <th className="border-b border-[#333] bg-[#2a2a2a] px-4 py-3 font-semibold text-[#ececec] text-sm" {...props} />,
          td: ({node, ...props}) => <td className="border-b border-[#333] px-4 py-3 text-[#ececec] text-sm" {...props} />
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex w-full justify-start gap-4 mb-8">
      {/* Claude-like Assistant Avatar */}
      <div className="w-8 h-8 rounded-md bg-[#ddb990] flex items-center justify-center shrink-0 mt-1 shadow-sm">
        <svg fill="#1c1c1c" width="18" height="18" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="3"/></svg>
      </div>
      <div className="w-full md:max-w-[calc(100%-3rem)] font-sans overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
