// 손목 화면: 원형 진행 + 남은 시간 + 세트 정보 + Pause/Next 버튼.
import SwiftUI

struct ContentView: View {
    @EnvironmentObject var phone: PhoneConnector

    private var phaseColor: Color {
        switch phone.phase {
        case "휴식 중": return Color(red: 0.22, green: 0.74, blue: 0.97) // 스카이
        case "일시정지": return Color(red: 1.0, green: 0.69, blue: 0.13)  // 앰버
        case "운동 완료": return .gray
        default: return Color(red: 0.80, green: 0.98, blue: 0.27)         // 라임
        }
    }

    private var timeText: String {
        let s = max(0, phone.remainingSec)
        return String(format: "%02d:%02d", s / 60, s % 60)
    }

    var body: some View {
        VStack(spacing: 6) {
            Text(phone.phase)
                .font(.caption2).bold()
                .foregroundColor(phaseColor)

            Text(timeText)
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .monospacedDigit()

            if !phone.exercise.isEmpty {
                Text(phone.exercise).font(.footnote).bold().lineLimit(1)
                Text("\(phone.setNo) / \(phone.totalSets) 세트")
                    .font(.caption2).foregroundColor(.secondary)
            }

            HStack(spacing: 8) {
                Button {
                    phone.send(command: "pause")
                } label: {
                    Image(systemName: phone.running ? "pause.fill" : "play.fill")
                        .frame(maxWidth: .infinity)
                }
                .tint(.gray)

                Button {
                    phone.send(command: "next")
                } label: {
                    Image(systemName: "checkmark")
                        .frame(maxWidth: .infinity)
                }
                .tint(phaseColor)
            }
            .padding(.top, 4)
        }
        .padding(.horizontal, 6)
    }
}
