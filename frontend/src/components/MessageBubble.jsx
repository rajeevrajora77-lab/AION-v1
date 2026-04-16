import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MessageBubble({ message }) {
  const isAssistant = message.role === 'assistant';

  if (!isAssistant) {
    return (
      <div className="flex w-full justify-end mb-4">
        <div className="bg-indigo-600 text-white rounded-2xl px-4 py-2 max-w-[80%] whitespace-pre-wrap">
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
            const match = /language-(\\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-md my-2"
                {...props}
              >
                {String(children).replace(/\\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-5 mb-2 text-slate-100" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-4 mb-2 text-slate-100 border-b border-slate-700 pb-1" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-3 mb-1 text-slate-100" {...props} />,
          p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="text-slate-200" {...props} />,
          strong: ({node, ...props}) => <strong className="font-semibold text-slate-200" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 my-3 text-slate-400 bg-slate-800/30 rounded-r-lg" {...props} />,
          a: ({node, ...props}) => <a className="text-indigo-400 hover:text-indigo-300 underline" rel="noopener noreferrer" target="_blank" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className="w-full text-left border-collapse" {...props} /></div>,
          th: ({node, ...props}) => <th className="border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-200" {...props} />,
          td: ({node, ...props}) => <td className="border border-slate-700 px-4 py-2" {...props} />
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex w-full justify-start mb-6">
      <div className="bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl rounded-tl-sm px-6 py-4 max-w-[90%] md:max-w-[85%] prose prose-invert overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
