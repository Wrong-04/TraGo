
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, Dimensions, Image, ScrollView,
  TouchableOpacity, Alert, Platform, Animated,
  TextInput as RNTextInput, KeyboardAvoidingView, InteractionManager, Modal,
} from 'react-native';
import {
  Text, Button, Portal, Dialog, TextInput,
  Snackbar, ActivityIndicator, Chip, Divider, IconButton,
} from 'react-native-paper';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import {
  Star, ArrowLeft, MapPin, Crosshair, X, Plus, Minus, Search,
  Maximize2, Navigation as NavIcon, Camera, BookOpen,
  Pencil, Trash2, Image as ImageIcon, Layers, Copy,
  Heart, Cloud, CloudRain, Sun, Smile, Frown, Meh, Clock
} from 'lucide-react-native';
import { supabase } from '../../config/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import * as Linking2 from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import * as Clipboard from 'expo-clipboard';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TripLocation {
  id: string;
  trip_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  visit_date: string;
  review?: string;
  rating?: number;
  distance_from_previous?: number;
  travel_time_minutes?: number;
  image?: string;
  status?: string;
  category?: string;
  is_favorite?: boolean;
  mood?: string;
  weather?: string;
  visit_time?: string;
  estimated_cost?: number;
}

const CATEGORIES = ['🏖 Beach', '🏯 Temple', '🍜 Food', '🌄 Mountain', '🏨 Hotel', '🛍 Shopping', '🎨 Museum', '🌳 Park'];
const MOODS = ['😍', '😀', '😊', '😐', '😢'];
const WEATHERS = ['☀️', '☁️', '🌧', '⛈', '❄️'];

// ─── Helper ───────────────────────────────────────────────────────────────────
const getMarkerColor = (index: number, total: number, isSelected: boolean) => {
  if (isSelected) return '#7C3AED';
  if (index === 0) return '#10B981';
  if (index === total - 1) return '#EF4444';
  return '#F59E0B';
};

