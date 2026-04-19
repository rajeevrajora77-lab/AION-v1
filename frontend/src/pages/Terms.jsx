import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center gap-1 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to AION
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Terms &amp; Conditions</h1>
          <p className="text-gray-500 text-sm">Last updated: April 2025</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the AION platform (&quot;Service&quot;), you agree to be bound by these Terms. If you do not agree, you must not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree to provide accurate, current, and complete information during registration.</li>
              <li>You are solely responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Acceptable Use Policy</h2>
            <p className="mb-3">You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate or distribute illegal, harmful, or abusive content.</li>
              <li>Attempt unauthorized access to systems or accounts.</li>
              <li>Reverse engineer or decompile any part of the Service.</li>
              <li>Conduct automated scraping or data extraction without permission.</li>
              <li>Impersonate any person or entity.</li>
              <li>Circumvent security-related features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. AI Limitations Disclaimer</h2>
            <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-4 mb-3">
              <p className="text-yellow-300/90 text-sm font-medium mb-2">&#9888;&#65039; Important AI Disclaimer</p>
              <p className="text-gray-300 text-sm">AION is powered by AI. Responses may contain inaccuracies or outdated information. Always verify critical information independently.</p>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI responses are not professional advice (legal, medical, financial, or otherwise).</li>
              <li>Results are non-deterministic — similar inputs may produce different outputs.</li>
              <li>We do not guarantee accuracy, completeness, or reliability of AI-generated content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Service Availability</h2>
            <p>The Service is provided &quot;as is&quot; and &quot;as available.&quot; We do not warrant uninterrupted, secure, or error-free operation. We may modify, suspend, or discontinue the Service at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, AION and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data &amp; Privacy</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">We do not train our AI models on your personal data.</strong></li>
              <li>Your data is used only for system functionality, security, and service improvement.</li>
              <li>Account data is encrypted at rest and in transit.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Termination</h2>
            <p>We may terminate or suspend your account for breach of these Terms. You may deactivate your account at any time through account settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
            <p>For questions, contact us at <a href="mailto:support@rajora.live" className="text-blue-400 hover:text-blue-300 underline">support@rajora.live</a></p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} AION by Rajora AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
