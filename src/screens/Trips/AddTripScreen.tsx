import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Image, TouchableOpacity } from 'react-native';
import { Text, TextInput, useTheme, ActivityIndicator, Snackbar, Button, Chip, Portal, Dialog } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { ArrowLeft, Calendar, Plus, MapPin, Map as MapIcon, Image as ImageIcon, Camera } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../config/supabase';
import { AppDispatch, RootState } from '../../features/store';
import { fetchTrips, Trip } from '../../features/trips/tripsSlice';
import { generateTripDetails } from '../../config/gemini';
import { Sparkles } from 'lucide-react-native';

type FormData = {
  title: string;
  country: string;
  city: string;
  budget: string;
  description: string;
};

const AVAILABLE_TAGS = ['Biển', 'Núi', 'Ẩm thực', 'Check-in', 'Gia đình', 'Bạn bè', 'Thư giãn', 'Mua sắm', 'Mạo hiểm'];

export default function AddTripScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const tripToEdit: Trip | undefined = route.params?.trip;
  const isEdit = !!tripToEdit;

  const [startDate, setStartDate] = useState(tripToEdit ? new Date(tripToEdit.startDate) : new Date());
  const [endDate, setEndDate] = useState(tripToEdit ? new Date(tripToEdit.endDate) : new Date(Date.now() + 3 * 86400000));
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  
  const [coverImage, setCoverImage] = useState<string>(tripToEdit?.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800');
  const [coverImageBase64, setCoverImageBase64] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(tripToEdit?.tags || []);
  
  const [latitude, setLatitude] = useState<number | null>(tripToEdit?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(tripToEdit?.longitude || null);
  const [address, setAddress] = useState<string>(tripToEdit?.address || '');

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [tempCoordinate, setTempCoordinate] = useState<{latitude: number, longitude: number} | null>(null);

  const [loading, setLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success'|'error'>('success');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title: tripToEdit?.title || '',
      country: tripToEdit?.country || 'Việt Nam',
      city: tripToEdit?.city || '',
      budget: tripToEdit?.budget ? tripToEdit.budget.toString() : '',
      description: tripToEdit?.description || '',
    }
  });

  const showSnackbar = (msg: string, type: 'success'|'error') => {
    setSnackbarMessage(msg);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setCoverImage(asset.uri);
      setCoverImageBase64(asset.base64 || null);
    }
  };

  const uploadImageToSupabase = async (uri: string, base64Data?: string | null) => {
    if (uri.startsWith('http')) return uri;
    if (!base64Data) return uri;

    try {
      const fileName = `trips/${user?.uid}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('trip-images')
        .upload(fileName, decode(base64Data), { contentType: 'image/jpeg' });
        
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('trip-images').getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.log('Upload error:', error);
      return uri; 
    }
  };

  const openMapSelector = () => {
    setMapModalVisible(true);
  };

  
  const handleAIFill = async () => {
    const city = getValues('city');
    if (!city || city.trim().length === 0) {
      showSnackbar('Vui lòng nhập Tên thành phố trước khi gọi AI.', 'error');
      return;
    }
    setLoading(true);
    try {
      const details = await generateTripDetails(city);
      if (details.title) setValue('title', details.title);
      if (details.description) setValue('description', details.description);
      if (details.budget) setValue('budget', details.budget.toString());
      if (details.tags && Array.isArray(details.tags)) {
        setSelectedTags(details.tags.filter(t => AVAILABLE_TAGS.includes(t)));
      }
      showSnackbar('AI đã điền thông tin tự động!', 'success');
    } catch (e) {
      showSnackbar('Không thể tạo thông tin bằng AI lúc này.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const onSubmit = async (data: FormData) => {
    if (!user) {
      showSnackbar('Vui lòng đăng nhập để tiếp tục.', 'error');
      return;
    }
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    if (endStr < startStr) {
      showSnackbar('Ngày kết thúc phải lớn hoặc bằng ngày bắt đầu', 'error');
      return;
    }

    setLoading(true);

    try {
      const uploadedImageUrl = await uploadImageToSupabase(coverImage, coverImageBase64);
      
      const tripData = {
        user_id: user.uid,
        title: data.title,
        description: data.description,
        country: data.country,
        city: data.city,
        budget: data.budget ? parseFloat(data.budget) : 0,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        cover_image: uploadedImageUrl,
        status: isEdit ? tripToEdit.status : 'Upcoming',
        tags: selectedTags,
        latitude,
        longitude,
        address
      };

      if (isEdit) {
        const { error } = await supabase.from('trips').update(tripData).eq('id', tripToEdit.id);
        if (error) throw error;
        showSnackbar('Cập nhật chuyến đi thành công!', 'success');
      } else {
        const { error } = await supabase.from('trips').insert([tripData]);
        if (error) throw error;
        showSnackbar('Tạo chuyến đi thành công!', 'success');
      }

      dispatch(fetchTrips(user.uid));
      setTimeout(() => navigation.goBack(), 1000);
      
    } catch (err: any) {
      showSnackbar(err.message || 'Có lỗi xảy ra khi lưu chuyến đi.', 'error');
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <ArrowLeft color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Sửa chuyến đi' : 'Tạo chuyến đi mới'}</Text>
        <TouchableOpacity style={[styles.headerBtn, styles.headerBtnSave]} onPress={handleSubmit(onSubmit)} disabled={loading}>
          <Text style={styles.headerSaveText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Cover Image Section */}
        <TouchableOpacity onPress={pickImage} activeOpacity={0.9} style={styles.coverImageContainer}>
          <Image source={{ uri: coverImage }} style={styles.coverImage} />
          <View style={styles.coverImageOverlay}>
            <View style={styles.photoIconBox}>
              <Camera color="#fff" size={24} />
            </View>
            <Text style={styles.coverImageText}>Đổi ảnh bìa</Text>
          </View>
        </TouchableOpacity>

        {/* Basic Info */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Thông tin chung</Text>
            <TouchableOpacity onPress={handleAIFill} style={styles.aiBtn}>
              <Sparkles color="#fff" size={16} />
              <Text style={styles.aiBtnText}>AI Điền</Text>
            </TouchableOpacity>
          </View>
          <Controller
            control={control}
            rules={{ required: 'Vui lòng nhập tên chuyến đi' }}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput autoCorrect={false} spellCheck={false}
                label="Tên chuyến đi *" 
                value={value} 
                onChangeText={onChange} 
                mode="outlined" 
                style={styles.input} 
                error={!!errors.title}
                theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
                outlineColor="transparent"
                activeOutlineColor="#4F46E5" 
              />
            )}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Controller
              control={control}
              name="country"
              render={({ field: { onChange, value } }) => (
                <TextInput autoCorrect={false} spellCheck={false}
                  label="Quốc gia" 
                  value={value} 
                  onChangeText={onChange} 
                  mode="outlined" 
                  style={[styles.input, { flex: 1 }]} 
                  theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
                  outlineColor="transparent"
                  activeOutlineColor="#4F46E5" 
                />
              )}
            />
            <Controller
              control={control}
              rules={{ required: 'Bắt buộc' }}
              name="city"
              render={({ field: { onChange, value } }) => (
                <TextInput autoCorrect={false} spellCheck={false}
                  label="Thành phố *" 
                  value={value} 
                  onChangeText={onChange} 
                  mode="outlined" 
                  style={[styles.input, { flex: 1 }]} 
                  error={!!errors.city}
                  theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
                  outlineColor="transparent"
                  activeOutlineColor="#4F46E5" 
                />
              )}
            />
          </View>
          
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput autoCorrect={false} spellCheck={false}
                label="Mô tả chuyến đi" 
                value={value} 
                onChangeText={onChange} 
                mode="outlined" 
                multiline 
                numberOfLines={3} 
                style={[styles.input, { height: 100 }]} 
                theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
                outlineColor="transparent"
                activeOutlineColor="#4F46E5" 
              />
            )}
          />
        </View>

        {/* Date & Budget */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thời gian & Ngân sách</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => setShowStartDate(true)} activeOpacity={0.8} style={{ flex: 1 }}>
              <View pointerEvents="none">
                <TextInput autoCorrect={false} spellCheck={false}
                  label="Bắt đầu" 
                  value={startDate.toLocaleDateString('vi-VN')} 
                  mode="outlined" 
                  style={styles.input} 
                  editable={false} 
                  theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
                  outlineColor="transparent"
                  right={<TextInput.Icon icon={() => <Calendar color="#94A3B8" size={20} />} />} 
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowEndDate(true)} activeOpacity={0.8} style={{ flex: 1 }}>
              <View pointerEvents="none">
                <TextInput autoCorrect={false} spellCheck={false}
                  label="Kết thúc" 
                  value={endDate.toLocaleDateString('vi-VN')} 
                  mode="outlined" 
                  style={styles.input} 
                  editable={false} 
                  theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
                  outlineColor="transparent"
                  right={<TextInput.Icon icon={() => <Calendar color="#94A3B8" size={20} />} />} 
                />
              </View>
            </TouchableOpacity>
          </View>

          <Controller
            control={control}
            rules={{ min: { value: 1, message: 'Ngân sách phải lớn hơn 0' } }}
            name="budget"
            render={({ field: { onChange, value } }) => (
              <View>
                <TextInput autoCorrect={false} spellCheck={false}
                  label="Ngân sách dự kiến (VND)" 
                  value={value} 
                  onChangeText={onChange} 
                  mode="outlined" 
                  keyboardType="numeric" 
                  style={styles.input} 
                  error={!!errors.budget}
                  theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
                  outlineColor="transparent"
                  activeOutlineColor="#4F46E5" 
                />
                <View style={styles.budgetChips}>
                  {[2000000, 5000000, 10000000, 20000000].map(val => (
                    <Chip 
                      key={val} 
                      selected={value === val.toString()} 
                      onPress={() => onChange(val.toString())}
                      style={[styles.budgetChip, value === val.toString() && styles.budgetChipActive]}
                      textStyle={value === val.toString() ? { color: '#fff', fontWeight: 'bold' } : { color: '#64748B' }}
                    >
                      {val.toLocaleString('vi-VN')}đ
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          />
        </View>

        {/* Location */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Vị trí chính</Text>
          <TouchableOpacity style={styles.mapBtn} onPress={openMapSelector} activeOpacity={0.7}>
            <MapIcon color="#4F46E5" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.mapBtnText}>Chọn vị trí trên Bản đồ</Text>
          </TouchableOpacity>
          
          {address || latitude ? (
            <View style={styles.locationInfo}>
              <MapPin color="#10B981" size={20} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationName}>{address || 'Vị trí đã chọn'}</Text>
                <Text style={styles.locationCoords}>Lat: {latitude?.toFixed(4)} • Lng: {longitude?.toFixed(4)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Tags */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chủ đề chuyến đi</Text>
          <View style={styles.tagsContainer}>
            {AVAILABLE_TAGS.map(tag => (
              <Chip 
                key={tag} 
                selected={selectedTags.includes(tag)} 
                onPress={() => toggleTag(tag)} 
                style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipActive]} 
                textStyle={{ color: selectedTags.includes(tag) ? '#fff' : '#64748B', fontWeight: selectedTags.includes(tag) ? 'bold' : 'normal' }}
              >
                {tag}
              </Chip>
            ))}
          </View>
        </View>

        {showStartDate && (
          <DateTimePicker value={startDate} mode="date" display="default" onChange={(event, date) => { setShowStartDate(Platform.OS === 'ios'); if (date) setStartDate(date); }} />
        )}
        {showEndDate && (
          <DateTimePicker value={endDate} mode="date" display="default" onChange={(event, date) => { setShowEndDate(Platform.OS === 'ios'); if (date) setEndDate(date); }} />
        )}
      </ScrollView>

      {/* Map Picker Modal */}
      <Portal>
        <Dialog visible={mapModalVisible} onDismiss={() => setMapModalVisible(false)} style={styles.mapDialog}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Chọn vị trí trên bản đồ</Dialog.Title>
          <View style={styles.mapContainer}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{ latitude: latitude || 16.0544, longitude: longitude || 108.2022, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
              onPress={(e) => setTempCoordinate(e.nativeEvent.coordinate)}
            >
              {(tempCoordinate || latitude) && (
                <Marker coordinate={tempCoordinate || { latitude: latitude!, longitude: longitude! }} />
              )}
            </MapView>
          </View>
          <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Button onPress={() => setMapModalVisible(false)} textColor="#64748B">Hủy</Button>
            <Button onPress={() => {
              if (tempCoordinate) {
                setLatitude(tempCoordinate.latitude);
                setLongitude(tempCoordinate.longitude);
                setAddress(`Tọa độ: ${tempCoordinate.latitude.toFixed(4)}, ${tempCoordinate.longitude.toFixed(4)}`);
              }
              setMapModalVisible(false);
            }} mode="contained" style={{ backgroundColor: '#4F46E5', borderRadius: 8 }}>Xác nhận</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={{ marginTop: 12, color: '#0F172A', fontWeight: 'bold' }}>Đang lưu...</Text>
          </View>
        </View>
      )}

      {/* Snackbar */}
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000} style={{ backgroundColor: snackbarType === 'success' ? '#10B981' : '#EF4444' }}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', 
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerBtn: { padding: 12 },
  headerBtnSave: { backgroundColor: '#E0E7FF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSaveText: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },
  scrollContent: { padding: 20, paddingBottom: 80, gap: 20 },
  sectionCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 24, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.03, 
    shadowRadius: 12, 
    elevation: 2 
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16, letterSpacing: -0.3 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  aiBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  input: { marginBottom: 16, backgroundColor: '#F8FAFC', height: 54 },
  budgetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  budgetChip: { backgroundColor: '#F1F5F9', borderRadius: 16 },
  budgetChipActive: { backgroundColor: '#4F46E5' },
  mapBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#EEF2FF', 
    paddingVertical: 14, 
    borderRadius: 16, 
    marginBottom: 16 
  },
  mapBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 15 },
  locationInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationName: { fontWeight: '700', color: '#0F172A', fontSize: 15, marginBottom: 4 },
  locationCoords: { color: '#64748B', fontSize: 12, fontWeight: '500' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagChip: { backgroundColor: '#F1F5F9', borderRadius: 20 },
  tagChipActive: { backgroundColor: '#4F46E5' },
  coverImageContainer: { height: 220, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverImageOverlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  photoIconBox: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 8 
  },
  coverImageText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingOverlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', alignItems: 'center', zIndex: 999 
  },
  loadingBox: { 
    backgroundColor: '#fff', 
    padding: 24, 
    borderRadius: 20, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  mapDialog: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  mapContainer: { height: 350, width: '100%', backgroundColor: '#F1F5F9' }
});
