import AppKit
import WebKit

/// The only page allowed in the app is its own authenticated loopback UI.
/// The page gets no filesystem, process-execution or native-message bridge.
final class WorkspaceWindow: NSWindowController, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    let engine: EngineProcess
    private(set) var webView: WKWebView!
    private var status: NSStackView!, heading: NSTextField!, detail: NSTextField!, spinner: NSProgressIndicator!, retry: NSButton!
    private var session: EngineReady?
    var hasSession: Bool { session != nil }
    private var downloads: [ObjectIdentifier: DownloadTarget] = [:]
    // Dependency injection for the separately compiled native QA harness, never
    // exposed to page JavaScript or accepted from command-line input.
    var chooseFiles: ((Bool, Bool, @escaping ([URL]?) -> Void) -> Void)?
    var chooseSave: ((String, @escaping (URL?) -> Void) -> Void)?
    var onPageReady: (() -> Void)?
    var onDownloaded: ((URL) -> Void)?
    var confirmMessage: ((String) -> Bool)?
    var onClose: (() -> Void)?
    var openExternal: (URL) -> Void = { NSWorkspace.shared.open($0) }

    init(engine: EngineProcess) {
        self.engine = engine
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 900),
            styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Counsel"; window.minSize = NSSize(width: 900, height: 640); window.appearance = NSAppearance(named: .aqua)
        window.isReleasedWhenClosed = false; window.center()
        super.init(window: window)
        window.delegate = self
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self; webView.uiDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        let root = NSView(); window.contentView = root
        root.addSubview(webView)
        NSLayoutConstraint.activate([webView.leadingAnchor.constraint(equalTo: root.leadingAnchor), webView.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            webView.topAnchor.constraint(equalTo: root.topAnchor), webView.bottomAnchor.constraint(equalTo: root.bottomAnchor)])
        heading = NSTextField(labelWithString: "Opening your workspace…")
        heading.font = .systemFont(ofSize: 25, weight: .semibold); heading.textColor = NSColor(srgbRed: 0.09, green: 0.19, blue: 0.29, alpha: 1)
        detail = NSTextField(wrappingLabelWithString: "Your saved work stays on this device.")
        detail.font = .systemFont(ofSize: 14); detail.textColor = .secondaryLabelColor; detail.alignment = .center
        detail.preferredMaxLayoutWidth = 450
        spinner = NSProgressIndicator(); spinner.style = .spinning; spinner.controlSize = .regular
        retry = NSButton(title: "Try again", target: self, action: #selector(restart)); retry.bezelStyle = .rounded; retry.isHidden = true
        status = NSStackView(views: [spinner, heading, detail, retry]); status.orientation = .vertical; status.alignment = .centerX; status.spacing = 18
        status.translatesAutoresizingMaskIntoConstraints = false; root.addSubview(status)
        NSLayoutConstraint.activate([status.centerXAnchor.constraint(equalTo: root.centerXAnchor), status.centerYAnchor.constraint(equalTo: root.centerYAnchor),
            detail.widthAnchor.constraint(lessThanOrEqualToConstant: 470)])
        engine.onReady = { [weak self] ready in self?.load(ready) }
        engine.onFailure = { [weak self] message in self?.failed(message) }
        starting()
    }
    required init?(coder: NSCoder) { fatalError("Use the workspace initializer") }

    func start() { showWindow(nil); engine.start() }
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if let onClose { onClose(); return false }; return true
    }
    func saveDrafts(completion: @escaping (Bool) -> Void) {
        guard hasSession, owns(webView.url) else { completion(!hasSession); return }
        var completed = false
        let finish: (Bool) -> Void = { success in
            guard !completed else { return }; completed = true; completion(success)
        }
        // Wait for the app's bounded, revision-checked writes, not a fixed sleep.
        // A timeout must never be reported as a successful save.
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { finish(false) }
        webView.callAsyncJavaScript("return window.counselSaveDrafts ? await window.counselSaveDrafts() : true", arguments: [:], in: nil, in: .page) { result in
            switch result { case .success(let value): finish((value as? Bool) == true); case .failure: finish(false) }
        }
    }
    func starting() { status.isHidden = false; webView.isHidden = true; heading.stringValue = "Opening your workspace…"; detail.stringValue = "Your saved work stays on this device."; retry.isHidden = true; spinner.startAnimation(nil) }
    @objc func restart() {
        if let ready = engine.ready { starting(); load(ready); return }
        guard engine.process == nil else { return }; session = nil; starting(); engine.start()
    }
    private func load(_ ready: EngineReady) { session = ready; webView.load(URLRequest(url: ready.url)) }
    private func failed(_ message: String) {
        // Keep the web view (and its unsent text) alive behind the failure view.
        status.isHidden = false; webView.isHidden = true; spinner.stopAnimation(nil)
        heading.stringValue = "Counsel couldn’t open the workspace"; detail.stringValue = message
        retry.title = engine.ready == nil ? "Try again" : "Reload window"; retry.isHidden = false
    }
    func showClosing() {
        for target in downloads.values { target.discard() }; downloads.removeAll()
        status.isHidden = false; webView.isHidden = true; heading.stringValue = "Closing your workspace…"; detail.stringValue = "Stopping background work and closing local files."; retry.isHidden = true; spinner.startAnimation(nil)
    }
    func navigate(_ fragment: String) {
        guard let session, let url = URL(string: session.origin + "/#" + fragment) else { return }
        webView.load(URLRequest(url: url))
    }
    func owns(_ url: URL?) -> Bool {
        guard let url, let session, let base = URL(string: session.origin) else { return false }
        return url.scheme == "http" && url.host == "127.0.0.1" && url.port == base.port && url.user == nil && url.password == nil
    }
    private func owns(_ frame: WKFrameInfo) -> Bool {
        guard frame.isMainFrame, let session, let base = URL(string: session.origin) else { return false }
        return frame.securityOrigin.protocol == "http" && frame.securityOrigin.host == "127.0.0.1" && frame.securityOrigin.port == base.port
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        let blob = session.map { url.absoluteString.hasPrefix("blob:\($0.origin)/") } ?? false
        if action.shouldPerformDownload && (owns(url) || blob) && owns(action.sourceFrame) { decisionHandler(.download); return }
        if owns(url) {
            if action.targetFrame == nil { webView.load(action.request); decisionHandler(.cancel) }
            else { decisionHandler(.allow) }
            return
        }
        if action.navigationType == .linkActivated, ["http", "https"].contains(url.scheme ?? ""), url.user == nil, url.password == nil { openExternal(url) }
        decisionHandler(.cancel)
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let blob = session.map { response.response.url?.absoluteString.hasPrefix("blob:\($0.origin)/") == true } ?? false
        guard owns(response.response.url) || blob else { decisionHandler(.cancel); return }
        decisionHandler(response.canShowMIMEType ? .allow : .download)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard owns(webView.url) else { return }; status.isHidden = true; webView.isHidden = false; spinner.stopAnimation(nil); onPageReady?()
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { failed("The app could not load its workspace. Quit and reopen Counsel; saved work is retained.") }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { failed("The app window stopped responding. Reopen Counsel to recover saved drafts from Chats. Edits not yet saved may need to be re-entered.") }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard owns(frame) else { completionHandler(false); return }
        if let confirmMessage { completionHandler(confirmMessage(message)); return }
        let alert = NSAlert(); alert.messageText = "Counsel"; alert.informativeText = String(message.prefix(8000))
        alert.addButton(withTitle: "Cancel"); alert.addButton(withTitle: "Continue")
        guard let window else { completionHandler(false); return }
        alert.beginSheetModal(for: window) { result in completionHandler(result == .alertSecondButtonReturn) }
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        guard owns(frame), let window else { completionHandler(); return }
        let alert = NSAlert(); alert.messageText = "Counsel"; alert.informativeText = String(message.prefix(8000)); alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        guard owns(frame) else { completionHandler(nil); return }
        if let chooseFiles { chooseFiles(parameters.allowsDirectories, parameters.allowsMultipleSelection, completionHandler); return }
        let panel = NSOpenPanel(); panel.canChooseDirectories = parameters.allowsDirectories; panel.canChooseFiles = !parameters.allowsDirectories
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection; panel.resolvesAliases = true
        panel.message = parameters.allowsDirectories ? "Choose a folder to review for import into Counsel." : "Choose documents to add to Counsel."
        panel.beginSheetModal(for: window!) { response in completionHandler(response == .OK ? panel.urls : nil) }
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, decisionHandler: @escaping (WKDownload.RedirectPolicy) -> Void) {
        decisionHandler(owns(request.url) ? .allow : .cancel)
    }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let name = String((suggestedFilename as NSString).lastPathComponent.prefix(220))
        let selected: (URL?) -> Void = { [weak self] url in
            guard let self, let url else { completionHandler(nil); return }
            do {
                let target = try DownloadTarget(destination: url)
                self.downloads[ObjectIdentifier(download)] = target; completionHandler(target.staging)
            } catch { completionHandler(nil); self.notice("This location cannot be used. Choose a regular file in a writable folder.") }
        }
        if let chooseSave { chooseSave(name, selected); return }
        let panel = NSSavePanel(); panel.nameFieldStringValue = name.isEmpty ? "Counsel document" : name; panel.canCreateDirectories = true
        panel.beginSheetModal(for: window!) { response in selected(response == .OK ? panel.url : nil) }
    }
    func downloadDidFinish(_ download: WKDownload) {
        guard let target = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        do { try target.finish(); onDownloaded?(target.destination) }
        catch { notice("The destination changed or could not be written. The downloaded copy is retained at \(target.staging.path).") }
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloads.removeValue(forKey: ObjectIdentifier(download))?.discard()
        if (error as NSError).code != NSURLErrorCancelled { notice("The download did not finish. Try downloading the saved file again.") }
    }
    private func notice(_ message: String) { let alert = NSAlert(); alert.messageText = "Counsel"; alert.informativeText = message; alert.beginSheetModal(for: window!) }
}

