/**
 * LegalBench (Guha et al., 2023): 162 tasks, each a TSV of `text` → `answer`
 * with its own base prompt. The default import takes the contract families
 * — `contract_nli_*`, `cuad_*`, `maud_*` — every one a short classification
 * a model answers from the clause alone. `--tasks` names any other task by
 * its LegalBench name; the loader fetches whatever it is told.
 *
 * Data: `huggingface.co/datasets/nguha/legalbench` (`data/<task>/test.tsv`).
 * Prompts and per-task licenses: `github.com/HazyResearch/legalbench`
 * (`tasks/<task>/base_prompt.txt`, `tasks/<task>/README.md`). The card says
 * CC BY 4.0; a task's README can say otherwise (`definition_classification`
 * is CC BY-SA 4.0), so each fixture records its task's own line.
 */
import { parseTsv } from './csv';
import { download, fixtureId, sourceOf, textOf, type BenchmarkFile, type BenchmarkFixtures, type BenchmarkLoader, type FetchOptions, type ToFixturesOptions } from './types';

export const LEGALBENCH_DATA = 'https://huggingface.co/datasets/nguha/legalbench/resolve/main/data';
export const LEGALBENCH_REPO = 'https://raw.githubusercontent.com/HazyResearch/legalbench/main/tasks';

/** The contract families (86 tasks as of 2026-09). */
export const LEGALBENCH_CONTRACT_TASKS: readonly string[] = [
  'contract_nli_confidentiality_of_agreement', 'contract_nli_explicit_identification', 'contract_nli_inclusion_of_verbally_conveyed_information', 'contract_nli_limited_use', 'contract_nli_no_licensing', 'contract_nli_notice_on_compelled_disclosure', 'contract_nli_permissible_acquirement_of_similar_information', 'contract_nli_permissible_copy', 'contract_nli_permissible_development_of_similar_information', 'contract_nli_permissible_post-agreement_possession', 'contract_nli_return_of_confidential_information', 'contract_nli_sharing_with_employees', 'contract_nli_sharing_with_third-parties', 'contract_nli_survival_of_obligations',
  'cuad_affiliate_license-licensee', 'cuad_affiliate_license-licensor', 'cuad_anti-assignment', 'cuad_audit_rights', 'cuad_cap_on_liability', 'cuad_change_of_control', 'cuad_competitive_restriction_exception', 'cuad_covenant_not_to_sue', 'cuad_effective_date', 'cuad_exclusivity', 'cuad_expiration_date', 'cuad_governing_law', 'cuad_insurance', 'cuad_ip_ownership_assignment', 'cuad_irrevocable_or_perpetual_license', 'cuad_joint_ip_ownership', 'cuad_license_grant', 'cuad_liquidated_damages', 'cuad_minimum_commitment', 'cuad_most_favored_nation', 'cuad_no-solicit_of_customers', 'cuad_no-solicit_of_employees', 'cuad_non-compete', 'cuad_non-disparagement', 'cuad_non-transferable_license', 'cuad_notice_period_to_terminate_renewal', 'cuad_post-termination_services', 'cuad_price_restrictions', 'cuad_renewal_term', 'cuad_revenue-profit_sharing', 'cuad_rofr-rofo-rofn', 'cuad_source_code_escrow', 'cuad_termination_for_convenience', 'cuad_third_party_beneficiary', 'cuad_uncapped_liability', 'cuad_unlimited-all-you-can-eat-license', 'cuad_volume_restriction', 'cuad_warranty_duration',
  'maud_ability_to_consummate_concept_is_subject_to_mae_carveouts', 'maud_accuracy_of_fundamental_target_rws_bringdown_standard', 'maud_accuracy_of_target_capitalization_rw_(outstanding_shares)_bringdown_standard_answer', 'maud_accuracy_of_target_general_rw_bringdown_timing_answer', 'maud_additional_matching_rights_period_for_modifications_(cor)', 'maud_application_of_buyer_consent_requirement_(negative_interim_covenant)', 'maud_buyer_consent_requirement_(ordinary_course)', 'maud_change_in_law__subject_to_disproportionate_impact_modifier', 'maud_changes_in_gaap_or_other_accounting_principles__subject_to_disproportionate_impact_modifier', 'maud_cor_permitted_in_response_to_intervening_event', 'maud_cor_permitted_with_board_fiduciary_determination_only', 'maud_cor_standard_(intervening_event)', 'maud_cor_standard_(superior_offer)', 'maud_definition_contains_knowledge_requirement_-_answer', 'maud_definition_includes_asset_deals', 'maud_definition_includes_stock_deals', 'maud_fiduciary_exception__board_determination_standard', 'maud_fiduciary_exception_board_determination_trigger_(no_shop)', 'maud_financial_point_of_view_is_the_sole_consideration', 'maud_fls_(mae)_standard', 'maud_general_economic_and_financial_conditions_subject_to_disproportionate_impact_modifier', 'maud_includes_consistent_with_past_practice', 'maud_initial_matching_rights_period_(cor)', 'maud_initial_matching_rights_period_(ftr)', 'maud_intervening_event_-_required_to_occur_after_signing_-_answer', 'maud_knowledge_definition', 'maud_liability_standard_for_no-shop_breach_by_target_non-do_representatives', 'maud_ordinary_course_efforts_standard', 'maud_pandemic_or_other_public_health_event__subject_to_disproportionate_impact_modifier', 'maud_pandemic_or_other_public_health_event_specific_reference_to_pandemic-related_governmental_responses_or_measures', 'maud_relational_language_(mae)_applies_to', 'maud_specific_performance', 'maud_tail_period_length', 'maud_type_of_consideration',
];