const formatDistance = (km: number) => {
  if (!km) return '0 km';
  return km >= 1 ? `${km.toFixed(1)} km` : `${(km * 1000).toFixed(0)} m`;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MapScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const trip = route.params?.trip;

  const mapRef = useRef<MapView>(null);
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<TripLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackError, setSnackError] = useState(false);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [previewLocation, setPreviewLocation] = useState<any | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Search & AI states
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Add / Edit form state
  const [formVisible, setFormVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<TripLocation | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIsFav, setFormIsFav] = useState(false);
  
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formCost, setFormCost] = useState('');
  
  const [formRating, setFormRating] = useState('5');
  const [formMood, setFormMood] = useState('');
  const [formWeather, setFormWeather] = useState('');
  const [formReview, setFormReview] = useState('');
  
  const [formImage, setFormImage] = useState<string | null>(null);

  const [formSaving, setFormSaving] = useState(false);
  const [addingMapMode, setAddingMapMode] = useState(false);

  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // Delete & Cancel Dialogs
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<TripLocation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

  // ─── Computed ──────────────────────────────────────────────────────────────
  const routeCoordinates = locations.map(l => ({ latitude: l.latitude, longitude: l.longitude }));
  const totalDistance = locations.reduce((s, l) => s + (l.distance_from_previous || 0), 0);

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const loadLocations = useCallback(async () => {
    if (!trip?.id) return;
    try {
      const { data, error } = await supabase
        .from('trip_locations')
        .select('*')
        .eq('trip_id', trip.id)
        .order('visit_date', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      const locs = (data || []) as TripLocation[];
      setLocations(locs);

      if (locs.length > 0) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(
            locs.map(l => ({ latitude: l.latitude, longitude: l.longitude })),
            { edgePadding: { top: 120, right: 60, bottom: 200, left: 60 }, animated: true }
          );
        }, 600);
      } else {
        // Fallback to trip coordinates or geocode city
        if (trip?.latitude && trip?.longitude) {
          setTimeout(() => {
            mapRef.current?.animateToRegion({
              latitude: trip.latitude, longitude: trip.longitude,
              latitudeDelta: 0.1, longitudeDelta: 0.1,
            }, 1000);
          }, 600);
        } else if (trip?.city) {
          Location.geocodeAsync(`${trip.city}, ${trip.country || ''}`).then((res) => {
            if (res && res.length > 0) {
              setTimeout(() => {
                mapRef.current?.animateToRegion({
                  latitude: res[0].latitude, longitude: res[0].longitude,
                  latitudeDelta: 0.1, longitudeDelta: 0.1,
                }, 1000);
              }, 600);
            }
          }).catch(() => {});
        }
      }
    } catch (e) {
      showSnack('Không thể tải dữ liệu địa điểm.', true);
    } finally {
      setLoading(false);
    }
  }, [trip?.id]);

  useEffect(() => { 
    // Fetch data immediately
    loadLocations(); 
    // Delay heavy map rendering until navigation transition finishes for butter-smooth UX
    InteractionManager.runAfterInteractions(() => {
      setMapReady(true);
    });
  }, [loadLocations]);

  // ─── Bottom Sheet animation ─────────────────────────────────────────────────
  const openBottomSheet = (loc: TripLocation) => {
    setSelectedLocation(loc);
    Animated.spring(bottomSheetAnim, { toValue: 1, useNativeDriver: true, bounciness: 8 }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(bottomSheetAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setSelectedLocation(null);
    });
  };

  // ─── Search & AI Logic ─────────────────────────────────────────────────────
  const searchNominatim = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`, {
        headers: { 
          'Accept-Language': 'vi',
          'User-Agent': 'TraGoApp/1.0 (Contact: admin@trago.com)'
        }
      });
      const data = await res.json();
      setSearchResults(data || []);
      setShowResults(true);
    } catch (e) {
      console.log('Search API error:', e);
    }
  };

  const onChangeSearchText = (text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchNominatim(text), 500);
  };

  const onSelectSuggestion = (item: any) => {
    const coords = { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) };
    const name = item.name || item.display_name.split(',')[0];
    setPreviewLocation({ name, ...coords, address: item.display_name });
    setShowResults(false);
    setSearchQuery(name);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 1000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const geocode = await Location.geocodeAsync(searchQuery);
      if (geocode && geocode.length > 0) {
        const coords = { latitude: geocode[0].latitude, longitude: geocode[0].longitude };
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 1000);
        setPreviewLocation({ name: searchQuery, ...coords, address: '' });
        setSearching(false);
      } else {
        showSnack('Không tìm thấy địa điểm này', true);
        setSearching(false);
      }
    } catch (err) {
      showSnack('Lỗi tìm kiếm địa điểm', true);
      setSearching(false);
    }
  };

  const confirmPreviewLocation = () => {
    if (!previewLocation) return;
    setSearching(true);
    fetchAIDetails(previewLocation.name, { latitude: previewLocation.latitude, longitude: previewLocation.longitude });
    setPreviewLocation(null);
  };

  const fetchAIDetails = async (query: string, coords: any) => {
    showSnack('AI đang phân tích và tìm ảnh bìa...');
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('No API Key');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `I am adding a travel location named "${query}". 
      Return a valid JSON with NO markdown formatting:
      {
        "name": "Formatted name",
        "category": "One of: 🏖 Beach, 🏯 Temple, 🍜 Food, 🌄 Mountain, 🏨 Hotel, 🛍 Shopping, 🎨 Museum, 🌳 Park, or Other",
        "review": "A short poetic description in Vietnamese",
        "wiki_title": "The English Wikipedia article title for this exact place (to fetch image). Empty string if not famous."
      }`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(text);
      
      let imageUrl = '';
      if (data.wiki_title) {
        try {
          const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(data.wiki_title)}&origin=*`);
          const wikiJson = await wikiRes.json();
          const pages = wikiJson.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            if (pageId !== '-1' && pages[pageId].original) {
              imageUrl = pages[pageId].original.source;
            }
          }
        } catch (e) {}
      }
      
      setFormName(data.name || query);
      setFormCategory(CATEGORIES.find(c => c.includes(data.category)) || CATEGORIES[0]);
      setFormReview(data.review || '');
      setFormImage(imageUrl || null);
      setFormLat(coords.latitude.toString());
      setFormLng(coords.longitude.toString());
      
      setAddingMapMode(false);
      setEditingLocation(null);
      setFormVisible(true);
      showSnack('AI đã điền xong thông tin!');
    } catch (err) {
      // Fallback
      setFormName(query);
      setFormLat(coords.latitude.toString());
      setFormLng(coords.longitude.toString());
      setAddingMapMode(false);
      setEditingLocation(null);
      setFormVisible(true);
      showSnack('Tìm thấy tọa độ, vui lòng tự điền thông tin.');
    } finally {
      setSearching(false);
      setSearchQuery('');
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const showSnack = (msg: string, error = false) => {
    setSnackMsg(msg);
    setSnackError(error);
    setSnackVisible(true);
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showSnack('Đã copy!');
  };

  // ─── Form CRUD ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingLocation(null);
    setFormName(''); setFormAddress(''); setFormLat(''); setFormLng('');
    setFormCategory(''); setFormIsFav(false);
    setFormDate(new Date().toISOString().split('T')[0]); setFormTime(''); setFormCost('');
    setFormRating('5'); setFormMood(''); setFormWeather(''); setFormReview('');
    setFormImage(null);
  };


  const toggleMapType = () => {
    setMapType(prev => {
      if (prev === 'standard') return 'satellite';
      if (prev === 'satellite') return 'terrain';
      return 'standard';
    });
  };

  const handleZoomIn = () => {
    mapRef.current?.getCamera().then((cam) => {
      cam.altitude = (cam.altitude || 1000) / 2;
      cam.zoom = (cam.zoom || 15) + 1;
      mapRef.current?.animateCamera(cam, { duration: 500 });
    });
  };

  const handleZoomOut = () => {
    mapRef.current?.getCamera().then((cam) => {
      cam.altitude = (cam.altitude || 1000) * 2;
      cam.zoom = (cam.zoom || 15) - 1;
      mapRef.current?.animateCamera(cam, { duration: 500 });
    });
  };

  const handleRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showSnack('Không có quyền truy cập vị trí.', true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    } catch (e) {
      showSnack('Không thể lấy vị trí hiện tại.', true);
    }
  };

  const openGoogleMaps = (loc: TripLocation) => {
    const url = `google.navigation:q=${loc.latitude},${loc.longitude}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`);
    });
  };

  const renderMarkerIcon = (category?: string) => {
    if (!category) return <MapPin size={20} color="#fff" />;
    if (category.includes('Beach')) return <Sun size={20} color="#fff" />;
    if (category.includes('Hotel')) return <Star size={20} color="#fff" />;
    if (category.includes('Food')) return <Star size={20} color="#fff" />;
    if (category.includes('Museum')) return <BookOpen size={20} color="#fff" />;
    return <MapPin size={20} color="#fff" />;
  };

  const openPrefilledAddForm = () => {
    if (!selectedLocation) return;
    setEditingLocation(null);
    setFormName(selectedLocation.name || '');
    setFormLat(selectedLocation.latitude.toString());
    setFormLng(selectedLocation.longitude.toString());
    setFormCategory(selectedLocation.category || CATEGORIES[0]);
    setFormReview(selectedLocation.review || '');
    setFormImage(selectedLocation.image || null);
    setFormDate(selectedLocation.visit_date || new Date().toISOString().split('T')[0]);
    fetchAddress(selectedLocation.latitude, selectedLocation.longitude);
    setFormVisible(true);
    closeBottomSheet();
  };
  const openAddForm = (coord?: { latitude: number; longitude: number }) => {
    resetForm();
    if (coord) {
      setFormLat(coord.latitude.toFixed(6));
      setFormLng(coord.longitude.toFixed(6));
      fetchAddress(coord.latitude, coord.longitude);
    }
    setFormVisible(true);
  };

  const openEditForm = (loc: TripLocation) => {
    setEditingLocation(loc);
    setFormName(loc.name || '');
    setFormAddress(loc.address || '');
    setFormLat(loc.latitude.toString());
    setFormLng(loc.longitude.toString());
    setFormCategory(loc.category || '');
    setFormIsFav(loc.is_favorite || false);
    setFormDate(loc.visit_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setFormTime(loc.visit_time || '');
    setFormCost(loc.estimated_cost ? loc.estimated_cost.toString() : '');
    setFormRating((loc.rating || 5).toString());
    setFormMood(loc.mood || '');
    setFormWeather(loc.weather || '');
    setFormReview(loc.review || '');
    setFormImage(loc.image || null);
    
    setFormVisible(true);
    closeBottomSheet();
  };

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (res && res.length > 0) {
        const addr = `${res[0].name ? res[0].name + ', ' : ''}${res[0].street ? res[0].street + ', ' : ''}${res[0].subregion || res[0].city || ''}`;
        setFormAddress(addr);
        if (!formName && res[0].name) setFormName(res[0].name);
      }
    } catch(e) {
      console.log('Geocoding error', e);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFormImage(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (uri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `${user?.uid}_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('gallery').upload(fileName, decode(base64), { contentType: `image/${ext}` });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Lỗi tải ảnh lên');
    }
  };

  const validateForm = () => {
    if (!trip?.id) { showSnack('🔴 Vui lòng mở Bản đồ từ một Chuyến đi cụ thể để lưu.', true); return false; }
    if (!formName.trim()) { showSnack('🔴 Tên địa điểm không được để trống.', true); return false; }
    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    if (isNaN(lat) || lat < -90 || lat > 90) { showSnack('🔴 Latitude phải từ -90 đến 90.', true); return false; }
    if (isNaN(lng) || lng < -180 || lng > 180) { showSnack('🔴 Longitude phải từ -180 đến 180.', true); return false; }
    if (formReview.length > 1000) { showSnack('🔴 Review tối đa 1000 ký tự.', true); return false; }
    return true;
  };

  const handleSaveLocation = async (continueAdding = false) => {
    if (!validateForm()) return;
    setFormSaving(true);
    try {
      let imageUrl = formImage;
      if (formImage && !formImage.startsWith('http')) {
        showSnack('Đang tải ảnh lên...');
        imageUrl = await uploadImageToSupabase(formImage);
      }

      const payload = {
        trip_id: trip.id,
        name: formName.trim(),
        address: formAddress.trim(),
        latitude: parseFloat(formLat),
        longitude: parseFloat(formLng),
        category: formCategory,
        is_favorite: formIsFav,
        visit_date: formDate,
        visit_time: formTime || null,
        estimated_cost: formCost ? parseInt(formCost) : 0,
        rating: parseInt(formRating),
        mood: formMood,
        weather: formWeather,
        review: formReview.trim(),
        image: imageUrl,
      };

      if (editingLocation) {
        const { error } = await supabase.from('trip_locations').update(payload).eq('id', editingLocation.id);
        if (error) throw error;
        showSnack('Cập nhật địa điểm thành công!');
      } else {
        const { error } = await supabase.from('trip_locations').insert([payload]);
        if (error) throw error;
        showSnack('Đã thêm địa điểm thành công!');
      }
      
      await loadLocations();

      if (continueAdding) {
        resetForm();
      } else {
        setFormVisible(false);
      }
    } catch (e: any) {
      showSnack(e.message || 'Lỗi khi lưu địa điểm.', true);
    } finally {
      setFormSaving(false);
    }
  };

  const confirmCancel = () => {
    if (formName || formAddress || formLat || formLng) {
      setCancelDialogVisible(true);
    } else {
      setFormVisible(false);
    }
  };

  const confirmDelete = (loc: TripLocation) => {
    setDeletingLocation(loc);
    setDeleteDialogVisible(true);
    closeBottomSheet();
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('trip_locations').delete().eq('id', deletingLocation.id);
      if (error) throw error;
      showSnack('Đã xóa địa điểm.');
      setDeleteDialogVisible(false);
      loadLocations();
    } catch (e: any) {
      showSnack('Xóa thất bại. Thử lại.', true);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Map press handler ──────────────────────────────────────────────────────
  const handleMapPress = (e: any) => {
    if (addingMapMode) {
      const coord = e.nativeEvent.coordinate;
      setAddingMapMode(false);
      openAddForm(coord);
    } else {
      if (selectedLocation) closeBottomSheet();
    }
  };

  // ─── Bottom Sheet translate ─────────────────────────────────────────────────
  const bottomSheetTranslate = bottomSheetAnim.interpolate({
    inputRange: [0, 1], outputRange: [height * 0.6, 0],
  });

  // ─── UI ──────────────────────────────────────────────────────────────────────
  if (!mapReady) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: '#64748B' }}>Đang tải bản đồ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
              {/* Preview Marker */}
        {previewLocation && (
          <Marker
            coordinate={{ latitude: previewLocation.latitude, longitude: previewLocation.longitude }}
            title={previewLocation.name}
            pinColor="#3B82F6"
          />
        )}
      {/* ─── MapView ─── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: locations.length > 0 ? locations[0].latitude : 16.047079,
          longitude: locations.length > 0 ? locations[0].longitude : 108.206230,
          latitudeDelta: 0.1, longitudeDelta: 0.1,
        }}
        onPress={handleMapPress}
        showsUserLocation
        showsCompass={false}
      >
        {locations.map((loc, index) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            onPress={(e) => {
              e.stopPropagation();
              openBottomSheet(loc);
            }}
            pinColor={getMarkerColor(index, locations.length, selectedLocation?.id === loc.id)}
            zIndex={selectedLocation?.id === loc.id ? 999 : index}
          />
        ))}

        {locations.length > 1 && (
          <Polyline coordinates={routeCoordinates} strokeColor="#3B82F6" strokeWidth={3} lineDashPattern={[5, 5]} />
        )}
      </MapView>

      {/* ─── Crosshair for picking location ─── */}
      {addingMapMode && (
        <View style={styles.crosshairContainer} pointerEvents="none">
          <Crosshair size={40} color="#EF4444" />
          <Text style={styles.crosshairText}>Chạm vào bản đồ để thả ghim</Text>
        </View>
      )}

      {/* ─── Header Overlay ─── */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color="#1E293B" size={24} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{trip?.title || 'Bản đồ'}</Text>
            <Text style={styles.headerSubtitle}>{locations.length} địa điểm • {formatDistance(totalDistance)}</Text>
          </View>
        </View>

        {/* Search Bar */}
                <View style={styles.searchContainer}>
          <RNTextInput autoCorrect={false} spellCheck={false}
            style={styles.searchInput}
            placeholder="Tìm kiếm địa danh (VD: Tháp Eiffel)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={onChangeSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator size="small" color="#3B82F6" style={styles.searchIcon} />
          ) : (
            <TouchableOpacity onPress={handleSearch} style={styles.searchIcon}>
              <Search color="#64748B" size={20} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Autocomplete Dropdown */}
        {showResults && searchResults.length > 0 && (
          <View style={styles.searchResultsWrap}>
            {searchResults.map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.searchResultItem} onPress={() => onSelectSuggestion(item)}>
                <MapPin color="#64748B" size={16} style={{marginRight: 10}} />
                <View style={{flex: 1}}>
                  <Text style={styles.searchResultName} numberOfLines={1}>{item.name || item.display_name.split(',')[0]}</Text>
                  <Text style={styles.searchResultAddress} numberOfLines={1}>{item.display_name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

            {/* ─── Confirm Preview Button ─── */}
      {previewLocation && (
        <View style={[styles.previewConfirmWrap, { bottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.previewConfirmBtn} onPress={confirmPreviewLocation}>
            <View style={styles.previewConfirmIcon}><Plus color="#fff" size={20} /></View>
            <Text style={styles.previewConfirmTxt}>Thêm địa điểm này</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Add Button ─── */}
      {!addingMapMode && (
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => { setAddingMapMode(true); closeBottomSheet(); }}>
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      )}

      {/* ─── Bottom Sheet (Location Details) ─── */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: bottomSheetTranslate }] }]}>
        {selectedLocation && (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{selectedLocation.name}</Text>
                {selectedLocation.address ? (
                  <Text style={styles.sheetMeta}>{selectedLocation.address}</Text>
                ) : null}
              </View>
              {selectedLocation.is_favorite && <Heart size={20} color="#EF4444" fill="#EF4444" style={{ marginLeft: 8 }} />}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {selectedLocation.category && <Chip icon="tag" style={{backgroundColor: '#F1F5F9'}}>{selectedLocation.category}</Chip>}
              {selectedLocation.mood && <Chip style={{backgroundColor: '#F1F5F9'}}>{selectedLocation.mood}</Chip>}
              {selectedLocation.weather && <Chip style={{backgroundColor: '#F1F5F9'}}>{selectedLocation.weather}</Chip>}
            </View>

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {selectedLocation.image && (
                <Image source={{ uri: selectedLocation.image }} style={styles.sheetImage} />
              )}
              
              <View style={styles.sheetStats}>
                {selectedLocation.distance_from_previous != null && (
                  <View style={styles.statBox}>
                    <MapPin size={16} color="#3B82F6" />
                    <Text style={styles.statValue}>{formatDistance(selectedLocation.distance_from_previous)}</Text>
                    <Text style={styles.statLabel}>Từ điểm trước</Text>
                  </View>
                )}
                {selectedLocation.rating != null && selectedLocation.rating > 0 && (
                  <View style={styles.statBox}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.statValue}>{selectedLocation.rating}.0</Text>
                    <Text style={styles.statLabel}>Đánh giá</Text>
                  </View>
                )}
                {selectedLocation.estimated_cost != null && selectedLocation.estimated_cost > 0 && (
                  <View style={styles.statBox}>
                    <Text style={{ fontSize: 16 }}>💰</Text>
                    <Text style={styles.statValue}>{(selectedLocation.estimated_cost/1000).toFixed(0)}k</Text>
                    <Text style={styles.statLabel}>Dự kiến</Text>
                  </View>
                )}
              </View>

              {selectedLocation.review ? (
                <View style={styles.reviewBox}>
                  <Text style={styles.reviewText}>{selectedLocation.review}</Text>
                </View>
              ) : null}

              <View style={styles.sheetActions}>
                <Button mode="contained" onPress={() => openEditForm(selectedLocation)} icon={() => <Pencil size={18} color="#fff" />} style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}>
                  Sửa
                </Button>
                <Button mode="contained" onPress={() => confirmDelete(selectedLocation)} icon={() => <Trash2 size={18} color="#fff" />} style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}>
                  Xóa
                </Button>
              </View>
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* ─── Form Modal (Add/Edit) ─── */}
      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFormVisible(false)} />
          
          <View style={styles.modernBottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>{editingLocation ? 'Sửa địa điểm' : 'Thêm địa điểm mới'}</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)} style={styles.closeBtn}>
                <X color="#94A3B8" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
              
              {/* Tên & Địa chỉ */}
              <View style={styles.formGroup}>
                <Text style={styles.modernLabel}>Tên địa điểm *</Text>
                <View style={styles.modernInputWrap}>
                  <RNTextInput style={styles.modernInput} placeholder="Nhập tên..." placeholderTextColor="#94A3B8" value={formName} onChangeText={setFormName} />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.modernLabel}>Địa chỉ</Text>
                <View style={styles.modernInputWrap}>
                  <RNTextInput style={styles.modernInput} placeholder="Nhập địa chỉ..." placeholderTextColor="#94A3B8" value={formAddress} onChangeText={setFormAddress} />
                </View>
              </View>

              {/* Danh mục */}
              <View style={styles.formGroup}>
                <Text style={styles.modernLabel}>Danh mục</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 8 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat} onPress={() => setFormCategory(cat)} style={[styles.modernChip, formCategory === cat && styles.modernChipActive]}>
                      <Text style={[styles.modernChipTxt, formCategory === cat && styles.modernChipTxtActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Thông tin chuyến đi */}
              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.modernLabel}>Ngày ghé</Text>
                  <TouchableOpacity style={styles.modernInputWrap} onPress={() => { setPickerMode('date'); setShowDatePicker(true); }}>
                    <Text style={styles.modernInputTxt}>{formDate || 'Chọn ngày'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.modernLabel}>Giờ</Text>
                  <TouchableOpacity style={styles.modernInputWrap} onPress={() => { setPickerMode('time'); setShowTimePicker(true); }}>
                    <Text style={styles.modernInputTxt}>{formTime || 'Tùy chọn'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.modernLabel}>Chi phí dự kiến (VNĐ)</Text>
                <View style={styles.modernInputWrap}>
                  <RNTextInput style={styles.modernInput} keyboardType="numeric" placeholder="VD: 150000" placeholderTextColor="#94A3B8" value={formCost} onChangeText={setFormCost} />
                </View>
              </View>

              {/* Đánh giá rút gọn */}
              <View style={styles.formGroup}>
                 <Text style={styles.modernLabel}>Nhận xét</Text>
                 <View style={[styles.modernInputWrap, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                   <RNTextInput style={[styles.modernInput, { height: '100%', textAlignVertical: 'top' }]} multiline placeholder="Cảm nhận của bạn..." placeholderTextColor="#94A3B8" value={formReview} onChangeText={setFormReview} />
                 </View>
              </View>

              {/* Hình ảnh */}
              <View style={styles.formGroup}>
                <Text style={styles.modernLabel}>Hình ảnh đính kèm</Text>
                <TouchableOpacity style={styles.modernImagePicker} onPress={pickImage}>
                  {formImage ? (
                    <Image source={{ uri: formImage }} style={styles.modernPreviewImage} />
                  ) : (
                    <View style={styles.modernImagePlaceholder}>
                      <Camera size={28} color="#94A3B8" />
                      <Text style={styles.modernImagePlaceholderTxt}>Chạm để thêm ảnh</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
            
            <View style={styles.bottomSheetActions}>
               {!editingLocation && (
                 <TouchableOpacity style={[styles.modernSaveBtn, { flex: 1, backgroundColor: '#F1F5F9', marginRight: 12 }]} onPress={() => handleSaveLocation(true)}>
                   <Text style={[styles.modernSaveBtnTxt, { color: '#475569' }]}>Lưu & Thêm</Text>
                 </TouchableOpacity>
               )}
               <TouchableOpacity style={[styles.modernSaveBtn, { flex: editingLocation ? 1 : 2 }]} onPress={() => handleSaveLocation(false)}>
                 <Text style={styles.modernSaveBtnTxt}>{editingLocation ? 'Cập nhật' : 'Lưu địa điểm'}</Text>
               </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date/Time Pickers */}
      {(showDatePicker || showTimePicker) && (
        Platform.OS === 'ios' ? (
          <Portal>
            <Dialog visible={true} onDismiss={() => { setShowDatePicker(false); setShowTimePicker(false); }} style={{ backgroundColor: '#fff', borderRadius: 16 }}>
              <Dialog.Title style={{ textAlign: 'center' }}>{pickerMode === 'date' ? 'Chọn Ngày' : 'Chọn Giờ'}</Dialog.Title>
              <Dialog.Content style={{ alignItems: 'center' }}>
                <DateTimePicker
                  value={tempDate}
                  mode={pickerMode}
                  display="spinner"
                  textColor="#000"
                  onChange={(event, date) => {
                    if (date) {
                      setTempDate(date);
                      if (pickerMode === 'date') setFormDate(date.toISOString().split('T')[0]);
                      if (pickerMode === 'time') setFormTime(date.toTimeString().substring(0,5));
                    }
                  }}
                />
              </Dialog.Content>
              <Dialog.Actions style={{ justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                <Button onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }} style={{ width: '100%' }} labelStyle={{ fontSize: 16, fontWeight: 'bold' }}>Xong</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode={pickerMode}
            is24Hour={true}
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              setShowTimePicker(false);
              if (event.type === 'set' && date) {
                setTempDate(date);
                if (pickerMode === 'date') setFormDate(date.toISOString().split('T')[0]);
                if (pickerMode === 'time') setFormTime(date.toTimeString().substring(0,5));
              }
            }}
          />
        )
      )}

      {/* Cancel Dialog */}
      <Portal>
        <Dialog visible={cancelDialogVisible} onDismiss={() => setCancelDialogVisible(false)}>
          <Dialog.Title>Hủy bỏ?</Dialog.Title>
          <Dialog.Content><Text>Bạn có chắc muốn hủy? Dữ liệu đang nhập sẽ bị mất.</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelDialogVisible(false)}>Không</Button>
            <Button onPress={() => { setCancelDialogVisible(false); setFormVisible(false); }} textColor="#EF4444">Có, Hủy</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Xóa địa điểm</Dialog.Title>
          <Dialog.Content><Text>Bạn có chắc muốn xóa "{deletingLocation?.name}" khỏi chuyến đi?</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Hủy</Button>
            <Button onPress={handleDelete} loading={deleting} textColor="#EF4444">Xóa</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar */}
      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={{ backgroundColor: snackError ? '#EF4444' : '#10B981', marginBottom: insets.bottom }}>
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  map: { width, height },
  headerOverlay: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 100,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  
  searchResultsWrap: { backgroundColor: '#fff', borderRadius: 12, marginTop: 8, paddingVertical: 8, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, maxHeight: 250 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchResultName: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  searchResultAddress: { fontSize: 12, color: '#64748B' },
  
  previewConfirmWrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center', zIndex: 10 },
  previewConfirmBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28, shadowColor: '#3B82F6', shadowOffset: {width:0, height:6}, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  previewConfirmIcon: { marginRight: 8 },
  previewConfirmTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    height: '100%',
  },
  searchIcon: {
    padding: 8,
    marginRight: -8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 100, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  bottomSheet: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.6, elevation: 20 },
  sheetContent: { flex: 1, padding: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  sheetMeta: { fontSize: 14, color: '#64748B', marginTop: 4 },
  sheetScroll: { marginTop: 16 },
  sheetImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
  sheetStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 16 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 4 },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  reviewBox: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, marginBottom: 16 },
  reviewText: { fontSize: 14, color: '#334155', fontStyle: 'italic', lineHeight: 20 },
  sheetActions: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  actionBtn: { flex: 1, borderRadius: 100 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  modernBottomSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingVertical: 20, maxHeight: height * 0.85, shadowColor: '#000', shadowOffset: {width:0, height:-10}, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  bottomSheetTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 18 },
  bottomSheetScroll: { paddingBottom: 20 },
  formGroup: { marginBottom: 20 },
  modernLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 },
  modernInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, height: 54, borderWidth: 1, borderColor: '#E2E8F0' },
  modernInput: { flex: 1, height: '100%', fontSize: 15, color: '#0F172A', backgroundColor: 'transparent' },
  modernInputTxt: { fontSize: 15, color: '#0F172A' },
  modernChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  modernChipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  modernChipTxt: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  modernChipTxtActive: { color: '#3B82F6' },
  modernImagePicker: { height: 160, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  modernImagePlaceholder: { alignItems: 'center' },
  modernImagePlaceholderTxt: { fontSize: 14, color: '#64748B', marginTop: 8, fontWeight: '500' },
  modernPreviewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bottomSheetActions: { flexDirection: 'row', marginTop: 10 },
  modernSaveBtn: { backgroundColor: '#3B82F6', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center' },
  modernSaveBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  formDialog: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, maxHeight: '85%' },
  formDialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  formDialogTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  formScroll: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 12, marginTop: 8 },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputGroup: { flex: 1 },
  divider: { marginVertical: 16, backgroundColor: '#E2E8F0' },
  chipRow: { flexDirection: 'row', marginBottom: 12 },
  catChip: { marginRight: 8, backgroundColor: '#F1F5F9' },
  subLabel: { fontSize: 13, color: '#64748B', marginBottom: 8, fontWeight: '500' },
  copyBtn: { position: 'absolute', right: 12, top: 20, padding: 4 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  emojiBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  emojiBtnActive: { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#3B82F6' },
  imagePicker: { width: '100%', height: 160, borderRadius: 12, backgroundColor: '#F1F5F9', overflow: 'hidden', marginBottom: 16 },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  favToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', padding: 12, backgroundColor: '#FEF2F2', borderRadius: 100, marginBottom: 16 },
  formDialogActions: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  crosshairContainer: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -40 }], alignItems: 'center', zIndex: 10 },
  crosshairText: { position: 'absolute', top: 50, backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontSize: 12, overflow: 'hidden', width: 200, textAlign: 'center' },

  // New styles for Map controls & markers
  mapControls: { position: 'absolute', right: 16, gap: 12, alignItems: 'center' },
  controlBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  markerImage: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#fff' },
  markerSelected: { transform: [{ scale: 1.2 }] },
  markerTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff', marginTop: -2 },
  summaryCard: { padding: 24, paddingBottom: 40 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 16 },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginTop: 8 },
  summaryLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },
});
