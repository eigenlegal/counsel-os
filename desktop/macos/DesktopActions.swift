import AppKit

/// Fixed user gestures only. No command text, paths, arguments or URLs arrive from the page.
enum DesktopAction: String {
    case restore, installCodex = "install-codex", installClaude = "install-claude-code"
    case loginCodex = "login-codex", loginClaude = "login-claude-code", loginClaudeAPI = "login-claude-code-api"
    static func parse(_ url: URL) -> DesktopAction? {
        guard url.scheme == "counsel-desktop", url.user == nil, url.password == nil,
              url.port == nil, url.path.isEmpty, url.query == nil, url.fragment == nil,
              let host = url.host else { return nil }
        return DesktopAction(rawValue: host)
    }
    var command: String? {
        switch self {
        case .restore: return nil
        case .installCodex: return "curl -fsSL https://chatgpt.com/codex/install.sh | sh"
        case .installClaude: return "curl -fsSL https://claude.ai/install.sh | bash"
        case .loginCodex: return "codex -c cli_auth_credentials_store='\"file\"' login"
        case .loginClaude: return "claude auth login"
        case .loginClaudeAPI: return "claude auth login --console"
        }
    }
    func openTerminal() {
        guard let command else { return }
        let alert = NSAlert(); alert.messageText = rawValue.hasPrefix("install") ? "Run the official installer in Terminal?" : "Sign in through the provider?"
        alert.informativeText = "Counsel OS will open Terminal and run:\n\n\(command)\n\nInstallation downloads provider software. Sign-in may change the account used by other projects. No practice documents are sent. Cancel with Control-C in Terminal, then return to Counsel OS and check local sign-in."
        alert.addButton(withTitle: "Cancel"); alert.addButton(withTitle: "Open Terminal")
        guard alert.runModal() == .alertSecondButtonReturn else { return }
        // JSON string escaping is also valid for this fixed AppleScript literal.
        let escaped = command.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
        let script = NSAppleScript(source: "tell application \"Terminal\"\nactivate\ndo script \"\(escaped)\"\nend tell")
        var error: NSDictionary?
        _ = script?.executeAndReturnError(&error)
        if error != nil { let message = NSAlert(); message.messageText = "Terminal could not be opened"; message.informativeText = "Use Copy command in Counsel OS and paste it in Terminal. Your existing connection has not been changed by Counsel OS."; message.runModal() }
    }
}

/// Runs the existing isolated backup worker. Diagnostics never enter the UI.
final class NativeBackupOperation {
    private var process: Process?, staging: URL?
    private var cancelled = false
    func cancel() {
        cancelled = true; process?.terminate()
        let child = process
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { if let child, child.isRunning { kill(child.processIdentifier, SIGKILL) } }
    }
    func run(executable: URL, action: String, file: URL, parent: URL, completion: @escaping ([String: Any]?) -> Void) {
        guard process == nil, ["inspect", "restore"].contains(action) else { completion(nil); return }
        cancelled = false
        let stage = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("counsel-native-backup-" + UUID().uuidString, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: stage, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700]); staging = stage
            let child = Process(), input = Pipe(), output = Pipe()
            child.executableURL = executable; child.arguments = ["--internal-worker", "backup"]
            child.currentDirectoryURL = stage; child.environment = ["PATH": "/usr/bin:/bin", "TMPDIR": NSTemporaryDirectory()]
            child.standardInput = input; child.standardOutput = output; child.standardError = FileHandle.nullDevice
            process = child
            try child.run()
            let bytes = try JSONSerialization.data(withJSONObject: ["action": action, "path": file.path, "staging": stage.path, "parent": parent.path])
            try input.fileHandleForWriting.write(contentsOf: bytes); try input.fileHandleForWriting.close()
            DispatchQueue.global(qos: .userInitiated).async { [self] in
                var result = Data()
                while let part = try? output.fileHandleForReading.read(upToCount: 65536), !part.isEmpty {
                    result.append(part)
                    if result.count > 32_000_000 { kill(child.processIdentifier, SIGKILL); break }
                }
                child.waitUntilExit()
                let value = child.terminationStatus == 0 ? (try? JSONSerialization.jsonObject(with: result)) as? [String: Any] : nil
                DispatchQueue.main.async { [self] in
                    process = nil; try? FileManager.default.removeItem(at: stage); staging = nil
                    completion(cancelled ? nil : value)
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 600) { [weak self, weak child] in
                guard let child, self?.process === child, child.isRunning else { return }; self?.cancel()
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 610) { [weak self, weak child] in
                guard let child, self?.process === child, child.isRunning else { return }; kill(child.processIdentifier, SIGKILL)
            }
        } catch {
            if let child = process, child.isRunning { kill(child.processIdentifier, SIGKILL); child.waitUntilExit() }
            process = nil; try? FileManager.default.removeItem(at: stage); staging = nil; completion(nil)
        }
    }
}