/**
 * The `**License**:` line of a task README — a markdown link, or the plain
 * text after the label.
 *
 * LegalBench is per-task: most tasks are CC BY 4.0 and at least one
 * (`definition_classification`) is CC BY-SA 4.0. Reading the line is how a
 * fixture records which, so a line this cannot read must never fall back to
 * the permissive default — the one task whose README is formatted
 * differently is exactly the one that would be recorded wrongly.
 */
export function licenseLineOf(readme: string): string | null {
  const linked = /\*\*License\*\*:\s*\[([^\]]+)\]\(([^)]+)\)/.exec(readme);
  if (linked !== null) return `${linked[1]!.trim()} (${linked[2]!.trim()})`;
  const plain = /\*\*License\*\*:\s*([^\n[]+)/.exec(readme);
  const text = plain?.[1]?.trim();
  return text === undefined || text === '' ? null : text;
}

/** What a fixture records when the task's README does not say. Never the
 * set's permissive default. */
export const LICENSE_UNKNOWN = 'unknown — the task README does not state one; see the task page before relying on it';

/** The base prompt with every `{{column}}` filled from the row. */
export function fillPrompt(prompt: string, row: Record<string, string>): string {
  return prompt.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, col: string) => row[col] ?? '').trimEnd();
}

function taskOf(path: string): string {
  return path.split('/')[0]!;
}

export const legalbench: BenchmarkLoader = {
  id: 'legalbench',
  name: 'LegalBench',
  url: 'https://huggingface.co/datasets/nguha/legalbench',
  license: 'CC BY 4.0 (per task; see each task README)',
  attribution: 'Guha et al., "LegalBench: A Collaboratively Built Benchmark for Measuring Legal Reasoning in Large Language Models" (2023). Contract tasks derive from CUAD (Hendrycks et al.), MAUD (Wang et al.) and ContractNLI (Koreeda & Manning).',
  redistributable: true,
  tasks: [...LEGALBENCH_CONTRACT_TASKS],

  async fetch(opts: FetchOptions = {}): Promise<BenchmarkFile[]> {
    const tasks = opts.tasks === undefined || opts.tasks.length === 0 ? this.tasks : opts.tasks;
    const files: BenchmarkFile[] = [];
    for (const task of tasks) {
      files.push({ path: `${task}/test.tsv`, bytes: await download(`${LEGALBENCH_DATA}/${task}/test.tsv`, opts) });
      files.push({ path: `${task}/base_prompt.txt`, bytes: await download(`${LEGALBENCH_REPO}/${task}/base_prompt.txt`, opts) });
      files.push({ path: `${task}/README.md`, bytes: await download(`${LEGALBENCH_REPO}/${task}/README.md`, opts) });
    }
    return files;
  },

  toFixtures(files: BenchmarkFile[], opts: ToFixturesOptions = {}): BenchmarkFixtures {
    const present = [...new Set(files.map(f => taskOf(f.path)))];
    const wanted = opts.tasks === undefined || opts.tasks.length === 0 ? present : present.filter(t => opts.tasks!.includes(t));
    const fixtures: Record<string, unknown>[] = [];
    for (const task of wanted) {
      const tsv = files.find(f => f.path === `${task}/test.tsv`);
      const prompt = files.find(f => f.path === `${task}/base_prompt.txt`);
      if (tsv === undefined || prompt === undefined) throw new Error(`legalbench: task ${task} is missing test.tsv or base_prompt.txt`);
      const readme = files.find(f => f.path === `${task}/README.md`);
      const license = readme === undefined ? null : licenseLineOf(textOf(readme.bytes));
      const promptText = textOf(prompt.bytes);
      let rows = parseTsv(textOf(tsv.bytes));
      if (opts.subset !== undefined) rows = rows.slice(0, opts.subset);
      // Every LegalBench task's test split has an `answer` column. One that
      // does not would import as a fixture whose every expected answer is
      // the empty string — which the classification scorer accepts and then
      // scores zero on for ever.
      const missing = rows.findIndex(row => (row.answer ?? '').trim() === '');
      if (missing !== -1) throw new Error(`legalbench: task ${task} has no answer on row ${missing + 1}; its test split is not in the expected shape`);
      fixtures.push({
        id: fixtureId('legalbench', task),
        title: `LegalBench · ${task}`,
        vault: 'legalbench',
        scorer: 'classification',
        source: sourceOf(this, license ?? LICENSE_UNKNOWN),
        documents: rows.map(row => ({
          id: row.index ?? String(rows.indexOf(row)),
          task: `${fillPrompt(promptText, row)}\n\nAnswer with the label only.`,
          expected: { answer: row.answer ?? '' },
        })),
      });
    }
    return { fixtures, documents: {} };
  },
};
