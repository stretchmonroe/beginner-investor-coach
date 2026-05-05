"use client";

interface AssetClassEntry {
  id: string;
  title: string;
  riskLevel: string;
  riskStyle: string;
  bestFor: string;
  explanation: string;
  beginnerTakeaway: string;
  etfExamples: { ticker: string; name: string; isPlaceholder?: boolean }[];
  noTickers?: string;
}

const ASSET_CLASSES: AssetClassEntry[] = [
  {
    id: "equity",
    title: "Equity ETFs",
    riskLevel: "Medium to High",
    riskStyle: "bg-red-100 text-red-700",
    bestFor: "Long-term growth",
    explanation:
      "Equity ETFs hold stocks. They are commonly used for long-term growth because stocks have higher growth potential, but they can also drop significantly in value.",
    beginnerTakeaway:
      "Equity ETFs can be useful for long timelines, but beginners need to be comfortable with market ups and downs.",
    etfExamples: [
      { ticker: "XEQT", name: "iShares Core Equity ETF Portfolio" },
      { ticker: "VEQT", name: "Vanguard All-Equity ETF Portfolio" },
    ],
  },
  {
    id: "bond",
    title: "Bond ETFs",
    riskLevel: "Low to Medium",
    riskStyle: "bg-blue-100 text-blue-700",
    bestFor: "Stability and income",
    explanation:
      "Bond ETFs hold bonds, which are loans to governments or companies. They are often used to reduce portfolio volatility, but they can still lose value when interest rates change.",
    beginnerTakeaway:
      "Bond ETFs may help smooth out a portfolio, but they are not risk-free.",
    etfExamples: [
      { ticker: "VAB", name: "Vanguard Canadian Aggregate Bond ETF", isPlaceholder: true },
      { ticker: "XBB", name: "iShares Core Canadian Universe Bond ETF", isPlaceholder: true },
      { ticker: "ZAG", name: "BMO Aggregate Bond ETF", isPlaceholder: true },
    ],
  },
  {
    id: "allinone",
    title: "All-in-one ETFs",
    riskLevel: "Depends on stock / bond mix",
    riskStyle: "bg-slate-100 text-slate-600",
    bestFor: "Simple beginner portfolios",
    explanation:
      "All-in-one ETFs combine multiple investments into one fund. Some are 100% stocks, while others mix stocks and bonds.",
    beginnerTakeaway:
      "All-in-one ETFs can be a simple way to avoid picking many separate funds.",
    etfExamples: [
      { ticker: "XEQT", name: "iShares Core Equity ETF Portfolio" },
      { ticker: "VEQT", name: "Vanguard All-Equity ETF Portfolio" },
      { ticker: "VGRO", name: "Vanguard Growth ETF Portfolio" },
      { ticker: "VBAL", name: "Vanguard Balanced ETF Portfolio" },
    ],
  },
  {
    id: "mutualfund",
    title: "Mutual Funds",
    riskLevel: "Depends on fund",
    riskStyle: "bg-slate-100 text-slate-600",
    bestFor: "Investors using banks, advisors, or automated plans",
    explanation:
      "Mutual funds pool money from many investors to buy stocks, bonds, or other investments. They can be convenient, but some have higher fees than comparable ETFs.",
    beginnerTakeaway:
      "Mutual funds are not automatically bad, but beginners should compare fees, holdings, and whether they need advisor support.",
    etfExamples: [],
    noTickers:
      "Mutual fund examples vary widely by provider, bank, or advisor. No specific tickers are listed here.",
  },
  {
    id: "cash",
    title: "Cash-like investments",
    riskLevel: "Low",
    riskStyle: "bg-emerald-100 text-emerald-700",
    bestFor: "Short-term goals and emergency savings",
    explanation:
      "Cash-like investments include high-interest savings ETFs, money market funds, savings accounts, and GIC-style products. They are usually used for money that should not be exposed to stock market risk.",
    beginnerTakeaway:
      "Cash-like options are better for short-term stability than long-term growth.",
    etfExamples: [
      { ticker: "CASH", name: "Global X High Interest Savings ETF" },
    ],
  },
];

