import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, List, useTheme, Button, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { MapPin, Settings, Bell, ShieldOutline, HelpCircle } from 'lucide-react-native';

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar.Image size={80} source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?img=68' }} />
        <Text variant="titleLarge" style={[styles.name, { color: theme.colors.onSurface }]}>
          {user?.displayName || 'Nguyễn Văn Minh'}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
          {user?.email || 'minh.nguyen@email.com'}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>12</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Chuyến đi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>58</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Địa điểm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>5.482</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Quãng đường</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Item
          title="Thông tin cá nhân"
          left={props => <List.Icon {...props} icon="account-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Chuyến đi đã lưu"
          left={props => <List.Icon {...props} icon="bookmark-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Ảnh đã lưu"
          left={props => <List.Icon {...props} icon="image-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Cài đặt"
          left={props => <List.Icon {...props} icon="cog-outline" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
      </View>

      <Button 
        mode="outlined" 
        onPress={handleLogout} 
        style={styles.logoutBtn}
        textColor={theme.colors.error}
        style={{ borderColor: theme.colors.error, marginHorizontal: 20, marginBottom: 40 }}
      >
        Đăng xuất
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
  },
  name: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    paddingHorizontal: 40,
    width: '100%',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  logoutBtn: {
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 16,
  }
});
