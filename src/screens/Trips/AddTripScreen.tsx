import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, TextInput, useTheme, ActivityIndicator, Snackbar, Button, Chip, Portal, Dialog } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { ArrowLeft, Calendar, Plus, MapPin, Map as MapIcon } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../config/supabase';
import { AppDispatch, RootState } from '../../features/store';
import { fetchTrips, Trip } from '../../features/trips/tripsSlice';

type FormData = {
  title: string;
  country: string;
  city: string;
  budget: string;
  description: string;
};

const AVAILABLE_TAGS = ['Biển', 'Núi', 'Ẩm thực', 'Check-in', 'Gia đình', 'Bạn bè'];

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

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
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

  const onSubmit = async (data: FormData) => {
    if (!user) {
      showSnackbar('Vui lòng đăng nhập để tiếp tục.', 'error');
      return;
    }
    if (endDate < startDate) {
      showSnackbar('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu', 'error');
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
        <Text style={styles.headerTitle}>{isEdit ? 'Sửa chuyến đi' : 'Thêm chuyến đi'}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleSubmit(onSubmit)} disabled={loading}>
          <Text style={styles.headerSave}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Controller
            control={control}
            rules={{ required: 'Vui lòng nhập tên chuyến đi' }}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Tên chuyến đi *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.title} />
            )}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Controller
              control={control}
              name="country"
              render={({ field: { onChange, value } }) => (
                <TextInput label="Quốc gia" value={value} onChangeText={onChange} mode="outlined" style={[styles.input, { flex: 1 }]} />
              )}
            />
            <Controller
              control={control}
              rules={{ required: 'Bắt buộc' }}
              name="city"
              render={({ field: { onChange, value } }) => (
                <TextInput label="Thành phố *" value={value} onChangeText={onChange} mode="outlined" style={[styles.input, { flex: 1 }]} error={!!errors.city} />
              )}
            />
          </View>

          <TouchableOpacity onPress={() => setShowStartDate(true)} activeOpacity={0.8}>
            <View pointerEvents="none">
              <TextInput label="Ngày bắt đầu" value={startDate.toLocaleDateString('vi-VN')} mode="outlined" style={styles.input} editable={false} right={<TextInput.Icon icon={() => <Calendar color="#94A3B8" size={20} />} />} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowEndDate(true)} activeOpacity={0.8}>
            <View pointerEvents="none">
              <TextInput label="Ngày kết thúc" value={endDate.toLocaleDateString('vi-VN')} mode="outlined" style={styles.input} editable={false} right={<TextInput.Icon icon={() => <Calendar color="#94A3B8" size={20} />} />} />
            </View>
          </TouchableOpacity>

          <Controller
            control={control}
            rules={{ min: { value: 1, message: 'Ngân sách phải lớn hơn 0' } }}
            name="budget"
            render={({ field: { onChange, value } }) => (
              <View>
                <TextInput label="Ngân sách (VND)" value={value} onChangeText={onChange} mode="outlined" keyboardType="numeric" style={{ backgroundColor: '#fff', marginBottom: 8 }} error={!!errors.budget} />
                <View style={styles.budgetChips}>
                  {[2000000, 5000000, 10000000, 20000000].map(val => (
                    <Chip 
                      key={val} 
                      selected={value === val.toString()} 
                      onPress={() => onChange(val.toString())}
                      style={value === val.toString() ? styles.budgetChipActive : styles.budgetChip}
                      textStyle={value === val.toString() ? { color: '#fff' } : { color: '#64748B' }}
                    >
                      {val.toLocaleString('vi-VN')}đ
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Mô tả" value={value} onChangeText={onChange} mode="outlined" multiline numberOfLines={3} style={styles.input} />
            )}
          />

          <Text style={styles.sectionTitle}>Vị trí chính</Text>
          <Button mode="outlined" icon={() => <MapIcon color="#3B82F6" size={18} />} onPress={openMapSelector} style={styles.mapBtn}>
            Chọn vị trí trên Google Maps
          </Button>
          {address || latitude ? (
            <View style={styles.locationInfo}>
              <Text style={{ fontWeight: 'bold', color: '#0F172A' }}>{address || 'Vị trí đã chọn'}</Text>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Lat: {latitude?.toFixed(4)} | Lng: {longitude?.toFixed(4)}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Danh sách Tags</Text>
          <View style={styles.tagsContainer}>
            {AVAILABLE_TAGS.map(tag => (
              <Chip key={tag} selected={selectedTags.includes(tag)} onPress={() => toggleTag(tag)} style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipActive]} textStyle={{ color: selectedTags.includes(tag) ? '#fff' : '#64748B' }}>
                {tag}
              </Chip>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Ảnh bìa</Text>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.coverImageContainer}>
            <Image source={{ uri: coverImage }} style={styles.coverImage} />
            <View style={styles.editImageOverlay}>
              <Plus color="#fff" size={24} />
              <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>Thay đổi ảnh</Text>
            </View>
          </TouchableOpacity>
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
          <Dialog.Title>Chọn vị trí trên bản đồ</Dialog.Title>
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
          <Dialog.Actions>
            <Button onPress={() => setMapModalVisible(false)} textColor="#64748B">Hủy</Button>
            <Button onPress={() => {
              if (tempCoordinate) {
                setLatitude(tempCoordinate.latitude);
                setLongitude(tempCoordinate.longitude);
                setAddress(`Tọa độ: ${tempCoordinate.latitude.toFixed(4)}, ${tempCoordinate.longitude.toFixed(4)}`);
              }
              setMapModalVisible(false);
            }} mode="contained" style={{ backgroundColor: '#3B82F6' }}>Xác nhận</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: '#fff', fontWeight: 'bold' }}>Đang lưu...</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  headerSave: { fontSize: 16, fontWeight: 'bold', color: '#3B82F6' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  input: { marginBottom: 16, backgroundColor: '#fff' },
  budgetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  budgetChip: { backgroundColor: '#F1F5F9' },
  budgetChipActive: { backgroundColor: '#3B82F6' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 8, marginBottom: 12 },
  mapBtn: { borderColor: '#3B82F6', borderRadius: 8, marginBottom: 12 },
  locationInfo: { padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8, marginBottom: 16 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tagChip: { backgroundColor: '#F1F5F9' },
  tagChipActive: { backgroundColor: '#3B82F6' },
  coverImageContainer: { height: 180, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  editImageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  mapDialog: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  mapContainer: { height: 300, width: '100%', backgroundColor: '#F1F5F9' }
});
