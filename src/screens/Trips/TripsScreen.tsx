import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, RefreshControl, Animated, ScrollView } from 'react-native';
import { Text, FAB, Menu, Portal, Dialog, Button, Modal } from 'react-native-paper';
import { Search, ArrowLeft, Plus, MoreVertical, MapPin, Calendar, Map, Pencil, ChevronRight, Sparkles } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import { fetchTrips, deleteTrip, Trip } from '../../features/trips/tripsSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translations } from '../../constants/translations';
import { LinearGradient } from 'expo-linear-gradient';

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
        <Animated.View style={{ height: 24, backgroundColor: '#E2E8F0', borderRadius: 4, width: '60%', marginBottom: 12, opacity }} />
        <Animated.View style={{ height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, width: '40%', marginBottom: 16, opacity }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Animated.View style={{ height: 24, backgroundColor: '#E2E8F0', borderRadius: 12, width: '25%', opacity }} />
          <Animated.View style={{ height: 24, backgroundColor: '#E2E8F0', borderRadius: 12, width: '25%', opacity }} />
        </View>
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
  const [createModalVisible, setCreateModalVisible] = useState(false);

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

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Planning': return '#F59E0B';
      case 'Upcoming': return '#3B82F6';
      case 'Ongoing': return '#10B981';
      case 'Completed': return '#64748B';
      default: return '#3B82F6';
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
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('TripDetail', { trip: item })}
        style={styles.card}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.coverImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800' }} style={styles.cardImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.imageOverlay}
          />
          <View style={[styles.statusBadgeImage, { backgroundColor: getStatusColor(item.status) + 'CC' }]}>
            <Text style={styles.statusTextImage}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            
            <Menu
              visible={menuVisibleId === item.id}
              onDismiss={() => setMenuVisibleId(null)}
              anchor={
                <TouchableOpacity onPress={() => setMenuVisibleId(item.id)} style={{ padding: 4, marginRight: -8, marginTop: -4 }}>
                  <MoreVertical color="#94A3B8" size={24} />
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

          <View style={styles.dateRow}>
            <Calendar color="#64748B" size={14} style={{ marginRight: 6 }} />
            <Text style={styles.cardDate}>
              {item.startDate} - {item.endDate}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>{diffDays} {texts.days}</Text>
            </View>
            <View style={styles.metaBadge}>
               <Map color="#64748B" size={12} style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{formatDistance(item.totalDistance)}</Text>
            </View>
            <View style={styles.metaBadge}>
              <MapPin color="#64748B" size={12} style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{item.itinerary?.length || 0} {texts.places}</Text>
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
          <Plus color="#4F46E5" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#94A3B8" size={20} style={styles.searchIcon} />
        <TextInput autoCorrect={false} spellCheck={false}          placeholder={texts.searchPlaceholder}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/7486/7486744.png' }} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>{texts.emptyTitle}</Text>
              <Text style={styles.emptySubtitle}>{texts.emptySubtitle}</Text>
              <Button mode="contained" onPress={() => navigation.navigate('AddTrip')} style={{ marginTop: 24, backgroundColor: '#4F46E5', borderRadius: 12, paddingHorizontal: 12 }}>
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
        onPress={() => setCreateModalVisible(true)}
      />

      {/* Delete Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={{ backgroundColor: '#fff', borderRadius: 24 }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>{texts.deleteTitle}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#475569', fontSize: 16 }}>{texts.deleteConfirm} "{selectedTripForDelete?.title}"? Hành động này không thể hoàn tác.</Text>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Button onPress={() => setDeleteDialogVisible(false)} textColor="#64748B">{texts.cancel}</Button>
            <Button onPress={handleDeleteConfirm} textColor="#FFFFFF" mode="contained" style={{ backgroundColor: '#EF4444', borderRadius: 12 }}>{texts.delete}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Create Trip Bottom Sheet */}
      <Portal>
        <Modal
          visible={createModalVisible}
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.createModal}
        >
          <View style={styles.createModalHandle} />
          <Text style={styles.createModalTitle}>Tạo chuyến đi mới</Text>
          <Text style={styles.createModalSubtitle}>Chọn cách bạn muốn lên kế hoạch</Text>

          <TouchableOpacity
            style={styles.createOption}
            activeOpacity={0.8}
            onPress={() => { setCreateModalVisible(false); navigation.navigate('AddTrip'); }}
          >
            <View style={[styles.createOptionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Pencil color="#4F46E5" size={24} />
            </View>
            <View style={styles.createOptionText}>
              <Text style={styles.createOptionTitle}>Tạo thủ công</Text>
              <Text style={styles.createOptionDesc}>Điền thông tin từng bước một theo ý muốn</Text>
            </View>
            <ChevronRight color="#94A3B8" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createOption, { marginBottom: 0 }]}
            activeOpacity={0.8}
            onPress={() => { setCreateModalVisible(false); navigation.navigate('AIPlanner'); }}
          >
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={[styles.createOptionIcon, { borderRadius: 16 }]}>
              <Sparkles color="#fff" size={24} />
            </LinearGradient>
            <View style={styles.createOptionText}>
              <Text style={styles.createOptionTitle}>✨ AI Tạo tự động</Text>
              <Text style={styles.createOptionDesc}>Nhập điểm đến, AI lên toàn bộ kế hoạch cho bạn</Text>
            </View>
            <ChevronRight color="#94A3B8" size={20} />
          </TouchableOpacity>
        </Modal>
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 24, borderRadius: 16, paddingHorizontal: 16, height: 52,
    marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#0F172A' },
  filterContainer: { marginBottom: 20 },
  filterScroll: { paddingHorizontal: 24, gap: 12 },
  filterChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  listContainer: { paddingHorizontal: 24, paddingBottom: 120 },
  card: {
    flexDirection: 'column', backgroundColor: '#fff', borderRadius: 24,
    marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, overflow: 'hidden',
    borderCurve: 'continuous',
  },
  imageContainer: { width: '100%', height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  statusBadgeImage: {
    position: 'absolute', top: 16, right: 16,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  statusTextImage: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardInfo: { padding: 20 },
  cardTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8, letterSpacing: -0.3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardDate: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9'
  },
  metaText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  fab: { position: 'absolute', margin: 16, right: 8, bottom: 16, backgroundColor: '#4F46E5', borderRadius: 28 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  errorText: { color: '#EF4444', textAlign: 'center', fontSize: 16 },
  emptyIcon: { width: 120, height: 120, marginBottom: 20, opacity: 0.7 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  createModal: { backgroundColor: '#fff', margin: 0, marginTop: 'auto', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 48 },
  createModalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  createModalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8, letterSpacing: -0.5 },
  createModalSubtitle: { fontSize: 15, color: '#64748B', marginBottom: 24 },
  createOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  createOptionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  createOptionText: { flex: 1 },
  createOptionTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  createOptionDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },
});
