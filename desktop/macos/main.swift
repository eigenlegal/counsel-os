import AppKit
import UniformTypeIdentifiers

final class CounselApplication: NSObject, NSApplicationDelegate {
    var controller: WorkspaceWindow?
    private var closing = false
    private var backupOperation: NativeBackupOperation?
    private var engineURL: URL!, workspaceHome: URL!, engineBuildID = ""
    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            guard let engineURL = Bundle.main.executableURL?.deletingLastPathComponent().appendingPathComponent("counsel-workspace"),
                  let resource = Bundle.main.url(forResource: "engine-manifest", withExtension: "json"),
                  let manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: resource)) as? [String: Any],
                  let build = manifest["build"] as? [String: Any], let buildID = build["id"] as? String
            else { throw CocoaError(.fileReadCorruptFile) }
            let home = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)
            self.engineURL = engineURL; workspaceHome = home; engineBuildID = buildID
            let saved = UserDefaults.standard.string(forKey: "CounselSelectedWorkspace")
            let selected = saved.map { URL(fileURLWithPath: $0) }
            installMenu(); openWorkspace(selected.flatMap { FileManager.default.fileExists(atPath: $0.path) ? $0 : nil } ?? personalWorkspace)
            NSApp.activate(ignoringOtherApps: true)
        } catch {
            let alert = NSAlert(); alert.messageText = "This Counsel app is incomplete"; alert.informativeText = "Use a complete app bundle. Your workspace files have not been opened."; alert.runModal(); NSApp.terminate(nil)
        }
    }
    private func installMenu() {
        let menu = NSMenu(), appItem = NSMenuItem(); menu.addItem(appItem)
        let app = NSMenu(); appItem.submenu = app
        app.addItem(withTitle: "About Counsel", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        app.addItem(.separator()); app.addItem(withTitle: "Hide Counsel", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthers = app.addItem(withTitle: "Hide others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h"); hideOthers.keyEquivalentModifierMask = [.command, .option]
        app.addItem(withTitle: "Show all", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        app.addItem(.separator()); app.addItem(withTitle: "Quit Counsel", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let fileItem = NSMenuItem(title: "File", action: nil, keyEquivalent: ""); menu.addItem(fileItem); let file = NSMenu(title: "File"); fileItem.submenu = file
        for (title, action, key) in [("New chat", #selector(newChat), "n"), ("Import files", #selector(importFiles), "i"), ("Settings", #selector(settings), ",")] {
            let item = file.addItem(withTitle: title, action: action, keyEquivalent: key); item.target = self
        }
        file.addItem(.separator()); file.addItem(withTitle: "Close window", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        for (title, selector) in [("Restore workspace from backup…", #selector(restoreWorkspace)), ("Open workspace…", #selector(chooseWorkspace)), ("Open personal workspace", #selector(openPersonal))] {
            file.addItem(withTitle: title, action: selector, keyEquivalent: "").target = self
        }
        let editItem = NSMenuItem(title: "Edit", action: nil, keyEquivalent: ""); menu.addItem(editItem); let edit = NSMenu(title: "Edit"); editItem.submenu = edit
        for (title, action, key) in [("Undo", "undo:", "z"), ("Redo", "redo:", "Z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select all", "selectAll:", "a")] {
            edit.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        let windowItem = NSMenuItem(title: "Window", action: nil, keyEquivalent: ""); menu.addItem(windowItem)
        let windows = NSMenu(title: "Window"); windowItem.submenu = windows; NSApp.windowsMenu = windows
        windows.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windows.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        windows.addItem(.separator()); windows.addItem(withTitle: "Bring all to front", action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")
        let helpItem = NSMenuItem(title: "Help", action: nil, keyEquivalent: ""); menu.addItem(helpItem)
        let help = NSMenu(title: "Help"); helpItem.submenu = help
        help.addItem(withTitle: "Set up your workspace", action: #selector(setup), keyEquivalent: "").target = self
        NSApp.mainMenu = menu
    }
    @objc func newChat() { controller?.navigate("home?new=" + UUID().uuidString) }
    @objc func importFiles() { controller?.navigate("imports") }
    @objc func settings() { controller?.navigate("settings") }
    @objc func setup() { controller?.navigate("settings?view=setup") }
    private var personalWorkspace: URL { workspaceHome.appendingPathComponent(".counsel/workspaces/personal/workspace.sqlite3") }
    private func openWorkspace(_ database: URL) {
        let engine = EngineProcess(executable: engineURL, database: database, home: workspaceHome, buildID: engineBuildID)
        let next = WorkspaceWindow(engine: engine)
        next.window?.setFrameAutosaveName("CounselWorkspaceWindow")
        next.onClose = { NSApp.terminate(nil) }
        next.onNativeAction = { [weak self] action in if action == .restore { self?.restoreWorkspace() } else { action.openTerminal() } }
        let ready = engine.onReady
        engine.onReady = { message in ready?(message); UserDefaults.standard.set(database.path, forKey: "CounselSelectedWorkspace") }
        controller = next; next.start()
    }
    private func switchWorkspace(_ database: URL) {
        guard !closing, backupOperation == nil, let current = controller else { return }
        current.saveDrafts { [weak self] saved in
            guard let self else { return }
            let alert = NSAlert(); alert.messageText = saved ? "Open another workspace?" : "Some drafts could not be saved"
            alert.informativeText = "Saved work stays in the current workspace. Running requests will stop and other unsaved forms will be lost. The selected workspace opens separately; nothing is merged or overwritten."
            alert.addButton(withTitle: "Keep working"); alert.addButton(withTitle: "Open workspace")
            guard alert.runModal() == .alertSecondButtonReturn else { return }
            closing = true; current.showClosing()
            current.engine.stop { current.onClose = nil; current.close(); self.closing = false; self.openWorkspace(database) }
        }
    }
    @objc func openPersonal() { switchWorkspace(personalWorkspace) }
    @objc func chooseWorkspace() {
        guard !closing, backupOperation == nil else { return }
        let panel = NSOpenPanel(); panel.canChooseFiles = true; panel.canChooseDirectories = false; panel.allowsMultipleSelection = false
        panel.directoryURL = workspaceHome.appendingPathComponent(".counsel/workspaces")
        panel.message = "Choose an existing Counsel workspace.sqlite3. Keep it together with its originals folder. To recover a backup instead, use Restore workspace from backup."
        if panel.runModal() == .OK, let file = panel.url { switchWorkspace(file) }
    }
    @objc func restoreWorkspace() {
        guard !closing, backupOperation == nil else { return }
        let panel = NSOpenPanel(); panel.canChooseFiles = true; panel.canChooseDirectories = false; panel.allowsMultipleSelection = false
        panel.allowedContentTypes = [UTType(filenameExtension: "counsel-backup") ?? .data]; panel.message = "Choose a Counsel backup. Recovery creates a separate workspace and never replaces your current one."
        guard panel.runModal() == .OK, let file = panel.url else { return }
        runBackup("inspect", file: file) { [weak self] result in
            guard let self, let manifest = result?["manifest"] as? [String: Any], let counts = manifest["counts"] as? [String: Any] else { self?.backupFailed(); return }
            let alert = NSAlert(); alert.messageText = "Restore a separate workspace?"
            alert.informativeText = "Backup saved \(manifest["createdAt"] as? String ?? "")\n\(counts["matters"] ?? 0) matters, \(counts["conversations"] ?? 0) chats.\n\nYour current workspace and the backup are kept. The recovered copy contains confidential data. AI credentials are not restored; reconnect in Settings."
            alert.addButton(withTitle: "Cancel"); alert.addButton(withTitle: "Restore separate workspace")
            guard alert.runModal() == .alertSecondButtonReturn else { return }
            self.runBackup("restore", file: file) { [weak self] restored in
                guard let self, let path = restored?["databasePath"] as? String else { self?.backupFailed(); return }
                let database = URL(fileURLWithPath: path).standardizedFileURL
                let root = self.workspaceHome.appendingPathComponent(".counsel/workspaces").standardizedFileURL
                guard database.lastPathComponent == "workspace.sqlite3", database.deletingLastPathComponent().deletingLastPathComponent() == root,
                      database.deletingLastPathComponent().lastPathComponent.hasPrefix("recovered-") else { self.backupFailed(); return }
                self.switchWorkspace(database)
            }
        }
    }
    private func runBackup(_ action: String, file: URL, completion: @escaping ([String: Any]?) -> Void) {
        let operation = NativeBackupOperation(); backupOperation = operation
        let progress = NSAlert(); progress.messageText = action == "inspect" ? "Checking your backup…" : "Restoring a separate workspace…"
        progress.informativeText = "The current workspace stays intact. Large backups can take several minutes."; progress.addButton(withTitle: "Cancel")
        if let window = controller?.window { progress.beginSheetModal(for: window) { [weak self] _ in if self?.backupOperation === operation { operation.cancel() } } }
        operation.run(executable: engineURL, action: action, file: file, parent: workspaceHome.appendingPathComponent(".counsel/workspaces")) { [weak self] result in
            self?.backupOperation = nil
            progress.window.sheetParent?.endSheet(progress.window); progress.window.orderOut(nil)
            completion(result)
        }
    }
    private func backupFailed() {
        let alert = NSAlert(); alert.messageText = "Recovery did not finish"
        alert.informativeText = "No existing workspace was replaced. Check that the backup is accessible, verify it in Settings, check disk space, then try again. Cancelled recoveries can leave an incomplete folder; Counsel will not open it."
        alert.runModal()
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { controller?.showWindow(nil); return true }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { !closing }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard !closing, let controller else { return closing ? .terminateLater : .terminateNow }
        closing = true
        backupOperation?.cancel()
        controller.saveDrafts { [weak self] saved in
            if controller.hasSession {
                let alert = NSAlert(); alert.messageText = saved ? "Quit Counsel?" : "Some drafts could not be saved"
                alert.informativeText = saved
                    ? "Chat drafts and working-preference drafts are kept on this device. Other unsaved forms will be lost, and running requests and downloads will stop."
                    : "Keep working to retry draft recovery or copy your text. Quitting now may lose recent edits. Saved work is kept."
                alert.addButton(withTitle: "Keep working"); alert.addButton(withTitle: saved ? "Quit Counsel" : "Quit without recent edits")
                if alert.runModal() != .alertSecondButtonReturn { self?.closing = false; controller.showWindow(nil); NSApp.reply(toApplicationShouldTerminate: false); return }
            }
            controller.showClosing(); controller.engine.stop { NSApp.reply(toApplicationShouldTerminate: true) }
        }
        return .terminateLater
    }
}
let application = NSApplication.shared
let delegate = CounselApplication(); application.delegate = delegate
application.setActivationPolicy(.regular); application.run()
