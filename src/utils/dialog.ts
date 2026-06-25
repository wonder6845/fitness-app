// 크로스 플랫폼 확인/알림 다이얼로그.
// 웹(react-native-web)에서는 Alert.alert가 동작하지 않고, iframe 환경에서는
// window.confirm도 차단될 수 있어서, 앱 안에 직접 렌더링하는 모달(DialogHost)로 처리한다.
// appAlert는 Alert.alert와 동일한 시그니처라 기존 호출부를 그대로 둘 수 있다.

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
}

export interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

let handler: ((req: DialogRequest) => void) | null = null;

/** DialogHost가 마운트되며 자신을 등록한다. */
export function registerDialogHost(fn: ((req: DialogRequest) => void) | null): void {
  handler = fn;
}

export function appAlert(
  title: string,
  message?: string,
  buttons?: DialogButton[]
): void {
  const req: DialogRequest = {
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: '확인' }],
  };
  if (handler) {
    handler(req);
    return;
  }
  // 호스트가 아직 없으면 브라우저 기본 알림으로라도 대체
  const g = globalThis as unknown as { alert?: (m?: string) => void };
  g.alert?.(message ? `${title}\n\n${message}` : title);
}
