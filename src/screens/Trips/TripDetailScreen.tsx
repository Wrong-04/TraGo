import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, Dimensions, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';

import { Text, useTheme, IconButton, Button, Portal, Modal, TextInput as PaperTextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Share2, MapPin, Navigation, DollarSign, BookOpen, Clock, Settings, Trash2 } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../features/store';
import { fetchTripDetailData, clearTripDetail } from '../../features/trips/tripDetailSlice';
import { TripActivity, TripDay } from '../../features/trips/tripsSlice';
import { fetchTrips } from '../../features/trips/tripsSlice';
import { fetchGallery } from '../../features/gallery/gallerySlice';
import { translations } from '../../constants/translations';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Maximize2 } from 'lucide-react-native';
import { generateExpenseAdvice, generateWeatherAdvice, generateJournalAdvice } from '../../config/gemini';
import { Sparkles, Plus } from 'lucide-react-native';
import { supabase } from '../../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

const { width } = Dimensions.get('window');

export default function TripDetailScreen({ navigation, route }: any) {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  
  const trip = route.params?.trip;
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const { locations, gallery, journals, expenses, isLoading } = useSelector((state: RootState) => state.tripDetail);
  const texts = translations[settings.language].tripDetail;
  const tripTexts = translations[settings.language].trips;

  useEffect(() => {
    if (trip?.id) {
      dispatch(fetchTripDetailData(trip.id));
    }
    return () => {
      dispatch(clearTripDetail());
    };
  }, [dispatch, trip?.id]);

  useEffect(() => {
    setItineraryData(Array.isArray(trip?.itinerary) ? trip.itinerary : []);
  }, [trip?.id, trip?.itinerary]);

  const persistItinerary = async (nextItinerary: TripDay[]) => {
    if (!trip?.id) return;

    const totalCostFromItinerary = nextItinerary.reduce((sum, day) => {
      const dayCost = Number((day as any)?.estimatedCost || 0);
      if (dayCost > 0) return sum + dayCost;
      return sum + (day.activities || []).reduce((aSum, act) => aSum + Number((act as any)?.estimatedCost || 0), 0);
    }, 0);

    await supabase
      .from('trips')
      .update({ itinerary: nextItinerary, total_cost: totalCostFromItinerary })
      .eq('id', trip.id);
  };

  const handleAddItineraryItem = async () => {
    const dayNumber = Math.max(1, parseInt(newItemDay || '1', 10));
    if (!newItemDescription.trim() || !newItemLocation.trim()) return;

    const next = [...itineraryData];
    const targetIndex = next.findIndex((d) => d.day === dayNumber);
    const newActivity: TripActivity = {
      time: newItemTime || '08:30',
      location: newItemLocation.trim(),
      description: newItemDescription.trim(),
      estimatedCost: Math.max(0, parseInt(newItemCost.replace(/\D/g, '') || '0', 10)),
    };

    if (targetIndex >= 0) {
      const currentActivities = Array.isArray(next[targetIndex].activities) ? next[targetIndex].activities : [];
      next[targetIndex] = {
        ...next[targetIndex],
        activities: [...currentActivities, newActivity],
      };
    } else {
      next.push({
        day: dayNumber,
        theme: `Lịch trình người dùng tạo - Ngày ${dayNumber}`,
        activities: [newActivity],
      });
    }

    next.sort((a, b) => a.day - b.day);
    setSavingItinerary(true);
    try {
      await persistItinerary(next);
      setItineraryData(next);
      setItineraryModalVisible(false);
      setNewItemDay('1');
      setNewItemTime('08:30');
      setNewItemLocation('');
      setNewItemDescription('');
      setNewItemCost('');
      dispatch(fetchTrips(user?.uid));
    } finally {
      setSavingItinerary(false);
    }
  };

  const handleDeleteItineraryActivity = async (day: number, activityIndex: number) => {
    const next = itineraryData
      .map((d) => {
        if (d.day !== day) return d;
        const acts = (d.activities || []).filter((_, idx) => idx !== activityIndex);
        return { ...d, activities: acts };
      })
      .filter((d) => (d.activities || []).length > 0);

    setSavingItinerary(true);
    try {
      await persistItinerary(next);
      setItineraryData(next);
      dispatch(fetchTrips(user?.uid));
    } finally {
      setSavingItinerary(false);
    }
  };

  const handleDeleteItineraryDay = async (day: number) => {
    const next = itineraryData.filter((d) => d.day !== day);
    setSavingItinerary(true);
    try {
      await persistItinerary(next);
      setItineraryData(next);
      dispatch(fetchTrips(user?.uid));
    } finally {
      setSavingItinerary(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'expenses' | 'journal'>('itinerary');
  const [expenseAdvice, setExpenseAdvice] = useState('');
  const [loadingExpenseAI, setLoadingExpenseAI] = useState(false);
  const [weatherAdvice, setWeatherAdvice] = useState<string | null>(null);
  const [loadingWeatherAI, setLoadingWeatherAI] = useState(false);
  const [itineraryData, setItineraryData] = useState<TripDay[]>(Array.isArray(trip?.itinerary) ? trip.itinerary : []);
  const [itineraryModalVisible, setItineraryModalVisible] = useState(false);
  const [newItemDay, setNewItemDay] = useState('1');
  const [newItemTime, setNewItemTime] = useState('08:30');
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [savingItinerary, setSavingItinerary] = useState(false);

  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);

  const handleAddExpense = async () => {
    if (!expenseAmount || !expenseCategory) return;
    setAddingExpense(true);
    try {
      const amountNum = parseInt(expenseAmount.replace(/\D/g, ''));
      if (isNaN(amountNum)) throw new Error('Số tiền không hợp lệ');

      const newExpense = {
        trip_id: trip.id,
        amount: amountNum,
        name: expenseCategory,
        expense_date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase.from('trip_expenses').insert([newExpense]);
      if (error) throw error;
      
      setExpenseModalVisible(false);
      setExpenseAmount('');
      setExpenseCategory('');
      dispatch(fetchTripDetailData(trip.id));
    } catch (e: any) {
      console.log('Error adding expense:', e);
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    Alert.alert('Xóa khoản chi', 'Bạn có chắc chắn muốn xóa khoản chi này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('trip_expenses').delete().eq('id', expenseId);
            if (error) throw error;
            dispatch(fetchTripDetailData(trip.id));
          } catch (e) {
            console.log('Error deleting expense:', e);
          }
        }
      }
    ]);
  };

  const handleExpenseAdvisor = async () => {
    setLoadingExpenseAI(true);
    const advice = await generateExpenseAdvice(trip.budget || 0, expenses);
    setExpenseAdvice(advice);
    setLoadingExpenseAI(false);
  };

  const handleWeatherAdvisor = async () => {
    setLoadingWeatherAI(true);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${trip.city || 'Hanoi'}&count=1`);
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) throw new Error('Location not found');
      const { latitude, longitude } = geoData.results[0];
      
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
      const weatherData = await weatherRes.json();

      const advice = await generateWeatherAdvice(trip.city, weatherData.current_weather);
      setWeatherAdvice(advice);
    } catch (e) {
      setWeatherAdvice(texts.aiWeatherError);
    } finally {
      setLoadingWeatherAI(false);
    }
  };


  const mapRef = React.useRef<any>(null);

  const [loadingJournalAI, setLoadingJournalAI] = useState(false);
  const handleJournalAdvisor = async () => {
    setLoadingJournalAI(true);
    const aiDestinations = itineraryData.flatMap((day: TripDay) => (day.activities ?? []).map((activity: TripActivity) => activity.location || activity.description).filter(Boolean));
    const locNames = locations.map(l => l.name);
    const allPlaces = Array.from(new Set([...aiDestinations, ...locNames])).join(', ');
    
    try {
      const response = await generateJournalAdvice(trip.city || trip.title, allPlaces);
      const newJournal = {
        trip_id: trip.id,
        content: response,
        title: `Nhật ký ngày ${new Date().toLocaleDateString('vi-VN')}`,
      };
      await supabase.from('journals').insert([newJournal]);
      dispatch(fetchTripDetailData(trip.id));
    } catch (e) {
      console.log('Error journal AI', e);
    } finally {
      setLoadingJournalAI(false);
    }
  };

  const [journalModalVisible, setJournalModalVisible] = useState(false);
  const [journalContent, setJournalContent] = useState('');
  const [addingJournal, setAddingJournal] = useState(false);

  const handleAddJournal = async () => {
    if (!journalContent.trim()) return;
    setAddingJournal(true);
    try {
      const newJournal = {
        trip_id: trip.id,
        content: journalContent.trim(),
        title: `Nhật ký ngày ${new Date().toLocaleDateString('vi-VN')}`,
      };
      const { error } = await supabase.from('journals').insert([newJournal]);
      if (error) throw error;
      setJournalModalVisible(false);
      setJournalContent('');
      dispatch(fetchTripDetailData(trip.id));
    } catch (e) {
      console.log('Error adding journal:', e);
    } finally {
      setAddingJournal(false);
    }
  };

  const handleDeleteJournal = async (journalId: string) => {
    Alert.alert('Xóa nhật ký', 'Bạn có chắc chắn muốn xóa mục nhật ký này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('journals').delete().eq('id', journalId);
            if (error) throw error;
            dispatch(fetchTripDetailData(trip.id));
          } catch (e) {
            console.log('Error deleting journal:', e);
          }
        }
      }
    ]);
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const handleDeleteLocation = async (locationId: string) => {
    Alert.alert('Xóa địa điểm', 'Bạn có chắc chắn muốn xóa địa điểm này khỏi hành trình?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('trip_locations').delete().eq('id', locationId);
            if (error) throw error;
            
            const remainingLocations = locations.filter(loc => loc.id !== locationId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            
            for (let i = 0; i < remainingLocations.length; i++) {
              const loc = remainingLocations[i];
              let newDist = null;
              let newTime = loc.travel_time_minutes;
              
              if (i === 0) {
                newDist = null;
                newTime = null;
              } else {
                const prevLoc = remainingLocations[i - 1];
                if (loc.latitude && loc.longitude && prevLoc.latitude && prevLoc.longitude) {
                  newDist = getDistanceFromLatLonInKm(prevLoc.latitude, prevLoc.longitude, loc.latitude, loc.longitude);
                }
              }

              await supabase.from('trip_locations').update({
                order_index: i,
                distance_from_previous: newDist,
                travel_time_minutes: newTime
              }).eq('id', loc.id);
            }

            dispatch(fetchTripDetailData(trip.id));
          } catch (e) {
            console.log('Error deleting location:', e);
          }
        }
      }
    ]);
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSourceModalVisible, setPhotoSourceModalVisible] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const getStoragePathFromUrl = (url?: string) => {
    if (!url) return null;

    const marker = '/storage/v1/object/public/trago-images/';
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return null;

    const rawPath = url.slice(markerIndex + marker.length);
    return rawPath ? decodeURIComponent(rawPath) : null;
  };

  const uploadTripPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user?.uid) return;

    setUploadingPhoto(true);
    try {
      let finalUrl = asset.uri;
      if (asset.base64) {
        const dotIndex = asset.uri.lastIndexOf('.');
        const ext = dotIndex >= 0 ? asset.uri.substring(dotIndex + 1) : 'jpg';
        const fileName = `${user.uid}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('trago-images')
          .upload(fileName, decode(asset.base64), { contentType: `image/${ext}` });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('trago-images').getPublicUrl(fileName);
        finalUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase.from('gallery').insert([{
        trip_id: trip.id,
        user_id: user.uid,
        url: finalUrl,
      }]);
      if (dbError) throw dbError;
      dispatch(fetchTripDetailData(trip.id));
      dispatch(fetchGallery(user.uid));
    } catch (error) {
      console.log('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openPhotoPicker = async (source: 'camera' | 'library') => {
    setPhotoSourceModalVisible(false);

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    };

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled) {
      await uploadTripPhoto(result.assets[0]);
    }
  };

  const handleAddPhoto = () => {
    setPhotoSourceModalVisible(true);
  };

  const deleteTripPhoto = async (photo: any) => {
    if (!user?.uid || !photo?.id) return;

    setDeletingPhotoId(photo.id);
    try {
      const storagePath = getStoragePathFromUrl(photo.image || photo.url);
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from('trago-images').remove([storagePath]);
        if (storageError) {
          console.log('Storage delete warning:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('gallery')
        .delete()
        .eq('id', photo.id)
        .eq('user_id', user.uid);

      if (dbError) throw dbError;

      dispatch(fetchTripDetailData(trip.id));
      dispatch(fetchGallery(user.uid));
    } catch (error) {
      console.log('Error deleting photo:', error);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleDeletePhoto = (photo: any) => {
    Alert.alert('Xóa ảnh', 'Bạn có chắc chắn muốn xóa ảnh này khỏi chuyến đi và thư viện?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteTripPhoto(photo),
      },
    ]);
  };
  
  const today = new Date();
  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);
  const totalDays = Math.max(1, Math.ceil((tripEnd.getTime() - tripStart.getTime()) / 86400000));
  const daysPassed = Math.max(0, Math.ceil((today.getTime() - tripStart.getTime()) / 86400000));
  const progressPct = Math.min(100, Math.round((daysPassed / totalDays) * 100));

  const hasItinerary = Array.isArray(itineraryData) && itineraryData.length > 0;
  const hasLocations = locations.length > 0;
  const hasExpenses = expenses.length > 0;
  const hasJournals = journals.length > 0;
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_HEIGHT = 360;
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, HEADER_HEIGHT],
    outputRange: [-50, 0, HEADER_HEIGHT * 0.5],
    extrapolate: 'clamp',
  });
  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.5, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  const miniMapCoords = React.useMemo(() => {
    const coords: {latitude: number; longitude: number; name: string}[] = [];
    if (hasItinerary) {
      (itineraryData as any[]).forEach((day: any) => {
        (day.activities || []).forEach((act: any) => {
          if (act.latitude && act.longitude) {
            coords.push({ latitude: act.latitude, longitude: act.longitude, name: act.location || act.description });
          }
        });
      });
    }
    locations.forEach(loc => {
      if (loc.latitude && loc.longitude) {
        coords.push({ latitude: loc.latitude, longitude: loc.longitude, name: loc.name });
      }
    });
    return coords;
  }, [itineraryData, locations, hasItinerary]);

  const miniMapRegion = React.useMemo(() => {
    if (miniMapCoords.length === 0) return { latitude: 16.0544, longitude: 108.2022, latitudeDelta: 2, longitudeDelta: 2 };
    const lats = miniMapCoords.map(c => c.latitude);
    const lngs = miniMapCoords.map(c => c.longitude);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.4),
    };
  }, [miniMapCoords]);

  if (!trip) return null;

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const estimatedBudget = trip.totalCost || trip.budget || 0;
  
  const formatter = new Intl.NumberFormat(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
  });
  const formattedBudget = formatter.format(estimatedBudget);
  const formattedExpenses = formatter.format(totalExpenses);
  const distanceValue = (trip.totalDistance || 0) * (settings.distanceUnit === 'Miles' ? 0.621371 : 1);
  const distanceUnit = settings.distanceUnit === 'Miles' ? translations[settings.language].common.miles : translations[settings.language].common.kilometers;
  const aiDestinations = itineraryData.flatMap((day: TripDay) => (day.activities ?? []).map((activity: TripActivity) => activity.location || activity.description).filter(Boolean));
  const uniqueDestinations = Array.from(new Set(aiDestinations));
  const destinationText = uniqueDestinations.length > 0
    ? uniqueDestinations.join(', ')
    : locations.map(loc => loc.name).filter(Boolean).join(', ');

  const renderTab = (key: typeof activeTab, label: string, IconComponent: any) => {
    const isActive = activeTab === key;
    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => setActiveTab(key)} 
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
      >
        <IconComponent color={isActive ? '#FFFFFF' : '#64748B'} size={18} />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'Planning':
        return tripTexts.statusPlanning;
      case 'Ongoing':
        return tripTexts.statusOngoing;
      case 'Completed':
        return tripTexts.statusCompleted;
      case 'Upcoming':
      default:
        return tripTexts.statusUpcoming;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <Animated.Image 
        source={{ uri: trip.coverImage || 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800' }} 
        style={[styles.headerImage, { position: 'absolute', top: 0, left: 0, right: 0, transform: [{ translateY: imageTranslateY }, { scale: imageScale }] }]} 
      />
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <View style={{ height: HEADER_HEIGHT }}>
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.headerOverlay}
          >
            <View style={[styles.appBar, { paddingTop: insets.top }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <IconButton icon="arrow-left" iconColor="#fff" size={24} style={{ margin: 0 }} />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.iconBtn}>
                <Share2 color="#fff" size={20} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerTitleContainer}>
              <View style={[styles.statusBadge, { backgroundColor: 
                trip.status === 'Completed' ? 'rgba(100,116,139,0.7)' : 
                trip.status === 'Ongoing' ? 'rgba(16,185,129,0.7)' : 
                trip.status === 'Planning' ? 'rgba(245,158,11,0.7)' :
                'rgba(59,130,246,0.7)' 
              }]}>
                <Text style={styles.statusText}>{getStatusLabel(trip.status)}</Text>
              </View>
              <Text variant="headlineMedium" style={styles.headerTitle} numberOfLines={2}>
                {trip.title}
              </Text>
              <View style={styles.dateRow}>
                <Calendar color="rgba(255,255,255,0.8)" size={16} />
                <Text style={styles.dateText}>{trip.startDate} - {trip.endDate}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{distanceValue.toFixed(settings.distanceUnit === 'Miles' ? 1 : 0)}</Text>
              <Text style={styles.statLabel}>{distanceUnit}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{destinationText ? destinationText.split(',').length : locations.length}</Text>
              <Text style={styles.statLabel}>Điểm đến</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{gallery.length}</Text>
              <Text style={styles.statLabel}>Ảnh</Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Tiến độ chuyến đi</Text>
              <Text style={styles.progressPct}>{progressPct}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressHint}>
              {progressPct === 0 ? 'Chưa bắt đầu · Còn ' + totalDays + ' ngày' :
               progressPct === 100 ? '✅ Đã hoàn thành chuyến đi!' :
               'Ngày ' + daysPassed + '/' + totalDays + ' · Đang diễn ra'}
            </Text>
          </View>

          <View style={styles.costCard}>
            <View style={styles.costIconBox}>
              <DollarSign color="#10B981" size={24} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.costTitle}>Ngân sách / Dự kiến</Text>
                <Text style={[styles.costValue, { fontSize: 15 }]}>{formattedBudget}</Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginVertical: 8 }}>
                <View style={{ height: '100%', width: `${Math.min((totalExpenses / (estimatedBudget || 1)) * 100, 100)}%`, backgroundColor: totalExpenses > estimatedBudget ? '#EF4444' : '#10B981', borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.costTitle}>Thực tế đã chi</Text>
                <Text style={[styles.costValue, { fontSize: 15, color: totalExpenses > estimatedBudget ? '#EF4444' : '#10B981' }]}>{formattedExpenses}</Text>
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
            {renderTab('itinerary', texts.itinerary, Navigation)}
            {renderTab('expenses', texts.expenses, DollarSign)}
            {renderTab('map', texts.map, MapPin)}
            {renderTab('journal', texts.journal, BookOpen)}
          </ScrollView>

          {isLoading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.tabContent}>
              {activeTab === 'itinerary' && (
                <View>
                  <View style={styles.itineraryHeaderRow}>
                    <Text style={styles.itineraryHeaderTitle}>📌 Chi tiết lịch trình</Text>
                    <TouchableOpacity style={styles.itineraryAddBtn} onPress={() => setItineraryModalVisible(true)} activeOpacity={0.8}>
                      <Plus color="#4F46E5" size={14} />
                      <Text style={styles.itineraryAddBtnText}>Thêm lịch trình</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.aiAdvisorBox}>
                    <Text style={styles.aiAdvisorTitle}>{texts.aiWeatherTitle}</Text>
                    {weatherAdvice ? (
                      <Text style={styles.aiAdvisorText}>{weatherAdvice}</Text>
                    ) : (
                      <Button 
                        mode="contained-tonal" 
                        onPress={handleWeatherAdvisor}
                        loading={loadingWeatherAI}
                        disabled={loadingWeatherAI}
                        icon={() => <Sparkles size={18} color="#4F46E5" />}
                        style={styles.aiButton}
                      >
                        {loadingWeatherAI ? texts.aiWeatherLoading : texts.aiWeatherButton}
                      </Button>
                    )}
                  </View>
                  {hasItinerary ? (
                    itineraryData.map((day: TripDay, index: number) => (
                      <View key={`day-${index}`} style={styles.dayBlock}>
                        <View style={styles.dayHeaderRow}>
                          <View style={styles.dayHeader}>
                            <Text style={styles.dayTitle}>Ngày {day.day}</Text>
                          </View>
                          <TouchableOpacity style={styles.itineraryDeleteDayBtn} onPress={() => handleDeleteItineraryDay(day.day)}>
                            <Trash2 color="#EF4444" size={16} />
                            <Text style={styles.itineraryDeleteDayText}>Xóa ngày</Text>
                          </TouchableOpacity>
                        </View>
                        {(day.activities ?? []).map((activity: TripActivity, actIdx: number) => (
                          <View key={actIdx} style={styles.activityRow}>
                            <View style={styles.activityTimeCol}>
                              <Text style={styles.activityTime}>{activity.time}</Text>
                            </View>
                            <View style={styles.activityContentCol}>
                              <Text style={styles.activityDescription}>{activity.description}</Text>
                              {activity.location ? (
                                <View style={styles.activityLocationRow}>
                                  <MapPin color="#64748B" size={14} />
                                  <Text style={styles.activityLocation}>{activity.location}</Text>
                                </View>
                              ) : null}
                            </View>
                            <TouchableOpacity
                              style={styles.deleteActivityBtn}
                              onPress={() => handleDeleteItineraryActivity(day.day, actIdx)}
                            >
                              <Trash2 color="#EF4444" size={16} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>{texts.noLocationsText}</Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'map' && (
                <View>
                  <View style={styles.mapHeaderActionRow}>
                    <Text style={styles.itineraryHeaderTitle}>🗺 Bản đồ hành trình</Text>
                    <TouchableOpacity
                      style={styles.itineraryAddBtn}
                      onPress={() => navigation.navigate('MainTabs', { screen: 'MapTab', params: { trip, openAdd: true } })}
                      activeOpacity={0.8}
                    >
                      <Plus color="#4F46E5" size={14} />
                      <Text style={styles.itineraryAddBtnText}>Thêm tọa độ</Text>
                    </TouchableOpacity>
                  </View>

                  {miniMapCoords.length > 0 ? (
                    <View style={styles.miniMapContainer}>
                      <MapView
                        ref={mapRef}
                        style={styles.miniMap}
                        region={miniMapRegion}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        pointerEvents="none"
                      >
                        <Polyline
                          coordinates={miniMapCoords}
                          strokeColor="#4F46E5"
                          strokeWidth={3}
                          lineDashPattern={[1]}
                        />
                        {miniMapCoords.map((coord, idx) => (
                          <Marker
                            key={idx}
                            coordinate={{ latitude: coord.latitude, longitude: coord.longitude }}
                            title={coord.name}
                            pinColor={idx === 0 ? '#10B981' : idx === miniMapCoords.length - 1 ? '#EF4444' : '#F59E0B'}
                          />
                        ))}
                      </MapView>
                      <TouchableOpacity
                        style={styles.expandMapBtn}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('MainTabs', { screen: 'MapTab', params: { trip } })}
                      >
                        <Maximize2 color="#fff" size={16} />
                        <Text style={styles.expandMapText}>Mở rộng bản đồ</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Chưa có tọa độ địa điểm nào</Text>
                    </View>
                  )}

                  <View style={styles.timelineContainer}>
                    {hasLocations ? (
                      locations.map((loc, index) => (
                        <View key={loc.id} style={styles.timelineItem}>
                          <View style={styles.timelineIconWrapper}>
                            <View style={[styles.timelineDot, { backgroundColor: index === 0 ? '#4F46E5' : '#94A3B8' }]} />
                          </View>
                          {index < locations.length - 1 && <View style={styles.timelineLine} />}
                          <View style={styles.timelineCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.timelineDate}>{loc.visit_date || `Điểm ${index + 1}`}</Text>
                                <Text style={styles.timelineName}>{loc.name}</Text>
                                {loc.address ? <Text style={styles.timelineAddress}>{loc.address}</Text> : null}
                              </View>
                              <TouchableOpacity onPress={() => handleDeleteLocation(loc.id)} style={{ padding: 4, marginLeft: 8 }}>
                                <Trash2 color="#EF4444" size={16} />
                              </TouchableOpacity>
                            </View>
                            {(loc.distance_from_previous || loc.travel_time_minutes) ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                                {loc.distance_from_previous ? (
                                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>🚗 {(loc.distance_from_previous * (settings.distanceUnit === 'Miles' ? 0.621371 : 1)).toFixed(1)} {distanceUnit}</Text>
                                ) : null}
                                {loc.travel_time_minutes ? (
                                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>⏳ {Math.round(loc.travel_time_minutes)} phút</Text>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))
                    ) : null}
                  </View>
                </View>
              )}

              {activeTab === 'expenses' && (
                <View style={styles.expenseSection}>
                  <View style={styles.aiAdvisorBox}>
                    <Text style={styles.aiAdvisorTitle}>{texts.aiExpenseTitle}</Text>
                    {expenseAdvice ? (
                      <Text style={styles.aiAdvisorText}>{expenseAdvice}</Text>
                    ) : (
                      <Button 
                        mode="contained-tonal" 
                        onPress={handleExpenseAdvisor}
                        loading={loadingExpenseAI}
                        disabled={loadingExpenseAI}
                        icon={() => <Sparkles size={18} color="#10B981" />}
                        style={styles.aiButton}
                      >
                        {loadingExpenseAI ? texts.aiExpenseLoading : texts.aiExpenseButton}
                      </Button>
                    )}
                  </View>

                  <View style={styles.expenseSectionHeader}>
                    <Text style={styles.expenseSectionTitle}>Danh sách chi tiêu</Text>
                    <TouchableOpacity style={styles.expenseAddBtn} onPress={() => setExpenseModalVisible(true)} activeOpacity={0.8}>
                      <Plus color="#10B981" size={14} />
                      <Text style={styles.expenseAddBtnText}>Thêm chi tiêu</Text>
                    </TouchableOpacity>
                  </View>

                  {hasExpenses ? (
                    expenses.map(exp => (
                      <View key={exp.id} style={styles.expenseItem}>
                        <View style={styles.expenseIcon}>
                          <DollarSign color="#10B981" size={20} />
                        </View>
                        <Text style={styles.expenseName}>{exp.name || exp.category || 'Khoản chi'}</Text>
                        <Text style={styles.expenseAmount}>{new Intl.NumberFormat(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
                          style: 'currency', currency: 'VND'
                        }).format(exp.amount || 0)}</Text>
                        <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => handleDeleteExpense(exp.id)}>
                          <Trash2 color="#EF4444" size={18} />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>{texts.noExpenses}</Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'journal' && (
                <View style={styles.journalSection}>
                  <View style={styles.journalSectionHeader}>
                    <Text style={styles.journalSectionTitle}>📓 Nhật ký chuyến đi</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[styles.journalAddBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setJournalModalVisible(true)} activeOpacity={0.8}>
                        <Plus color="#4F46E5" size={14} />
                        <Text style={[styles.journalAddBtnText, { color: '#4F46E5' }]}>Viết tay</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.journalAddBtn} onPress={handleJournalAdvisor} activeOpacity={0.8}>
                        {loadingJournalAI ? <ActivityIndicator size={14} color="#8B5CF6" /> : <Sparkles color="#8B5CF6" size={14} />}
                        <Text style={styles.journalAddBtnText}>{loadingJournalAI ? 'Đang viết...' : 'AI viết nhật ký'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {hasJournals ? (
                    journals.map(journal => (
                      <View key={journal.id} style={styles.journalCard}>
                        <View style={styles.journalHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Clock color="#94A3B8" size={14} />
                            <Text style={styles.journalDate}>{new Date(journal.created_at).toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US')}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteJournal(journal.id)} style={{ padding: 4 }}>
                            <Trash2 color="#EF4444" size={16} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.journalText}>{journal.content || 'Không có nội dung'}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>{texts.noJournal}</Text>
                    </View>
                  )}

                  <View style={[styles.journalSectionHeader, { marginTop: 24 }]}>
                    <Text style={styles.journalSectionTitle}>🖼 Ảnh chuyến đi</Text>
                    <TouchableOpacity 
                      style={styles.journalAddBtn}
                      onPress={handleAddPhoto}
                      activeOpacity={0.8}
                    >
                      {uploadingPhoto ? <ActivityIndicator size={14} color="#10B981" /> : <Plus color="#10B981" size={14} />}
                      <Text style={[styles.journalAddBtnText, { color: '#10B981' }]}>{uploadingPhoto ? 'Đang tải...' : 'Thêm ảnh'}</Text>
                    </TouchableOpacity>
                  </View>
                  {gallery.length > 0 ? (
                    <View style={styles.photoGrid}>
                      {gallery.map((photo: any, idx: number) => (
                        <TouchableOpacity
                          key={photo.id || idx}
                          style={styles.photoGridItem}
                          activeOpacity={0.85}
                          onPress={() => navigation.navigate('PhotoDescription', { imageUri: photo.image || photo.url })}
                        >
                          <Image
                            source={{ uri: photo.image || photo.url }}
                            style={styles.photoGridImg}
                          />
                          <TouchableOpacity
                            style={styles.photoDeleteBtn}
                            onPress={() => handleDeletePhoto(photo)}
                            activeOpacity={0.85}
                            disabled={deletingPhotoId === photo.id}
                          >
                            {deletingPhotoId === photo.id ? (
                              <ActivityIndicator size={12} color="#fff" />
                            ) : (
                              <Trash2 color="#fff" size={14} />
                            )}
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Chưa có ảnh nào trong chuyến đi này</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={styles.editButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddTrip', { trip })}
          >
            <Settings color="#4F46E5" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.editButtonText}>{texts.editTrip}</Text>
          </TouchableOpacity>

        </View>
      </Animated.ScrollView>

      <Portal>
        <Modal
          visible={expenseModalVisible}
          onDismiss={() => setExpenseModalVisible(false)}
          contentContainerStyle={styles.expenseModal}
        >
          <Text style={styles.expenseModalTitle}>Thêm khoản chi mới</Text>
          <PaperTextInput
            mode="outlined"
            label="Tên khoản chi (VD: Ăn sáng, Taxi)"
            value={expenseCategory}
            onChangeText={setExpenseCategory}
            style={styles.expenseInput}
            outlineColor="#E2E8F0"
            activeOutlineColor="#10B981"
            theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
            autoCorrect={false}
            spellCheck={false}
          />
          <PaperTextInput
            mode="outlined"
            label="Số tiền (VND)"
            value={expenseAmount}
            onChangeText={(text) => {
              const numericValue = text.replace(/[^0-9]/g, '');
              const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
              setExpenseAmount(formattedValue);
            }}
            keyboardType="numeric"
            style={styles.expenseInput}
            outlineColor="#E2E8F0"
            activeOutlineColor="#10B981"
            theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
            autoCorrect={false}
            spellCheck={false}
          />
          <View style={styles.expenseModalActions}>
            <Button mode="text" onPress={() => setExpenseModalVisible(false)} textColor="#64748B" style={{ flex: 1 }}>Hủy</Button>
            <Button mode="contained" onPress={handleAddExpense} loading={addingExpense} disabled={addingExpense} buttonColor="#10B981" style={{ flex: 1, borderRadius: 12 }}>Lưu</Button>
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={journalModalVisible}
          onDismiss={() => setJournalModalVisible(false)}
          contentContainerStyle={styles.expenseModal}
        >
          <Text style={styles.expenseModalTitle}>Viết nhật ký</Text>
          <PaperTextInput
            mode="outlined"
            label="Cảm nghĩ, kỷ niệm về chuyến đi..."
            value={journalContent}
            onChangeText={setJournalContent}
            style={[styles.expenseInput, { height: 120 }]}
            multiline
            numberOfLines={4}
            outlineColor="#E2E8F0"
            activeOutlineColor="#8B5CF6"
            theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
          />
          <View style={styles.expenseModalActions}>
            <Button mode="text" onPress={() => setJournalModalVisible(false)} textColor="#64748B" style={{ flex: 1 }}>Hủy</Button>
            <Button mode="contained" onPress={handleAddJournal} loading={addingJournal} disabled={addingJournal} buttonColor="#8B5CF6" style={{ flex: 1, borderRadius: 12 }}>Lưu</Button>
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={itineraryModalVisible}
          onDismiss={() => setItineraryModalVisible(false)}
          contentContainerStyle={styles.expenseModal}
        >
          <Text style={styles.expenseModalTitle}>Thêm lịch trình thủ công</Text>
          <PaperTextInput
            mode="outlined"
            label="Ngày"
            value={newItemDay}
            onChangeText={setNewItemDay}
            keyboardType="number-pad"
            style={styles.expenseInput}
            outlineColor="#E2E8F0"
            activeOutlineColor="#4F46E5"
            theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
            autoCorrect={false}
            spellCheck={false}
          />
          <PaperTextInput
            mode="outlined"
            label="Giờ (VD: 09:00)"
            value={newItemTime}
            onChangeText={setNewItemTime}
            style={styles.expenseInput}
            outlineColor="#E2E8F0"
            activeOutlineColor="#4F46E5"
            theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
            autoCorrect={false}
            spellCheck={false}
          />
          <PaperTextInput
            mode="outlined"
            label="Tên địa danh"
            value={newItemLocation}
            onChangeText={setNewItemLocation}
            style={styles.expenseInput}
            outlineColor="#E2E8F0"
            activeOutlineColor="#4F46E5"
            theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
            autoCorrect={false}
            spellCheck={false}
          />
          <PaperTextInput
            mode="outlined"
            label="Mô tả hoạt động"
            value={newItemDescription}
            onChangeText={setNewItemDescription}
            style={styles.expenseInput}
            outlineColor="#E2E8F0"
            activeOutlineColor="#4F46E5"
            theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
            autoCorrect={false}
            spellCheck={false}
          />
          <PaperTextInput
            mode="outlined"
            label="Chi phí dự kiến (VND)"
            value={newItemCost}
            onChangeText={setNewItemCost}
            keyboardType="numeric"
            style={styles.expenseInput}
            outlineColor="#E2E8F0"
            activeOutlineColor="#4F46E5"
            theme={{ roundness: 12, colors: { background: '#F8FAFC' } }}
            autoCorrect={false}
            spellCheck={false}
          />
          <View style={styles.expenseModalActions}>
            <Button mode="text" onPress={() => setItineraryModalVisible(false)} textColor="#64748B" style={{ flex: 1 }}>Hủy</Button>
            <Button mode="contained" onPress={handleAddItineraryItem} loading={savingItinerary} disabled={savingItinerary} buttonColor="#4F46E5" style={{ flex: 1, borderRadius: 12 }}>Lưu</Button>
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={photoSourceModalVisible}
          onDismiss={() => setPhotoSourceModalVisible(false)}
          contentContainerStyle={styles.expenseModal}
        >
          <Text style={styles.expenseModalTitle}>Thêm ảnh chuyến đi</Text>
          <TouchableOpacity style={styles.photoSourceOption} activeOpacity={0.8} onPress={() => openPhotoPicker('camera')}>
            <Text style={styles.photoSourceOptionTitle}>Chụp ảnh bằng camera</Text>
            <Text style={styles.photoSourceOptionText}>Mở camera để chụp khoảnh khắc mới</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoSourceOption} activeOpacity={0.8} onPress={() => openPhotoPicker('library')}>
            <Text style={styles.photoSourceOptionTitle}>Chọn từ thư viện</Text>
            <Text style={styles.photoSourceOptionText}>Thêm ảnh đã có trong máy vào chuyến đi</Text>
          </TouchableOpacity>
          <View style={styles.expenseModalActions}>
            <Button mode="text" onPress={() => setPhotoSourceModalVisible(false)} textColor="#64748B" style={{ flex: 1 }}>Đóng</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerImage: { width: width, height: 360 },
  headerOverlay: { flex: 1, justifyContent: 'space-between', paddingBottom: 52 },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconBtn: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  headerTitleContainer: { paddingHorizontal: 24 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 28, letterSpacing: -0.5, marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginLeft: 8, fontWeight: '500' },
  content: { 
    flex: 1, 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    backgroundColor: '#F8FAFC', 
    marginTop: -16, 
    paddingTop: 24, 
    paddingHorizontal: 20 
  },
  statsGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  statValue: { fontWeight: '800', fontSize: 20, color: '#0F172A' },
  statLabel: { color: '#64748B', fontSize: 12, marginTop: 4, fontWeight: '500' },
  costCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  costIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center',
  },
  costTitle: { color: '#065F46', fontSize: 13, fontWeight: '600' },
  costValue: { color: '#047857', fontSize: 20, fontWeight: '800', marginTop: 2 },
  tabContainer: { 
    flexDirection: 'row', 
    marginBottom: 24, 
    gap: 12,
    paddingBottom: 4,
  },
  tabButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: { 
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  tabText: { color: '#64748B', fontWeight: '600', marginLeft: 8 },
  tabTextActive: { color: '#FFFFFF' },
  tabContent: { marginBottom: 24 },
  itineraryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mapHeaderActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itineraryHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  itineraryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itineraryAddBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  dayBlock: { marginBottom: 24 },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayHeader: {
    backgroundColor: '#E0E7FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  dayTitle: { fontWeight: 'bold', color: '#4F46E5', fontSize: 14 },
  itineraryDeleteDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  itineraryDeleteDayText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  activityRow: { 
    flexDirection: 'row', 
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  activityTimeCol: { width: 64 },
  activityTime: { color: '#4F46E5', fontSize: 13, fontWeight: '700' },
  activityContentCol: { flex: 1 },
  activityDescription: { color: '#0F172A', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  activityLocationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  activityLocation: { color: '#64748B', fontSize: 13, marginLeft: 4 },
  deleteActivityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 2,
  },
  expenseSection: { gap: 12 },
  expenseItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  expenseIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  expenseName: { flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '600' },
  expenseAmount: { color: '#0F172A', fontWeight: '700', fontSize: 16 },
  journalSection: { gap: 16 },
  journalCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20 },
  journalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  journalDate: { color: '#64748B', fontSize: 13, marginLeft: 6, fontWeight: '500' },
  journalText: { color: '#1E293B', fontSize: 15, lineHeight: 24 },
  timelineContainer: { paddingLeft: 8, marginTop: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 24, position: 'relative' },
  timelineIconWrapper: { width: 24, alignItems: 'center', zIndex: 2 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4, borderWidth: 2, borderColor: '#fff' },
  timelineLine: { position: 'absolute', left: 11, top: 18, bottom: -24, width: 2, backgroundColor: '#E2E8F0', zIndex: 1 },
  timelineCard: { marginLeft: 16, flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16 },
  timelineDate: { color: '#4F46E5', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  timelineName: { color: '#0F172A', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  timelineAddress: { color: '#64748B', fontSize: 13 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { color: '#94A3B8', fontSize: 15 },
  editButton: { 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16, 
    marginBottom: 40, 
    paddingVertical: 16,
    backgroundColor: '#E0E7FF'
  },
  editButtonText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 16,
  },
  aiAdvisorBox: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  aiAdvisorTitle: {
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 8,
  },
  aiAdvisorText: {
    color: '#0C4A6E',
    lineHeight: 22,
    fontSize: 14,
  },
  aiButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  progressPct: { fontSize: 14, fontWeight: '800', color: '#4F46E5' },
  progressBg: {
    height: 8,
    backgroundColor: '#E0E7FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  progressHint: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  miniMapContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  miniMap: { width: '100%', height: '100%' },
  expandMapBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  expandMapText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  journalFab: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  journalFabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  journalFabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  journalSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  journalSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  journalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  journalAddBtnText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoGridImg: {
    width: '100%',
    height: '100%',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  expenseSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  expenseAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  expenseAddBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  expenseModal: {
    backgroundColor: '#fff',
    margin: 24,
    borderRadius: 24,
    padding: 24,
  },
  expenseModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  expenseInput: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    height: 54,
  },
  expenseModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoSourceOption: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoSourceOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  photoSourceOptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
});
