import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import {
  Appbar,
  Text,
  List,
  Divider,
  useTheme,
  Switch,
  Dialog,
  Portal,
  Button,
  Snackbar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { supabase } from '../../config/supabase';
import { User, Bell, Globe, MapPin, Cloud, Star, Info, ArrowLeft } from 'lucide-react-native';
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
  const theme = useTheme();
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Appbar.Header style={[styles.appbar, { paddingTop: insets.top }]}> 
        <Appbar.Action icon={() => <ArrowLeft color="#fff" size={20} />} onPress={() => navigation.goBack()} />
        <Appbar.Content title={texts.settings.title} titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <List.Section style={styles.section}>
          <List.Item
            title={texts.settings.accountInfo}
            description={user?.email || (settings.language === 'vi' ? 'Chưa đăng nhập' : 'Not logged in')}
            left={() => <User color="#64748B" size={24} />}
            onPress={() => navigation.navigate('ProfileInfo')}
            right={() => <Text style={styles.rightText}>{texts.settings.accountDetails}</Text>}
          />
          <Divider />
          <List.Item
            title={texts.settings.notifications}
            description={texts.settings.notificationsDescription}
            left={() => <Bell color="#64748B" size={24} />}
            right={() => (
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(value) => {
                  dispatch(setNotificationsEnabled(value));
                }}
              />
            )}
          />
          <Divider />
          <List.Item
            title={texts.settings.theme}
            description={settings.darkMode ? texts.settings.themeOn : texts.settings.themeOff}
            left={() => <Bell color="#64748B" size={24} />}
            right={() => (
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => {
                  dispatch(setDarkMode(value));
                }}
              />
            )}
          />
          <Divider />
          <List.Item
            title={texts.settings.language}
            description={settings.language === 'vi' ? texts.settings.vietnamese : texts.settings.english}
            left={() => <Globe color="#64748B" size={24} />}
            onPress={() => setDialogVisible('language')}
            right={() => <Text style={styles.rightText}>{texts.settings.change}</Text>}
          />
          <Divider />
          <List.Item
            title={texts.settings.distanceUnit}
            description={settings.distanceUnit}
            left={() => <MapPin color="#64748B" size={24} />}
            onPress={() => setDialogVisible('distance')}
            right={() => <Text style={styles.rightText}>{texts.settings.change}</Text>}
          />
          <Divider />
          <List.Item
            title={texts.settings.backup}
            description={texts.settings.backupDescription}
            left={() => <Cloud color="#64748B" size={24} />}
            right={() => (
              <Switch
                value={settings.backupEnabled}
                onValueChange={(value) => {
                  dispatch(setBackupEnabled(value));
                }}
              />
            )}
          />
          <Divider />
          <List.Item
            title={texts.settings.rateApp}
            description={texts.settings.rateAppDescription}
            left={() => <Star color="#64748B" size={24} />}
            onPress={handleRateApp}
            right={() => <Text style={styles.rightText}>{texts.settings.open}</Text>}
          />
          <Divider />
          <List.Item
            title={texts.settings.about}
            description={texts.settings.aboutDescription}
            left={() => <Info color="#64748B" size={24} />}
            onPress={() => setDialogVisible('about')}
            right={() => <Text style={styles.rightText}>{texts.settings.open}</Text>}
          />
          <Divider />
          <List.Item
            title={texts.settings.logout}
            titleStyle={styles.logoutTitle}
            left={() => <Text style={styles.logoutIcon}>⎋</Text>}
            onPress={handleLogout}
          />
        </List.Section>
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible === 'language'} onDismiss={() => setDialogVisible(null)}>
          <Dialog.Title>{texts.settings.languageDialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Button
              mode={settings.language === 'vi' ? 'contained' : 'outlined'}
              onPress={() => {
                dispatch(setLanguage('vi'));
                setDialogVisible(null);
              }}
              style={styles.dialogButton}
            >
              {texts.settings.vietnamese}
            </Button>
            <Button
              mode={settings.language === 'en' ? 'contained' : 'outlined'}
              onPress={() => {
                dispatch(setLanguage('en'));
                setDialogVisible(null);
              }}
              style={styles.dialogButton}
            >
              {texts.settings.english}
            </Button>
          </Dialog.Content>
        </Dialog>

        <Dialog visible={dialogVisible === 'distance'} onDismiss={() => setDialogVisible(null)}>
          <Dialog.Title>{texts.settings.distanceDialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Button
              mode={settings.distanceUnit === 'Kilomet' ? 'contained' : 'outlined'}
              onPress={() => {
                dispatch(setDistanceUnit('Kilomet'));
                setDialogVisible(null);
              }}
              style={styles.dialogButton}
            >
              Kilomet
            </Button>
            <Button
              mode={settings.distanceUnit === 'Miles' ? 'contained' : 'outlined'}
              onPress={() => {
                dispatch(setDistanceUnit('Miles'));
                setDialogVisible(null);
              }}
              style={styles.dialogButton}
            >
              Miles
            </Button>
          </Dialog.Content>
        </Dialog>

        <Dialog visible={dialogVisible === 'about'} onDismiss={() => setDialogVisible(null)}>
          <Dialog.Title>{texts.settings.aboutDialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Text>{texts.common.appInfo}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(null)}>{texts.settings.closeButton}</Button>
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
  },
  appbar: {
    backgroundColor: '#2563EB',
    elevation: 0,
  },
  appbarTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  rightText: {
    color: '#64748B',
    fontWeight: '600',
    marginRight: 8,
  },
  logoutTitle: {
    color: '#EF4444',
    fontWeight: '700',
  },
  logoutIcon: {
    fontSize: 18,
    color: '#EF4444',
    marginLeft: 12,
  },
  dialogButton: {
    marginBottom: 8,
  },
});
