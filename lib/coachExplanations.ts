export interface CoachContent {
  explanation: string;
  keyTakeaway: string;
}

// ─── ETF explanations (by ticker) ────────────────────────────────────────────

export const etfExplanations: Record<string, CoachContent> = {
  XEQT: {
    explanation:
      "XEQT is an all-in-one ETF that owns stocks from many countries. Instead of picking individual companies, you get broad exposure to thousands of businesses in one fund. It is built for long-term growth, but because it is 100% stocks, it can fall a lot during market downturns.",
    keyTakeaway:
      "XEQT is simple and diversified, but it is still high risk because it is fully invested in stocks.",
  },
  VEQT: {
    explanation:
      "VEQT is Vanguard's all-in-one equity ETF. It gives you global stock exposure in a single fund. It is similar to XEQT, which means most beginners probably do not need both. It can be useful for long-term investors who want simplicity and can handle volatility.",
    keyTakeaway:
      "VEQT is a simple long-term growth ETF, but it overlaps heavily with other all-equity portfolio ETFs.",
  },
  VGRO: {
    explanation:
      "VGRO is an all-in-one growth ETF with mostly stocks and some bonds. The stock portion gives it growth potential, while the bond portion can help reduce some volatility. It may be easier for some beginners to hold than a 100% stock ETF.",
    keyTakeaway:
      "VGRO is a middle ground between aggressive growth and added stability.",
  },
  VBAL: {
    explanation:
      "VBAL is a balanced ETF with a mix of stocks and bonds. It is designed for investors who want growth, but also want less volatility than an all-equity ETF. It may feel more comfortable for cautious beginners.",
    keyTakeaway:
      "VBAL may be easier to hold during market drops, but it may grow more slowly than equity-heavy ETFs.",
  },
  CASH: {
    explanation:
      "CASH is a high-interest savings ETF. It is designed more for stability and interest-like income than long-term growth. It can be useful for short-term money, emergency savings, or money you do not want exposed to stock market swings.",
    keyTakeaway:
      "CASH is not really a growth investment. It is better understood as a lower-risk place to park cash.",
  },
};

// ─── Comparison explanations (by sorted ticker pair) ─────────────────────────
// Key format: [tickerA, tickerB].sort().join("-")

