export type RiskLevel = "Low" | "Medium" | "High";
export type Profile = "Conservative Beginner" | "Balanced Beginner" | "Growth Beginner";
export type FitLabel = { label: string; style: string };

export interface Etf {
  ticker: string;
  name: string;
  category: string;
  riskLevel: RiskLevel;
  bestFor: string;
  explanation: string;
  beginnerNote: string;
  whyFit: string;
  watchOut: string;
  questions: string[];
}

export const ETFs: Etf[] = [
  {
    ticker: "XEQT",
    name: "iShares Core Equity ETF Portfolio",
    category: "All-in-one equity ETF",
    riskLevel: "High",
    bestFor: "Long-term growth investors",
    explanation:
      "A globally diversified all-equity ETF that gives beginners exposure to thousands of companies in one fund.",
    beginnerNote:
      "Good for people with a long timeline who can handle market ups and downs.",
    whyFit:
      "It gives broad global stock exposure in one ETF, which makes it simpler than picking individual stocks.",
    watchOut:
      "It is 100% stocks, so it can drop significantly during market downturns.",
    questions: [
      "Is my timeline at least 10 years?",
      "Can I handle large short-term losses without panic-selling?",
      "Do I want a one-fund portfolio?",
    ],
  },
  {
    ticker: "VEQT",
    name: "Vanguard All-Equity ETF Portfolio",
    category: "All-in-one equity ETF",
    riskLevel: "High",
    bestFor: "Long-term growth investors",
    explanation:
      "A simple one-fund portfolio with global stock exposure across Canada, the U.S., and international markets.",
    beginnerNote:
      "Similar to XEQT. Useful for beginners who want broad diversification without picking individual stocks.",
    whyFit:
      "It is a simple all-equity portfolio with global diversification from Vanguard.",
    watchOut:
      "It has high stock exposure, so it is better suited for long-term investors.",
    questions: [
      "Am I investing for long-term growth and comfortable being fully invested in stocks?",
      "Do I understand that similar ETFs like XEQT can overlap?",
    ],
  },
  {
    ticker: "VGRO",
    name: "Vanguard Growth ETF Portfolio",
    category: "All-in-one growth ETF",
    riskLevel: "Medium",
    bestFor: "Balanced growth investors",
    explanation:
      "A diversified ETF with mostly stocks and some bonds, designed for growth with slightly less volatility than an all-equity ETF.",
    beginnerNote:
      "Good for people who want growth but do not want to be 100% in stocks.",
    whyFit:
      "It combines stocks and bonds, which can make it easier to hold through market swings than a 100% stock ETF.",
    watchOut:
      "It may grow slower than an all-equity ETF during strong stock markets.",
    questions: [
      "Do I want growth with some stability?",
      "Would a smoother ride help me stay invested?",
      "Am I okay with slightly lower upside than a 100% stock ETF?",
    ],
  },
  {
    ticker: "VBAL",
    name: "Vanguard Balanced ETF Portfolio",
    category: "Balanced ETF",
    riskLevel: "Medium",
    bestFor: "Moderate investors",
    explanation:
      "A balanced ETF with a mix of stocks and bonds, built for people who want growth but also want more stability.",
    beginnerNote: "Good for beginners who feel nervous about big market swings.",
    whyFit:
      "It balances stocks and bonds, which can help reduce volatility for newer investors.",
    watchOut:
      "It may be too conservative if your timeline is very long and you want maximum growth.",
    questions: [
      "Do market drops make me nervous?",
      "Do I want a balanced mix instead of full stock exposure?",
      "Is stability important to me right now?",
    ],
  },
  {
    ticker: "CASH",
    name: "Global X High Interest Savings ETF",
    category: "Cash / savings ETF",
    riskLevel: "Low",
    bestFor: "Short-term savings",
    explanation:
      "A low-risk ETF designed to generate interest-like income while keeping money relatively stable.",
    beginnerNote:
      "Better suited for short-term goals or money you do not want exposed to stock market risk.",
    whyFit:
      "It can be useful for short-term savings or money you do not want exposed to stock market risk.",
    watchOut:
      "This ETF is not designed for long-term growth like stock ETFs.",
    questions: [
      "Do I need this money soon?",
      "Am I using this for savings instead of investing?",
      "Do I understand this is not a growth ETF?",
    ],
  },
];

export const riskBadge: Record<RiskLevel, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

export const fitLabels: Record<Profile, Record<string, FitLabel>> = {
  "Conservative Beginner": {
    CASH: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    VBAL: { label: "Good learning match", style: "bg-blue-100 text-blue-700" },
    VGRO: { label: "Higher risk", style: "bg-amber-100 text-amber-700" },
    XEQT: { label: "May be too aggressive", style: "bg-red-100 text-red-700" },
    VEQT: { label: "May be too aggressive", style: "bg-red-100 text-red-700" },
  },
  "Balanced Beginner": {
    VBAL: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    VGRO: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    CASH: { label: "Low-risk parking option", style: "bg-blue-100 text-blue-700" },
    XEQT: { label: "Higher growth option", style: "bg-amber-100 text-amber-700" },
    VEQT: { label: "Higher growth option", style: "bg-amber-100 text-amber-700" },
  },
  "Growth Beginner": {
    XEQT: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    VEQT: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    VGRO: { label: "Balanced alternative", style: "bg-blue-100 text-blue-700" },
    VBAL: { label: "More conservative", style: "bg-amber-100 text-amber-700" },
    CASH: { label: "Short-term savings only", style: "bg-slate-100 text-slate-600" },
  },
};

export const defaultFit: FitLabel = {
  label: "Learning option",
  style: "bg-slate-100 text-slate-500",
};

export function deriveProfile(
  answers: { risk: string; timeline: string } | null
): Profile | null {
  if (!answers) return null;
  const riskScore =
    answers.risk === "I am comfortable with higher risk" ? 2
    : answers.risk === "I can handle some ups and downs" ? 1
    : 0;
  const timelineScore =
    answers.timeline === "10+ years" ? 2
    : answers.timeline === "3–10 years" ? 1
    : 0;
  const score = riskScore + timelineScore;
  if (score >= 3) return "Growth Beginner";
  if (score >= 1) return "Balanced Beginner";
  return "Conservative Beginner";
}

export function getFit(ticker: string, profile: Profile | null): FitLabel {
  if (!profile) return defaultFit;
  return fitLabels[profile][ticker] ?? defaultFit;
}
