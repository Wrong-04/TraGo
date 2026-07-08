import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ImageBackground, Image } from 'react-native';
import { TextInput, Button, Text, Snackbar, ActivityIndicator, Avatar } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../config/supabase';
import { setUser } from '../../features/auth/authSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translations } from '../../constants/translations';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileInfoScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();
  const texts = translations[settings.language].profile;

  const [fullName, setFullName] = useState(user?.displayName || user?.email?.split('@')[0] || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleUpdate = async () => {
    if (!fullName.trim()) {
      setMsg(settings.language === 'vi' ? 'Vui lòng nhập họ tên' : 'Please enter your name');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });
      if (error) throw error;
      
      // Update users table
      if (user) {
        await supabase.from('users').update({ full_name: fullName.trim() }).eq('id', user.uid);
      }

      if (data.user) {
        dispatch(setUser({ ...user, displayName: fullName.trim(), uid: user?.uid || '', email: user?.email || null, photoURL: user?.photoURL || null }));
      }
      setMsg(texts.updateSuccess);
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      setMsg(texts.updateError + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    return user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800';
  };

  return (
    <View style={styles.container}>
      {/* Cover Header */}
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' }} 
        style={styles.coverImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={[styles.coverOverlay, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.appBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ArrowLeft color="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.appBarTitle}>{texts.editProfile}</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {user?.photoURL ? (
              <Avatar.Image size={100} source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <Avatar.Text size={100} label={(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()} style={styles.avatar} />
            )}
            <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
              <Camera color="#fff" size={16} />
            </TouchableOpacity>
          </View>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <TextInput autoCorrect={false} spellCheck={false}            label={texts.fullName}
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            outlineColor="transparent"
            activeOutlineColor="#4F46E5"
            theme={{ roundness: 16, colors: { background: '#F8FAFC' } }}
          />
          
          <TextInput autoCorrect={false} spellCheck={false}            label="Email"
            value={user?.email || ''}
            disabled
            mode="outlined"
            style={[styles.input, { opacity: 0.7 }]}
            outlineColor="transparent"
            theme={{ roundness: 16, colors: { background: '#F1F5F9' } }}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
          activeOpacity={0.8}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{texts.save}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      <Snackbar
        visible={!!msg}
        onDismiss={() => setMsg('')}
        duration={2000}
        style={{ backgroundColor: '#10B981', borderRadius: 12, marginBottom: insets.bottom + 16 }}
      >
        {msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  coverImage: {
    width: '100%',
    height: 180,
  },
  coverOverlay: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  appBarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    padding: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 60,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#4F46E5',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  emailText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
    height: 56,
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});
