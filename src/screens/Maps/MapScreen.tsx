import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, IconButton, Button, Divider, Portal, Dialog, TextInput, Snackbar, ActivityIndicator } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import { Star, Navigation as NavigationIcon, MapPin, Crosshair, Plus, Minus, Filter, MapPinPlusInside } from 'lucide-react-native';
import { supabase } from '../../config/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Kiểu dữ liệu Location
export interface TripLocation {
  id: string;
  trip_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  visit_date: string;
  review?: string;
  rating?: number;
  distance_from_previous?: number;
  travel_time_minutes?: number;
  image?: string;
  status: 'Completed' | 'Current' | 'Future';
}

export default function MapScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const trip = route.params?.trip; // Lấy từ navigate

  const mapRef = useRef<MapView>(null);

  const [locations, setLocations] = useState<TripLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<TripLocation | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Marker State
  const [addingMarkerMode, setAddingMarkerMode] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newCoordinate, setNewCoordinate] = useState<{latitude: number, longitude: number} | null>(null);
  const [newLocName, setNewLocName] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Lấy dữ liệu từ Supabase
  const loadLocations = async () => {
    if (!trip?.id) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('trip_locations')
        .select('*')
        .eq('trip_id', trip.id)
        .order('visit_date', { ascending: true });
        
      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.log('Error fetching locations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, [trip?.id]);

  const routeCoordinates = locations.map(loc => ({
    latitude: loc.latitude,
    longitude: loc.longitude
  }));

  const totalDistance = locations.reduce((sum, loc) => sum + (loc.distance_from_previous || 0), 0);
  const totalMinutes = locations.reduce((sum, loc) => sum + (loc.travel_time_minutes || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalDays = trip ? Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 3600 * 24)) + 1 : 0;

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#10B981'; // Green
      case 'Current': return '#F59E0B'; // Orange
      case 'Future': return '#3B82F6'; // Blue
      default: return '#3B82F6';
    }
  };

  const handleMapPress = (e: any) => {
    if (addingMarkerMode) {
      setNewCoordinate(e.nativeEvent.coordinate);
      setAddModalVisible(true);
      setAddingMarkerMode(false);
    } else {
      setSelectedLocation(null);
    }
  };

  const handleSaveNewLocation = async () => {
    if (!newLocName || !newCoordinate) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên địa điểm');
      return;
    }
    try {
      const newLoc = {
        trip_id: trip.id,
        name: newLocName,
        latitude: newCoordinate.latitude,
        longitude: newCoordinate.longitude,
        status: 'Future', // Default
        visit_date: new Date().toISOString(),
      };
      const { error } = await supabase.from('trip_locations').insert([newLoc]);
      if (error) throw error;
      
      setAddModalVisible(false);
      setNewLocName('');
      setSnackbarMessage('Đã thêm địa điểm thành công!');
      setSnackbarVisible(true);
      loadLocations(); // Reload Map
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  const zoomIn = () => {
    mapRef.current?.animateCamera({ zoom: 15 }, { duration: 500 });
  };
  const zoomOut = () => {
    mapRef.current?.animateCamera({ zoom: 10 }, { duration: 500 });
  };
  const goToCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền vị trí để sử dụng tính năng này.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      }, 1000);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy được vị trí hiện tại.');
    }
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#3B82F6" /></View>;
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: locations[0]?.latitude || 16.0440,
          longitude: locations[0]?.longitude || 108.1993,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        onPress={handleMapPress}
        showsUserLocation={true}
      >
        {routeCoordinates.map((coord, index) => (
          <Marker 
            key={locations[index].id} 
            coordinate={coord}
            pinColor={getMarkerColor(locations[index].status)}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedLocation(locations[index]);
            }}
          />
        ))}
        {routeCoordinates.length > 1 && (
          <Polyline coordinates={routeCoordinates} strokeColor="#3B82F6" strokeWidth={4} />
        )}
      </MapView>

      {/* Header Overlay */}
      <View style={[styles.headerOverlay, { top: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <NavigationIcon color="#0F172A" size={24} style={{ transform: [{ rotate: '270deg' }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Filter color="#0F172A" size={24} />
        </TouchableOpacity>
      </View>

      {/* Floating Buttons Right */}
      <View style={styles.floatingRight}>
        <TouchableOpacity style={styles.floatingBtn} onPress={goToCurrentLocation}>
          <Crosshair color="#0F172A" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingBtn} onPress={zoomIn}>
          <Plus color="#0F172A" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingBtn} onPress={zoomOut}>
          <Minus color="#0F172A" size={24} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.floatingBtn, addingMarkerMode && { backgroundColor: '#3B82F6' }]} 
          onPress={() => {
            setAddingMarkerMode(!addingMarkerMode);
            if (!addingMarkerMode) setSnackbarMessage('Nhấn vào bản đồ để thêm Marker');
            setSnackbarVisible(true);
          }}
        >
          <MapPinPlusInside color={addingMarkerMode ? '#fff' : '#0F172A'} size={24} />
        </TouchableOpacity>
      </View>

      {/* Bottom Dashboard */}
      {!selectedLocation && (
        <View style={styles.dashboardCard}>
          <View style={styles.dashboardRow}>
            <View style={styles.dashCol}>
              <Text style={styles.dashLabel}>Tổng quãng đường</Text>
              <Text style={styles.dashValue}>{totalDistance.toLocaleString('vi-VN')} km</Text>
            </View>
            <View style={styles.dashDivider} />
            <View style={styles.dashCol}>
              <Text style={styles.dashLabel}>Số địa điểm</Text>
              <Text style={styles.dashValue}>{locations.length}</Text>
            </View>
          </View>
          <View style={[styles.dashboardRow, { marginTop: 12 }]}>
            <View style={styles.dashCol}>
              <Text style={styles.dashLabel}>Thời gian di chuyển</Text>
              <Text style={styles.dashValue}>{hours}h {mins}m</Text>
            </View>
            <View style={styles.dashDivider} />
            <View style={styles.dashCol}>
              <Text style={styles.dashLabel}>Tổng ngày</Text>
              <Text style={styles.dashValue}>{totalDays} ngày</Text>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Sheet */}
      {selectedLocation && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedLocation.image && <Image source={{ uri: selectedLocation.image }} style={styles.sheetImage} />}
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeaderRow}>
                <Text style={styles.sheetTitle} numberOfLines={2}>{selectedLocation.name}</Text>
                {selectedLocation.rating && (
                  <View style={styles.ratingBadge}>
                    <Star color="#F59E0B" fill="#F59E0B" size={14} />
                    <Text style={styles.ratingText}>{selectedLocation.rating}</Text>
                  </View>
                )}
              </View>
              {selectedLocation.address && (
                <View style={styles.addressRow}>
                  <MapPin color="#64748B" size={16} />
                  <Text style={styles.addressText}>{selectedLocation.address}</Text>
                </View>
              )}
              {selectedLocation.review && <Text style={styles.reviewText}>"{selectedLocation.review}"</Text>}
              
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Khoảng cách</Text>
                  <Text style={styles.statValue}>{selectedLocation.distance_from_previous || 0} km</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Thời gian</Text>
                  <Text style={styles.statValue}>{selectedLocation.travel_time_minutes || 0} phút</Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />
              <View style={styles.actionRow}>
                <Button mode="contained" style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} icon="navigation" onPress={() => {}}>Navigate</Button>
                <Button mode="outlined" style={[styles.actionBtn, { borderColor: '#3B82F6' }]} textColor="#3B82F6" icon="image" onPress={() => {}}>Gallery</Button>
                <Button mode="outlined" style={[styles.actionBtn, { borderColor: '#3B82F6' }]} textColor="#3B82F6" icon="book" onPress={() => {}}>Journal</Button>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Add Marker Dialog */}
      <Portal>
        <Dialog visible={addModalVisible} onDismiss={() => setAddModalVisible(false)} style={{ borderRadius: 16, backgroundColor: '#fff' }}>
          <Dialog.Title>Thêm địa điểm mới</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Tên địa điểm *" value={newLocName} onChangeText={setNewLocName} mode="outlined" style={{ backgroundColor: '#fff', marginBottom: 12 }} activeOutlineColor="#3B82F6" />
            <Text style={{ color: '#64748B', fontSize: 13 }}>Tọa độ: {newCoordinate?.latitude.toFixed(4)}, {newCoordinate?.longitude.toFixed(4)}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddModalVisible(false)} textColor="#64748B">Hủy</Button>
            <Button onPress={handleSaveNewLocation} mode="contained" style={{ backgroundColor: '#3B82F6' }}>Lưu vị trí</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  headerOverlay: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  iconBtn: { backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  floatingRight: { position: 'absolute', right: 16, top: height * 0.3, gap: 12, zIndex: 10 },
  floatingBtn: { backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  dashboardCard: { position: 'absolute', bottom: 40, left: 16, right: 16, backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, zIndex: 10 },
  dashboardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dashCol: { flex: 1, alignItems: 'center' },
  dashDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 12 },
  dashLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  dashValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.55, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 16, zIndex: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 12 },
  sheetImage: { width: '100%', height: 180 },
  sheetContent: { padding: 24 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', flex: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: '#B45309', marginLeft: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  addressText: { fontSize: 14, color: '#64748B', marginLeft: 8, flex: 1 },
  reviewText: { fontStyle: 'italic', color: '#475569', lineHeight: 22, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statBox: { flex: 1, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 2 }
});
