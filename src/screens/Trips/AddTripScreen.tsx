
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Image, TouchableOpacity, Dimensions, Keyboard } from 'react-native';
import { Text, TextInput, useTheme, ActivityIndicator, Snackbar, Button, Chip, Portal, Dialog, HelperText, Menu } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { ArrowLeft, Calendar, MapPin, Camera, Trash2, Check, Sparkles, Map as MapIcon, ChevronDown } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../config/supabase';
import { AppDispatch, RootState } from '../../features/store';
import { fetchTrips, Trip } from '../../features/trips/tripsSlice';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

type FormData = {
  title: string;
  country: string;
  city: string;
  budget: string;
  description: string;
};

const AVAILABLE_TAGS = ['🏖 Biển', '🍜 Ẩm thực', '🏕 Camping', '🏛 Văn hóa', '🎡 Giải trí', '👨‍👩‍👧 Gia đình', '⛰️ Núi rừng', '📸 Khám phá'];
const COUNTRIES = ['Việt Nam', 'Thái Lan', 'Nhật Bản', 'Hàn Quốc', 'Singapore', 'Malaysia', 'Châu Âu', 'Khác'];
const CITIES: Record<string, string[]> = {
  'Việt Nam': ['Hà Nội', 'Đà Nẵng', 'Hồ Chí Minh', 'Đà Lạt', 'Nha Trang', 'Phú Quốc', 'Hội An', 'Khác'],
  'Thái Lan': ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Khác'],
  'Nhật Bản': ['Tokyo', 'Kyoto', 'Osaka', 'Hokkaido', 'Khác'],
  'Hàn Quốc': ['Seoul', 'Jeju', 'Busan', 'Khác'],
  'Singapore': ['Singapore'],
};

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const formatCurrencyInput = (value: string) => {
  if (!value) return '';
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return parseInt(num).toLocaleString('vi-VN');
};
const parseCurrency = (value: string) => value ? value.replace(/\D/g, '') : '';
const formatDate = (date: Date) => `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
// Helper to fix timezone offset when selecting date
const fixDateTimezone = (date: Date) => {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
};

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
  
  const [coverImage, setCoverImage] = useState<string | null>(tripToEdit?.coverImage || (tripToEdit as any)?.cover_image || null);
  const [selectedTags, setSelectedTags] = useState<string[]>(tripToEdit?.tags || []);
  
  const [latitude, setLatitude] = useState<number | null>(tripToEdit?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(tripToEdit?.longitude || null);
  const [address, setAddress] = useState<string>(tripToEdit?.address || '');
  const [forceExit, setForceExit] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [tempCoordinate, setTempCoordinate] = useState<{latitude: number, longitude: number} | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingText, setLoadingText] = useState('Đang lưu...');
  const [msg, setMsg] = useState('');

  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);

  const { control, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<FormData>({
    defaultValues: {
      title: tripToEdit?.title || '',
      country: tripToEdit?.country || 'Việt Nam',
      city: tripToEdit?.city || '',
      budget: tripToEdit?.budget ? tripToEdit.budget.toLocaleString('vi-VN') : '',
      description: tripToEdit?.description || '',
    }
  });

  const watchCountry = watch('country');
  const watchCity = watch('city');

  useEffect(() => {
    if (isDirty && watchCountry !== (tripToEdit?.country || 'Việt Nam')) {
      setValue('city', '', { shouldDirty: true });
    }
  }, [watchCountry]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (forceExit || loading) return;
      if (!isDirty && coverImage === (tripToEdit?.coverImage || null)) return;
      e.preventDefault();
      setDiscardDialogVisible(true);
    });
    return unsubscribe;
  }, [navigation, isDirty, coverImage, forceExit, loading]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
    else setSelectedTags([...selectedTags, tag]);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const generateAIInfo = async () => {
    if (!watchCountry || !watchCity) {
      setMsg('Vui lòng chọn Quốc gia và Thành phố trước khi gọi AI.'); return;
    }
    Keyboard.dismiss(); setLoadingAI(true);
    try {
      const prompt = `Tôi chuẩn bị đi du lịch đến ${watchCity}, ${watchCountry}. Hãy tạo cho tôi:
1. Một tiêu đề ngắn gọn thú vị cho chuyến đi (dưới 10 chữ).
2. Một đoạn mô tả ngắn gọn hấp dẫn về chuyến đi (dưới 50 chữ).
3. Gợi ý 3-4 tags phù hợp nhất từ danh sách sau: ${AVAILABLE_TAGS.join(', ')}.
Trả về định dạng JSON thuần túy: {"title": "...", "description": "...", "tags": ["...", "..."]}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!response.ok) throw new Error('Lỗi kết nối Gemini');

      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      
      if (parsed.title) setValue('title', parsed.title, { shouldDirty: true });
      if (parsed.description) setValue('description', parsed.description, { shouldDirty: true });
      if (parsed.tags && Array.isArray(parsed.tags)) {
        setSelectedTags(parsed.tags.filter((t: string) => AVAILABLE_TAGS.includes(t)));
      }
      setMsg('Đã gợi ý nội dung thành công! ✨');
    } catch (e: any) {
      setMsg('Lỗi AI, vui lòng thử lại.');
    } finally {
      setLoadingAI(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) { setMsg('Vui lòng đăng nhập!'); return; }
    if (endDate < startDate) { setMsg('Ngày kết thúc phải sau ngày bắt đầu!'); return; }
    setLoading(true);
    try {
      let finalCoverImage = coverImage;
      if (coverImage && !coverImage.startsWith('http')) {
        setLoadingText('Đang tải ảnh lên...');
        const ext = coverImage.substring(coverImage.lastIndexOf('.') + 1);
        const fileName = `${user.uid}/${Date.now()}.${ext}`;
        const base64 = await FileSystem.readAsStringAsync(coverImage, { encoding: FileSystem.EncodingType.Base64 });
        const { error: uploadError } = await supabase.storage.from('trago-images').upload(fileName, decode(base64), { contentType: `image/${ext}` });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('trago-images').getPublicUrl(fileName);
        finalCoverImage = publicData.publicUrl;
      }
      
      setLoadingText('Đang lưu thông tin...');
      // Fix timezone for dates before saving
      const fixedStart = fixDateTimezone(startDate).toISOString().split('T')[0];
      const fixedEnd = fixDateTimezone(endDate).toISOString().split('T')[0];

      const tripData = {
        user_id: user.uid,
        title: data.title,
        country: data.country,
        city: data.city,
        start_date: fixedStart,
        end_date: fixedEnd,
        budget: data.budget ? parseInt(parseCurrency(data.budget)) : 0,
        description: data.description,
        cover_image: finalCoverImage,
        tags: selectedTags,
        status: new Date(fixedStart) > new Date() ? 'Upcoming' : new Date(fixedEnd) < new Date() ? 'Completed' : 'Ongoing',
        latitude: latitude,
        longitude: longitude,
        address: address
      };

      if (isEdit && tripToEdit.id) {
        const { error } = await supabase.from('trips').update(tripData).eq('id', tripToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('trips').insert([tripData]);
        if (error) throw error;
      }

      setForceExit(true);
      dispatch(fetchTrips(user.uid));
      setTimeout(() => navigation.goBack(), 100);
    } catch (e: any) {
      setMsg(`Lỗi lưu chuyến đi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMapSelect = async () => {
    if (tempCoordinate) {
      setLatitude(tempCoordinate.latitude);
      setLongitude(tempCoordinate.longitude);
      setLoadingText('Đang lấy địa chỉ...'); setLoading(true);
      try {
        let location = await Location.reverseGeocodeAsync(tempCoordinate);
        if (location && location.length > 0) {
          const loc = location[0];
          setAddress(`${loc.name ? loc.name + ', ' : ''}${loc.street || ''}, ${loc.subregion || ''}, ${loc.region || ''}, ${loc.country || ''}`.replace(/^, | ,/g, '').trim());
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    setMapModalVisible(false);
  };

  const InputWrapper = ({ label, children, error }: any) => (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputBox, error && styles.inputBoxError]}>
        {children}
      </View>
      {error && <HelperText type="error" visible={true} style={{ paddingHorizontal: 0 }}>{error.message}</HelperText>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
        <LinearGradient colors={['#FDF4FF', '#F8FAFC']} style={StyleSheet.absoluteFillObject} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <ArrowLeft color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Sửa chuyến đi' : 'Tạo chuyến đi mới'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          {/* COVER IMAGE */}
          <View style={styles.coverSection}>
            <TouchableOpacity activeOpacity={0.9} onPress={pickImage} style={styles.coverWrapper}>
              {coverImage ? (
                <>
                  <Image source={{ uri: coverImage }} style={styles.coverImg} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.coverOverlay} />
                  <View style={styles.changeCoverBtn}>
                    <Camera color="#fff" size={16} /><Text style={styles.changeCoverText}>Đổi ảnh</Text>
                  </View>
                </>
              ) : (
                <View style={styles.emptyCover}>
                  <Camera color="#94A3B8" size={32} />
                  <Text style={styles.emptyCoverText}>Thêm ảnh bìa</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Controller control={control} rules={{ required: 'Vui lòng nhập tiêu đề' }} render={({ field: { onChange, value } }) => (
              <InputWrapper label="Tên chuyến đi" error={errors.title}>
                <TextInput mode="flat" placeholder="VD: Mùa hè rực rỡ tại Đà Nẵng" value={value} onChangeText={onChange} style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent"  />
              </InputWrapper>
            )} name="title" />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Controller control={control} name="country" render={({ field: { onChange, value } }) => (
                  <InputWrapper label="Quốc gia">
                    <Menu visible={showCountryMenu} onDismiss={() => setShowCountryMenu(false)} anchor={
                      <TouchableOpacity onPress={() => setShowCountryMenu(true)} style={styles.pickerBtn}>
                        <Text style={styles.pickerText}>{value || 'Chọn quốc gia'}</Text>
                        <ChevronDown color="#64748B" size={20} />
                      </TouchableOpacity>
                    }>
                      {COUNTRIES.map(c => <Menu.Item key={c} onPress={() => { onChange(c); setShowCountryMenu(false); }} title={c} />)}
                    </Menu>
                  </InputWrapper>
                )} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Controller control={control} rules={{ required: 'Bắt buộc' }} name="city" render={({ field: { onChange, value } }) => (
                  <InputWrapper label="Thành phố" error={errors.city}>
                    <Menu visible={showCityMenu} onDismiss={() => setShowCityMenu(false)} anchor={
                      <TouchableOpacity onPress={() => setShowCityMenu(true)} style={styles.pickerBtn}>
                        <Text style={styles.pickerText}>{value || 'Chọn thành phố'}</Text>
                        <ChevronDown color="#64748B" size={20} />
                      </TouchableOpacity>
                    }>
                      {(CITIES[watchCountry] || ['Khác']).map(c => <Menu.Item key={c} onPress={() => { onChange(c); setShowCityMenu(false); }} title={c} />)}
                    </Menu>
                  </InputWrapper>
                )} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <InputWrapper label="Ngày bắt đầu">
                  <TouchableOpacity onPress={() => setShowStartDate(true)} style={styles.pickerBtn}>
                    <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
                    <Calendar color="#64748B" size={20} />
                  </TouchableOpacity>
                </InputWrapper>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <InputWrapper label="Ngày kết thúc">
                  <TouchableOpacity onPress={() => setShowEndDate(true)} style={styles.pickerBtn}>
                    <Text style={styles.pickerText}>{formatDate(endDate)}</Text>
                    <Calendar color="#64748B" size={20} />
                  </TouchableOpacity>
                </InputWrapper>
              </View>
            </View>

            {/* AI BANNER */}
            <TouchableOpacity activeOpacity={0.9} onPress={generateAIInfo} disabled={loadingAI} style={styles.aiBanner}>
              <LinearGradient colors={['#D946EF', '#8B5CF6']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.aiBannerGradient}>
                {loadingAI ? <ActivityIndicator color="#fff" size={24} /> : (
                  <>
                    <Sparkles color="#fff" size={24} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiBannerTitle}>Gợi ý thông minh với AI</Text>
                      <Text style={styles.aiBannerDesc}>Tự động tạo Tiêu đề, Mô tả và Tags</Text>
                    </View>
                    <ChevronDown color="#fff" size={20} style={{ transform: [{ rotate: '-90deg' }] }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
              <InputWrapper label="Mô tả chuyến đi">
                <TextInput mode="flat" placeholder="Kể về kỳ vọng của bạn..." value={value} onChangeText={onChange} multiline numberOfLines={3} style={[styles.input, { height: 100 }]} underlineColor="transparent" activeUnderlineColor="transparent"  />
              </InputWrapper>
            )} />

            <Controller control={control} name="budget" render={({ field: { onChange, value } }) => (
              <InputWrapper label="Ngân sách dự kiến (VND)">
                <TextInput mode="flat" placeholder="VD: 5,000,000" keyboardType="numeric" value={value} onChangeText={(txt) => onChange(formatCurrencyInput(txt))} style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent"  />
              </InputWrapper>
            )} />

            <View style={styles.tagsSection}>
              <Text style={styles.inputLabel}>Tags nổi bật</Text>
              <View style={styles.tagsContainer}>
                {AVAILABLE_TAGS.map(tag => (
                  <Chip key={tag} selected={selectedTags.includes(tag)} onPress={() => toggleTag(tag)} style={[styles.chip, selectedTags.includes(tag) && styles.chipActive]} textStyle={[styles.chipText, selectedTags.includes(tag) && styles.chipTextActive]}>
                    {tag}
                  </Chip>
                ))}
              </View>
            </View>

            <View style={styles.locationSection}>
              <Text style={styles.inputLabel}>Ghim vị trí trung tâm (Tùy chọn)</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(true)} style={styles.locationCard}>
                {latitude && longitude ? (
                  <View style={styles.locationData}>
                    <View style={styles.locationIconWrap}><MapPin color="#3B82F6" size={24} /></View>
                    <View style={{ flex: 1, paddingLeft: 16 }}>
                      <Text style={styles.locationAddress} numberOfLines={2}>{address || 'Đã chọn vị trí'}</Text>
                      <Text style={styles.locationCoords}>{latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyLocation}>
                    <MapIcon color="#94A3B8" size={32} />
                    <Text style={styles.emptyLocationText}>Chạm để chọn trên bản đồ</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FAB SAVE BTN */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={handleSubmit(onSubmit)} disabled={loading}>
        <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.fabGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
          {loading ? <ActivityIndicator color="#fff" size={24} /> : <Check color="#fff" size={28} />}
        </LinearGradient>
      </TouchableOpacity>

      {/* DATE PICKERS & DIALOGS */}
      {Platform.OS === 'ios' ? (
        <Portal>
          <Dialog visible={showStartDate} onDismiss={() => setShowStartDate(false)} style={{ backgroundColor: '#fff', borderRadius: 24 }}>
            <Dialog.Title>Ngày bắt đầu</Dialog.Title>
            <Dialog.Content style={{ alignItems: 'center' }}>
              <DateTimePicker value={startDate} mode="date" display="spinner" onChange={(e, d) => d && setStartDate(d)} />
            </Dialog.Content>
            <Dialog.Actions><Button onPress={() => setShowStartDate(false)}>Xong</Button></Dialog.Actions>
          </Dialog>
          <Dialog visible={showEndDate} onDismiss={() => setShowEndDate(false)} style={{ backgroundColor: '#fff', borderRadius: 24 }}>
            <Dialog.Title>Ngày kết thúc</Dialog.Title>
            <Dialog.Content style={{ alignItems: 'center' }}>
              <DateTimePicker value={endDate} mode="date" display="spinner" minimumDate={startDate} onChange={(e, d) => d && setEndDate(d)} />
            </Dialog.Content>
            <Dialog.Actions><Button onPress={() => setShowEndDate(false)}>Xong</Button></Dialog.Actions>
          </Dialog>
        </Portal>
      ) : (
        <>
          {showStartDate && <DateTimePicker value={startDate} mode="date" onChange={(e, d) => { setShowStartDate(false); if (d) setStartDate(d); }} />}
          {showEndDate && <DateTimePicker value={endDate} mode="date" minimumDate={startDate} onChange={(e, d) => { setShowEndDate(false); if (d) setEndDate(d); }} />}
        </>
      )}

      {/* MAP MODAL */}
      <Portal>
        <Dialog visible={mapModalVisible} onDismiss={() => setMapModalVisible(false)} style={styles.mapModal}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>Chọn vị trí</Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)} style={{ padding: 8 }}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Đóng</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapContainer}>
            <MapView 
              style={{ flex: 1 }} 
              initialRegion={{ latitude: latitude || 16.0544, longitude: longitude || 108.2022, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
              onPress={(e) => setTempCoordinate(e.nativeEvent.coordinate)}
            >
              {(tempCoordinate || (latitude && longitude)) && (
                <Marker coordinate={tempCoordinate || { latitude: latitude as number, longitude: longitude as number }} />
              )}
            </MapView>
          </View>
          <View style={styles.mapModalFooter}>
            <Button mode="contained" onPress={handleMapSelect} disabled={!tempCoordinate} style={{ borderRadius: 12 }}>
              Xác nhận vị trí
            </Button>
          </View>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={discardDialogVisible} onDismiss={() => setDiscardDialogVisible(false)} style={{ borderRadius: 16, backgroundColor: '#fff' }}>
          <Dialog.Title>Chưa lưu thay đổi</Dialog.Title>
          <Dialog.Content><Text>Bạn có chắc chắn muốn thoát? Các thay đổi sẽ bị mất.</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDiscardDialogVisible(false)}>Hủy</Button>
            <Button onPress={() => { setDiscardDialogVisible(false); setForceExit(true); navigation.goBack(); }} textColor="#EF4444">Thoát</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </View>
      )}

      <Snackbar visible={!!msg} onDismiss={() => setMsg('')} duration={3000} style={{ backgroundColor: '#0F172A', borderRadius: 12 }}>{msg}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  coverSection: { paddingHorizontal: 20, marginBottom: 24 },
  coverWrapper: { width: '100%', height: 200, borderRadius: 24, overflow: 'hidden', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  changeCoverBtn: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  changeCoverText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  emptyCover: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCoverText: { color: '#94A3B8', marginTop: 12, fontWeight: '600' },
  formContainer: { paddingHorizontal: 20 },
  inputWrap: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 8, marginLeft: 4 },
  inputBox: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  inputBoxError: { borderColor: '#EF4444', borderWidth: 1 },
  input: { backgroundColor: 'transparent', height: 56, paddingHorizontal: 4 },
  row: { flexDirection: 'row' },
  pickerBtn: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  pickerText: { fontSize: 16, color: '#0F172A' },
  aiBanner: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, shadowColor: '#D946EF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 6 },
  aiBannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  aiBannerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  aiBannerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  tagsSection: { marginBottom: 24 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 100 },
  chipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  chipText: { color: '#64748B' },
  chipTextActive: { color: '#3B82F6', fontWeight: 'bold' },
  locationSection: { marginBottom: 40 },
  locationCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#F1F5F9' },
  locationData: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  locationIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  locationAddress: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  locationCoords: { fontSize: 12, color: '#64748B' },
  emptyLocation: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyLocationText: { color: '#94A3B8', marginTop: 12, fontWeight: '500' },
  fab: { position: 'absolute', bottom: 32, right: 24, borderRadius: 28, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  fabGradient: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  mapModal: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', marginHorizontal: 20 },
  mapModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mapModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  mapContainer: { height: 400, width: '100%' },
  mapModalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadingBox: { backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  loadingText: { marginTop: 16, fontSize: 15, fontWeight: '600', color: '#0F172A' }
});