export const comparisonExplanations: Record<string, CoachContent> = {
  "VEQT-XEQT": {
    explanation:
      "XEQT and VEQT are both all-equity ETFs with broad global diversification. They are offered by different companies — iShares and Vanguard — but the underlying approach is very similar. For a beginner, choosing between them often comes down to preference rather than a meaningful difference in strategy.",
    keyTakeaway:
      "Most beginners do not need both XEQT and VEQT. They overlap heavily, and picking one is usually enough.",
  },
  "VGRO-XEQT": {
    explanation:
      "XEQT is more aggressive because it is fully invested in stocks. VGRO includes bonds, which may make it easier to hold when markets drop. The main tradeoff is growth potential versus stability.",
    keyTakeaway:
      "XEQT may fit a long-term growth mindset, while VGRO may be better for someone who wants growth with a smoother ride.",
  },
  "VBAL-XEQT": {
    explanation:
      "XEQT is focused entirely on stocks and is built for long-term growth with higher short-term volatility. VBAL has a meaningful bond allocation, which makes it more stable but potentially slower-growing. The gap between them is wider than XEQT vs VGRO.",
    keyTakeaway:
      "XEQT is for growth-focused investors with a long horizon. VBAL may feel more manageable for cautious beginners.",
  },
  "CASH-XEQT": {
    explanation:
      "XEQT and CASH serve very different purposes. XEQT is for long-term wealth building through stock market growth. CASH is designed to preserve capital and generate modest interest-like income. They are rarely compared directly because they solve different problems.",
    keyTakeaway:
      "XEQT is for long-term growth and can be volatile. CASH is for short-term savings and stability. They are not substitutes for each other.",
  },
  "VGRO-VEQT": {
    explanation:
      "VEQT is 100% stocks and is built for investors who are comfortable with the ups and downs of equity markets. VGRO has a meaningful bond allocation, which can help reduce volatility. If market drops make you nervous, VGRO may feel easier to hold.",
    keyTakeaway:
      "VEQT is better for investors who can tolerate high volatility. VGRO is a better fit if you want some stability built in.",
  },
  "VBAL-VEQT": {
    explanation:
      "VEQT is fully invested in stocks and is better suited for aggressive long-term investors. VBAL has more bonds, which makes it more moderate. The gap between them reflects a meaningful difference in risk tolerance and expected short-term volatility.",
    keyTakeaway:
      "VEQT is more aggressive and focused on growth. VBAL is more balanced and may be easier to hold if market drops make you nervous.",
  },
  "CASH-VEQT": {
    explanation:
      "VEQT is a long-term equity ETF meant for investors who can hold through market volatility for years. CASH is a savings-style ETF not designed for growth. They serve different roles and are rarely compared directly.",
    keyTakeaway:
      "VEQT is built for long-term investors who can handle volatility. CASH is better understood as a place to park short-term savings.",
  },
  "VBAL-VGRO": {
    explanation:
      "Both VBAL and VGRO are all-in-one ETFs from Vanguard, but they have different stock-to-bond ratios. VGRO leans more toward stocks, which means more growth potential but also more volatility. VBAL has more bonds, making it more conservative and potentially easier to hold.",
    keyTakeaway:
      "VGRO is better for investors comfortable with more market movement. VBAL is better for those who want more stability.",
  },
  "CASH-VGRO": {
    explanation:
      "VGRO is an investment ETF designed for long-term growth through a mix of stocks and bonds. CASH is a savings-style ETF that prioritizes capital preservation over growth. They serve very different purposes for a beginner portfolio.",
    keyTakeaway:
      "VGRO is for long-term growth. CASH is for short-term savings. They are not interchangeable.",
  },
  "CASH-VBAL": {
    explanation:
      "VBAL is a balanced investment ETF with stocks and bonds designed for moderate long-term growth. CASH is much lower risk and better suited for short-term savings or money you cannot afford to lose. The gap between them in risk and purpose is significant.",
    keyTakeaway:
      "VBAL is for investing with a medium-to-long horizon. CASH is for savings and capital preservation. They solve different problems.",
  },
};

// ─── Portfolio Simulator explanations (by profile) ───────────────────────────

export const profileSimulatorExplanations: Record<string, CoachContent> = {
  "Conservative Beginner": {
    explanation:
      "This sample allocation is designed to reduce volatility and make investing feel more manageable. It includes more balanced and lower-risk options, which may help a cautious beginner avoid panic-selling during market drops. The tradeoff is that it may have lower long-term growth potential.",
    keyTakeaway:
      "This learning portfolio prioritizes stability over maximum growth.",
  },
  "Balanced Beginner": {
    explanation:
      "This sample allocation tries to balance growth and stability. It keeps a meaningful portion invested for long-term growth while including more moderate options to help reduce volatility. This can be useful for beginners who want growth but do not want the most aggressive path.",
    keyTakeaway:
      "This learning portfolio is designed to balance upside with emotional comfort.",
  },
  "Growth Beginner": {
    explanation:
      "This sample allocation leans toward long-term growth. It has more exposure to equity-heavy ETFs, which can increase long-term upside but also means the portfolio may drop significantly during market downturns. Anyone using this style needs to be comfortable staying invested through volatility.",
    keyTakeaway:
      "This learning portfolio prioritizes long-term growth, but it requires patience and risk tolerance.",
  },
};

// Generic fallback used when a specific explanation is not found
export const genericCoachContent: CoachContent = {
  explanation:
    "This is a beginner-friendly learning tool. The options shown here are educational examples, not recommendations. Before making any investment decision, consider your timeline, risk tolerance, and overall financial situation.",
  keyTakeaway:
    "Always do your own research and consult a licensed financial advisor before investing.",
};
