
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Text, useTheme, Divider, Chip, Portal, Dialog, TextInput, Button, FAB, Snackbar } from 'react-native-paper';
import { ArrowLeft, Map, Calendar, MapPin, Navigation2, CheckCircle2, Activity, Image as ImageIcon, Book, Plus, Wallet, Trash2, Camera } from 'lucide-react-native';
import { supabase } from '../../config/supabase';
import { TripLocation } from '../Maps/MapScreen';
import { Trip } from '../../features/trips/tripsSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../features/store';
import { fetchTripDetailData } from '../../features/trips/tripDetailSlice';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

const { width } = Dimensions.get('window');

const formatCurrency = (amount: number) => {
  return amount ? amount.toLocaleString('vi-VN') + ' đ' : '0 đ';
};

export default function TripDetailScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { top } = { top: 40 }; 
  
  const trip: Trip = route.params?.trip;
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Redux state
  const { locations, gallery, expenses, journals, isLoading } = useSelector((state: RootState) => state.tripDetail);

  const [activeTab, setActiveTab] = useState<'itinerary' | 'gallery' | 'expenses' | 'journals'>('itinerary');
  const [snackMsg, setSnackMsg] = useState('');

  // Modals state
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  
  const [journalModal, setJournalModal] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (trip.id) {
      dispatch(fetchTripDetailData(trip.id));
    }
  }, [trip.id]);

  const totalCost = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const start = new Date(trip.startDate); start.setHours(0,0,0,0);
  const end = new Date(trip.endDate); end.setHours(0,0,0,0);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  // --- Handlers ---
  
  const handleAddExpense = async () => {
    if (!expenseAmount || !expenseName) return;
    try {
      const { error } = await supabase.from('trip_expenses').insert([{
        trip_id: trip.id,
        amount: parseInt(expenseAmount),
        name: expenseName,
        category: 'other',
        expense_date: new Date().toISOString()
      }]);
      if (error) throw error;
      setExpenseModal(false);
      setExpenseAmount(''); setExpenseName('');
      dispatch(fetchTripDetailData(trip.id));
      setSnackMsg('Đã thêm chi phí!');
    } catch (e: any) {
      setSnackMsg('Lỗi: ' + e.message);
    }
  };

  const handleAddJournal = async () => {
    if (!journalTitle || !journalContent) return;
    try {
      const { error } = await supabase.from('journals').insert([{
        trip_id: trip.id,
        title: journalTitle,
        content: journalContent,
        date: new Date().toISOString()
      }]);
      if (error) throw error;
      setJournalModal(false);
      setJournalTitle(''); setJournalContent('');
      dispatch(fetchTripDetailData(trip.id));
      setSnackMsg('Đã thêm nhật ký!');
    } catch (e: any) {
      setSnackMsg('Lỗi: ' + e.message);
    }
  };

  const handleUploadImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && user) {
      setUploading(true);
      try {
        const asset = result.assets[0];
        const ext = asset.uri.substring(asset.uri.lastIndexOf('.') + 1);
        const fileName = `${user.uid}/${Date.now()}.${ext}`;
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        
        const { error: uploadError } = await supabase.storage.from('trago-images').upload(fileName, decode(base64), { contentType: `image/${ext}` });
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('trago-images').getPublicUrl(fileName);
        
        const { error: dbError } = await supabase.from('gallery').insert([{
          trip_id: trip.id,
          user_id: user.uid,
          image_url: data.publicUrl,
        }]);
        if (dbError) throw dbError;

        dispatch(fetchTripDetailData(trip.id));
        setSnackMsg('Đã tải ảnh lên!');
      } catch (e: any) {
        setSnackMsg('Lỗi: ' + e.message);
      } finally {
        setUploading(false);
      }
    }
  };

  // --- Renderers ---

  const renderTabHeader = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity style={activeTab === 'itinerary' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('itinerary')}>
        <Text style={activeTab === 'itinerary' ? styles.tabActiveText : styles.tabInactiveText}>Lịch trình</Text>
      </TouchableOpacity>
      <TouchableOpacity style={activeTab === 'gallery' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('gallery')}>
        <Text style={activeTab === 'gallery' ? styles.tabActiveText : styles.tabInactiveText}>Ảnh ({gallery.length})</Text>
      </TouchableOpacity>
      <TouchableOpacity style={activeTab === 'expenses' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('expenses')}>
        <Text style={activeTab === 'expenses' ? styles.tabActiveText : styles.tabInactiveText}>Chi phí</Text>
      </TouchableOpacity>
      <TouchableOpacity style={activeTab === 'journals' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('journals')}>
        <Text style={activeTab === 'journals' ? styles.tabActiveText : styles.tabInactiveText}>Nhật ký</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItinerary = () => (
    <>
      <View style={styles.itineraryHeader}>
        <Text style={styles.sectionTitle}>Lịch trình chi tiết</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'MapTab', params: { trip } })} style={styles.mapBtn}>
          <Map color="#3B82F6" size={18} />
          <Text style={styles.mapBtnText}>Bản đồ</Text>
        </TouchableOpacity>
      </View>
      {locations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Navigation2 color="#94A3B8" size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Chưa có địa điểm nào</Text>
          <Text style={styles.emptyDesc}>Hãy mở bản đồ và bắt đầu ghim những điểm đến thú vị cho chuyến đi này!</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'MapTab', params: { trip } })} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Thêm địa điểm ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.timeline}>
          {locations.map((loc, index) => (
            <View key={loc.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, loc.status === 'Visited' && styles.timelineDotVisited]}>
                  {loc.status === 'Visited' && <CheckCircle2 color="#fff" size={12} />}
                </View>
                {index < locations.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{new Date(loc.visit_date).toLocaleDateString('vi-VN')} {loc.visit_time && `- ${loc.visit_time}`}</Text>
                <View style={styles.timelineCard}>
                  <Text style={styles.locName}>{loc.name}</Text>
                  {loc.category && <Text style={styles.locCat}>{loc.category}</Text>}
                  {loc.estimated_cost ? (
                    <Text style={styles.locCost}>Dự kiến: {formatCurrency(loc.estimated_cost)}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  const renderGallery = () => (
    <View>
      <View style={styles.itineraryHeader}>
        <Text style={styles.sectionTitle}>Ảnh chuyến đi</Text>
        <TouchableOpacity onPress={handleUploadImage} style={styles.mapBtn} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color="#3B82F6" /> : <Camera color="#3B82F6" size={18} />}
          <Text style={styles.mapBtnText}>Thêm ảnh</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.gridContainer}>
        {gallery.map(item => (
          <Image key={item.id} source={{ uri: item.image_url || item.url }} style={styles.gridImage} />
        ))}
      </View>
      {gallery.length === 0 && !uploading && (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748B' }}>Chưa có ảnh nào.</Text>
      )}
    </View>
  );

  const renderExpenses = () => (
    <View>
      <View style={styles.itineraryHeader}>
        <Text style={styles.sectionTitle}>Chi phí thực tế</Text>
        <TouchableOpacity onPress={() => setExpenseModal(true)} style={styles.mapBtn}>
          <Plus color="#3B82F6" size={18} />
          <Text style={styles.mapBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>
      {expenses.map((exp, i) => (
        <View key={exp.id || i} style={styles.expenseCard}>
          <View style={styles.expenseIconWrap}>
            <Wallet color="#10B981" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locName}>{exp.description || 'Khoản chi'}</Text>
            <Text style={styles.locCost}>{new Date(exp.date || new Date()).toLocaleDateString('vi-VN')}</Text>
          </View>
          <Text style={[styles.locName, { color: '#EF4444' }]}>-{formatCurrency(exp.amount)}</Text>
        </View>
      ))}
      {expenses.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748B' }}>Chưa có khoản chi nào.</Text>
      )}
    </View>
  );

  const renderJournals = () => (
    <View>
      <View style={styles.itineraryHeader}>
        <Text style={styles.sectionTitle}>Nhật ký hành trình</Text>
        <TouchableOpacity onPress={() => setJournalModal(true)} style={styles.mapBtn}>
          <Plus color="#3B82F6" size={18} />
          <Text style={styles.mapBtnText}>Viết mới</Text>
        </TouchableOpacity>
      </View>
      {journals.map((j, i) => (
        <View key={j.id || i} style={styles.journalCard}>
          <View style={styles.journalHeader}>
            <Text style={styles.journalTitle}>{j.title}</Text>
            <Text style={styles.timelineDate}>{new Date(j.date || j.created_at || new Date()).toLocaleDateString('vi-VN')}</Text>
          </View>
          <Text style={styles.descText}>{j.content}</Text>
        </View>
      ))}
      {journals.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748B' }}>Chưa có nhật ký nào.</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* HERO IMAGE */}
        <View style={styles.heroSection}>
          <Image source={{ uri: trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' }} style={styles.heroImage} />
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(15,23,42,0.9)']} style={styles.heroOverlay}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { marginTop: top + 10 }]}>
              <ArrowLeft color="#fff" size={24} />
            </TouchableOpacity>
            
            <View style={styles.heroContent}>
              <View style={styles.badgeWrap}>
                <View style={styles.statusBadge}><Text style={styles.statusText}>{trip.status === 'Ongoing' ? 'Đang diễn ra' : trip.status === 'Completed' ? 'Hoàn thành' : 'Sắp tới'}</Text></View>
              </View>
              <Text style={styles.heroTitle}>{trip.title}</Text>
              <View style={styles.heroMetaRow}>
                <MapPin color="#CBD5E1" size={16} />
                <Text style={styles.heroMetaText}>{trip.city}, {trip.country}</Text>
                <Text style={styles.heroDot}>•</Text>
                <Calendar color="#CBD5E1" size={16} />
                <Text style={styles.heroMetaText}>{new Date(trip.startDate).toLocaleDateString('vi-VN')}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* CONTENT */}
        <View style={styles.contentSection}>
          
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
              <Calendar color="#3B82F6" size={24} />
              <Text style={styles.statLabel}>Thời gian</Text>
              <Text style={styles.statValue}>{diffDays} ngày</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
              <MapPin color="#10B981" size={24} />
              <Text style={styles.statLabel}>Địa điểm</Text>
              <Text style={styles.statValue}>{locations.length}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEF2F2' }]}>
              <Activity color="#EF4444" size={24} />
              <Text style={styles.statLabel}>Chi tiêu</Text>
              <Text style={styles.statValue}>{formatCurrency(totalCost)}</Text>
            </View>
          </View>

          {trip.description && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Mô tả</Text>
              <Text style={styles.descText}>{trip.description}</Text>
            </View>
          )}

          {renderTabHeader()}

          {isLoading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
          ) : (
            <>
              {activeTab === 'itinerary' && renderItinerary()}
              {activeTab === 'gallery' && renderGallery()}
              {activeTab === 'expenses' && renderExpenses()}
              {activeTab === 'journals' && renderJournals()}
            </>
          )}

        </View>
      </ScrollView>

      <Portal>
        {/* Expense Modal */}
        <Dialog visible={expenseModal} onDismiss={() => setExpenseModal(false)} style={{ backgroundColor: '#fff', borderRadius: 24 }}>
          <Dialog.Title style={{ fontWeight: 'bold', color: '#0F172A' }}>Thêm Chi Phí</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Tên khoản chi (vd: Ăn tối)" value={expenseName} onChangeText={setExpenseName} mode="outlined" style={styles.input} outlineColor="#E2E8F0" activeOutlineColor="#3B82F6" />
            <TextInput label="Số tiền (VND)" value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="numeric" mode="outlined" style={styles.input} outlineColor="#E2E8F0" activeOutlineColor="#3B82F6" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExpenseModal(false)} textColor="#64748B">Hủy</Button>
            <Button onPress={handleAddExpense} mode="contained" buttonColor="#3B82F6" style={{ borderRadius: 8 }}>Lưu</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Journal Modal */}
        <Dialog visible={journalModal} onDismiss={() => setJournalModal(false)} style={{ backgroundColor: '#fff', borderRadius: 24 }}>
          <Dialog.Title style={{ fontWeight: 'bold', color: '#0F172A' }}>Thêm Nhật Ký</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Tiêu đề" value={journalTitle} onChangeText={setJournalTitle} mode="outlined" style={styles.input} outlineColor="#E2E8F0" activeOutlineColor="#3B82F6" />
            <TextInput label="Nội dung" value={journalContent} onChangeText={setJournalContent} multiline numberOfLines={4} mode="outlined" style={styles.input} outlineColor="#E2E8F0" activeOutlineColor="#3B82F6" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setJournalModal(false)} textColor="#64748B">Hủy</Button>
            <Button onPress={handleAddJournal} mode="contained" buttonColor="#3B82F6" style={{ borderRadius: 8 }}>Lưu</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg('')} duration={3000}>
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  heroSection: { width: '100%', height: 350, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: 20 },
  heroContent: { padding: 24, paddingBottom: 32 },
  badgeWrap: { flexDirection: 'row', marginBottom: 12 },
  statusBadge: { backgroundColor: 'rgba(59,130,246,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 12, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center' },
  heroMetaText: { color: '#F8FAFC', fontSize: 14, fontWeight: '500', marginLeft: 6 },
  heroDot: { color: '#CBD5E1', marginHorizontal: 12, fontSize: 18 },
  contentSection: { flex: 1, backgroundColor: '#F8FAFC', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -24, padding: 24 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', marginHorizontal: 4 },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 12, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  descText: { fontSize: 15, color: '#475569', lineHeight: 24 },
  tabContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 12 },
  tabActive: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tabActiveText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 13 },
  tabInactive: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  tabInactiveText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  itineraryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  mapBtnText: { color: '#3B82F6', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  timeline: { marginLeft: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 24 },
  timelineLeft: { alignItems: 'center', width: 24, marginRight: 16 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#CBD5E1', borderWidth: 3, borderColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  timelineDotVisited: { backgroundColor: '#10B981' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', position: 'absolute', top: 16, bottom: -24 },
  timelineContent: { flex: 1, paddingBottom: 8 },
  timelineDate: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 8 },
  timelineCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  locName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  locCat: { fontSize: 13, color: '#8B5CF6', fontWeight: '500', marginBottom: 8 },
  locCost: { fontSize: 13, color: '#475569' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridImage: { width: (width - 48 - 16) / 3, height: (width - 48 - 16) / 3, borderRadius: 12 },
  expenseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  expenseIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  journalCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  journalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  journalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  input: { marginBottom: 16, backgroundColor: '#fff' }
});
