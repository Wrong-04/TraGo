import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, 
  TextInput as RNTextInput, ScrollView, Modal, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Text, ActivityIndicator, Snackbar, Checkbox } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabase';
import { decode } from 'base64-arraybuffer';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, AppDispatch } from '../../features/store';
import { fetchGallery } from '../../features/gallery/gallerySlice';
import { translations } from '../../constants/translations';
import { 
  Plus, Search, Camera, Image as ImageIcon, X, MapPin, Calendar, Heart, Trash2, FolderPlus, Map
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export default function GalleryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const { images, isLoading } = useSelector((state: RootState) => state.gallery);
  
  // States
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  // Multi-select Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchGallery(user.uid));
    }
  }, [dispatch, user?.uid]);

  const handleUpload = async (asset: any) => {
    if (!user) {
      setMsg('Bạn cần đăng nhập để tải ảnh lên');
      return;
    }
    setUploading(true);
    setFabModalVisible(false);
    try {
      let finalUrl = asset.uri;
      if (asset.base64) {
        const ext = asset.uri.substring(asset.uri.lastIndexOf('.') + 1);
        const fileName = `${user.uid}/${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('trago-images')
          .upload(fileName, decode(asset.base64), { contentType: `image/${ext}` });
          
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('trago-images').getPublicUrl(fileName);
        finalUrl = data.publicUrl;
      }
      const { error: dbError } = await supabase.from('gallery').insert([{
        user_id: user.uid, url: finalUrl,
      }]);
      
      if (dbError) throw dbError;
      setMsg('Tải ảnh lên thành công!');
      dispatch(fetchGallery(user.uid));
    } catch (error: any) {
      setMsg('Lỗi tải ảnh: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async (useCamera: boolean = false) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    };
    
    let result;
    if (useCamera) {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Lỗi", "Bạn cần cấp quyền sử dụng Camera!");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled) {
      handleUpload(result.assets[0]);
    }
  };

  const toggleSelection = (id: string) => {
    if (selectedImageIds.includes(id)) {
      const newIds = selectedImageIds.filter(i => i !== id);
      setSelectedImageIds(newIds);
      if (newIds.length === 0) setIsSelectionMode(false);
    } else {
      setSelectedImageIds([...selectedImageIds, id]);
    }
  };

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedImageIds([id]);
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedImageIds([]);
  };

  const handleDeleteSelected = () => {
    Alert.alert('Xóa ảnh', `Bạn có chắc chắn muốn xóa ${selectedImageIds.length} ảnh đã chọn?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        // Implement delete logic here in the future
        setMsg(`Đã xóa ${selectedImageIds.length} ảnh (Demo)`);
        cancelSelection();
      }}
    ]);
  };

  // Filter images based on search query
  const filteredImages = images.filter((img: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (img.location && img.location.toLowerCase().includes(q)) ||
      (img.tripId && img.tripId.toLowerCase().includes(q)) ||
      (img.title && img.title.toLowerCase().includes(q))
    );
  });

  // Divide images into 2 columns for Masonry layout
  const leftColumn = filteredImages.filter((_, i) => i % 2 === 0);
  const rightColumn = filteredImages.filter((_, i) => i % 2 !== 0);

  const renderImageCard = (item: any) => {
    const isSelected = selectedImageIds.includes(item.id);
    // Random height for masonry effect based on item.id length
    const randomHeight = 150 + ((item.id.charCodeAt(0) % 3) * 50); 
    
    return (
      <TouchableOpacity 
        key={item.id}
        activeOpacity={0.9}
        onPress={() => isSelectionMode ? toggleSelection(item.id) : navigation.navigate('PhotoDescription', { imageUri: item.image })}
        onLongPress={() => handleLongPress(item.id)}
        style={[styles.imageWrapper, { height: randomHeight }]}
      >
        <Image source={{ uri: item.image }} style={styles.image} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.imageOverlay} />
        
        {/* Top Right Icons */}
        <View style={styles.imageTopActions}>
          {isSelectionMode ? (
            <View style={[styles.checkboxWrap, isSelected && styles.checkboxActive]}>
              {isSelected && <X color="#fff" size={14} />}
            </View>
          ) : (
            <Heart color="#fff" size={20} style={{ opacity: 0.8 }} />
          )}
        </View>

        {/* Bottom Info */}
        <View style={styles.imageBottomInfo}>
          <Text style={styles.imageDate} numberOfLines={1}>{new Date(item.createdAt || Date.now()).toLocaleDateString('vi-VN')}</Text>
          {item.tripId && <Text style={styles.imageLocation} numberOfLines={1}>📍 Chuyến đi</Text>}
        </View>

        {isSelectionMode && isSelected && (
          <View style={styles.selectedOverlay} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Ảnh đã lưu</Text>
          <Text style={styles.headerCount}>{images.length} ảnh</Text>
        </View>

        <View style={styles.searchBar}>
          <Search color="#94A3B8" size={20} />
          <RNTextInput 
            style={styles.searchInput}
            placeholder="Tìm theo địa điểm, ngày, chuyến đi..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {/* TABS */}
        <View style={styles.tabContainer}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'trip', label: 'Theo chuyến đi' },
            { key: 'date', label: 'Theo ngày' },
          ].map(tab => (
            <TouchableOpacity 
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tabTxt, activeTab === tab.key && styles.tabTxtActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CHIPS (Theo chuyến đi) */}
        {activeTab === 'trip' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {['Đà Lạt Mộng Mơ (12)', 'Hội An Valentine (8)', 'Tokyo Explore (24)'].map(chip => (
              <TouchableOpacity key={chip} onPress={() => setSelectedTrip(chip)} style={[styles.chip, selectedTrip === chip && styles.chipActive]}>
                <Text style={[styles.chipTxt, selectedTrip === chip && styles.chipTxtActive]}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ─── GRID (MASONRY) ─── */}
      {isLoading && images.length === 0 ? (
        <View style={styles.centerBox}><ActivityIndicator size="large" color="#4F46E5" /></View>
      ) : images.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconWrap}>
            <Camera size={48} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Thư viện ảnh của bạn còn trống</Text>
          <Text style={styles.emptySub}>Những khoảnh khắc đẹp nhất của chuyến đi sẽ được lưu ở đây</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setFabModalVisible(true)}>
            <Text style={styles.emptyBtnTxt}>+ Thêm ảnh đầu tiên</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.gridScroll} contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
          <View style={styles.masonryContainer}>
            <View style={styles.column}>{leftColumn.map(renderImageCard)}</View>
            <View style={styles.column}>{rightColumn.map(renderImageCard)}</View>
          </View>
        </ScrollView>
      )}

      {/* ─── FAB (Nút +) ─── */}
      {!isSelectionMode && (
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => setFabModalVisible(true)} activeOpacity={0.9}>
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Plus color="#fff" size={28} />}
        </TouchableOpacity>
      )}

      {/* ─── BOTTOM ACTION BAR (Multi-Select Mode) ─── */}
      {isSelectionMode && (
        <View style={[styles.selectionBar, { paddingBottom: insets.bottom || 20 }]}>
          <View style={styles.selectionBarHeader}>
            <TouchableOpacity onPress={cancelSelection}><Text style={styles.cancelTxt}>Hủy</Text></TouchableOpacity>
            <Text style={styles.selectionCount}>Đã chọn {selectedImageIds.length} ảnh</Text>
            <TouchableOpacity onPress={handleDeleteSelected}><Trash2 color="#EF4444" size={20} /></TouchableOpacity>
          </View>
          <View style={styles.selectionActionsRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <View style={styles.actionIconWrap}><Map color="#3B82F6" size={20} /></View>
              <Text style={styles.actionTxt}>Thêm vào chuyến</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <View style={styles.actionIconWrap}><FolderPlus color="#10B981" size={20} /></View>
              <Text style={styles.actionTxt}>Tạo Album</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <View style={styles.actionIconWrap}><Heart color="#F59E0B" size={20} /></View>
              <Text style={styles.actionTxt}>Yêu thích</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── UPLOAD BOTTOM SHEET ─── */}
      <Modal visible={fabModalVisible} transparent animationType="slide" onRequestClose={() => setFabModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{flex: 1}} activeOpacity={1} onPress={() => setFabModalVisible(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Thêm ảnh mới</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={() => pickImage(false)}>
              <View style={[styles.sheetIconWrap, { backgroundColor: '#EEF2FF' }]}><ImageIcon color="#4F46E5" size={24} /></View>
              <View>
                <Text style={styles.sheetOptTitle}>Chọn từ thư viện điện thoại</Text>
                <Text style={styles.sheetOptSub}>Tải lên nhiều ảnh cùng lúc</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => pickImage(true)}>
              <View style={[styles.sheetIconWrap, { backgroundColor: '#F0FDF4' }]}><Camera color="#10B981" size={24} /></View>
              <View>
                <Text style={styles.sheetOptTitle}>Chụp ảnh mới</Text>
                <Text style={styles.sheetOptSub}>Mở Camera để chụp khoảnh khắc</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Snackbar visible={!!msg} onDismiss={() => setMsg('')} duration={3000} style={styles.snackbar}>
        {msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  headerCount: { fontSize: 14, color: '#64748B', fontWeight: '500', marginBottom: 6 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#0F172A' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTxtActive: { color: '#0F172A', fontWeight: '700' },
  chipScroll: { marginTop: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  chipTxt: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  chipTxtActive: { color: '#3B82F6', fontWeight: '700' },
  
  gridScroll: { flex: 1 },
  gridContent: { padding: 16, paddingBottom: 100 },
  masonryContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { width: COLUMN_WIDTH },
  imageWrapper: { width: '100%', marginBottom: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  imageTopActions: { position: 'absolute', top: 12, right: 12 },
  imageBottomInfo: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  imageDate: { color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  imageLocation: { color: '#E2E8F0', fontSize: 11 },
  
  checkboxWrap: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(59, 130, 246, 0.2)' },

  fab: { position: 'absolute', right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100 },
  emptyBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  selectionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 20, paddingTop: 16, shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  selectionBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cancelTxt: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  selectionCount: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  selectionActionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center' },
  actionIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionTxt: { fontSize: 12, color: '#475569', fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 12 },
  sheetIconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  sheetOptTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  sheetOptSub: { fontSize: 13, color: '#64748B' },
  
  snackbar: { backgroundColor: '#10B981', borderRadius: 12, marginBottom: 20 },
});
