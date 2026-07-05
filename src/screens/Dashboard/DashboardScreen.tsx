import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, useTheme, Avatar } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import { fetchTrips } from '../../features/trips/tripsSlice';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';

export default function DashboardScreen({ navigation }: any) {
  const theme = useTheme() as any;
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
      const { count: photosCount } = await supabase
        .from('gallery')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.uid);
      setTotalPhotos(photosCount || 0);

      const tripIds = items.map(t => t.id);
      if (tripIds.length > 0) {
        const { count: locCount } = await supabase
          .from('trip_locations')
          .select('*', { count: 'exact', head: true })
          .in('trip_id', tripIds);
        setTotalLocations(locCount || 0);
      } else {
        setTotalLocations(0);
      }
    } catch (e) {
      console.log('Error fetching stats', e);
    }
  };

  const totalTrips = items.length;
  const totalDistance = items.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0);
  const recentTrip = items.length > 0 ? items[0] : null;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: '#F8FAFC' }]} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="headlineSmall" style={styles.greeting}>
            Xin chào, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'} 👋
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Cùng khám phá những hành trình mới
          </Text>
        </View>
        <Avatar.Image size={48} source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?img=68' }} />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { marginRight: 8 }]}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{totalTrips}</Text>
            <Text style={styles.statLabel}>Chuyến đi</Text>
          </View>
          <View style={[styles.statBox, { marginLeft: 8 }]}>
            <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>{totalLocations}</Text>
            <Text style={styles.statLabel}>Địa điểm</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { marginRight: 8 }]}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>
              {totalDistance > 0 ? totalDistance.toLocaleString('vi-VN') : '0'} <Text style={{fontSize: 16}}>km</Text>
            </Text>
            <Text style={styles.statLabel}>Tổng quãng đường</Text>
          </View>
          <View style={[styles.statBox, { marginLeft: 8 }]}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{totalPhotos}</Text>
            <Text style={styles.statLabel}>Ảnh đã lưu</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Chuyến đi gần nhất</Text>
      </View>

      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => {
          if (recentTrip) {
            navigation.navigate('TripDetail', { trip: recentTrip });
          } else {
            navigation.navigate('Trips'); // Go to trips tab if no recent trip
          }
        }} 
        style={styles.recentCard}
      >
        <Image 
          source={{ uri: recentTrip?.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' }} 
          style={styles.recentImage} 
        />
        <View style={styles.recentInfo}>
          <Text style={styles.recentTitle} numberOfLines={1}>{recentTrip?.title || 'Chưa có chuyến đi'}</Text>
          <Text style={styles.recentDate}>
            {recentTrip ? `${recentTrip.startDate} - ${recentTrip.endDate}` : 'Hãy thêm chuyến đi mới'}
          </Text>
          <Text style={styles.recentMeta}>
            {recentTrip ? `5 ngày • ${recentTrip.totalDistance || 0} km` : ''}
          </Text>
        </View>
        <ChevronRight color="#94A3B8" size={24} />
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Gợi ý cho bạn</Text>
      </View>

      <TouchableOpacity activeOpacity={0.8} style={styles.aiCard}>
        <View style={styles.aiIconBox}>
          <Sparkles color="#8B5CF6" size={28} />
        </View>
        <View style={styles.aiInfo}>
          <Text style={styles.aiTitle}>AI Trip Planner</Text>
          <Text style={styles.aiDesc}>Tạo lịch trình du lịch với AI</Text>
        </View>
        <ChevronRight color="#94A3B8" size={24} />
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748B',
  },
  statsGrid: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    padding: 12,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recentImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  recentInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  recentDate: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  recentMeta: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aiIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiInfo: {
    flex: 1,
    marginLeft: 16,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  aiDesc: {
    fontSize: 13,
    color: '#64748B',
  }
});
