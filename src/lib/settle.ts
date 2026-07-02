export type Scores = {
  homeScore: number;
  awayScore: number;
  homeScoreH1: number;
  awayScoreH1: number;
  homeScoreH2: number;
  awayScoreH2: number;
};

export type SelectionData = {
  marketKey: string;
  typeofBet: string;
  point?: number | null;
};

export type BetSelectionResult = {
  selectionId: string;
  marketKey: string;
  typeofBet: string;
  point: number | null;
  outcomeName: string | null;
  label: string;
  outcome: 'WON' | 'LOST' | 'VOIDED';
};

export type BetSettleResult = {
  betId: string;
  userId: string;
  username: string;
  stake: number;
  odds: number;
  selections: BetSelectionResult[];
  overall: 'WON' | 'LOST' | 'VOIDED' | 'PARTIAL_VOID';
  payout: number;
};

export type SettlementSummary = {
  totalBets: number;
  totalStake: number;
  wonCount: number;
  wonPayout: number;
  lostCount: number;
  lostStake: number;
  voidedCount: number;
  voidedStake: number;
  partialVoidCount: number;
  partialVoidPayout: number;
  profit: number;
  betResults: BetSettleResult[];
};

function getH2HOutcome(homeScore: number, awayScore: number, typeofBet: string): 'WON' | 'LOST' | 'VOIDED' {
  if (typeofBet === 'HOME_WINS') return homeScore > awayScore ? 'WON' : 'LOST';
  if (typeofBet === 'AWAY_WINS') return awayScore > homeScore ? 'WON' : 'LOST';
  if (typeofBet === 'DRAW') return homeScore === awayScore ? 'WON' : 'LOST';
  return 'VOIDED';
}

function getHT_H2HOutcome(homeScore: number, awayScore: number, typeofBet: string): 'WON' | 'LOST' | 'VOIDED' {
  if (typeofBet === 'HT_HOME_WINS') return homeScore > awayScore ? 'WON' : 'LOST';
  if (typeofBet === 'HT_AWAY_WINS') return awayScore > homeScore ? 'WON' : 'LOST';
  if (typeofBet === 'HT_DRAW') return homeScore === awayScore ? 'WON' : 'LOST';
  return 'VOIDED';
}

function getHT2_H2HOutcome(homeScore: number, awayScore: number, typeofBet: string): 'WON' | 'LOST' | 'VOIDED' {
  if (typeofBet === 'HT2_HOME_WINS') return homeScore > awayScore ? 'WON' : 'LOST';
  if (typeofBet === 'HT2_AWAY_WINS') return awayScore > homeScore ? 'WON' : 'LOST';
  if (typeofBet === 'HT2_DRAW') return homeScore === awayScore ? 'WON' : 'LOST';
  return 'VOIDED';
}

function getBttsOutcome(homeScore: number, awayScore: number, typeofBet: string): 'WON' | 'LOST' {
  const bothScored = homeScore > 0 && awayScore > 0;
  if (typeofBet === 'BOTH_TEAMS_TO_SCORE_YES') return bothScored ? 'WON' : 'LOST';
  if (typeofBet === 'BOTH_TEAMS_TO_SCORE_NO') return !bothScored ? 'WON' : 'LOST';
  return 'LOST';
}

function getOverUnderOutcome(total: number, point: number, typeofBet: string): 'WON' | 'LOST' {
  if (typeofBet === 'OVER') return total > point ? 'WON' : 'LOST';
  if (typeofBet === 'UNDER') return total < point ? 'WON' : 'LOST';
  return 'LOST';
}

function getSpreadOutcome(homeScore: number, awayScore: number, point: number, typeofBet: string): 'WON' | 'LOST' {
  if (typeofBet === 'HOME_COVER') return homeScore + point > awayScore ? 'WON' : 'LOST';
  if (typeofBet === 'AWAY_COVER') return awayScore + point > homeScore ? 'WON' : 'LOST';
  return 'LOST';
}

function getDoubleChanceOutcome(homeScore: number, awayScore: number, typeofBet: string): 'WON' | 'LOST' {
  if (typeofBet === 'HOME_WINS_OR_DRAW') return homeScore >= awayScore ? 'WON' : 'LOST';
  if (typeofBet === 'AWAY_WINS_OR_DRAW') return awayScore >= homeScore ? 'WON' : 'LOST';
  if (typeofBet === 'HOME_OR_AWAY') return homeScore !== awayScore ? 'WON' : 'LOST';
  return 'LOST';
}

function getDrawNoBetOutcome(homeScore: number, awayScore: number, typeofBet: string): 'WON' | 'LOST' | 'VOIDED' {
  if (homeScore === awayScore) return 'VOIDED';
  if (typeofBet === 'HOME_WINS') return homeScore > awayScore ? 'WON' : 'LOST';
  if (typeofBet === 'AWAY_WINS') return awayScore > homeScore ? 'WON' : 'LOST';
  return 'LOST';
}

