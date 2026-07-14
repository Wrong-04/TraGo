import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { Text, Avatar, useTheme, Button } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../features/store';
import { supabase } from '../../config/supabase';
import { User, Map, Image as ImageIcon, Bell, Settings, Sparkles, ChevronRight, LogOut } from 'lucide-react-native';
import { translations } from '../../constants/translations';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const { items } = useSelector((state: RootState) => state.trips);
  const texts = translations[settings.language].profile;
  
  const totalTrips = items.length;
  const totalLocations = items.reduce((sum, trip) => sum + (trip.totalLocations || 0), 0);
  const totalDistance = items.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0);
  const distanceValue = settings.distanceUnit === 'Miles' ? totalDistance * 0.621371 : totalDistance;
  const distanceUnit = settings.distanceUnit === 'Miles' ? translations[settings.language].common.miles : translations[settings.language].common.kilometers;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const renderMenuItem = (icon: React.ReactNode, title: string, color: string, onPress: () => void) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconBox, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
      <ChevronRight color="#CBD5E1" size={20} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#F8FAFC' }]} showsVerticalScrollIndicator={false}>
      
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800' }} 
        style={styles.headerBackground}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', '#F8FAFC']}
          style={styles.gradientOverlay}
        />
        <View style={[styles.headerContent, { paddingTop: insets.top + 40 }]}>
          <View style={styles.avatarWrapper}>
            {user?.photoURL ? (
              <Avatar.Image size={96} source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <Avatar.Text size={96} label={(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()} style={styles.avatar} />
            )}
          </View>
          <Text variant="titleLarge" style={styles.name}>
            {user?.displayName || texts.userPlaceholder}
          </Text>
          <Text variant="bodyMedium" style={styles.email}>
            {user?.email || ''}
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalTrips}</Text>
          <Text style={styles.statLabel}>{texts.trips}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalLocations}</Text>
          <Text style={styles.statLabel}>{texts.locations}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{distanceValue.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 })}</Text>
          <Text style={styles.statLabel}>{texts.distance}</Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        {renderMenuItem(<User color="#3B82F6" size={22} />, texts.personalInfo, '#3B82F6', () => navigation.navigate('ProfileInfo'))}
        {renderMenuItem(<Map color="#10B981" size={22} />, texts.savedTrips, '#10B981', () => navigation.navigate('TripsTab'))}
        {renderMenuItem(<ImageIcon color="#F59E0B" size={22} />, texts.savedPhotos, '#F59E0B', () => navigation.navigate('GalleryTab'))}
        {renderMenuItem(<Sparkles color="#8B5CF6" size={22} />, texts.aiPlanner, '#8B5CF6', () => navigation.navigate('AIPlanner'))}
      </View>
      
      <View style={styles.menuSection}>
        {renderMenuItem(<Bell color="#EC4899" size={22} />, texts.notifications, '#EC4899', () => navigation.navigate('Notifications'))}
        {renderMenuItem(<Settings color="#64748B" size={22} />, texts.settings, '#64748B', () => navigation.navigate('Settings'))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut color="#EF4444" size={20} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>{translations[settings.language].common.logout}</Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    width: '100%',
    height: 320,
    justifyContent: 'flex-end',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerContent: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  avatarWrapper: {
    padding: 4,
    backgroundColor: '#fff',
    borderRadius: 100,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    backgroundColor: '#E2E8F0',
  },
  name: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 24,
    marginBottom: 4,
  },
  email: {
    color: '#475569',
    fontSize: 15,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: -20,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  }
});
