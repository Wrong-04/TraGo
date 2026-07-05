
import React from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Avatar, useTheme, Button } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../features/store';
import { supabase } from '../../config/supabase';
import { User, Map, Image as ImageIcon, Bell, Settings, LogOut, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

  const MenuItem = ({ icon: Icon, title, color, onPress }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, { backgroundColor: color + '15' }]}>
        <Icon color={color} size={22} />
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
      <ChevronRight color="#CBD5E1" size={20} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
        <LinearGradient colors={['#E0E7FF', '#F8FAFC']} style={StyleSheet.absoluteFillObject} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View style={[styles.header, { paddingTop: insets.top + 40 }]}>
          <View style={styles.avatarWrap}>
            <Avatar.Image size={100} source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?img=68' }} style={styles.avatar} />
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Settings color="#fff" size={16} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{user?.displayName || 'Người dùng TraGo'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Chuyến đi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalLocations}</Text>
              <Text style={styles.statLabel}>Địa điểm</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalDistance >= 1 ? totalDistance.toFixed(1) : (totalDistance*1000).toFixed(0)}</Text>
              <Text style={styles.statLabel}>{totalDistance >= 1 ? 'km' : 'm'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <View style={styles.menuBlock}>
            <MenuItem icon={User} title="Thông tin cá nhân" color="#3B82F6" onPress={() => {}} />
            <View style={styles.menuDivider} />
            <MenuItem icon={Map} title="Chuyến đi đã lưu" color="#10B981" onPress={() => navigation.navigate('TripsTab')} />
            <View style={styles.menuDivider} />
            <MenuItem icon={ImageIcon} title="Thư viện ảnh" color="#8B5CF6" onPress={() => navigation.navigate('GalleryTab')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>
          <View style={styles.menuBlock}>
            <MenuItem icon={Bell} title="Thông báo" color="#F59E0B" onPress={() => {}} />
            <View style={styles.menuDivider} />
            <MenuItem icon={Settings} title="Tùy chọn chung" color="#64748B" onPress={() => Alert.alert('Thông báo', 'Đang phát triển.')} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut color="#EF4444" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 320, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' },
  header: { alignItems: 'center', paddingBottom: 32, paddingHorizontal: 20 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { borderWidth: 4, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 8 },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3B82F6', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  email: { fontSize: 15, color: '#64748B', marginBottom: 24 },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', width: '100%', borderRadius: 24, paddingVertical: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', height: '80%', alignSelf: 'center' },
  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#94A3B8', marginLeft: 16, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuBlock: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0F172A' },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 72 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', marginHorizontal: 20, paddingVertical: 16, borderRadius: 20, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' }
});
