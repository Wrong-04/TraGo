import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, RefreshControl, Animated, ScrollView } from 'react-native';
import { Text, FAB, Menu, Portal, Dialog, Button } from 'react-native-paper';
import { Search, ArrowLeft, Plus, MoreVertical, MapPin } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import { fetchTrips, deleteTrip, Trip } from '../../features/trips/tripsSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translations } from '../../constants/translations';

const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [opacity]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.cardImage, { backgroundColor: '#E2E8F0', opacity }]} />
      <View style={styles.cardInfo}>
        <Animated.View style={{ height: 20, backgroundColor: '#E2E8F0', borderRadius: 4, width: '70%', marginBottom: 8, opacity }} />
        <Animated.View style={{ height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, width: '50%', marginBottom: 8, opacity }} />
        <Animated.View style={{ height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, width: '40%', opacity }} />
      </View>
    </View>
  );
};

export default function TripsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, error } = useSelector((state: RootState) => state.trips);
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const texts = translations[settings.language].trips;

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedTripForDelete, setSelectedTripForDelete] = useState<Trip | null>(null);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchTrips(user.uid));
    }
  }, [dispatch, user?.uid]);

  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    await dispatch(fetchTrips(user.uid));
    setRefreshing(false);
  }, [dispatch, user?.uid]);

  const handleDeleteConfirm = async () => {
    if (selectedTripForDelete) {
      await dispatch(deleteTrip(selectedTripForDelete.id));
      setDeleteDialogVisible(false);
      setSelectedTripForDelete(null);
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'Planning': return texts.statusPlanning;
      case 'Upcoming': return texts.statusUpcoming;
      case 'Ongoing': return texts.statusOngoing;
      case 'Completed': return texts.statusCompleted;
      default: return texts.statusUpcoming;
    }
  };

  const filteredTrips = items.filter(trip => {
    const matchesSearch = trip.title.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = true;
    if (filter === 'upcoming') matchesFilter = trip.status === 'Upcoming' || trip.status === 'Planning';
    if (filter === 'ongoing') matchesFilter = trip.status === 'Ongoing';
    if (filter === 'completed') matchesFilter = trip.status === 'Completed';
    return matchesSearch && matchesFilter;
  });

  const formatDistance = (value: number | undefined) => {
    const distance = (value || 0) * (settings.distanceUnit === 'Miles' ? 0.621371 : 1);
    return `${distance.toFixed(settings.distanceUnit === 'Miles' ? 1 : 0)} ${settings.distanceUnit === 'Miles' ? translations[settings.language].common.miles : translations[settings.language].common.kilometers}`;
  };

  const renderTripCard = ({ item }: { item: Trip }) => {
    // Tính tổng số ngày
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TripDetail', { trip: item })}
        style={styles.card}
      >
        <Image source={{ uri: item.coverImage }} style={styles.cardImage} />
        
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardDate}>
                {item.startDate} - {item.endDate}
              </Text>
            </View>
            
            <Menu
              visible={menuVisibleId === item.id}
              onDismiss={() => setMenuVisibleId(null)}
              anchor={
                <TouchableOpacity onPress={() => setMenuVisibleId(item.id)} style={{ padding: 4 }}>
                  <MoreVertical color="#64748B" size={20} />
                </TouchableOpacity>
              }
            >
              <Menu.Item onPress={() => { setMenuVisibleId(null); navigation.navigate('TripDetail', { trip: item }); }} title={texts.viewDetail} />
              <Menu.Item onPress={() => { setMenuVisibleId(null); navigation.navigate('EditTrip', { trip: item }); }} title={texts.edit} />
              <Menu.Item onPress={() => { setMenuVisibleId(null); /* Handle Favorite */ }} title={texts.favorite} />
              <Menu.Item 
                titleStyle={{ color: '#EF4444' }} 
                onPress={() => {
                  setMenuVisibleId(null);
                  setSelectedTripForDelete(item);
                  setDeleteDialogVisible(true);
                }} 
                title={texts.delete} 
              />
            </Menu>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{diffDays} {texts.days}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{formatDistance(item.totalDistance)}</Text>
              <Text style={styles.metaDot}>•</Text>
              <MapPin color="#64748B" size={12} style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{item.itinerary?.length || 0} {texts.places}</Text>
            </View>
            <View style={[styles.statusBadge, item.status === 'Completed' && styles.statusBadgeCompleted, item.status === 'Ongoing' && styles.statusBadgeOngoing]}>
              <Text style={[styles.statusText, item.status === 'Completed' && styles.statusTextCompleted, item.status === 'Ongoing' && styles.statusTextOngoing]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterScroll = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        <TouchableOpacity style={[styles.filterChip, filter === 'all' && styles.filterChipActive]} onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>{texts.all}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, filter === 'upcoming' && styles.filterChipActive]} onPress={() => setFilter('upcoming')}>
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>{texts.upcoming}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, filter === 'ongoing' && styles.filterChipActive]} onPress={() => setFilter('ongoing')}>
          <Text style={[styles.filterText, filter === 'ongoing' && styles.filterTextActive]}>{texts.ongoing}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]} onPress={() => setFilter('completed')}>
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>{texts.completed}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{texts.title}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('AddTrip')}>
          <Plus color="#3B82F6" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#94A3B8" size={20} style={styles.searchIcon} />
        <TextInput
          placeholder={texts.searchPlaceholder}
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      {renderFilterScroll()}

      {/* Main List */}
      {isLoading && !refreshing ? (
        <View style={styles.listContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Đã có lỗi xảy ra: {error}</Text>
          <Button mode="contained" onPress={onRefresh} style={{ marginTop: 16 }}>{texts.retry}</Button>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/7486/7486744.png' }} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>{texts.emptyTitle}</Text>
              <Text style={styles.emptySubtitle}>{texts.emptySubtitle}</Text>
              <Button mode="contained" onPress={() => navigation.navigate('AddTrip')} style={{ marginTop: 16, backgroundColor: '#3B82F6' }}>
                {texts.createNew}
              </Button>
            </View>
          }
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={() => navigation.navigate('AddTrip')}
      />

      {/* Delete Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={{ backgroundColor: '#fff', borderRadius: 16 }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>{texts.deleteTitle}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#475569' }}>{texts.deleteConfirm} "{selectedTripForDelete?.title}"? Hành động này không thể hoàn tác.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} textColor="#64748B">{texts.cancel}</Button>
            <Button onPress={handleDeleteConfirm} textColor="#EF4444" mode="contained" style={{ backgroundColor: '#FEE2E2', elevation: 0 }}>{texts.delete}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8FAFC'
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 24, borderRadius: 12, paddingHorizontal: 16, height: 48,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A' },
  filterContainer: { marginBottom: 16 },
  filterScroll: { paddingHorizontal: 24, gap: 12 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: { backgroundColor: '#3B82F6' },
  filterText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden', minHeight: 110
  },
  cardImage: { width: 110, height: '100%', minHeight: 110 },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  cardDate: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  cardFooter: { flexDirection: 'column', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  metaDot: { fontSize: 12, color: '#CBD5E1', marginHorizontal: 6 },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, backgroundColor: '#EFF6FF'
  },
  statusBadgeOngoing: { backgroundColor: '#FEF3C7' },
  statusBadgeCompleted: { backgroundColor: '#ECFDF5' },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#3B82F6' },
  statusTextOngoing: { color: '#D97706' },
  statusTextCompleted: { color: '#10B981' },
  fab: { position: 'absolute', margin: 16, right: 8, bottom: 16, backgroundColor: '#3B82F6', borderRadius: 28 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  errorText: { color: '#EF4444', textAlign: 'center' },
  emptyIcon: { width: 120, height: 120, marginBottom: 16, opacity: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
