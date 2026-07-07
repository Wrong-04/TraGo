import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ImageBackground, StatusBar, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { translations } from '../../constants/translations';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSelector((state: RootState) => state.settings);
  const texts = translations[settings.language].auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
  });

  const ensureUserRecord = async (user: any, name?: string) => {
    await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: name || user.user_metadata?.full_name || user.email?.split('@')[0],
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    }, { onConflict: 'id' });
  };

  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken || response.params?.id_token;
      if (!idToken) {
        setErrorMsg(texts.googleTokenMissing);
        return;
      }
      setLoading(true);
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      }).then(async ({ data, error }) => {
        if (error) throw error;
        if (data.user) {
          await ensureUserRecord(data.user);
        }
        setLoading(false);
      }).catch(err => {
        setErrorMsg(texts.googleFailed + ': ' + err.message);
        setLoading(false);
      });
    } else if (response?.type === 'error') {
      setErrorMsg(texts.googleCancelled);
    }
  }, [response]);

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMsg(texts.emailPasswordRequired);
      return;
    }

    if (isRegister) {
      if (!fullName.trim()) {
        setErrorMsg(texts.fullNameRequired);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(texts.passwordMismatch);
        return;
      }
      if (password.length < 8) {
        setErrorMsg(texts.passwordTooShort);
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: fullName.trim() }
          }
        });
        if (error) throw error;
        if (data.user) {
          await ensureUserRecord(data.user, fullName.trim());
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      let displayError = error.message || error.toString();
      if (displayError.includes('{"type":"default"')) {
        displayError = 'Lỗi máy chủ (Internal Server Error). Vui lòng thử lại sau.';
      }
      setErrorMsg((isRegister ? texts.registerFailed : texts.loginFailed) + ': ' + displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#fff' }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={[styles.keyboardView, { paddingTop: insets.top + 40 }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <Text variant="headlineLarge" style={styles.title}>
              {texts.welcomeTitle}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {texts.welcomeSubtitle}
            </Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {isRegister && (
              <TextInput
                label={texts.fullName}
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                style={styles.input}
                outlineColor="#e2e8f0"
                activeOutlineColor="#3B82F6"
              />
            )}

            <TextInput
              label={texts.email}
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineColor="#e2e8f0"
              activeOutlineColor="#3B82F6"
            />

            <TextInput
              label={texts.password}
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              outlineColor="#e2e8f0"
              activeOutlineColor="#3B82F6"
              right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
            />

            {isRegister && (
              <TextInput
                label={texts.confirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
                outlineColor="#e2e8f0"
                activeOutlineColor="#3B82F6"
              />
            )}

            {!isRegister && (
              <View style={styles.rememberRow}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
                  <View style={[styles.checkboxPlaceholder, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Text style={{color: '#fff', fontSize: 12, textAlign: 'center', lineHeight: 16}}>✓</Text>}
                  </View>
                  <Text style={{ marginLeft: 8, color: theme.colors.secondary }}>{texts.rememberMe}</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={{ color: theme.colors.primary, fontWeight: '500' }}>{texts.forgotPassword}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Button 
              mode="contained" 
              onPress={handleAuth} 
              loading={loading}
              disabled={loading}
              style={styles.authButton}
              labelStyle={styles.authButtonLabel}
            >
              {isRegister ? texts.register : texts.login}
            </Button>

            {!isRegister && (
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} onPress={() => promptAsync()} activeOpacity={0.7}>
                  <ImageBackground source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.footerRow}>
              <Text style={{ color: theme.colors.secondary }}>
                {isRegister ? texts.alreadyHaveAccount : texts.noAccount}
              </Text>
              <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
                <Text style={styles.footerLink}>
                  {isRegister ? ` ${texts.loginNow}` : ` ${texts.registerNow}`}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 40,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkboxPlaceholder: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 4,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#3B82F6',
  },
  authButton: {
    borderRadius: 30,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    marginBottom: 30,
  },
  authButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  socialBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLink: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  }
});
