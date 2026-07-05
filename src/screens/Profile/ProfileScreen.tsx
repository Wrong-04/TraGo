import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, List, useTheme, Button, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../features/store';
import { supabase } from '../../config/supabase';
import { User, Map, Image as ImageIcon, Bell, Settings } from 'lucide-react-native';

export default function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const { items } = useSelector((state: RootState) => state.trips);
  const { locations } = useSelector((state: RootState) => state.map);
  
  const totalTrips = items.length;
  const totalLocations = locations.length;
  const totalDistance = items.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Avatar.Image size={80} source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?img=68' }} />
        <Text variant="titleLarge" style={[styles.name, { color: theme.colors.onSurface }]}>
          {user?.displayName || 'Người dùng'}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
          {user?.email || ''}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{totalTrips}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Chuyến đi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{totalLocations}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Địa điểm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{totalDistance.toLocaleString('vi-VN')}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Quãng đường</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Item
          title="Thông tin cá nhân"
          left={props => <List.Icon {...props} icon={() => <User color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Chuyến đi đã lưu"
          left={props => <List.Icon {...props} icon={() => <Map color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Ảnh đã lưu"
          left={props => <List.Icon {...props} icon={() => <ImageIcon color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Thông báo"
          left={props => <List.Icon {...props} icon={() => <Bell color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title="Cài đặt"
          left={props => <List.Icon {...props} icon={() => <Settings color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Settings')}
        />
      </View>

      <Button 
        mode="outlined" 
        onPress={handleLogout} 
        textColor={theme.colors.error}
        style={[styles.logoutBtn, { borderColor: theme.colors.error, marginHorizontal: 20, marginBottom: 40 }]}
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
