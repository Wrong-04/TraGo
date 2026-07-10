import React, { useEffect, useMemo, useState } from 'react';
import {
  View, StyleSheet, Image, Dimensions, TouchableOpacity,
  TextInput as RNTextInput, ScrollView, Modal, Alert,
} from 'react-native';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabase';
import { decode } from 'base64-arraybuffer';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, AppDispatch } from '../../features/store';
import { fetchGallery } from '../../features/gallery/gallerySlice';
import {
  Plus, Search, Camera, Image as ImageIcon, X, Heart, Trash2, FolderPlus, Map,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

type TripOption = {
  id: string;
  title: string;
};

export default function GalleryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { images, isLoading } = useSelector((state: RootState) => state.gallery);

  const [activeTab, setActiveTab] = useState<'all' | 'trip' | 'date'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [uploadTripId, setUploadTripId] = useState<string | null>(null);
  const [assignTripId, setAssignTripId] = useState<string | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [trips, setTrips] = useState<TripOption[]>([]);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchGallery(user.uid));
    }
  }, [dispatch, user?.uid]);

  useEffect(() => {
    const loadTrips = async () => {
      if (!user?.uid) return;
      const { data, error } = await supabase
        .from('trips')
        .select('id, title')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false });

      if (!error) {
        setTrips((data || []).map((trip: any) => ({ id: trip.id, title: trip.title || 'Chuyến đi' })));
      }
    };

    loadTrips();
  }, [user?.uid]);

  const tripNameById = useMemo(() => {
    return trips.reduce((acc, trip) => {
      acc[trip.id] = trip.title;
      return acc;
    }, {} as Record<string, string>);
  }, [trips]);

  const dateChips = useMemo(() => {
    return Array.from(
      new Set(
        images
          .map((img: any) => (img.createdAt ? new Date(img.createdAt).toISOString().split('T')[0] : null))
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => (a > b ? -1 : 1));
  }, [images]);

  const handleUpload = async (asset: any, tripIdForUpload: string | null) => {
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
        user_id: user.uid,
        trip_id: tripIdForUpload,
        url: finalUrl,
      }]);

      if (dbError) throw dbError;
      setMsg('Tải ảnh lên thành công!');
      dispatch(fetchGallery(user.uid));
      setUploadTripId(null);
    } catch (error: any) {
      setMsg('Lỗi tải ảnh: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async (useCamera = false, tripIdForUpload: string | null = null) => {
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
        Alert.alert('Lỗi', 'Bạn cần cấp quyền sử dụng Camera!');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled) {
      handleUpload(result.assets[0], tripIdForUpload);
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
    setAssignTripId(null);
  };

  const getStoragePathFromUrl = (url?: string) => {
    if (!url) return null;

    const marker = '/storage/v1/object/public/trago-images/';
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return null;

    const rawPath = url.slice(markerIndex + marker.length);
    return rawPath ? decodeURIComponent(rawPath) : null;
  };

  const deleteSelectedImages = async () => {
    if (!user?.uid || selectedImageIds.length === 0) return;

    setDeleting(true);
    try {
      const selectedImages = images.filter((img: any) => selectedImageIds.includes(img.id));
      const storagePaths = selectedImages
        .map((img: any) => getStoragePathFromUrl(img.image))
        .filter(Boolean) as string[];

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('trago-images').remove(storagePaths);
        if (storageError) {
          console.log('Storage delete warning:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('gallery')
        .delete()
        .eq('user_id', user.uid)
        .in('id', selectedImageIds);

      if (dbError) throw dbError;

      setMsg(`Đã xóa ${selectedImageIds.length} ảnh`);
      cancelSelection();
      dispatch(fetchGallery(user.uid));
    } catch (error: any) {
      setMsg('Không thể xóa ảnh: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = () => {
    Alert.alert('Xóa ảnh', `Bạn có chắc chắn muốn xóa ${selectedImageIds.length} ảnh đã chọn?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: deleteSelectedImages,
      },
    ]);
  };

  const handleAssignSelectedToTrip = async () => {
    if (!user?.uid || selectedImageIds.length === 0 || !assignTripId) return;
    try {
      const { error } = await supabase
        .from('gallery')
        .update({ trip_id: assignTripId })
        .eq('user_id', user.uid)
        .in('id', selectedImageIds);

      if (error) throw error;

      setMsg('Đã gán ảnh vào chuyến đi thành công');
      setAssignModalVisible(false);
      setAssignTripId(null);
      cancelSelection();
      dispatch(fetchGallery(user.uid));
    } catch (error: any) {
      setMsg('Không thể gán ảnh: ' + error.message);
    }
  };

  const filteredImages = useMemo(() => {
    return images.filter((img: any) => {
      if (activeTab === 'trip' && selectedTrip && img.tripId !== selectedTrip) {
        return false;
      }

      if (activeTab === 'date' && selectedDate) {
        const imgDate = img.createdAt ? new Date(img.createdAt).toISOString().split('T')[0] : '';
        if (imgDate !== selectedDate) return false;
      }

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const tripTitle = img.tripId ? tripNameById[img.tripId] || '' : '';
      return (
        tripTitle.toLowerCase().includes(q) ||
        (img.title || '').toLowerCase().includes(q)
      );
    });
  }, [images, activeTab, searchQuery, selectedTrip, selectedDate, tripNameById]);

  const leftColumn = filteredImages.filter((_, i) => i % 2 === 0);
  const rightColumn = filteredImages.filter((_, i) => i % 2 !== 0);

  const renderImageCard = (item: any) => {
    const isSelected = selectedImageIds.includes(item.id);
    const tripTitle = item.tripId ? tripNameById[item.tripId] : '';
    const randomHeight = 150 + ((item.id.charCodeAt(0) % 3) * 50);

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.9}
        onPress={() => isSelectionMode ? toggleSelection(item.id) : navigation.navigate('PhotoDescription', { imageUri: item.image, trip: tripTitle })}
        onLongPress={() => handleLongPress(item.id)}
        style={[styles.imageWrapper, { height: randomHeight }]}
      >
        <Image source={{ uri: item.image }} style={styles.image} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.imageOverlay} />

        <View style={styles.imageTopActions}>
          {isSelectionMode ? (
            <View style={[styles.checkboxWrap, isSelected && styles.checkboxActive]}>
              {isSelected && <X color="#fff" size={14} />}
            </View>
          ) : (
            <Heart color="#fff" size={20} style={{ opacity: 0.8 }} />
          )}
        </View>

        <View style={styles.imageBottomInfo}>
          <Text style={styles.imageDate} numberOfLines={1}>{new Date(item.createdAt || Date.now()).toLocaleDateString('vi-VN')}</Text>
          {tripTitle ? <Text style={styles.imageLocation} numberOfLines={1}>📍 {tripTitle}</Text> : null}
        </View>

        {isSelectionMode && isSelected && <View style={styles.selectedOverlay} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}> 
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Ảnh đã lưu</Text>
          <Text style={styles.headerCount}>{images.length} ảnh</Text>
        </View>

        <View style={styles.searchBar}>
          <Search color="#94A3B8" size={20} />
          <RNTextInput
            style={styles.searchInput}
            placeholder="Tìm theo chuyến đi, ngày..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.tabContainer}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'trip', label: 'Theo chuyến đi' },
            { key: 'date', label: 'Theo ngày' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key as 'all' | 'trip' | 'date');
                if (tab.key !== 'trip') setSelectedTrip(null);
                if (tab.key !== 'date') setSelectedDate(null);
              }}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tabTxt, activeTab === tab.key && styles.tabTxtActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'trip' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity onPress={() => setSelectedTrip(null)} style={[styles.chip, !selectedTrip && styles.chipActive]}>
              <Text style={[styles.chipTxt, !selectedTrip && styles.chipTxtActive]}>Tất cả</Text>
            </TouchableOpacity>
            {trips.map(tripItem => {
              const count = images.filter((img: any) => img.tripId === tripItem.id).length;
              return (
                <TouchableOpacity
                  key={tripItem.id}
                  onPress={() => setSelectedTrip(tripItem.id)}
                  style={[styles.chip, selectedTrip === tripItem.id && styles.chipActive]}
                >
                  <Text style={[styles.chipTxt, selectedTrip === tripItem.id && styles.chipTxtActive]}>{tripItem.title} ({count})</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'date' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity onPress={() => setSelectedDate(null)} style={[styles.chip, !selectedDate && styles.chipActive]}>
              <Text style={[styles.chipTxt, !selectedDate && styles.chipTxtActive]}>Tất cả</Text>
            </TouchableOpacity>
            {dateChips.map(date => (
              <TouchableOpacity key={date} onPress={() => setSelectedDate(date)} style={[styles.chip, selectedDate === date && styles.chipActive]}>
                <Text style={[styles.chipTxt, selectedDate === date && styles.chipTxtActive]}>{new Date(date).toLocaleDateString('vi-VN')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

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

      {!isSelectionMode && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={() => {
            setUploadTripId(activeTab === 'trip' ? selectedTrip : null);
            setFabModalVisible(true);
          }}
          activeOpacity={0.9}
        >
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Plus color="#fff" size={28} />}
        </TouchableOpacity>
      )}

      {isSelectionMode && (
        <View style={[styles.selectionBar, { paddingBottom: insets.bottom || 20 }]}> 
          <View style={styles.selectionBarHeader}>
            <TouchableOpacity onPress={cancelSelection}><Text style={styles.cancelTxt}>Hủy</Text></TouchableOpacity>
            <Text style={styles.selectionCount}>Đã chọn {selectedImageIds.length} ảnh</Text>
            <TouchableOpacity onPress={handleDeleteSelected} disabled={deleting}>
              {deleting ? <ActivityIndicator size={20} color="#EF4444" /> : <Trash2 color="#EF4444" size={20} />}
            </TouchableOpacity>
          </View>
          <View style={styles.selectionActionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setAssignModalVisible(true)}>
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

      <Modal
        visible={fabModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setFabModalVisible(false);
          setUploadTripId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => {
              setFabModalVisible(false);
              setUploadTripId(null);
            }}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Thêm ảnh mới</Text>
            <Text style={styles.sheetAssignLabel}>Gán ảnh vào chuyến đi:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sheetTripScroll}>
              <TouchableOpacity onPress={() => setUploadTripId(null)} style={[styles.sheetTripChip, !uploadTripId && styles.sheetTripChipActive]}>
                <Text style={[styles.sheetTripChipText, !uploadTripId && styles.sheetTripChipTextActive]}>Không gán</Text>
              </TouchableOpacity>
              {trips.map(tripItem => (
                <TouchableOpacity
                  key={tripItem.id}
                  onPress={() => setUploadTripId(tripItem.id)}
                  style={[styles.sheetTripChip, uploadTripId === tripItem.id && styles.sheetTripChipActive]}
                >
                  <Text style={[styles.sheetTripChipText, uploadTripId === tripItem.id && styles.sheetTripChipTextActive]}>{tripItem.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.sheetOption} onPress={() => pickImage(false, uploadTripId)}>
              <View style={[styles.sheetIconWrap, { backgroundColor: '#EEF2FF' }]}><ImageIcon color="#4F46E5" size={24} /></View>
              <View>
                <Text style={styles.sheetOptTitle}>Chọn từ thư viện điện thoại</Text>
                <Text style={styles.sheetOptSub}>Tải lên nhiều ảnh cùng lúc</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => pickImage(true, uploadTripId)}>
              <View style={[styles.sheetIconWrap, { backgroundColor: '#F0FDF4' }]}><Camera color="#10B981" size={24} /></View>
              <View>
                <Text style={styles.sheetOptTitle}>Chụp ảnh mới</Text>
                <Text style={styles.sheetOptSub}>Mở Camera để chụp khoảnh khắc</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={assignModalVisible} transparent animationType="fade" onRequestClose={() => setAssignModalVisible(false)}>
        <View style={styles.assignOverlay}>
          <View style={styles.assignCard}>
            <Text style={styles.assignTitle}>Gán {selectedImageIds.length} ảnh vào chuyến đi</Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {trips.map(tripItem => (
                <TouchableOpacity
                  key={tripItem.id}
                  onPress={() => setAssignTripId(tripItem.id)}
                  style={[styles.assignTripRow, assignTripId === tripItem.id && styles.assignTripRowActive]}
                >
                  <Text style={[styles.assignTripText, assignTripId === tripItem.id && styles.assignTripTextActive]}>{tripItem.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.assignActions}>
              <TouchableOpacity style={styles.assignCancelBtn} onPress={() => setAssignModalVisible(false)}>
                <Text style={styles.assignCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assignSaveBtn, !assignTripId && { opacity: 0.4 }]}
                onPress={handleAssignSelectedToTrip}
                disabled={!assignTripId}
              >
                <Text style={styles.assignSaveText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
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
  selectionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 20, paddingTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
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
  sheetAssignLabel: { fontSize: 13, color: '#64748B', fontWeight: '700', marginBottom: 10 },
  sheetTripScroll: { marginBottom: 14 },
  sheetTripChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  sheetTripChipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  sheetTripChipText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  sheetTripChipTextActive: { color: '#3B82F6', fontWeight: '700' },
  sheetOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 12 },
  sheetIconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  sheetOptTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  sheetOptSub: { fontSize: 13, color: '#64748B' },
  assignOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'center', paddingHorizontal: 20 },
  assignCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  assignTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  assignTripRow: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', marginBottom: 8 },
  assignTripRowActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#3B82F6' },
  assignTripText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  assignTripTextActive: { color: '#1D4ED8' },
  assignActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  assignCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  assignCancelText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  assignSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  assignSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  snackbar: { backgroundColor: '#10B981', borderRadius: 12, marginBottom: 20 },
});