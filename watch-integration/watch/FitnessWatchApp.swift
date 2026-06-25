// watchOS 앱 진입점. Xcode 의 watchOS App 타깃에 추가하세요. (README 4단계)
import SwiftUI

@main
struct FitnessWatchApp: App {
    @StateObject private var phone = PhoneConnector()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(phone)
        }
    }
}