export function selectionLabel(
  marketKey: string,
  typeofBet: string,
  point: number | null,
  outcomeName: string | null,
): string {
  if (outcomeName) return outcomeName;

  const p = point != null ? Number(point) : null;
  const fmtP = p != null ? (p > 0 ? `+${p}` : `${p}`) : '';

  switch (marketKey) {
    case 'h2h':
    case 'h2h_lay':
    case 'double_chance':
    case 'draw_no_bet':
      if (typeofBet === 'HOME_WINS') return 'Home';
      if (typeofBet === 'AWAY_WINS') return 'Away';
      if (typeofBet === 'DRAW') return 'Draw';
      if (typeofBet === 'HOME_WINS_OR_DRAW') return '1X';
      if (typeofBet === 'AWAY_WINS_OR_DRAW') return 'X2';
      if (typeofBet === 'HOME_OR_AWAY') return '12';
      return typeofBet;

    case 'btts':
      if (typeofBet === 'BOTH_TEAMS_TO_SCORE_YES') return 'Yes';
      if (typeofBet === 'BOTH_TEAMS_TO_SCORE_NO') return 'No';
      return typeofBet;

    case 'totals':
    case 'alternate_totals':
    case 'totals_h1':
    case 'totals_h2':
      if (typeofBet === 'OVER') return `Over ${p}`;
      if (typeofBet === 'UNDER') return `Under ${p}`;
      return typeofBet;

    case 'spreads':
    case 'alternate_spreads':
    case 'spreads_h1':
    case 'spreads_h2':
      if (typeofBet === 'HOME_COVER') return `Home ${fmtP}`;
      if (typeofBet === 'AWAY_COVER') return `Away ${fmtP}`;
      return typeofBet;

    case 'h2h_h1':
      if (typeofBet === 'HT_HOME_WINS') return 'HT Home';
      if (typeofBet === 'HT_AWAY_WINS') return 'HT Away';
      if (typeofBet === 'HT_DRAW') return 'HT Draw';
      return typeofBet;

    case 'h2h_h2':
      if (typeofBet === 'HT2_HOME_WINS') return 'HT2 Home';
      if (typeofBet === 'HT2_AWAY_WINS') return 'HT2 Away';
      if (typeofBet === 'HT2_DRAW') return 'HT2 Draw';
      return typeofBet;

    default:
      return typeofBet;
  }
}

export function marketLabel(marketKey: string): string {
  const labels: Record<string, string> = {
    h2h: '1X2',
    h2h_lay: 'Lay 1X2',
    btts: 'BTTS',
    totals: 'Totals',
    spreads: 'Spreads',
    double_chance: 'Double Chance',
    draw_no_bet: 'Draw No Bet',
    h2h_h1: 'Half-Time',
    h2h_h2: 'Second-Half',
    totals_h1: 'HT Totals',
    totals_h2: 'HT2 Totals',
    spreads_h1: 'HT Spreads',
    spreads_h2: 'HT2 Spreads',
    alternate_totals: 'Alt Totals',
    alternate_spreads: 'Alt Spreads',
  };
  return labels[marketKey] || marketKey;
}

export function calculateSelectionOutcome(
  selection: SelectionData,
  scores: Scores,
): 'WON' | 'LOST' | 'VOIDED' {
  const pointNum = selection.point != null ? Number(selection.point) : 0;
  const { marketKey, typeofBet } = selection;

  switch (marketKey) {
    case 'h2h':
      return getH2HOutcome(scores.homeScore, scores.awayScore, typeofBet);

    case 'h2h_lay': {
      const base = getH2HOutcome(scores.homeScore, scores.awayScore, typeofBet);
      if (base === 'WON') return 'LOST';
      if (base === 'LOST') return 'WON';
      return 'VOIDED';
    }

    case 'btts':
      return getBttsOutcome(scores.homeScore, scores.awayScore, typeofBet);

    case 'totals':
    case 'alternate_totals': {
      const total = scores.homeScore + scores.awayScore;
      return getOverUnderOutcome(total, pointNum, typeofBet);
    }

    case 'spreads':
    case 'alternate_spreads':
      return getSpreadOutcome(scores.homeScore, scores.awayScore, pointNum, typeofBet);

    case 'double_chance':
      return getDoubleChanceOutcome(scores.homeScore, scores.awayScore, typeofBet);

    case 'draw_no_bet':
      return getDrawNoBetOutcome(scores.homeScore, scores.awayScore, typeofBet);

    case 'h2h_h1':
      return getHT_H2HOutcome(scores.homeScoreH1, scores.awayScoreH1, typeofBet);

    case 'h2h_h2':
      return getHT2_H2HOutcome(scores.homeScoreH2, scores.awayScoreH2, typeofBet);

    case 'totals_h1': {
      const totalH1 = scores.homeScoreH1 + scores.awayScoreH1;
      return getOverUnderOutcome(totalH1, pointNum, typeofBet);
    }

    case 'totals_h2': {
      const totalH2 = scores.homeScoreH2 + scores.awayScoreH2;
      return getOverUnderOutcome(totalH2, pointNum, typeofBet);
    }

    case 'spreads_h1':
      return getSpreadOutcome(scores.homeScoreH1, scores.awayScoreH1, pointNum, typeofBet);

    case 'spreads_h2':
      return getSpreadOutcome(scores.homeScoreH2, scores.awayScoreH2, pointNum, typeofBet);

    default:
      return 'VOIDED';
  }
}

