import { PageHeader, Badge } from './components';
import { Icon, type IconName } from './icons';
import { href, type Snapshot } from './api';
import { ConnectionCard } from './ConnectionCard';
import { BackupCard } from './BackupCard';

export function Settings({
  data,
  onChanged,
}: {
  data: Snapshot;
  onChanged: () => void;
}): JSX.Element {
  const primitives: [string, string, IconName][] = [
    ['Read', 'Understand source material and its context.', 'read'],
    ['Research', 'Find what the law and your past work have to say.', 'search'],
    ['Evaluate', 'Apply judgment to the question at hand.', 'review'],
    ['Draft', 'Turn reasoning into useful work product.', 'work'],
    ['Remember', 'Keep the context, decisions, and lessons.', 'knowledge'],
  ];
  return (
    <>
      <PageHeader
        title="Workspace settings"
        description="Your data, your tools, and what is connected."
      />
      <div className="settings-stack">
        {(data.interfaceVersion ?? 0) >= 29 && <section className="settings-section import-settings-card"><div><h2>Getting started</h2><p>Connect AI, add your optional profile, and bring in your files at your own pace.</p></div><a className="button" href={href('settings', {view:'setup'})}>Workspace setup</a></section>}
        <section className="settings-section import-settings-card"><div><h2>Profile &amp; preferences</h2><p>Your practice context, writing style, document-review instructions, and Word output preferences live in Practice.</p></div><a className="button" href={href('knowledge', { section: 'preferences' })}>Open practice preferences</a></section>
        <section className="settings-section import-settings-card"><div><h2>Bring in your existing files</h2><p>Drop a folder, review suggested organization, and build your workspace from your own material.</p></div><a className="button" href={href('imports')}>Import files & folders</a></section>
        <ConnectionCard status={data.connection} onChanged={onChanged} />
        <section className="settings-section">
          <div className="settings-title">
            <span className="record-icon">
              <Icon name="shield" />
            </span>
            <div>
              <h2>Local workspace</h2>
              <p>Structured records are saved in SQLite on this device.</p>
            </div>
            <Badge tone="green">Connected</Badge>
          </div>
          <dl className="settings-details">
            <dt>Workspace</dt>
            <dd>{data.demo ? 'Example workspace · examples and your additions' : 'Personal workspace'}</dd>
            <dt>Database location</dt>
            <dd>
              <code>{data.databasePath}</code>
            </dd>
            <dt>Plugin & existing vault</dt>
            <dd>Original plugin files stay separate. Importing creates a local snapshot; it does not modify or synchronize the plugin.</dd>
          </dl>
        </section>
        <BackupCard />
        <section className="settings-section">
          <div className="settings-title">
            <span className="record-icon">
              <Icon name="reference" />
            </span>
            <div>
              <h2>Document handling</h2>
              <p>Word, PDF, text documents and saved sources can be attached to chat.</p>
            </div>
          </div>
          <p className="settings-copy">
            Word .docx and PDF files up to 25 MB are supported, alongside UTF-8 .txt and .md files
            up to 500 KB. PDF extraction supports up to 300 pages. Originals can be downloaded
            unchanged, and extraction limitations stay visible. Chat can prepare tracked replacements
            and comments, including new paragraphs, in a copy of a retained Word original up to 5 MB.
            It can also compare sent and returned Word drafts without changing either. Table restructuring,
            scanned-page OCR and legacy .doc conversion are not connected yet.
            Completed answers can also be exported to editable Word files with saved source excerpts.
          </p>
          <p className="settings-copy">For live research, Counsel can fetch dated federal regulation sections
            from eCFR and U.S. Code sections from the House publisher by citation. Only citations and supported dates go to publishers; originals and text stay in Sources.
            This is not general web search or comprehensive legal-currency verification.</p>
        </section>
        <section className="methodology-section">
          <h2>Five ways of working. No fixed sequence.</h2>
          <p>
            The standalone app is being built around the same primitives as the plugin, across every
            kind of legal work.
          </p>
          <div className="primitives-list">
            {primitives.map(([title, description, icon]) => (
              <div key={title}>
                <Icon name={icon} size={21} />
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
