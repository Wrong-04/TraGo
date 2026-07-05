
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Text, useTheme, Snackbar, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabase';
import { decode } from 'base64-arraybuffer';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, AppDispatch } from '../../features/store';
import { fetchGallery } from '../../features/gallery/gallerySlice';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ImageIcon, Plus, LayoutGrid, MapPin, CalendarDays, Camera } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const SPACING = 16;
const IMAGE_SIZE = (width - SPACING * 3) / 2;

export default function GalleryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { images } = useSelector((state: RootState) => state.gallery);
  
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      handleUpload(result.assets[0]);
    }
  };

  const handleUpload = async (asset: any) => {
    if (!user) {
      setMsg('Vui lòng đăng nhập để tải ảnh lên.');
      return;
    }
    setUploading(true);
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
        url: finalUrl,
      }]);
      
      if (dbError) throw dbError;

      setMsg('Tải ảnh lên thành công! 🎉');
      dispatch(fetchGallery());
    } catch (error: any) {
      setMsg('Lỗi: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    dispatch(fetchGallery());
  }, [dispatch]);

  const FilterTab = ({ value, label, icon: Icon }: any) => {
    const isActive = filter === value;
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => setFilter(value)}
        style={[styles.filterTab, isActive && styles.filterTabActive]}
      >
        <Icon color={isActive ? '#3B82F6' : '#64748B'} size={18} />
        <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
        <LinearGradient colors={['#FDF4FF', '#F8FAFC']} style={StyleSheet.absoluteFillObject} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Kỷ niệm của bạn</Text>
        <Text style={styles.headerSubtitle}>Lưu giữ những khoảnh khắc đẹp nhất</Text>
      </View>

      <View style={styles.tabsContainer}>
        <FilterTab value="all" label="Tất cả" icon={LayoutGrid} />
        <FilterTab value="location" label="Địa điểm" icon={MapPin} />
        <FilterTab value="date" label="Theo ngày" icon={CalendarDays} />
      </View>

      <FlatList
        data={images}
        numColumns={2}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.9} style={styles.imageCard}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <LinearGradient colors={['transparent', 'rgba(15,23,42,0.6)']} style={styles.imageOverlay}>
              <View style={styles.imageMeta}>
                <MapPin color="#fff" size={12} />
                <Text style={styles.imageLocation}>Đà Nẵng</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        contentContainerStyle={[styles.grid, images.length === 0 && { flex: 1, justifyContent: 'center' }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <ImageIcon color="#C026D3" size={48} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có ảnh nào</Text>
            <Text style={styles.emptySubtitle}>Hãy tải lên những bức ảnh tuyệt đẹp từ chuyến đi của bạn để lưu giữ kỷ niệm nhé!</Text>
            <Button mode="contained" onPress={pickImage} loading={uploading} style={styles.emptyBtn} contentStyle={{ height: 48 }}>
              Tải ảnh lên ngay
            </Button>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={pickImage} disabled={uploading}>
        <LinearGradient colors={['#D946EF', '#8B5CF6']} style={styles.fabGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Camera color="#fff" size={24} />
        </LinearGradient>
      </TouchableOpacity>

      <Snackbar visible={!!msg} onDismiss={() => setMsg('')} duration={3000} style={{ backgroundColor: '#0F172A', borderRadius: 12 }}>
        {msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 250 },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  headerSubtitle: { color: '#64748B', fontSize: 15 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  filterTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  filterTabActive: { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE', borderWidth: 1 },
  filterLabel: { marginLeft: 8, color: '#64748B', fontWeight: '600', fontSize: 14 },
  filterLabelActive: { color: '#3B82F6' },
  grid: { paddingHorizontal: SPACING, paddingBottom: 100 },
  imageCard: { width: IMAGE_SIZE, height: IMAGE_SIZE * 1.3, marginBottom: SPACING, marginRight: SPACING, borderRadius: 20, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 6 },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 12 },
  imageMeta: { flexDirection: 'row', alignItems: 'center' },
  imageLocation: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  emptyState: { alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FDF4FF', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FAE8FF' },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyBtn: { backgroundColor: '#C026D3', borderRadius: 100, width: '100%' },
  fab: { position: 'absolute', bottom: 32, right: 24, borderRadius: 28, shadowColor: '#D946EF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' }
});
