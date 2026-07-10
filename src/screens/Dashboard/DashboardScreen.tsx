import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, useTheme, Avatar } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import { fetchTrips } from '../../features/trips/tripsSlice';
import { ChevronRight, Sparkles, Map, MapPin, Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { translations } from '../../constants/translations';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const { items } = useSelector((state: RootState) => state.trips);
  const texts = translations[settings.language].dashboard;
  const tripTexts = translations[settings.language].trips;
  const commonTexts = translations[settings.language].common;

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
  const rawDistance = items.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0);
  const totalDistance = settings.distanceUnit === 'Miles' ? rawDistance * 0.621371 : rawDistance;
  const totalDistanceUnit = settings.distanceUnit === 'Miles' ? commonTexts.miles : commonTexts.kilometers;
  const recentTrip = items.length > 0 ? items[0] : null;

  const formatDistance = (value?: number) => {
    const distance = (value || 0) * (settings.distanceUnit === 'Miles' ? 0.621371 : 1);
    return `${distance.toFixed(2)} ${totalDistanceUnit}`;
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'Planning':
        return tripTexts.statusPlanning;
      case 'Ongoing':
        return tripTexts.statusOngoing;
      case 'Completed':
        return tripTexts.statusCompleted;
      case 'Upcoming':
      default:
        return tripTexts.statusUpcoming;
    }
  };

  const getTripDays = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="headlineSmall" style={[styles.greeting, { color: theme.colors.onSurface }]}>
            {texts.greeting}, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'} 👋
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.secondary }]}>
            {texts.subtitle}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ProfileTab')}>
          {user?.photoURL ? (
            <Avatar.Image size={56} source={{ uri: user.photoURL }} style={styles.avatarShadow} />
          ) : (
            <Avatar.Text size={56} label={(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()} style={styles.avatarShadow} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#EEF2FF', marginRight: 8 }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#E0E7FF' }]}>
               <Map color="#4F46E5" size={20} />
            </View>
            <Text style={[styles.statNumber, { color: '#4F46E5' }]}>{totalTrips}</Text>
            <Text style={styles.statLabel}>{texts.trips}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#F0FDF4', marginLeft: 8 }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
               <MapPin color="#16A34A" size={20} />
            </View>
            <Text style={[styles.statNumber, { color: '#16A34A' }]}>{totalLocations}</Text>
            <Text style={styles.statLabel}>{texts.locations}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#FFF7ED', marginRight: 8 }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFEDD5' }]}>
               <ChevronRight color="#EA580C" size={20} />
            </View>
            <Text style={[styles.statNumber, { color: '#EA580C' }]}>
              {totalDistance.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <Text style={{fontSize: 14}}> {totalDistanceUnit}</Text>
            </Text>
            <Text style={styles.statLabel}>{texts.totalDistance}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FDF2F8', marginLeft: 8 }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#FCE7F3' }]}>
               <Camera color="#DB2777" size={20} />
            </View>
            <Text style={[styles.statNumber, { color: '#DB2777' }]}>{totalPhotos}</Text>
            <Text style={styles.statLabel}>{texts.photos}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{texts.recentTrip}</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('TripsTab')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        snapToInterval={width * 0.85 + 16}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, gap: 16 }}
      >
        {items.length === 0 ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AddTrip')}
            style={[styles.recentCardWrapper, { marginHorizontal: 0, width: width * 0.85 }]}
          >
            <View style={[styles.recentCard, { backgroundColor: theme.colors.surface }]}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800' }}
                style={styles.recentImage}
              />
              <View style={styles.recentInfo}>
                <Text style={[styles.recentTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {texts.recentTripEmpty}
                </Text>
                <Text style={styles.recentDate}>{texts.recentTripHint}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          items.slice(0, 5).map(trip => (
            <TouchableOpacity
              key={trip.id}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('TripDetail', { trip })}
              style={[styles.recentCardWrapper, { marginHorizontal: 0, width: width * 0.85 }]}
            >
              <View style={[styles.recentCard, { backgroundColor: theme.colors.surface }]}>
                <Image
                  source={{ uri: trip.coverImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800' }}
                  style={styles.recentImage}
                />
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {trip.title}
                  </Text>
                  <Text style={styles.recentDate}>
                    {trip.startDate} - {trip.endDate}
                  </Text>
                  <Text style={styles.recentMeta}>
                    {getTripDays(trip.startDate, trip.endDate)} {commonTexts.days} • {formatDistance(trip.totalDistance)}
                  </Text>
                  <View style={styles.recentTags}>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagText}>{formatDistance(trip.totalDistance)}</Text>
                    </View>
                    <View style={[styles.tagBadge, { backgroundColor: '#E0E7FF' }]}>
                      <Text style={[styles.tagText, { color: '#4F46E5' }]}>{getStatusLabel(trip.status)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{texts.suggestions}</Text>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('AIPlanner')}>
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiCard}
        >
          <View style={styles.aiIconBox}>
            <Sparkles color="#8B5CF6" size={24} />
          </View>
          <View style={styles.aiInfo}>
            <Text style={styles.aiTitle}>{texts.aiPlannerTitle}</Text>
            <Text style={styles.aiDesc}>{texts.aiPlannerDesc}</Text>
          </View>
          <View style={styles.aiArrow}>
            <ChevronRight color="#FFFFFF" size={20} />
          </View>
        </LinearGradient>
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
    marginBottom: 28,
  },
  headerText: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.8,
  },
  avatarShadow: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    borderCurve: 'continuous', // iOS only, gracefully degrades
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  seeAllText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  recentCardWrapper: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  recentCard: {
    flexDirection: 'column',
    borderRadius: 24,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  recentImage: {
    width: '100%',
    height: 140,
  },
  recentInfo: {
    padding: 20,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  recentDate: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  recentMeta: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
    fontWeight: '500',
  },
  recentTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 24,
    marginBottom: 40,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderCurve: 'continuous',
  },
  aiIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  aiDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  aiArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
