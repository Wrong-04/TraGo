import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ImageBackground, StatusBar } from 'react-native';
import { TextInput, Button, Text, useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || '678197524294-eo71qvfseu97t5oknpkedor0sqf762c0.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID || '678197524294-ios-client-id.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID || '678197524294-android-client-id.apps.googleusercontent.com',
  });

  const ensureUserRecord = async (user: any, name?: string) => {
    await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      display_name: name || user.user_metadata?.display_name || user.email?.split('@')[0],
      photo_url: user.user_metadata?.photo_url || null,
    }, { onConflict: 'id' });
  };

  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken || response.params?.id_token;
      if (!idToken) {
        setErrorMsg('Lỗi: Không nhận được token từ Google.');
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
        setErrorMsg('Đăng nhập Google thất bại: ' + err.message);
        setLoading(false);
      });
    } else if (response?.type === 'error') {
      setErrorMsg('Đã hủy hoặc xảy ra lỗi khi đăng nhập Google.');
    }
  }, [response]);

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập email và mật khẩu');
      return;
    }

    if (isRegister) {
      if (!fullName.trim()) {
        setErrorMsg('Vui lòng nhập Họ và tên.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp.');
        return;
      }
      if (password.length < 8) {
        setErrorMsg('Mật khẩu quá yếu! Yêu cầu ít nhất 8 ký tự.');
        return;
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        setErrorMsg('Mật khẩu phải chứa ít nhất 1 chữ in hoa.');
        return;
      }
      if (!/(?=.*[0-9])/.test(password)) {
        setErrorMsg('Mật khẩu phải chứa ít nhất 1 chữ số.');
        return;
      }
      if (!/(?=.*[!@#$%^&*])/.test(password)) {
        setErrorMsg('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*).');
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
      setErrorMsg((isRegister ? 'Đăng ký' : 'Đăng nhập') + ' thất bại: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800' }} 
      style={styles.container}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          style={[styles.keyboardView, { paddingTop: insets.top }]} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.formContainer}>
            <Text variant="headlineLarge" style={styles.title}>
              Chào mừng trở lại!
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Đăng nhập để tiếp tục khám phá thế giới.
            </Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {isRegister && (
              <TextInput
                placeholder="Họ và tên của bạn"
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                left={<TextInput.Icon icon="account-outline" color="#64748B" />}
                textColor="#0F172A"
                placeholderTextColor="#94A3B8"
              />
            )}

            <TextInput
              placeholder="Nhập email của bạn"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="email-outline" color="#64748B" />}
              textColor="#0F172A"
              placeholderTextColor="#94A3B8"
            />
            
            <TextInput
              placeholder="Mật khẩu (Tối thiểu 8 ký tự)"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="lock-outline" color="#64748B" />}
              right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} color="#64748B" />}
              textColor="#0F172A"
              placeholderTextColor="#94A3B8"
            />

            {isRegister && (
              <TextInput
                placeholder="Xác nhận lại mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
                outlineStyle={styles.inputOutline}
                left={<TextInput.Icon icon="lock-check-outline" color="#64748B" />}
                textColor="#0F172A"
                placeholderTextColor="#94A3B8"
              />
            )}

            {!isRegister && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text variant="bodyMedium" style={{ color: '#3B82F6', fontWeight: 'bold' }}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            )}
            
            <Button 
              mode="contained" 
              onPress={handleAuth} 
              loading={loading}
              style={styles.button}
              buttonColor="#2563EB"
              textColor="#fff"
              contentStyle={styles.buttonContent}
            >
              {isRegister ? 'Đăng ký' : 'Đăng Nhập'}
            </Button>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text variant="bodySmall" style={styles.dividerText}>Hoặc đăng nhập với:</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialContainer}>
              <IconButton 
                icon="google" 
                mode="outlined" 
                size={24} 
                iconColor="#DB4437" 
                onPress={() => promptAsync()} 
                style={styles.socialBtn} 
                disabled={!request || loading}
              />
              <IconButton icon="facebook" mode="outlined" size={24} iconColor="#1877F2" onPress={() => {}} style={styles.socialBtn} />
              <IconButton icon="apple" mode="outlined" size={24} iconColor="#000" onPress={() => {}} style={styles.socialBtn} />
            </View>

            <View style={styles.footer}>
              <Text variant="bodyMedium" style={{ color: '#E2E8F0' }}>
                {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
              </Text>
              <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
                <Text variant="bodyMedium" style={{ color: '#3B82F6', fontWeight: 'bold' }}>
                  {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#E2E8F0',
    marginBottom: 40,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  inputOutline: {
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    marginBottom: 32,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    color: '#E2E8F0',
    paddingHorizontal: 16,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 48,
  },
  socialBtn: {
    borderColor: 'transparent',
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  }
});
