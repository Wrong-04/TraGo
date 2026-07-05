
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, useTheme, Avatar } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import { fetchTrips } from '../../features/trips/tripsSlice';
import { ChevronRight, Sparkles, Map as MapIcon, Compass, Navigation2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { items } = useSelector((state: RootState) => state.trips);

  const [totalLocations, setTotalLocations] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchTrips(user.uid));
      fetchStats();
    }
  }, [dispatch, user?.uid]);

  const fetchStats = async () => {
    if (!user?.uid) return;
    try {
      const { count: photosCount } = await supabase.from('gallery').select('*', { count: 'exact', head: true }).eq('user_id', user.uid);
      setTotalPhotos(photosCount || 0);

      const { data: locData } = await supabase.from('trip_locations').select('id, trip_id, trips!inner(user_id)').eq('trips.user_id', user.uid);
      setTotalLocations(locData?.length || 0);
    } catch (e) {
      console.log('Error fetching stats', e);
    }
  };

  const totalTrips = items.length;
  const totalDistance = items.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0);
  const recentTrip = items.length > 0 ? items[0] : null;

  const formatKm = (km: number) => {
    if (!km) return '0 m';
    return km >= 1 ? `${km.toFixed(1)} km` : `${(km * 1000).toFixed(0)} m`;
  };

  const getDiffDays = (start?: string, end?: string) => {
    if (!start || !end) return 1;
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <View style={styles.container}>
      {/* Background Header Decoration */}
      <View style={styles.headerBg}>
        <LinearGradient colors={['#E0F2FE', '#F1F5F9']} style={StyleSheet.absoluteFillObject} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={styles.greeting}>
              Xin chào, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'} 👋
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Sẵn sàng cho những cuộc phiêu lưu mới!
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileTab')} activeOpacity={0.8}>
            <Avatar.Image size={54} source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?img=68' }} style={styles.avatar} />
          </TouchableOpacity>
        </View>

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#EFF6FF', marginRight: 8 }]}>
              <View style={[styles.iconWrap, { backgroundColor: '#DBEAFE' }]}><Compass color="#3B82F6" size={24} /></View>
              <Text style={styles.statNumber}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Chuyến đi</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#F5F3FF', marginLeft: 8 }]}>
              <View style={[styles.iconWrap, { backgroundColor: '#EDE9FE' }]}><MapIcon color="#8B5CF6" size={24} /></View>
              <Text style={styles.statNumber}>{totalLocations}</Text>
              <Text style={styles.statLabel}>Địa điểm</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#ECFDF5', marginRight: 8 }]}>
              <View style={[styles.iconWrap, { backgroundColor: '#D1FAE5' }]}><Navigation2 color="#10B981" size={24} /></View>
              <Text style={[styles.statNumber, { fontSize: 22 }]}>{formatKm(totalDistance)}</Text>
              <Text style={styles.statLabel}>Quãng đường</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FFFBEB', marginLeft: 8 }]}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}><Sparkles color="#F59E0B" size={24} /></View>
              <Text style={styles.statNumber}>{totalPhotos}</Text>
              <Text style={styles.statLabel}>Khoảnh khắc</Text>
            </View>
          </View>
        </View>

        {/* AI PLANNER BANNER */}
        <TouchableOpacity activeOpacity={0.9} style={styles.aiBanner}>
          <LinearGradient colors={['#8B5CF6', '#D946EF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiBannerGradient}>
            <View style={styles.aiBannerContent}>
              <View>
                <Text style={styles.aiBannerTitle}>AI Trip Planner ✨</Text>
                <Text style={styles.aiBannerDesc}>Để AI lên lịch trình hoàn hảo cho bạn chỉ trong 30 giây!</Text>
              </View>
              <View style={styles.aiBannerBtn}>
                <Text style={styles.aiBannerBtnText}>Thử ngay</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Chuyến đi gần nhất</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TripsTab')}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT TRIP CARD */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => {
            if (recentTrip) navigation.navigate('TripDetail', { trip: recentTrip });
            else navigation.navigate('TripsTab');
          }} 
          style={styles.recentCard}
        >
          <Image source={{ uri: recentTrip?.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' }} style={styles.recentImage} />
          <LinearGradient colors={['transparent', 'rgba(15,23,42,0.8)']} style={styles.recentOverlay}>
            <View style={styles.recentInfo}>
              <Text style={styles.recentTitle} numberOfLines={1}>{recentTrip?.title || 'Chưa có chuyến đi nào'}</Text>
              {recentTrip && (
                <View style={styles.recentMetaRow}>
                  <Text style={styles.recentDate}>{new Date(recentTrip.startDate || '').toLocaleDateString('vi-VN')} - {new Date(recentTrip.endDate || '').toLocaleDateString('vi-VN')}</Text>
                  <Text style={styles.recentDot}>•</Text>
                  <Text style={styles.recentDays}>{getDiffDays(recentTrip.startDate, recentTrip.endDate)} ngày</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 32 },
  headerText: { flex: 1, paddingRight: 16 },
  greeting: { fontWeight: '900', color: '#0F172A', marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { color: '#475569', fontSize: 15 },
  avatar: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  statsGrid: { paddingHorizontal: 20, marginBottom: 24 },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statNumber: { fontSize: 26, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  aiBanner: { marginHorizontal: 20, marginBottom: 32, borderRadius: 24, shadowColor: '#D946EF', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  aiBannerGradient: { borderRadius: 24, padding: 24 },
  aiBannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiBannerTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 6 },
  aiBannerDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 13, width: width * 0.5, lineHeight: 20 },
  aiBannerBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  aiBannerBtnText: { color: '#C026D3', fontWeight: 'bold', fontSize: 13 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontWeight: 'bold', color: '#0F172A', fontSize: 18 },
  seeAllText: { color: '#3B82F6', fontWeight: '600', fontSize: 14 },
  recentCard: { marginHorizontal: 20, height: 220, borderRadius: 24, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.15, shadowRadius: 25, elevation: 10 },
  recentImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  recentOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  recentInfo: { padding: 24 },
  recentTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  recentMetaRow: { flexDirection: 'row', alignItems: 'center' },
  recentDate: { color: '#E2E8F0', fontSize: 14, fontWeight: '500' },
  recentDot: { color: '#CBD5E1', marginHorizontal: 8, fontSize: 16 },
  recentDays: { color: '#38BDF8', fontWeight: 'bold', fontSize: 14 },
});
