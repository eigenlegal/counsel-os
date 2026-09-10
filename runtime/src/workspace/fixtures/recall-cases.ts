/** Fictional retrieval fixtures, not legal positions or current-law statements. */
export const RECALL_CASES = [
  { prompt:'Can they recruit our employees?', query:'nonsolicitation', body:'Exclude nonsolicitation covenants from confidentiality instruments.' },
  { prompt:'Must we use private adjudication instead of going to court?', query:'arbitration', body:'Arbitration clauses require escalation.' },
  { prompt:'Can the supplier move our files overseas?', query:'cross border transfers', body:'Cross-border transfers require documented assessment.' },
  { prompt:'Does this roll over by itself?', query:'evergreen renewals', body:'Evergreen renewals require a calendar reminder.' },
  { prompt:'Who pays if someone else sues us?', query:'indemnification', body:'Indemnification must address defense control.' },
  { prompt:'Can we leave early without a breach?', query:'termination convenience', body:'Termination for convenience requires notice.' },
  { prompt:'What happens if the provider goes broke?', query:'insolvency', body:'Insolvency triggers a suspension review.' },
  { prompt:"Can we use this person's image in our advertisements?", query:'publicity releases', body:'Publicity releases must identify authorized channels.' },
] as const;
