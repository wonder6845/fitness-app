import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { DialogButton, DialogRequest, registerDialogHost } from '../utils/dialog';

/**
 * 앱 루트에 1회 마운트되어 appAlert() 요청을 인앱 모달로 렌더링한다.
 * react-native-web의 Modal은 DOM 오버레이로 렌더되므로 웹/iframe에서도 동작한다.
 */
export default function DialogHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);

  useEffect(() => {
    registerDialogHost((r) => setReq(r));
    return () => registerDialogHost(null);
  }, []);

  const close = () => setReq(null);

  function handlePress(b: DialogButton) {
    close();
    b.onPress?.();
  }

  return (
    <Modal
      transparent
      visible={req !== null}
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        {req && (
          <View style={styles.card}>
            <Text style={styles.title}>{req.title}</Text>
            {req.message ? <Text style={styles.message}>{req.message}</Text> : null}
            <View
              style={[
                styles.buttons,
                req.buttons.length > 2 && { flexDirection: 'column' },
              ]}
            >
              {req.buttons.map((b, i) => (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => handlePress(b)}
                  style={({ pressed }) => [
                    styles.btn,
                    b.style === 'cancel' && styles.btnCancel,
                    b.style === 'destructive' && styles.btnDestructive,
                    (!b.style || b.style === 'default') && styles.btnDefault,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      b.style === 'cancel' && { color: colors.sub },
                      b.style === 'destructive' && { color: '#fff' },
                      (!b.style || b.style === 'default') && { color: '#fff' },
                    ]}
                  >
                    {b.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.sub,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDefault: { backgroundColor: colors.primary },
  btnCancel: { backgroundColor: colors.card },
  btnDestructive: { backgroundColor: colors.danger },
  btnText: { fontSize: 15, fontWeight: '700' },
});
