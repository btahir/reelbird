import Foundation

/// What to record. Built by the app or the CLI and handed to the recorder.
public struct RecordingOptions: Codable, Hashable, Sendable {
    public enum Quality: String, Codable, Hashable, Sendable, CaseIterable {
        /// HEVC at the standard bitrate (EncoderSettings.bitsPerPixel). Default.
        case high
        /// HEVC at a higher bitrate for text-heavy 5K screens.
        case max
        /// H.264, smaller and faster to share.
        case compact
    }

    public var source: CaptureSource
    public var frameRate: Int = 60
    public var quality: Quality = .high
    public var captureSystemAudio = true
    /// Microphone device unique ID, or `nil` for no microphone. "default" = system default.
    public var microphoneID: String? = "default"
    /// Camera device unique ID, or `nil` for no camera.
    public var cameraID: String?
    /// Record key presses for a keystroke overlay (needs Input Monitoring permission).
    public var captureKeystrokes = false
    /// Produce and upload the quick-share stream while recording (needs a share destination).
    public var shareWhileRecording = false
    /// Seconds of countdown before recording starts.
    public var countdown = 3
    /// Stop automatically after this many seconds (CLI / agents). `nil` = until stopped.
    public var maxDuration: Double?

    public init(source: CaptureSource) { self.source = source }
}

/// Non-secret share destination settings. The secret key lives in the Keychain (`ReelbirdShare`).
public struct ShareDestination: Codable, Hashable, Sendable {
    /// S3-compatible endpoint, e.g. "https://<account>.r2.cloudflarestorage.com".
    public var endpoint: String
    public var bucket: String
    public var region: String = "auto"
    public var accessKeyID: String
    /// Public base URL that serves the bucket, e.g. "https://pub-xxxx.r2.dev" or "https://video.example.com".
    public var publicBaseURL: String
    /// Key prefix for every share, e.g. "r".
    public var prefix: String = "r"
    /// Set for Reelbird Cloud: the server that hands out upload keys for each share (the "secret"
    /// is then the account token). `nil` for your own bucket.
    public var cloudServer: String?

    public init(endpoint: String, bucket: String, region: String = "auto", accessKeyID: String,
                publicBaseURL: String, prefix: String = "r", cloudServer: String? = nil) {
        self.endpoint = endpoint; self.bucket = bucket; self.region = region
        self.accessKeyID = accessKeyID; self.publicBaseURL = publicBaseURL; self.prefix = prefix
        self.cloudServer = cloudServer
    }

    /// Whether this is a Reelbird Cloud destination.
    public var isCloud: Bool { cloudServer != nil }
}

/// Live state reported by the recorder (HUD, CLI progress, health warnings).
public struct RecorderStatus: Codable, Hashable, Sendable {
    public enum Phase: String, Codable, Hashable, Sendable { case idle, countdown, recording, paused, finishing, finished, failed }
    public var phase: Phase = .idle
    public var elapsed: Double = 0
    public var droppedFrames = 0
    /// Microphone level 0...1 (RMS, smoothed) for the meter.
    public var microphoneLevel: Double = 0
    public var warnings: [HealthWarning] = []
    public var shareURL: String?
    /// Share segments not yet uploaded.
    public var uploadBacklog = 0
    public init() {}
}

public struct HealthWarning: Codable, Hashable, Sendable, Identifiable {
    public enum Kind: String, Codable, Hashable, Sendable {
        /// Microphone is delivering silence (muted hardware, wrong device, call app holding it).
        case microphoneSilent
        /// No screen frames for a while although the screen is changing.
        case captureStalled
        /// Audio and video clocks are drifting apart.
        case avDrift
        /// Disk is nearly full.
        case lowDisk
        /// Uploads are falling behind.
        case uploadBacklog
        /// The share link couldn't be reserved when recording started; the take is saved locally only.
        case shareFailed
        case permissionMissing
        /// The recording microphone was unplugged or switched off mid-take.
        case microphoneDisconnected
        /// macOS switched its default input (e.g. AirPods reconnected); the take keeps its locked mic.
        case microphoneChanged
        /// Peaks hit 0 dBFS repeatedly.
        case microphoneClipping
        /// Speech is reaching the mic but its peaks stay below -30 dBFS.
        case microphoneTooQuiet
        /// Speech while the recording is paused.
        case talkingWhilePaused
    }
    public var id: String { kind.rawValue }
    public var kind: Kind
    public var message: String
    public var since: Double
    public init(kind: Kind, message: String, since: Double) { self.kind = kind; self.message = message; self.since = since }
}

public enum ReelbirdInfo {
    /// Keep in step with `CFBundleShortVersionString` in packaging/Info.plist (scripts/dist.sh checks).
    public static let version = "0.4.1"
    public static let websiteURL = "https://reelbird.app"
    public static let repositoryURL = "https://github.com/btahir/reelbird"
}
