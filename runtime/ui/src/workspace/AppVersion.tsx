import release from '../../../../desktop/release.json';
import { desktopReleaseNotesUrl, desktopReleaseTag } from '../../../../desktop/version';

export function AppVersion({ desktop = false }: { desktop?: boolean }) {
  return <div className="app-version" aria-label="Application version">
    <span>Version {release.version} (build {release.build})</span>
    <span className="app-version-context">{desktop ? 'macOS preview' : 'Development workspace'}</span>
    <a href={desktopReleaseNotesUrl} target="_blank" rel="noopener noreferrer" title={desktopReleaseTag()}>Release notes</a>
  </div>;
}
