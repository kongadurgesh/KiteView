interface AboutPageProps {
  onBack: () => void;
}

const TRACK_RECORD = [
  { fy: '2021-22', status: 'Net Positive', proofLabel: 'View P&L (Groww)', url: 'https://docs.google.com/spreadsheets/d/1P04wvDCzSVS0UxyIZTOGnMohoJtiGZoE/edit?usp=sharing&ouid=111406837300351215866&rtpof=true&sd=true', type: 'xlsx' as const },
  { fy: '2022-23', status: 'Net Positive', proofLabel: 'View P&L (Groww)', url: 'https://docs.google.com/spreadsheets/d/11cD9ttg6tS1e0Bjl51lpwiIxhB3TGecW/edit?usp=sharing&ouid=111406837300351215866&rtpof=true&sd=true', type: 'xlsx' as const },
  { fy: '2023-24', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/ab143f05-371f-40a6-97b0-deafbedf312c.html', type: 'verified' as const },
  { fy: '2024-25', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/53edf16c-39a4-490a-83ee-809d22ff5498.html', type: 'verified' as const },
  { fy: '2025-26', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/83ba31c7-8a4f-4436-a94a-8d141acab9b7.html', type: 'verified' as const },
  { fy: '2026-27', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/1d748036-e2bc-4d1a-be83-94bf9bb6012f.html', type: 'verified' as const },
];

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Identity */}
      <div className="flex items-center gap-5 mb-8">
        <div className="size-20 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          DK
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Durgesh Konga</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Retail investor since September 2021. Net profitable every financial year.
          </p>
        </div>
      </div>

      {/* Investment Philosophy */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Investment Philosophy</h3>
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <span className="font-semibold text-gray-900 dark:text-gray-100">"Cut your losers with a stop loss. Let the gainers run forward."</span>
          {' '}I follow a disciplined approach rooted in this principle — exit losing positions
          early with strict stop-losses, and hold winners with patience to maximise returns.
          Combined with technical breakout patterns and fundamental quality filters, every trade
          is sized and managed with risk at its core.
        </p>
      </div>

      {/* Track Record */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Track Record</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="text-left pb-3 font-medium">Financial Year</th>
                <th className="text-left pb-3 font-medium">Status</th>
                <th className="text-left pb-3 font-medium">Proof</th>
              </tr>
            </thead>
            <tbody>
              {TRACK_RECORD.map((row) => (
                <tr key={row.fy} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{row.fy}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {row.url === '#' ? (
                      <span className="text-gray-400 dark:text-gray-500 italic text-xs">Link coming soon</span>
                    ) : (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        {row.type === 'verified' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        )}
                        {row.proofLabel}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          FY 2021-23 reports are from Groww. FY 2023-24 onwards are FYERS Verified P&L links — tamper-proof and independently verifiable.
        </p>
      </div>

      {/* Contact */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Get in Touch</h3>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:kongadurgesh20@gmail.com"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </a>
          <a
            href="https://linkedin.com/in/durgeshkonga"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </a>
          <a
            href="https://x.com/durgesh_konga"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            X (Twitter)
          </a>
        </div>
      </div>
    </div>
  );
}
