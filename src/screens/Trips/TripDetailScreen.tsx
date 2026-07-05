import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, Dimensions, ActivityIndicator } from 'react-native';
import { Text, useTheme, IconButton, Divider, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Calendar, Camera, Clock, Share2 } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../features/store';
import { fetchTripDetailData, clearTripDetail } from '../../features/trips/tripDetailSlice';

const { width } = Dimensions.get('window');

export default function TripDetailScreen({ navigation, route }: any) {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  
  const trip = route.params?.trip;
  const { locations, gallery, expenses, isLoading } = useSelector((state: RootState) => state.tripDetail);

  useEffect(() => {
    if (trip?.id) {
      dispatch(fetchTripDetailData(trip.id));
    }
    return () => {
      dispatch(clearTripDetail());
    };
  }, [dispatch, trip?.id]);

  if (!trip) return null;

  const totalCost = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Cover Image Header */}
        <ImageBackground source={{ uri: trip.coverImage || 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800' }} style={styles.headerImage}>
          <View style={[styles.headerOverlay, { paddingTop: insets.top }]}>
            <View style={styles.appBar}>
              <IconButton 
                icon="arrow-left" 
                iconColor="#fff" 
                size={24} 
                onPress={() => navigation.goBack()} 
                style={styles.iconBtn}
              />
              <View style={{ flex: 1 }} />
              <IconButton 
                icon={() => <Share2 color="#fff" size={20} />} 
                onPress={() => {}} 
                style={styles.iconBtn}
              />
            </View>
            <View style={styles.headerTitleContainer}>
              <Text variant="headlineMedium" style={styles.headerTitle}>
                {trip.title}
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          {/* Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Calendar color={theme.colors.secondary} size={20} />
              <Text variant="bodyMedium" style={{ marginLeft: 8, color: theme.colors.secondary }}>
                {trip.startDate} - {trip.endDate}
              </Text>
            </View>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{trip.status}</Text>
          </View>

          <Divider style={styles.divider} />

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>{trip.totalDistance || 0}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Quãng đường (km)</Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>{totalCost.toLocaleString('vi-VN')}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Chi phí</Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>{locations.length}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Điểm đến</Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>{gallery.length}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Ảnh</Text>
            </View>
          </View>

          {/* Tabs Tạm thời */}
          <View style={styles.tabContainer}>
            <Text variant="titleMedium" style={[styles.tabActive, { color: theme.colors.primary, borderBottomColor: theme.colors.primary }]}>Lịch trình</Text>
            <Text 
              variant="titleMedium" 
              style={styles.tabInactive}
              onPress={() => navigation.navigate('MapTab', { tripId: trip.id })}
            >
              Bản đồ
            </Text>
            <Text variant="titleMedium" style={styles.tabInactive}>Chi phí</Text>
            <Text variant="titleMedium" style={styles.tabInactive}>Nhật ký</Text>
          </View>

          {/* Timeline Thực Tế */}
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.timelineContainer}>
              {locations.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.colors.secondary }}>Chưa có địa điểm nào.</Text>
              ) : (
                locations.map((loc, index) => (
                  <View key={loc.id} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: index === 0 ? theme.colors.primary : theme.colors.secondary }]} />
                    {index < locations.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: theme.colors.surfaceVariant }]} />
                    )}
                    <View style={styles.timelineContent}>
                      <Text variant="labelLarge" style={{ color: index === 0 ? theme.colors.primary : theme.colors.secondary }}>
                        {loc.visit_date || `Điểm ${index + 1}`}
                      </Text>
                      <Text variant="bodyLarge" style={{ fontWeight: 'bold', marginTop: 4 }}>{loc.name}</Text>
                      {loc.address && <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>{loc.address}</Text>}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          <Button 
            mode="contained" 
            style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('AddTrip', { trip })}
          >
            Sửa chuyến đi
          </Button>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerImage: { width: width, height: 300, justifyContent: 'flex-start' },
  headerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between', paddingBottom: 20 },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  iconBtn: { backgroundColor: 'rgba(0,0,0,0.3)' },
  headerTitleContainer: { paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  content: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff', marginTop: -24, paddingTop: 24, paddingHorizontal: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  infoItem: { flexDirection: 'row', alignItems: 'center' },
  divider: { marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statBox: { alignItems: 'center' },
  statValue: { fontWeight: 'bold' },
  statLabel: { color: '#64748b', marginTop: 4 },
  tabContainer: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 24 },
  tabActive: { fontWeight: 'bold', borderBottomWidth: 2, paddingBottom: 10 },
  tabInactive: { color: '#94a3b8', paddingBottom: 10 },
  timelineContainer: { paddingLeft: 10, marginBottom: 40 },
  timelineItem: { flexDirection: 'row', marginBottom: 24, position: 'relative' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -24, width: 2, zIndex: 1 },
  timelineContent: { marginLeft: 20, flex: 1 },
  editButton: { borderRadius: 30, marginBottom: 40, paddingVertical: 4 }
});
