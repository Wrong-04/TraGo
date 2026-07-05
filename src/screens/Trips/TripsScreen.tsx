
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, RefreshControl, Animated, ScrollView, Dimensions } from 'react-native';
import { Text, Menu, Portal, Dialog, Button } from 'react-native-paper';
import { Search, ArrowLeft, Plus, MoreVertical, MapPin, Sparkles } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import { fetchTrips, Trip } from '../../features/trips/tripsSlice';
import { deleteTripCascade } from '../../features/trips/tripDetailSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
        <Animated.View style={{ height: 24, backgroundColor: '#E2E8F0', borderRadius: 6, width: '70%', marginBottom: 12, opacity }} />
        <Animated.View style={{ height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, width: '50%', marginBottom: 12, opacity }} />
        <Animated.View style={{ height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, width: '40%', opacity }} />
      </View>
    </View>
  );
};

const formatKm = (km: number) => {
  if (!km) return '0 m';
  return km >= 1 ? `${km.toFixed(1)} km` : `${(km * 1000).toFixed(0)} m`;
};

export default function TripsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, error } = useSelector((state: RootState) => state.trips);
  const user = useSelector((state: RootState) => state.auth.user);

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
      await dispatch(deleteTripCascade(selectedTripForDelete.id));
      dispatch(fetchTrips(user?.uid));
      setDeleteDialogVisible(false);
      setSelectedTripForDelete(null);
    }
  };

  const getStatusConfig = (status: string | undefined) => {
    switch (status) {
      case 'Planning': return { label: 'Lên kế hoạch', colors: ['#E0F2FE', '#BAE6FD'] as [string, string], textColor: '#0284C7' };
      case 'Upcoming': return { label: 'Sắp tới', colors: ['#FEF3C7', '#FDE68A'] as [string, string], textColor: '#D97706' };
      case 'Ongoing': return { label: 'Đang đi', colors: ['#D1FAE5', '#A7F3D0'] as [string, string], textColor: '#059669' };
      case 'Completed': return { label: 'Hoàn thành', colors: ['#F1F5F9', '#E2E8F0'] as [string, string], textColor: '#475569' };
      default: return { label: 'Sắp tới', colors: ['#FEF3C7', '#FDE68A'] as [string, string], textColor: '#D97706' };
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

  const renderTripCard = ({ item }: { item: Trip }) => {
    const startDate = new Date(item.startDate); startDate.setHours(0,0,0,0);
    const endDate = new Date(item.endDate); endDate.setHours(0,0,0,0);
    const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const statusCfg = getStatusConfig(item.status);

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('TripDetail', { trip: item })}
        style={styles.card}
      >
        <Image source={{ uri: item.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' }} style={styles.cardImage} />
        
        {/* Floating Badge */}
        <LinearGradient colors={statusCfg.colors} style={styles.floatingBadge} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Text style={[styles.badgeText, { color: statusCfg.textColor }]}>{statusCfg.label}</Text>
        </LinearGradient>

        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardDate}>{new Date(item.startDate).toLocaleDateString('vi-VN')} - {new Date(item.endDate).toLocaleDateString('vi-VN')}</Text>
            </View>
            
            <Menu
              visible={menuVisibleId === item.id}
              onDismiss={() => setMenuVisibleId(null)}
              anchor={
                <TouchableOpacity onPress={() => setMenuVisibleId(item.id)} style={styles.moreBtn}>
                  <MoreVertical color="#94A3B8" size={20} />
                </TouchableOpacity>
              }
              contentStyle={{ borderRadius: 12, backgroundColor: '#fff' }}
            >
              <Menu.Item onPress={() => { setMenuVisibleId(null); navigation.navigate('TripDetail', { trip: item }); }} title="Xem chi tiết" leadingIcon="eye-outline" />
              <Menu.Item onPress={() => { setMenuVisibleId(null); navigation.navigate('AddTrip', { trip: item }); }} title="Sửa" leadingIcon="pencil-outline" />
              <Menu.Item titleStyle={{ color: '#EF4444' }} onPress={() => { setMenuVisibleId(null); setSelectedTripForDelete(item); setDeleteDialogVisible(true); }} title="Xóa" leadingIcon="trash-can-outline" />
            </Menu>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>{diffDays} ngày</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>{formatKm(item.totalDistance || 0)}</Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: '#EFF6FF' }]}>
              <MapPin color="#3B82F6" size={12} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: '#3B82F6' }]}>{item.totalLocations || 0} địa điểm</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
        <LinearGradient colors={['#F0F9FF', '#F8FAFC']} style={StyleSheet.absoluteFillObject} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Chuyến đi của tôi</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddTrip')}>
          <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.addBtnGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Plus color="#fff" size={24} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchContainer}>
          <Search color="#94A3B8" size={20} style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm kiếm hành trình..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['all', 'upcoming', 'ongoing', 'completed'].map((f) => {
            const labels: any = { all: 'Tất cả', upcoming: 'Sắp tới', ongoing: 'Đang diễn ra', completed: 'Hoàn thành' };
            const isActive = filter === f;
            return (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} activeOpacity={0.8}>
                <LinearGradient 
                  colors={isActive ? ['#3B82F6', '#2563EB'] : ['#fff', '#fff']} 
                  style={[styles.filterChip, !isActive && styles.filterChipInactive]}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{labels[f]}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}><Sparkles color="#8B5CF6" size={48} /></View>
                <Text style={styles.emptyTitle}>Chưa có chuyến đi nào</Text>
                <Text style={styles.emptySubtitle}>Bắt đầu lên kế hoạch cho chuyến phiêu lưu tiếp theo của bạn ngay hôm nay!</Text>
                <Button mode="contained" onPress={() => navigation.navigate('AddTrip')} style={styles.emptyBtn} contentStyle={{ height: 48 }}>
                  Tạo chuyến đi mới
                </Button>
              </View>
            )}
          </View>
        )}
      />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={{ borderRadius: 16, backgroundColor: '#fff' }}>
          <Dialog.Title>Xóa chuyến đi?</Dialog.Title>
          <Dialog.Content><Text style={{ color: '#475569' }}>Toàn bộ dữ liệu về địa điểm, chi tiêu, và hình ảnh của chuyến đi này sẽ bị xóa vĩnh viễn.</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} textColor="#64748B">Hủy</Button>
            <Button onPress={handleDeleteConfirm} textColor="#EF4444">Xóa vĩnh viễn</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  addBtn: { borderRadius: 16, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  addBtnGradient: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { paddingHorizontal: 20, marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, height: 54, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 16, color: '#0F172A' },
  filterWrap: { marginBottom: 16 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
  filterChipInactive: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  filterText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  filterTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5, overflow: 'hidden' },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  floatingBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  cardInfo: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  cardDate: { fontSize: 14, color: '#64748B' },
  moreBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 100 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  metaText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', paddingVertical: 40 },
  emptyState: { alignItems: 'center', paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyBtn: { backgroundColor: '#3B82F6', borderRadius: 12, width: '100%' },
});
