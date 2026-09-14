// Compiled separately for qualification. Never included in Counsel.app.
import AppKit
import WebKit

struct CheckError: Error { let message: String }
@MainActor final class DesktopSmoke: NSObject, NSApplicationDelegate {
    let app: URL, root: URL, crashFixture: Bool
    var controller: WorkspaceWindow!, engine: EngineProcess!
    var downloaded: [URL] = [], pickerCalls: [(Bool, Bool)] = [], external: [URL] = []
    var phase = "startup"
    init(app: URL, root: URL, crashFixture: Bool) { self.app = app; self.root = root; self.crashFixture = crashFixture }
    func check(_ ok: @autoclosure () throws -> Bool, _ message: String) throws { if try !ok() { throw CheckError(message: message) } }
    func applicationDidFinishLaunching(_ notification: Notification) {
        Task { @MainActor in
            do { try await run(); print("PASS native desktop qualification"); exit(0) }
            catch {
                // Only fixed check labels, never JavaScript output/auth values.
                fputs("FAIL native desktop: \(phase): \((error as? CheckError)?.message ?? "\((error as NSError).domain) \((error as NSError).code)")\n", stderr)
                if controller != nil, let body = try? await js("return document.body.innerText.slice(0,5000)+'\\nINPUTS: '+JSON.stringify([...document.querySelectorAll('input[type=file]')].map(x=>x.outerHTML));") as? String {
                    try? body.write(to: root.appendingPathComponent("failure-page.txt"), atomically: true, encoding: .utf8)
                }
                if let engine { await stop(engine) }; exit(1)
            }
        }
    }
    func js(_ body: String) async throws -> Any? {
        try await withCheckedThrowingContinuation { continuation in
            controller.webView.callAsyncJavaScript(body, arguments: [:], in: nil, in: .page) { result in
                switch result {
                case .success(let value): continuation.resume(returning: value)
                case .failure(let error): continuation.resume(throwing: error)
                }
            }
        }
    }
    func waitJS(_ expression: String, label: String) async throws {
        for _ in 0..<200 {
            if (try? await js("return !!(\(expression));")) as? Bool == true { return }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        throw CheckError(message: label)
    }
    func stop(_ engine: EngineProcess) async { await withCheckedContinuation { continuation in engine.stop { continuation.resume() } } }
    func saveDrafts() async -> Bool { await withCheckedContinuation { continuation in controller.saveDrafts { continuation.resume(returning: $0) } } }
    func backup(_ action: String, file: URL, parent: URL) async -> [String: Any]? {
        let operation = NativeBackupOperation()
        return await withCheckedContinuation { continuation in
            operation.run(executable: app.appendingPathComponent("Contents/MacOS/counsel-workspace"), action: action, file: file, parent: parent) { value in
                withExtendedLifetime(operation) { continuation.resume(returning: value) }
            }
        }
    }
    func snapshot(_ name: String) async throws {
        let image = try await controller.webView.takeSnapshot(configuration: nil)
        let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
        try bitmap.representation(using: .png, properties: [:])!.write(to: root.appendingPathComponent(name))
    }
    func awaitDownloads(_ count: Int) async throws {
        for _ in 0..<150 { if downloaded.count >= count { return }; try await Task.sleep(nanoseconds: 100_000_000) }
        throw CheckError(message: "download did not reach the native save delegate")
    }
    func run() async throws {
        let fm = FileManager.default, home = root.appendingPathComponent("home", isDirectory: true)
        try fm.createDirectory(at: home, withIntermediateDirectories: false)
        let replace = root.appendingPathComponent("Synthetic replace.txt")
        try "old".write(to: replace, atomically: true, encoding: .utf8)
        let approved = try DownloadTarget(destination: replace)
        try "new".write(to: approved.staging, atomically: true, encoding: .utf8); try approved.finish()
        try check(try String(contentsOf: replace, encoding: .utf8) == "new", "approved download replacement failed")
        let stale = try DownloadTarget(destination: replace)
        try "later edit".write(to: replace, atomically: true, encoding: .utf8)
        try "stale".write(to: stale.staging, atomically: true, encoding: .utf8)
        var refused = false; do { try stale.finish() } catch { refused = true }; stale.discard()
        try check(refused && (try String(contentsOf: replace, encoding: .utf8)) == "later edit", "download replaced a changed destination")
        let manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: app.appendingPathComponent("Contents/Resources/engine-manifest.json"))) as! [String: Any]
        let build = manifest["build"] as! [String: Any]
        engine = EngineProcess(executable: app.appendingPathComponent("Contents/MacOS/counsel-workspace"), database: root.appendingPathComponent("workspace.sqlite3"), home: home, buildID: build["id"] as! String)
        controller = WorkspaceWindow(engine: engine)
        if crashFixture {
            engine.onReady = { ready in
                let data = try! JSONSerialization.data(withJSONObject: ["pid": ready.pid, "origin": ready.origin])
                try! data.write(to: self.root.appendingPathComponent("lease-ready.json"), options: .atomic)
            }
            engine.start()
            try await Task.sleep(nanoseconds: 60_000_000_000)
            throw CheckError(message: "crash fixture was not terminated")
        }
        let file = root.appendingPathComponent("Native upload.md"), folder = root.appendingPathComponent("Native folder", isDirectory: true)
        let contents = "# Native evidence\nSynthetic file chosen through the native upload delegate.\n"
        try contents.write(to: file, atomically: true, encoding: .utf8)
        try fm.createDirectory(at: folder, withIntermediateDirectories: false)
        try "Synthetic folder note.".write(to: folder.appendingPathComponent("Folder note.md"), atomically: true, encoding: .utf8)
        controller.chooseFiles = { directories, multiple, done in self.pickerCalls.append((directories, multiple)); done([directories ? folder : file]) }
        controller.chooseSave = { name, done in done(self.root.appendingPathComponent(name)) }
        controller.onDownloaded = { url in self.downloaded.append(url) }
        controller.openExternal = { url in self.external.append(url) }
        controller.start()
        try await waitJS("document.body.textContent.includes('A workspace for your practice.')", label: "initial setup did not become ready")
        try await snapshot("native-setup.png")
        phase = "onboarding scrolling"
        _ = try await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='Choose a connection').click(); return true;")
        try await waitJS("document.querySelector('.connection-setup details')", label: "onboarding AI setup did not expand")
        let setupScrolls = try await js("""
        document.querySelector('.connection-setup details').open=true;
        const main=document.querySelector('#workspace-content');
        main.scrollTop=main.scrollHeight;
        const footer=document.querySelector('.workspace-welcome footer').getBoundingClientRect();
        return getComputedStyle(main).overflowY==='auto' && main.scrollTop>0 && footer.top>=0 && footer.bottom<=innerHeight;
        """) as? Bool
        try check(setupScrolls == true, "expanded first-run AI setup clips controls below the window")
        try await snapshot("native-onboarding-scrolled.png")
        _ = try await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='Explore without AI').click(); return true;")
        try await waitJS("!!document.querySelector('textarea[aria-label=\"Message Counsel\"]:not(:disabled)') && !document.querySelector('fieldset:disabled')", label: "setup did not open local workspace")
        try await waitJS("!document.querySelector('.sidebar-setup') && !document.querySelector('.workspace-welcome')", label: "completed onboarding remained in the navigation")
        controller.confirmMessage = { _ in false }
        let cancelled = try await js("return window.confirm('Synthetic cancel check');") as? Bool
        try check(cancelled == false, "native confirm did not cancel")
        controller.confirmMessage = { _ in true }
        let confirmed = try await js("return window.confirm('Synthetic continue check');") as? Bool
        try check(confirmed == true, "native confirm did not continue")
        controller.confirmMessage = nil
        _ = try await js("const f=document.querySelector('textarea[aria-label=\"Message Counsel\"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(f,'Synthetic recovered draft — あ 🧭');f.dispatchEvent(new Event('input',{bubbles:true}));return true;")
        let draftSaved = await saveDrafts(); try check(draftSaved, "native quit flush did not save draft")
        try await waitJS("document.querySelector('textarea[aria-label=\"Message Counsel\"]').value==='Synthetic recovered draft — あ 🧭'", label: "draft input not retained")
        try check(engine.ready != nil, "engine handshake absent")
        let firstPID = engine.ready!.pid
        try check(engine.ready!.validated(pid: firstPID, database: engine.database, build: engine.buildID), "valid handshake rejected")
        try check(!engine.ready!.validated(pid: firstPID + 1, database: engine.database, build: engine.buildID), "wrong PID accepted")
        try check(!controller.owns(URL(string: "https://example.invalid")), "external URL trusted")
        let unauthorized = try await js("return (await fetch('/api/workspace')).status;") as? Int
        try check(unauthorized == 401, "unauthenticated API not rejected")
        let noBridge = try await js("return !window.webkit?.messageHandlers || Object.keys(window.webkit.messageHandlers).length===0;") as? Bool
        try check(noBridge == true, "page has an unexpected native-message bridge")
        _ = try await js("""
        const token=sessionStorage.getItem('counsel-os.token');
        const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
        const matter=await (await fetch('/api/workspace/matters',{method:'POST',headers,body:JSON.stringify({title:'Native desktop matter'})})).json();
        const source=await (await fetch('/api/workspace/files',{method:'POST',headers,body:JSON.stringify({name:'Native evidence.md',matterId:matter.id,base64:btoa('Synthetic native evidence.')})})).json();
        window.nativeFixture={matter: matter.id, revision: source.latest.id}; return true;
        """)
        _ = try await js("""
        const response=await fetch('/api/workspace/source-revisions/'+window.nativeFixture.revision+'/original',{headers:{Authorization:'Bearer '+sessionStorage.getItem('counsel-os.token')}});
        const a=document.createElement('a'); a.href=URL.createObjectURL(await response.blob()); a.download='Native saved evidence.md';document.body.append(a);a.click();return true;
        """)
        try await awaitDownloads(1)
        try check(try String(contentsOf: downloaded[0], encoding: .utf8) == "Synthetic native evidence.", "blob original download changed bytes")
        _ = try await js("""
        const r=await fetch('/api/workspace/backups/prepare',{method:'POST',headers:{Authorization:'Bearer '+sessionStorage.getItem('counsel-os.token'),'Content-Type':'application/json'},body:'{}'});
        const value=await r.json(); const a=document.createElement('a');a.href=value.downloadUrl;a.download='Native backup.counsel-backup';document.body.append(a);a.click();return true;
        """)
        try await awaitDownloads(2)
        try check((try Data(contentsOf: downloaded[1])).count > 1000, "streamed backup empty")
        phase = "native backup restore"
        let inspected = await backup("inspect", file: downloaded[1], parent: root)
        try check((inspected?["manifest"] as? [String: Any]) != nil, "native backup inspection failed")
        let restored = await backup("restore", file: downloaded[1], parent: root)
        guard let restoredPath = restored?["databasePath"] as? String else { throw CheckError(message: "native backup restore failed") }
        let recoveredDatabase = URL(fileURLWithPath: restoredPath).standardizedFileURL
        try check(recoveredDatabase.deletingLastPathComponent().deletingLastPathComponent() == root.standardizedFileURL && recoveredDatabase.deletingLastPathComponent().lastPathComponent.hasPrefix("recovered-"), "restore escaped its separate workspace")
        let brokenBackup = root.appendingPathComponent("broken.counsel-backup")
        try "Not a backup".write(to: brokenBackup, atomically: true, encoding: .utf8)
        let broken = await backup("inspect", file: brokenBackup, parent: root)
        try check(broken == nil, "native worker accepted an invalid backup")
        try check(DesktopAction.parse(URL(string: "counsel-desktop://restore")!) == .restore, "restore action unavailable")
        for invalid in ["counsel-desktop://install-codex?command=anything", "counsel-desktop://restore/path", "counsel-desktop://restore#extra", "counsel-desktop://unknown", "https://restore"] {
            try check(DesktopAction.parse(URL(string: invalid)!) == nil, "native action accepted untrusted arguments")
        }
        var actions: [DesktopAction] = []
        controller.onNativeAction = { action in actions.append(action) }
        _ = try await js("const a=document.createElement('a');a.href='counsel-desktop://restore';document.body.append(a);a.click();a.remove();return true;")
        try await Task.sleep(nanoseconds: 300_000_000)
        try check(actions == [.restore], "native restore link did not route its fixed action")
        phase = "import navigation"; controller.navigate("imports")
        try await waitJS("!!document.querySelector('input[type=file][webkitdirectory]')", label: "import route unavailable")
        phase = "file selection"
        _ = try await js("document.querySelector('input[type=file]:not([webkitdirectory])').click(); return true;")
        try await waitJS("document.body.textContent.includes('Native upload.md')", label: "native file selection was not staged")
        try await waitJS("document.body.textContent.includes('Ready for your review')", label: "file staging did not finish")
        controller.navigate("imports")
        try await waitJS("!!document.querySelector('input[type=file][webkitdirectory]:not(:disabled)')", label: "new folder import route unavailable")
        phase = "folder selection"
        _ = try await js("document.querySelector('input[type=file][webkitdirectory]').click(); return true;")
        try await waitJS("document.body.textContent.includes('Folder note.md')", label: "native folder selection was not enumerated")
        try check(pickerCalls.contains(where: { !$0.0 }) && pickerCalls.contains(where: { $0.0 }), "file/folder delegate flags missing")
        phase = "external navigation"
        _ = try await js("const a=document.createElement('a');a.href='https://example.invalid/reference';a.textContent='External QA';document.body.append(a);a.click();return true;")
        try await Task.sleep(nanoseconds: 300_000_000)
        try check(external.count == 1 && controller.owns(controller.webView.url), "external navigation did not stay outside app")
        _ = try await js("document.querySelector('a[href=\"https://example.invalid/reference\"]')?.remove(); return true;")
        phase = "snapshot"
        try await snapshot("native-window.png")
        await stop(engine)
        try check(kill(firstPID, 0) != 0, "engine survives graceful stop")
        phase = "reopen"; controller.window?.orderOut(nil); controller = WorkspaceWindow(engine: engine); controller.start()
        try await waitJS("document.body.textContent.includes('What are we working through?')", label: "reopened window unavailable")
        let matters = try await js("return (await (await fetch('/api/workspace',{headers:{Authorization:'Bearer '+sessionStorage.getItem('counsel-os.token')}})).json()).totals.matters;") as? Int
        try check(matters == 1, "reopen duplicated or lost records")
        controller.navigate("home?view=history")
        try await waitJS("document.querySelector('.recovered-drafts')?.textContent.includes('Synthetic recovered draft')", label: "reopened window did not list saved draft")
        _ = try await js("document.querySelector('.recovered-drafts a').click();return true;")
        try await waitJS("document.querySelector('textarea[aria-label=\"Message Counsel\"]')?.value==='Synthetic recovered draft — あ 🧭'", label: "draft not restored into fresh native window")
        try await snapshot("native-draft-recovered.png")
        await stop(engine)
        phase = "restored workspace reopen"
        controller.window?.orderOut(nil)
        engine = EngineProcess(executable: app.appendingPathComponent("Contents/MacOS/counsel-workspace"), database: recoveredDatabase, home: home, buildID: build["id"] as! String)
        controller = WorkspaceWindow(engine: engine); controller.start()
        try await waitJS("document.body.textContent.includes('What are we working through?')", label: "recovered workspace did not open")
        let recoveredMatters = try await js("return (await (await fetch('/api/workspace',{headers:{Authorization:'Bearer '+sessionStorage.getItem('counsel-os.token')}})).json()).totals.matters;") as? Int
        try check(recoveredMatters == 1, "restored workspace lost saved records")
        controller.navigate("settings")
        try await waitJS("document.body.textContent.includes('Your AI connection')", label: "connection settings unavailable")
        _ = try await js("document.querySelector('.connection-setup details').open=true; document.querySelector('.connection-card').scrollIntoView(); return true;")
        try await snapshot("native-connection-setup.png")
        await stop(engine)
        try check(!fm.fileExists(atPath: home.appendingPathComponent(".counsel/workspaces").path), "test opened a default workspace")
        let result: [String: Any] = ["status": "passed", "nativeWebKit": true, "pickerCalls": pickerCalls.count, "downloads": downloaded.count,
            "checks": ["optional first-run setup", "authenticated startup", "no native-message bridge", "confirmation cancel/continue", "quit flush and draft recovery in a fresh window", "blob original download", "streaming backup download", "native backup inspection and separate restore", "invalid backup refused", "native action allowlist", "restored workspace reopened", "file/folder upload delegate", "external navigation", "graceful close and reopen"],
            "limits": ["File selection and save destinations supplied by isolated test delegates; manual native-panel interaction remains to qualify.", "No live AI, private workspace or installed-app launch."]]
        try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]).write(to: root.appendingPathComponent("native-result.json"))
    }
}
@main struct NativeSmokeMain {
    @MainActor static func main() {
        guard CommandLine.arguments.count >= 3 else { exit(2) }
        let application = NSApplication.shared
        let delegate = DesktopSmoke(app: URL(fileURLWithPath: CommandLine.arguments[1]), root: URL(fileURLWithPath: CommandLine.arguments[2]), crashFixture: CommandLine.arguments.contains("--crash-fixture"))
        application.delegate = delegate; application.setActivationPolicy(.accessory)
        withExtendedLifetime(delegate) { application.run() }
    }
}
