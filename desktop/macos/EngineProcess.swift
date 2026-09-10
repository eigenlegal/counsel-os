import Foundation

struct EngineReady: Decodable {
    let `protocol`: Int
    let event: String
    let pid: Int32
    let origin: String
    let token: String
    let databasePath: String
    let buildId: String?

    func validated(pid expectedPID: Int32, database: URL, build: String) -> Bool {
        guard self.protocol == 1, event == "ready", pid == expectedPID,
              databasePath == database.path, buildId == build,
              token.count == 64, token.allSatisfy({ "0123456789abcdef".contains($0) }),
              let url = URLComponents(string: origin), let port = url.port,
              port > 0, port <= 65535, origin == "http://127.0.0.1:\(port)" else { return false }
        return true
    }
    var url: URL { URL(string: "\(origin)/#token=\(token)")! }
}

/// A single owned child. No port discovery, attaching to existing servers,
/// shell commands, capability files or inherited provider credentials.
final class EngineProcess {
    let executable: URL, database: URL, home: URL, buildID: String
    private(set) var process: Process?
    private(set) var ready: EngineReady?
    private var input: Pipe?, output: Pipe?, errors: Pipe?
    private var buffer = Data(), diagnostic = ""
    private var stopping = false, failure: String?
    private var completion: (() -> Void)?
    var onReady: ((EngineReady) -> Void)?
    var onFailure: ((String) -> Void)?

    init(executable: URL, database: URL, home: URL, buildID: String) {
        self.executable = executable; self.database = database; self.home = home; self.buildID = buildID
    }

    func start() {
        precondition(Thread.isMainThread)
        guard process == nil else { return }
        ready = nil; buffer = Data(); diagnostic = ""; stopping = false; failure = nil
        let child = Process(), stdin = Pipe(), stdout = Pipe(), stderr = Pipe()
        child.executableURL = executable
        child.arguments = ["--desktop", "--database", database.path]
        child.currentDirectoryURL = executable.deletingLastPathComponent()
        child.environment = ["HOME": home.path, "TMPDIR": NSTemporaryDirectory(), "LANG": "en_US.UTF-8",
            "PATH": "\(home.path)/.local/bin:\(home.path)/.bun/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"]
        child.standardInput = stdin; child.standardOutput = stdout; child.standardError = stderr
        process = child; input = stdin; output = stdout; errors = stderr
        stdout.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let bytes = handle.availableData
            DispatchQueue.main.async { [weak self] in
                guard let self, self.process === child, !self.stopping, !bytes.isEmpty else { return }
                self.buffer.append(bytes)
                guard self.buffer.count <= 65_536 else { self.fail("Counsel could not verify its workspace engine."); return }
                while let newline = self.buffer.firstIndex(of: 10) {
                    let line = self.buffer.prefix(upTo: newline); self.buffer.removeSubrange(...newline)
                    guard self.ready == nil,
                          let message = try? JSONDecoder().decode(EngineReady.self, from: line),
                          message.validated(pid: child.processIdentifier, database: self.database, build: self.buildID)
                    else { self.fail("Counsel could not verify its workspace engine."); return }
                    self.ready = message; self.onReady?(message)
                }
            }
        }
        stderr.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let bytes = handle.availableData
            DispatchQueue.main.async { [weak self] in
                guard let self, self.process === child else { return }
                // Retain only enough to recognize known failures. Raw diagnostics
                // (which may contain paths or capabilities) never enter the UI/log.
                self.diagnostic = String((self.diagnostic + String(decoding: bytes, as: UTF8.self)).suffix(4096))
            }
        }
        child.terminationHandler = { [weak self] _ in DispatchQueue.main.async { self?.exited(child) } }
        do { try child.run() }
        catch {
            cleanup(); process = nil
            onFailure?("Counsel’s workspace engine could not start. Check that the app bundle is complete.")
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 25) { [weak self] in
            guard let self, self.process === child, self.ready == nil, !self.stopping else { return }
            self.fail("The workspace took too long to start. Try again; saved work remains on this device.")
        }
    }

    private func fail(_ message: String) { failure = message; stop() }

    func stop(completion: (() -> Void)? = nil) {
        precondition(Thread.isMainThread)
        if let completion { self.completion = completion }
        guard let child = process else { let callback = self.completion; self.completion = nil; callback?(); return }
        guard !stopping else { return }
        stopping = true
        // Closing this private lease also occurs automatically if the app dies.
        try? input?.fileHandleForWriting.close()
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
            guard self?.process === child, child.isRunning else { return }; child.terminate()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            guard self?.process === child, child.isRunning else { return }; kill(child.processIdentifier, SIGKILL)
        }
    }

    private func exited(_ child: Process) {
        guard process === child else { return }
        let planned = stopping, failed = failure
        cleanup(); process = nil; ready = nil
        if let failed { onFailure?(failed) }
        else if !planned {
            onFailure?(diagnostic.contains("already running")
                ? "This workspace is already open in another Counsel process. Close that process before trying again."
                : "The workspace engine stopped. Saved work is retained; review interrupted work after restarting.")
        }
        let callback = completion; completion = nil; callback?()
    }
    private func cleanup() {
        output?.fileHandleForReading.readabilityHandler = nil; errors?.fileHandleForReading.readabilityHandler = nil
        try? input?.fileHandleForWriting.close(); try? output?.fileHandleForReading.close(); try? errors?.fileHandleForReading.close()
        input = nil; output = nil; errors = nil; buffer = Data()
    }
}
