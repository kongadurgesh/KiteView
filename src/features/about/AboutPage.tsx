import { PageLayout } from '../../components/layout/PageLayout';
import { PAGE_COPY } from '../../content/pageCopy';

const TRACK_RECORD = [
  { fy: '2021-22', status: 'Net Positive', proofLabel: 'View P&L (Groww)', url: 'https://docs.google.com/spreadsheets/d/1P04wvDCzSVS0UxyIZTOGnMohoJtiGZoE/edit?usp=sharing&ouid=111406837300351215866&rtpof=true&sd=true', type: 'sheet' as const },
  { fy: '2022-23', status: 'Net Positive', proofLabel: 'View P&L (Groww)', url: 'https://docs.google.com/spreadsheets/d/11cD9ttg6tS1e0Bjl51lpwiIxhB3TGecW/edit?usp=sharing&ouid=111406837300351215866&rtpof=true&sd=true', type: 'sheet' as const },
  { fy: '2023-24', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/ab143f05-371f-40a6-97b0-deafbedf312c.html', type: 'verified' as const },
  { fy: '2024-25', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/53edf16c-39a4-490a-83ee-809d22ff5498.html', type: 'verified' as const },
  { fy: '2025-26', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/83ba31c7-8a4f-4436-a94a-8d141acab9b7.html', type: 'verified' as const },
  { fy: '2026-27', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/1d748036-e2bc-4d1a-be83-94bf9bb6012f.html', type: 'verified' as const },
];

const { about: copy } = PAGE_COPY;

export function AboutPage() {
  return (
    <PageLayout className="max-w-3xl" title={copy.title}>
      <div className="w-full space-y-6">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold shrink-0">
            DK
          </div>
          <div className="w-full min-w-0">
            <h2 className="section-title text-xl">{copy.identityName}</h2>
            <p className="section-desc">{copy.identityTagline}</p>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="label-caps mb-3">{copy.philosophyTitle}</h3>
          <p className="body-text">
            <span className="font-semibold text-ink-primary dark:text-ink-dark-primary">{copy.philosophyQuote}</span>{' '}
            {copy.philosophyBody}
          </p>
        </div>

        <div className="card p-5">
          <h3 className="label-caps mb-4">{copy.trackRecordTitle}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-muted dark:text-ink-dark-muted uppercase tracking-wider">
                  <th className="text-left pb-3 font-medium">Financial Year</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Proof</th>
                </tr>
              </thead>
              <tbody>
                {TRACK_RECORD.map((row) => (
                  <tr key={row.fy} className="border-t border-border dark:border-border-dark">
                    <td className="py-3 font-medium text-ink-primary dark:text-ink-dark-primary">{row.fy}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-desc mt-4">
            FY 2021-23 reports are from Groww. FY 2023-24 onwards are FYERS Verified P&L links which are tamper-proof and
            independently verifiable.
          </p>
        </div>

        <div className="card p-5">
          <h3 className="label-caps mb-4">Get in Touch</h3>
          <div className="flex flex-wrap gap-4">
            <a href="mailto:kongadurgesh20@gmail.com" className="btn-secondary text-sm">
              Email
            </a>
            <a href="https://linkedin.com/in/durgeshkonga" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
              LinkedIn
            </a>
            <a href="https://x.com/durgesh_konga" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
              X (Twitter)
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
