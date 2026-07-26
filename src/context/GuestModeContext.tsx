// src/context/GuestModeContext.tsx
//
// Guest mode = a stateless, session-less "browse the Bible without an account"
// experience (Apple Guideline 5.1.1(v)). A guest has NO Supabase session, so
// every supabase.auth.getUser() call returns null and existing null-guards make
// personal reads degrade to empty automatically — no changes needed at those
// ~40 sites. Only account/action surfaces consult this context.
//
// This provider owns the ONE shared "sign in to …" sheet. Every gated tap point
// (#1–10 across the app) routes through the single promptSignIn(action) here, so
// the gating is consistent and can't drift into per-surface prompts.

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';

type GuestModeValue = {
  /** True when browsing without an account. */
  isGuest: boolean;
  /** Enter guest mode (from the Auth screen's "Browse the Bible" button). */
  enterGuest: () => void;
  /** Leave guest mode — drops the root gate back to the Auth screen. */
  exitGuest: () => void;
  /**
   * Open the shared sign-in sheet. `action` completes the sentence
   * "Sign in to {action}" (e.g. "save Battle Verses"). Call this at every
   * gated tap point instead of performing the personal action.
   */
  promptSignIn: (action?: string) => void;
};

const GuestModeContext = createContext<GuestModeValue | null>(null);

export function useGuestMode(): GuestModeValue {
  const ctx = useContext(GuestModeContext);
  if (!ctx) throw new Error('useGuestMode must be used within a GuestModeProvider');
  return ctx;
}

type ProviderProps = {
  isGuest: boolean;
  onEnterGuest: () => void;
  onExitGuest: () => void;
  children: React.ReactNode;
};

/**
 * Controlled provider: guest state lives in AppNavigator (so the root gate can
 * read it and the auth listener can clear it on sign-in). This provider owns the
 * shared sheet and distributes the context to descendants.
 */
export function GuestModeProvider({ isGuest, onEnterGuest, onExitGuest, children }: ProviderProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const promptSignIn = useCallback((a?: string) => {
    setAction(a ?? null);
    setSheetVisible(true);
  }, []);

  const handleSignIn = useCallback(() => {
    setSheetVisible(false);
    onExitGuest(); // isGuest=false + no session → root gate shows the Auth screen
  }, [onExitGuest]);

  const value = useMemo<GuestModeValue>(
    () => ({ isGuest, enterGuest: onEnterGuest, exitGuest: onExitGuest, promptSignIn }),
    [isGuest, onEnterGuest, onExitGuest, promptSignIn]
  );

  return (
    <GuestModeContext.Provider value={value}>
      {children}
      <SignInPromptSheet
        visible={sheetVisible}
        action={action}
        onSignIn={handleSignIn}
        onDismiss={() => setSheetVisible(false)}
      />
    </GuestModeContext.Provider>
  );
}

function SignInPromptSheet({
  visible,
  action,
  onSignIn,
  onDismiss,
}: {
  visible: boolean;
  action: string | null;
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  const message = action
    ? `Sign in or create a free account to ${action}.`
    : 'Sign in or create a free account to use this feature.';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropFill} activeOpacity={1} onPress={onDismiss} />
        <View style={styles.sheet}>
          <Text style={styles.title} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Create an account</Text>
          <Text style={styles.message} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{message}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onSignIn} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Sign In / Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdropFill: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
    marginBottom: 20,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  secondaryBtnText: {
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 15,
  },
});
