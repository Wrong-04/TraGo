import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton, Divider, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Calendar, Camera, Clock, Share2 } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../features/store';
import { fetchTripDetailData, clearTripDetail } from '../../features/trips/tripDetailSlice';
import { TripActivity, TripDay } from '../../features/trips/tripsSlice';
import { translations } from '../../constants/translations';

const { width } = Dimensions.get('window');

export default function TripDetailScreen({ navigation, route }: any) {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  
  const trip = route.params?.trip;
  const settings = useSelector((state: RootState) => state.settings);
  const { locations, gallery, journals, expenses, isLoading } = useSelector((state: RootState) => state.tripDetail);
  const texts = translations[settings.language].tripDetail;

  useEffect(() => {
    if (trip?.id) {
      dispatch(fetchTripDetailData(trip.id));
    }
    return () => {
      dispatch(clearTripDetail());
    };
  }, [dispatch, trip?.id]);

  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'expenses' | 'journal'>('itinerary');

  if (!trip) return null;

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const totalCost = trip.totalCost ?? totalExpenses;
  const formattedCost = new Intl.NumberFormat(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
  }).format(totalCost);
  const distanceValue = (trip.totalDistance || 0) * (settings.distanceUnit === 'Miles' ? 0.621371 : 1);
  const distanceUnit = settings.distanceUnit === 'Miles' ? translations[settings.language].common.miles : translations[settings.language].common.kilometers;
  const aiDestinations = (trip.itinerary as TripDay[] | undefined)?.flatMap((day: TripDay) => (day.activities ?? []).map((activity: TripActivity) => activity.location || activity.description).filter(Boolean)) ?? [];
  const uniqueDestinations = Array.from(new Set(aiDestinations));
  const destinationText = uniqueDestinations.length > 0
    ? uniqueDestinations.join(', ')
    : locations.map(loc => loc.name).filter(Boolean).join(', ');
  const hasItinerary = Array.isArray(trip.itinerary) && trip.itinerary.length > 0;
  const hasLocations = locations.length > 0;
  const hasExpenses = expenses.length > 0;
  const hasJournals = journals.length > 0;

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
              <Text variant="titleLarge" style={styles.statValue}>{distanceValue.toFixed(settings.distanceUnit === 'Miles' ? 1 : 0)}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{texts.distanceLabel} ({distanceUnit})</Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>{formattedCost}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{texts.costLabel}</Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>{destinationText ? destinationText.split(',').length : locations.length}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{texts.destinationsLabel}</Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="titleLarge" style={styles.statValue}>{gallery.length}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{texts.photosLabel}</Text>
            </View>
          </View>

          {destinationText ? (
            <View style={styles.destinationPreview}>
              <Text style={styles.destinationPreviewLabel}>Danh sách điểm đến AI:</Text>
              <Text style={styles.destinationPreviewText}>{destinationText}</Text>
            </View>
          ) : null}

          <View style={styles.tabContainer}>
            <TouchableOpacity onPress={() => setActiveTab('itinerary')} style={[styles.tabButton, activeTab === 'itinerary' && styles.tabButtonActive]}>
              <Text variant="titleMedium" style={[styles.tabText, activeTab === 'itinerary' && styles.tabTextActive]}>{texts.itinerary}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('map')} style={[styles.tabButton, activeTab === 'map' && styles.tabButtonActive]}>
              <Text variant="titleMedium" style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>{texts.map}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('expenses')} style={[styles.tabButton, activeTab === 'expenses' && styles.tabButtonActive]}>
              <Text variant="titleMedium" style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>{texts.expenses}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('journal')} style={[styles.tabButton, activeTab === 'journal' && styles.tabButtonActive]}>
              <Text variant="titleMedium" style={[styles.tabText, activeTab === 'journal' && styles.tabTextActive]}>{texts.journal}</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.tabContent}>
              {activeTab === 'itinerary' && (
                <View>
                  {hasItinerary ? (
                    (trip.itinerary as TripDay[]).map((day: TripDay, index: number) => (
                      <View key={`day-${index}`} style={styles.dayBlock}>
                        <Text variant="titleMedium" style={styles.dayTitle}>Ngày {day.day}</Text>
                        {(day.activities ?? []).map((activity: TripActivity, actIdx: number) => (
                          <View key={actIdx} style={styles.activityRow}>
                            <Text style={styles.activityTime}>{activity.time}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.activityDescription}>{activity.description}</Text>
                              {activity.location ? <Text style={styles.activityLocation}>{activity.location}</Text> : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: theme.colors.secondary }}>{texts.noLocationsText}</Text>
                  )}
                </View>
              )}

              {activeTab === 'map' && (
                <View>
                  {hasLocations ? (
                    <View style={styles.timelineContainer}>
                      {locations.map((loc, index) => (
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
                            {loc.address ? <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>{loc.address}</Text> : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: theme.colors.secondary }}>{texts.noLocations}</Text>
                  )}
                </View>
              )}

              {activeTab === 'expenses' && (
                <View style={styles.expenseSection}>
                  {hasExpenses ? (
                    expenses.map(exp => (
                      <View key={exp.id} style={styles.expenseItem}>
                        <Text style={styles.expenseName}>{exp.category || 'Khoản chi'}</Text>
                        <Text style={styles.expenseAmount}>{new Intl.NumberFormat(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
                          style: 'currency', currency: 'VND'
                        }).format(exp.amount || 0)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: theme.colors.secondary }}>{texts.noExpenses}</Text>
                  )}
                </View>
              )}

              {activeTab === 'journal' && (
                <View style={styles.journalSection}>
                  {hasJournals ? (
                    journals.map(journal => (
                      <View key={journal.id} style={styles.journalCard}>
                        <Text style={styles.journalDate}>{new Date(journal.created_at).toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US')}</Text>
                        <Text style={styles.journalText}>{journal.content || 'Không có nội dung'}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: theme.colors.secondary }}>{texts.noJournal}</Text>
                  )}
                </View>
              )}
            </View>
          )}

          <Button 
            mode="contained" 
            style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('AddTrip', { trip })}
          >
            {texts.editTrip}
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
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#3B82F6' },
  tabText: { color: '#94a3b8' },
  tabTextActive: { color: '#0F172A', fontWeight: 'bold' },
  tabContent: { marginBottom: 24 },
  destinationPreview: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, marginBottom: 16 },
  destinationPreviewLabel: { fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: '600' },
  destinationPreviewText: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  dayBlock: { marginBottom: 18, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 16 },
  dayTitle: { fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  activityRow: { flexDirection: 'row', marginBottom: 10 },
  activityTime: { width: 68, color: '#64748B', fontSize: 13 },
  activityDescription: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  activityLocation: { color: '#64748B', fontSize: 12, marginTop: 4 },
  expenseSection: { marginBottom: 24 },
  expenseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  expenseName: { color: '#0F172A', fontSize: 14 },
  expenseAmount: { color: '#0F172A', fontWeight: '700' },
  journalSection: { marginBottom: 24 },
  journalCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 16 },
  journalDate: { color: '#64748B', fontSize: 12, marginBottom: 8 },
  journalText: { color: '#0F172A', fontSize: 14, lineHeight: 20 },
  timelineContainer: { paddingLeft: 10, marginBottom: 40 },
  timelineItem: { flexDirection: 'row', marginBottom: 24, position: 'relative' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, zIndex: 2 },
  timelineLine: { position: 'absolute', left: 5, top: 16, bottom: -24, width: 2, zIndex: 1 },
  timelineContent: { marginLeft: 20, flex: 1 },
  editButton: { borderRadius: 30, marginBottom: 40, paddingVertical: 4 }
});
