import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, TouchableOpacity, Switch } from 'react-native';
import {
  Text,
  Dialog,
  Portal,
  Button,
  Snackbar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../config/supabase';
import { User, Bell, Globe, MapPin, Cloud, Star, Info, ArrowLeft, LogOut, ChevronRight } from 'lucide-react-native';
import {
  setDarkMode,
  setLanguage,
  setNotificationsEnabled,
  setBackupEnabled,
  setDistanceUnit,
  LanguageCode,
  DistanceUnit,
} from '../../features/settings/settingsSlice';
import { translations } from '../../constants/translations';

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const texts = translations[settings.language];

  const [dialogVisible, setDialogVisible] = useState<'language' | 'distance' | 'about' | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigation.replace('Login');
    } catch (error: any) {
      setSnackbarMessage(settings.language === 'vi' ? 'Đăng xuất thất bại. Vui lòng thử lại.' : 'Failed to logout. Please try again.');
    }
  };

  const handleRateApp = async () => {
    const url = 'https://expo.dev';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      setSnackbarMessage(settings.language === 'vi' ? 'Không thể mở liên kết đánh giá.' : 'Cannot open review link.');
    }
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    value, 
    onPress, 
    iconColor, 
    iconBg,
    isSwitch = false,
    switchValue = false,
    onSwitchChange,
    danger = false
  }: any) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress} 
      activeOpacity={isSwitch ? 1 : 0.7}
      disabled={isSwitch && !onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={22} />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#CBD5E1', true: '#4F46E5' }}
          thumbColor={'#fff'}
        />
      ) : value ? (
        <View style={styles.valueContainer}>
          <Text style={styles.settingValue}>{value}</Text>
          {!danger && <ChevronRight color="#94A3B8" size={20} />}
        </View>
      ) : (
        !danger ? <ChevronRight color="#94A3B8" size={20} /> : null
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}> 
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{texts.settings.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        <View style={styles.sectionCard}>
          <SettingItem
            icon={User}
            iconBg="#E0E7FF"
            iconColor="#4F46E5"
            title={texts.settings.accountInfo}
            subtitle={user?.email || (settings.language === 'vi' ? 'Chưa đăng nhập' : 'Not logged in')}
            onPress={() => navigation.navigate('ProfileInfo')}
          />
        </View>

        <Text style={styles.sectionTitle}>Tùy chỉnh & Hiển thị</Text>
        <View style={styles.sectionCard}>
          <SettingItem
            icon={Globe}
            iconBg="#FEF08A"
            iconColor="#CA8A04"
            title={texts.settings.language}
            value={settings.language === 'vi' ? texts.settings.vietnamese : texts.settings.english}
            onPress={() => setDialogVisible('language')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={MapPin}
            iconBg="#D1FAE5"
            iconColor="#059669"
            title={texts.settings.distanceUnit}
            value={settings.distanceUnit}
            onPress={() => setDialogVisible('distance')}
          />
        </View>

        <Text style={styles.sectionTitle}>Tính năng</Text>
        <View style={styles.sectionCard}>
          <SettingItem
            icon={Bell}
            iconBg="#FCE7F3"
            iconColor="#DB2777"
            title={texts.settings.notifications}
            subtitle={texts.settings.notificationsDescription}
            isSwitch
            switchValue={settings.notificationsEnabled}
            onSwitchChange={(val: boolean) => dispatch(setNotificationsEnabled(val))}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={Cloud}
            iconBg="#E0F2FE"
            iconColor="#0284C7"
            title={texts.settings.backup}
            subtitle={texts.settings.backupDescription}
            isSwitch
            switchValue={settings.backupEnabled}
            onSwitchChange={(val: boolean) => dispatch(setBackupEnabled(val))}
          />
        </View>

        <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>
        <View style={styles.sectionCard}>
          <SettingItem
            icon={Star}
            iconBg="#FEF9C3"
            iconColor="#EAB308"
            title={texts.settings.rateApp}
            onPress={handleRateApp}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={Info}
            iconBg="#F3E8FF"
            iconColor="#9333EA"
            title={texts.settings.about}
            onPress={() => setDialogVisible('about')}
          />
        </View>

        <View style={[styles.sectionCard, { marginTop: 24 }]}>
          <SettingItem
            icon={LogOut}
            iconBg="#FEE2E2"
            iconColor="#EF4444"
            title={texts.settings.logout}
            danger
            onPress={handleLogout}
          />
        </View>
        
        <Text style={styles.versionText}>Phiên bản 1.0.0</Text>

      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible === 'language'} onDismiss={() => setDialogVisible(null)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{texts.settings.languageDialogTitle}</Dialog.Title>
          <Dialog.Content>
            <TouchableOpacity 
              style={[styles.dialogOption, settings.language === 'vi' && styles.dialogOptionActive]}
              onPress={() => { dispatch(setLanguage('vi')); setDialogVisible(null); }}
            >
              <Text style={[styles.dialogOptionText, settings.language === 'vi' && styles.dialogOptionTextActive]}>{texts.settings.vietnamese}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dialogOption, settings.language === 'en' && styles.dialogOptionActive]}
              onPress={() => { dispatch(setLanguage('en')); setDialogVisible(null); }}
            >
              <Text style={[styles.dialogOptionText, settings.language === 'en' && styles.dialogOptionTextActive]}>{texts.settings.english}</Text>
            </TouchableOpacity>
          </Dialog.Content>
        </Dialog>

        <Dialog visible={dialogVisible === 'distance'} onDismiss={() => setDialogVisible(null)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{texts.settings.distanceDialogTitle}</Dialog.Title>
          <Dialog.Content>
            <TouchableOpacity 
              style={[styles.dialogOption, settings.distanceUnit === 'Kilomet' && styles.dialogOptionActive]}
              onPress={() => { dispatch(setDistanceUnit('Kilomet')); setDialogVisible(null); }}
            >
              <Text style={[styles.dialogOptionText, settings.distanceUnit === 'Kilomet' && styles.dialogOptionTextActive]}>Kilomet</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dialogOption, settings.distanceUnit === 'Miles' && styles.dialogOptionActive]}
              onPress={() => { dispatch(setDistanceUnit('Miles')); setDialogVisible(null); }}
            >
              <Text style={[styles.dialogOptionText, settings.distanceUnit === 'Miles' && styles.dialogOptionTextActive]}>Miles</Text>
            </TouchableOpacity>
          </Dialog.Content>
        </Dialog>

        <Dialog visible={dialogVisible === 'about'} onDismiss={() => setDialogVisible(null)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{texts.settings.aboutDialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.aboutText}>{texts.common.appInfo}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(null)} textColor="#4F46E5">{texts.settings.closeButton}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snackbarMessage} onDismiss={() => setSnackbarMessage('')} duration={3000}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 15,
    color: '#64748B',
    marginRight: 4,
    fontWeight: '500',
  },
  dangerText: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 76,
  },
  versionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 32,
    fontWeight: '500',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 24,
  },
  dialogTitle: {
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  dialogOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  dialogOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  dialogOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  dialogOptionTextActive: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  aboutText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  }
});