export function settleBet(
  bet: {
    id: string;
    userId: string;
    username: string;
    stake: number;
    potentialPayout: number;
    cumulativeOdds: number | null;
    selections: { id: string; marketKey: string; typeofBet: string; point: number | null; outcomeName: string | null }[];
  },
  scores: Scores,
): BetSettleResult {
  const selectionResults = bet.selections.map((s) => {
    const outcome = calculateSelectionOutcome(
      { marketKey: s.marketKey, typeofBet: s.typeofBet, point: s.point },
      scores,
    );
    return {
      selectionId: s.id,
      marketKey: s.marketKey,
      typeofBet: s.typeofBet,
      point: s.point,
      outcomeName: s.outcomeName,
      label: selectionLabel(s.marketKey, s.typeofBet, s.point, s.outcomeName),
      outcome,
    };
  });

  const hasLost = selectionResults.some((r) => r.outcome === 'LOST');
  const hasVoided = selectionResults.some((r) => r.outcome === 'VOIDED');
  const allWon = selectionResults.every((r) => r.outcome === 'WON');

  let overall: BetSettleResult['overall'];
  let payout: number;

  if (hasLost) {
    overall = 'LOST';
    payout = 0;
  } else if (allWon) {
    overall = 'WON';
    payout = Number(bet.potentialPayout);
  } else if (hasVoided) {
    const wonSelections = selectionResults.filter((r) => r.outcome === 'WON');
    if (wonSelections.length === 0) {
      overall = 'VOIDED';
      payout = Number(bet.stake);
    } else {
      overall = 'PARTIAL_VOID';
      // For partial void (parlay with one voided leg), recalculate reduced payout
      const validOdds = bet.selections
        .filter((_, i) => selectionResults[i].outcome !== 'VOIDED')
        .reduce((prod, s) => prod * Number(s.point ?? 1), 1);
      payout = Number(bet.stake) * validOdds;
    }
  } else {
    overall = 'VOIDED';
    payout = Number(bet.stake);
  }

  return { betId: bet.id, userId: bet.userId, username: bet.username, stake: Number(bet.stake), odds: Number(bet.cumulativeOdds ?? 1), selections: selectionResults, overall, payout };
}

export function calculateSettlement(
  bets: {
    id: string;
    userId: string;
    username: string;
    stake: number;
    potentialPayout: number;
    cumulativeOdds: number | null;
    selections: { id: string; marketKey: string; typeofBet: string; point: number | null; outcomeName: string | null }[];
  }[],
  scores: Scores,
): SettlementSummary {
  const betResults = bets.map((b) => settleBet(b, scores));

  let totalStake = 0;
  let wonCount = 0;
  let wonPayout = 0;
  let lostCount = 0;
  let lostStake = 0;
  let voidedCount = 0;
  let voidedStake = 0;
  let partialVoidCount = 0;
  let partialVoidPayout = 0;

  for (const r of betResults) {
    totalStake += r.stake;
    if (r.overall === 'WON') {
      wonCount++;
      wonPayout += r.payout;
    } else if (r.overall === 'LOST') {
      lostCount++;
      lostStake += r.stake;
    } else if (r.overall === 'VOIDED') {
      voidedCount++;
      voidedStake += r.stake;
    } else if (r.overall === 'PARTIAL_VOID') {
      partialVoidCount++;
      partialVoidPayout += r.payout;
    }
  }

  const totalPayout = wonPayout + partialVoidPayout + voidedStake;
  const profit = totalStake - totalPayout;

  return {
    totalBets: betResults.length,
    totalStake,
    wonCount,
    wonPayout,
    lostCount,
    lostStake,
    voidedCount,
    voidedStake,
    partialVoidCount,
    partialVoidPayout,
    profit,
    betResults,
  };
}