const COMPARISON_ROWS: { feature: string; etf: string; mutual: string }[] = [
  {
    feature: "How it trades",
    etf: "Trades during market hours",
    mutual: "Usually priced once per day",
  },
  {
    feature: "Fees",
    etf: "Often lower fees",
    mutual: "Can be higher fee, depending on fund",
  },
  {
    feature: "Minimum investment",
    etf: "Usually flexible depending on brokerage",
    mutual: "May have minimums",
  },
  {
    feature: "Transparency",
    etf: "Holdings are often easier to inspect",
    mutual: "Transparency varies",
  },
  {
    feature: "Ease",
    etf: "Good for self-directed investors",
    mutual: "Can be easier through banks or advisors",
  },
  {
    feature: "Common use case",
    etf: "Common for low-cost index investing",
    mutual: "Common for automated investing or advisor-led accounts",
  },
];

interface Props {
  onBack: () => void;
}

export default function AssetClassExplorer({ onBack }: Props) {
  return (
    <main className="min-h-screen px-6 py-14 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mb-8 inline-block"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="mb-10 space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Asset Class Explorer</h1>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
          Before comparing specific ETFs or building a sample portfolio, it helps to understand the main types of investments and what they are each used for.
        </p>
      </div>

      {/* Asset class cards */}
      <div className="space-y-5 mb-14">
        {ASSET_CLASSES.map((ac) => (
          <div
            key={ac.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4"
          >
            {/* Title + risk badge */}
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">{ac.title}</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ac.riskStyle}`}>
                {ac.riskLevel}
              </span>
            </div>

            {/* Best for */}
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Best for:{" "}
              <span className="text-slate-600 normal-case tracking-normal font-semibold">
                {ac.bestFor}
              </span>
            </p>

            {/* Explanation */}
            <p className="text-sm text-slate-600 leading-relaxed">{ac.explanation}</p>

            {/* Beginner takeaway */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-emerald-700 mb-0.5 uppercase tracking-wide">
                Beginner takeaway
              </p>
              <p className="text-sm text-emerald-800 leading-relaxed">{ac.beginnerTakeaway}</p>
            </div>

            {/* ETF examples */}
            {ac.etfExamples.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Educational ETF examples
                </p>
                <div className="flex flex-wrap gap-2">
                  {ac.etfExamples.map((ex) => (
                    <div
                      key={ex.ticker}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
                        ex.isPlaceholder
                          ? "bg-slate-50 border-slate-200 text-slate-500"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      }`}
                    >
                      <span className="font-bold">{ex.ticker}</span>
                      <span className="hidden sm:inline text-slate-400">— {ex.name}</span>
                      {ex.isPlaceholder && (
                        <span className="text-slate-400 italic">· placeholder</span>
                      )}
                    </div>
                  ))}
                </div>
                {ac.etfExamples.some((e) => e.isPlaceholder) && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Bond ETF tickers are shown as educational placeholders. They are not yet included in this app&apos;s detailed ETF data.
                  </p>
                )}
              </div>
            )}

            {ac.noTickers && (
              <p className="text-xs text-slate-400 italic">{ac.noTickers}</p>
            )}
          </div>
        ))}
      </div>

      {/* ETF vs Mutual Fund comparison */}
      <div className="mb-10">
        <div className="mb-5 space-y-2">
          <h2 className="text-xl font-bold text-slate-900">ETF vs Mutual Fund</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Choosing between ETFs and mutual funds is not about one always being better. The important thing is understanding fees, holdings, risk, and whether the product fits your investing style.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-1/3">
                  Feature
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                  ETF
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Mutual Fund
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                >
                  <td className="px-5 py-4 align-top text-xs font-semibold text-slate-600">
                    {row.feature}
                  </td>
                  <td className="px-5 py-4 align-top text-xs text-slate-600 leading-relaxed">
                    {row.etf}
                  </td>
                  <td className="px-5 py-4 align-top text-xs text-slate-600 leading-relaxed">
                    {row.mutual}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Educational only. Not financial advice. </span>
          Asset class descriptions are simplified for beginners. Real investments vary in structure, fees, risk, and suitability. Always consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </main>
  );
}
