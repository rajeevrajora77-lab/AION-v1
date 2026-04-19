import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center gap-1 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to AION
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">About AION</h1>
          <p className="text-gray-500 text-sm">AI Operating Intelligence Network</p>
        </div>

        {/* Hero card */}
        <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-800/30 rounded-2xl p-6 md:p-8 mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AION</h2>
              <p className="text-blue-300/80 text-sm">Enterprise AI Infrastructure</p>
            </div>
          </div>
          <p className="text-gray-300 text-[15px] leading-relaxed">
            AION is a governed AI system designed for enterprise-grade conversational intelligence.
            Built with security, compliance, and performance at its core, AION delivers a seamless,
            ChatGPT-level experience while maintaining strict data governance and user privacy.
          </p>
        </div>

        {/* Capabilities */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Core Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '🧠', title: 'Advanced LLM Integration', desc: 'Multi-provider LLM support with intelligent fallback and streaming responses.' },
              { icon: '🔒', title: 'Enterprise Security', desc: 'JWT authentication, AES-256 encryption, rate limiting, and CORS protection.' },
              { icon: '💬', title: 'Real-time Chat', desc: 'Server-Sent Events (SSE) streaming with persistent session management.' },
              { icon: '🎨', title: 'Premium UX', desc: 'Clean, minimal interface with dark theme, responsive design, and smooth animations.' },
            ].map((item) => (
              <div key={item.title} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="text-white font-medium mb-1.5">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rajora AI */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Built by Rajora AI</h2>
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg shadow-indigo-500/20">
                R
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Rajora AI</h3>
                <p className="text-gray-500 text-sm mb-3">Founded 2025 &middot; Governed AI &amp; Enterprise LLM Systems</p>
                <p className="text-gray-300 text-[15px] leading-relaxed mb-4">
                  Rajora AI is an AI infrastructure company building governed AI systems,
                  enterprise LLM infrastructure, and measurable operational outcomes.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Founder:</span>
                  <span className="text-white text-sm font-medium">Er. Rajeev Rajora</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Technology</h2>
          <div className="flex flex-wrap gap-2">
            {['React', 'Node.js', 'Express', 'MongoDB', 'Zustand', 'Vite', 'Tailwind CSS', 'JWT', 'SSE Streaming', 'Groq', 'OpenAI'].map((tech) => (
              <span key={tech} className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 text-xs font-medium">
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Links */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Links</h2>
          <div className="flex flex-wrap gap-4">
            <Link to="/terms" className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2">Terms & Conditions</Link>
            <a href="https://rajora.live" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2">rajora.live</a>
            <a href="mailto:support@rajora.live" className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2">support@rajora.live</a>
          </div>
        </section>

        <div className="mt-16 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} AION by Rajora AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
