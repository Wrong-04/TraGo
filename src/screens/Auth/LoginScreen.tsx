import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ImageBackground, StatusBar, ScrollView, Dimensions } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { translations } from '../../constants/translations';
import { LinearGradient } from 'expo-linear-gradient';

WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get('window');

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

  const mapAuthErrorMessage = (rawError: any, registering: boolean) => {
    const raw = (rawError?.message || rawError?.toString?.() || '').toLowerCase();

    if (!raw) {
      return registering ? texts.registerFailed : texts.loginFailed;
    }

    if (raw.includes('invalid login credentials')) {
      return 'Email hoặc mật khẩu không đúng. Nếu chưa có tài khoản, hãy bấm Đăng ký ngay.';
    }
    if (raw.includes('email not confirmed')) {
      return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và xác nhận tài khoản.';
    }
    if (raw.includes('user already registered') || raw.includes('already registered')) {
      return 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.';
    }
    if (raw.includes('password should be at least')) {
      return texts.passwordTooShort;
    }
    if (raw.includes('invalid email')) {
      return 'Định dạng email không hợp lệ.';
    }
    if (raw.includes('network request failed') || raw.includes('failed to fetch')) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.';
    }
    if (raw.includes('internal server error') || raw.includes('{"type":"default"')) {
      return 'Lỗi máy chủ (Internal Server Error). Vui lòng thử lại sau.';
    }

    return rawError?.message || (registering ? texts.registerFailed : texts.loginFailed);
  };

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

  const tryRecoverLegacyAccount = async (normalizedEmail: string, normalizedPassword: string) => {
    try {
      const { data: legacyUser, error: legacyError } = await supabase
        .from('users')
        .select('email, full_name, avatar')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (legacyError || !legacyUser) {
        return { recovered: false as const };
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          data: {
            full_name: legacyUser.full_name || normalizedEmail.split('@')[0],
            avatar_url: legacyUser.avatar || null,
          },
        },
      });

      if (signUpError) {
        if ((signUpError.message || '').toLowerCase().includes('already registered')) {
          return { recovered: false as const, alreadyRegistered: true as const };
        }
        return { recovered: false as const, reason: signUpError.message };
      }

      if (signUpData?.user) {
        await ensureUserRecord(signUpData.user, legacyUser.full_name || normalizedEmail.split('@')[0]);
      }

      if (signUpData?.session) {
        return { recovered: true as const, signedIn: true as const };
      }

      return { recovered: true as const, signedIn: false as const };
    } catch (err: any) {
      return { recovered: false as const, reason: err?.message };
    }
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
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
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
          email: normalizedEmail,
          password: normalizedPassword,
          options: {
            data: { display_name: fullName.trim() }
          }
        });
        if (error) throw error;
        if (data.user) {
          await ensureUserRecord(data.user, fullName.trim());
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword });
        if (error) throw error;
      }
    } catch (error: any) {
      const raw = (error?.message || error?.toString?.() || '').toLowerCase();

      if (!isRegister && raw.includes('invalid login credentials')) {
        const recoverResult = await tryRecoverLegacyAccount(normalizedEmail, normalizedPassword);

        if (recoverResult.recovered && recoverResult.signedIn) {
          setErrorMsg('Đã đồng bộ tài khoản cũ thành công. Bạn đã được đăng nhập.');
          return;
        }

        if (recoverResult.recovered && !recoverResult.signedIn) {
          setErrorMsg('Tài khoản cũ đã được đồng bộ. Vui lòng kiểm tra email xác nhận rồi đăng nhập lại.');
          return;
        }
      }

      const displayError = mapAuthErrorMessage(error, isRegister);
      setErrorMsg((isRegister ? texts.registerFailed : texts.loginFailed) + ': ' + displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800' }} 
      style={styles.container}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(15,23,42,0.95)']}
        style={styles.gradientOverlay}
      />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
          
          <View style={styles.header}>
            <Text variant="displaySmall" style={styles.appTitle}>TraGo</Text>
            <Text variant="bodyLarge" style={styles.appSubtitle}>{texts.welcomeSubtitle}</Text>
          </View>

          <View style={styles.formContainer}>
            <Text variant="headlineSmall" style={styles.title}>
              {isRegister ? texts.register : texts.login}
            </Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {isRegister && (
              <TextInput autoCorrect={false} spellCheck={false}                label={texts.fullName}
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                style={styles.input}
                outlineColor="transparent"
                activeOutlineColor="#4F46E5"
                textColor="#0F172A"
                theme={{ colors: { background: '#F8FAFC' }, roundness: 12 }}
              />
            )}

            <TextInput autoCorrect={false} spellCheck={false}              label={texts.email}
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineColor="transparent"
              activeOutlineColor="#4F46E5"
              textColor="#0F172A"
              theme={{ colors: { background: '#F8FAFC' }, roundness: 12 }}
            />

            <TextInput autoCorrect={false} spellCheck={false}              label={texts.password}
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              outlineColor="transparent"
              activeOutlineColor="#4F46E5"
              textColor="#0F172A"
              theme={{ colors: { background: '#F8FAFC' }, roundness: 12 }}
              right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} color="#94A3B8" onPress={() => setShowPassword(!showPassword)} />}
            />

            {isRegister && (
              <TextInput autoCorrect={false} spellCheck={false}                label={texts.confirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
                outlineColor="transparent"
                activeOutlineColor="#4F46E5"
                textColor="#0F172A"
                theme={{ colors: { background: '#F8FAFC' }, roundness: 12 }}
              />
            )}

            {!isRegister && (
              <View style={styles.rememberRow}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
                  <View style={[styles.checkboxPlaceholder, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Text style={{color: '#fff', fontSize: 12, textAlign: 'center', lineHeight: 16}}>✓</Text>}
                  </View>
                  <Text style={{ marginLeft: 8, color: '#64748B' }}>{texts.rememberMe}</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={{ color: '#4F46E5', fontWeight: '600' }}>{texts.forgotPassword}</Text>
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
                <TouchableOpacity style={styles.socialBtn} onPress={() => setErrorMsg('Tính năng đăng nhập Google đang được phát triển')} activeOpacity={0.8}>
                  <ImageBackground source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
                  <Text style={styles.socialBtnText}>Tiếp tục với Google</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.footerRow}>
              <Text style={{ color: '#64748B' }}>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  formContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderCurve: 'continuous',
  },
  title: {
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    height: 54,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxPlaceholder: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  authButton: {
    borderRadius: 16,
    paddingVertical: 6,
    backgroundColor: '#4F46E5',
    marginBottom: 24,
  },
  authButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  socialRow: {
    marginBottom: 32,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 12,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  socialBtnText: {
    fontWeight: '600',
    color: '#334155',
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLink: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
  }
});
