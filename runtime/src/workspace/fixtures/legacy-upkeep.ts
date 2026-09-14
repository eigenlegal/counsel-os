import { UPKEEP_SCHEMA } from '../upkeep-schema';
import { SOURCE_LINKS_SCHEMA } from '../source-links-schema';
import { AUTO_FILING_SCHEMA } from '../auto-filing-schema';

export const DROP_AUTO_FILING = 'DROP TABLE import_organization_files; DROP TABLE workspace_drafts;\n' + [...AUTO_FILING_SCHEMA.matchAll(/CREATE TRIGGER (auto_filing_[a-z_]+)/g)]
  .map(match => `DROP TRIGGER ${match[1]};`).join('\n') + '\nDROP TABLE auto_filing_results; DROP TABLE auto_filing_protection; DROP TABLE auto_filing_tasks; DROP TABLE auto_filing_settings;\n';

export const DROP_SOURCE_LINKS = DROP_AUTO_FILING + [...SOURCE_LINKS_SCHEMA.matchAll(/CREATE TRIGGER (source_links_[a-z_]+)/g)]
  .map(match => `DROP TRIGGER ${match[1]};`).join('\n') + '\nDROP TABLE source_link_refresh;\n';

/** Synthetic downgrade fixtures only; never a production migration or recovery action. */
export const DROP_UPKEEP = DROP_SOURCE_LINKS + [...UPKEEP_SCHEMA.matchAll(/CREATE TRIGGER (upkeep_[a-z_]+)/g)]
  .map(match => `DROP TRIGGER ${match[1]};`).join('\n') +
  '\nDROP TABLE upkeep_queue; DROP TABLE upkeep_findings; DROP TABLE upkeep_runs;\n';
