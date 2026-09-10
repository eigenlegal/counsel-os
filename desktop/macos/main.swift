import AppKit

final class CounselApplication: NSObject, NSApplicationDelegate {
    var controller: WorkspaceWindow?
    private var closing = false
    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            guard let engineURL = Bundle.main.executableURL?.deletingLastPathComponent().appendingPathComponent("counsel-workspace"),
                  let resource = Bundle.main.url(forResource: "engine-manifest", withExtension: "json"),
                  let manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: resource)) as? [String: Any],
                  let build = manifest["build"] as? [String: Any], let buildID = build["id"] as? String
            else { throw CocoaError(.fileReadCorruptFile) }
            let home = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)
            let engine = EngineProcess(executable: engineURL, database: home.appendingPathComponent(".counsel/workspaces/personal/workspace.sqlite3"), home: home, buildID: buildID)
            controller = WorkspaceWindow(engine: engine)
            controller?.window?.setFrameAutosaveName("CounselWorkspaceWindow")
            controller?.onClose = { NSApp.terminate(nil) }
            installMenu(); controller?.start(); NSApp.activate(ignoringOtherApps: true)
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
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { controller?.showWindow(nil); return true }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard !closing, let controller else { return closing ? .terminateLater : .terminateNow }
        closing = true
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