/// WebKit requires a nonexistent download target. Stage beside the approved
/// destination, then replace only if that destination has not changed.
final class DownloadTarget {
    let destination: URL, directory: URL, staging: URL
    private struct Version: Equatable { let inode: UInt64, size: UInt64, modified: Date }
    private let prior: Version?
    private static func version(_ url: URL) throws -> Version? {
        let fm = FileManager.default
        guard fm.fileExists(atPath: url.path) else { return nil }
        let a = try fm.attributesOfItem(atPath: url.path)
        guard a[.type] as? FileAttributeType == .typeRegular, let inode = a[.systemFileNumber] as? NSNumber,
              let size = a[.size] as? NSNumber, let modified = a[.modificationDate] as? Date else { throw CocoaError(.fileWriteInvalidFileName) }
        return Version(inode: inode.uint64Value, size: size.uint64Value, modified: modified)
    }
    init(destination: URL) throws {
        self.destination = destination; prior = try Self.version(destination)
        directory = destination.deletingLastPathComponent().appendingPathComponent(".counsel-download-" + UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
        staging = directory.appendingPathComponent("download")
    }
    func finish() throws {
        guard try Self.version(destination) == prior else { throw CocoaError(.fileWriteFileExists) }
        if prior != nil { _ = try FileManager.default.replaceItemAt(destination, withItemAt: staging) }
        else { try FileManager.default.moveItem(at: staging, to: destination) }
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: destination.path)
        try? FileManager.default.removeItem(at: directory)
    }
    func discard() { try? FileManager.default.removeItem(at: directory) }
}
