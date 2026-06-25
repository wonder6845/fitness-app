// 폰에서 오는 타이머 상태를 수신하고, 워치 버튼 명령을 폰으로 보낸다.
// WatchConnectivity 의 WCSession 을 감싼 ObservableObject.
import Foundation
import WatchConnectivity

final class PhoneConnector: NSObject, ObservableObject, WCSessionDelegate {
    // 폰에서 push 되는 운동 상태
    @Published var phase: String = "대기 중"
    @Published var remainingSec: Int = 0
    @Published var setNo: Int = 0
    @Published var totalSets: Int = 0
    @Published var exercise: String = ""
    @Published var running: Bool = false

    override init() {
        super.init()
        if WCSession.isSupported() {
            let s = WCSession.default
            s.delegate = self
            s.activate()
        }
    }

    // 폰 → 워치 : 최신 상태(applicationContext)
    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        DispatchQueue.main.async { self.apply(context) }
    }

    // 폰 → 워치 : 즉시 메시지(있을 경우)
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { self.apply(message) }
    }

    private func apply(_ d: [String: Any]) {
        if let v = d["phase"] as? String { phase = v }
        if let v = d["remainingSec"] as? Int { remainingSec = v }
        if let v = d["setNo"] as? Int { setNo = v }
        if let v = d["totalSets"] as? Int { totalSets = v }
        if let v = d["exercise"] as? String { exercise = v }
        if let v = d["running"] as? Bool { running = v }
    }

    // 워치 → 폰 : 명령 전송 (next / pause)
    func send(command: String) {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["command": command], replyHandler: nil) { _ in }
    }

    // 필수 델리게이트
    func session(_ session: WCSession,
                 activationDidCompleteWith state: WCSessionActivationState,
                 error: Error?) {}
}
