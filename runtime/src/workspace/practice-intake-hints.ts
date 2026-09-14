/** Local discovery hints, not a legal classification or permission to apply text.
 * The model reads selected originals only after the user sends the prepared chat. */
export function practiceIntakeHint(text: string, title = ''): string | null {
  const sample = text.slice(0, 12_000) + '\n' + text.slice(-4_000);
  if (/^(?:practice[ _-])?profile(?:\.(?:md|txt))?$|^(?:working|practice)[ _-]preferences(?:\.(?:md|txt))?$/i.test(title))
    return 'The filename suggests personal context or working preferences.';
  if (/(?:^|\n)\s*#{0,6}\s*(?:my practice|practice (?:profile|preferences|instructions)|writing (?:preferences|instructions|and communication)|principles and risk approach|working preferences|word output)\s*[:\n]/im.test(sample))
    return 'The text contains practice context or working instructions.';
  if (/\b(?:I prefer|my (?:writing|drafting|review) (?:style|preferences)|when (?:you|we) (?:draft|review)|for (?:future|all) .{0,35}(?:reviews|drafts|work)|attribute .{0,55}(?:comments|changes) to)\b/i.test(sample))
    return 'The text describes how you want work prepared.';
  if (/\b(?:my name is|I am (?:a |the )?(?:lawyer|counsel|attorney))\b/i.test(sample) && /\b(?:practice|prefer|draft|review|represent|advise)\b/i.test(sample))
    return 'The text may describe your own practice.';
  return null;
}
