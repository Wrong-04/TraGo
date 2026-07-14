import { supabase } from '../config/supabase';

/**
 * Tính khoảng cách (km) giữa 2 tọa độ
 */
export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

/**
 * Tính toán lại thứ tự (order_index) và khoảng cách (distance_from_previous)
 * cho toàn bộ các địa điểm trong một chuyến đi, sắp xếp theo ngày giờ.
 */
export const recalculateTripLocations = async (tripId: string) => {
  try {
    // Lấy toàn bộ locations của trip
    const { data: locations, error: fetchError } = await supabase
      .from('trip_locations')
      .select('*')
      .eq('trip_id', tripId)
      // Cần sort theo visit_date, visit_time và created_at
      .order('visit_date', { ascending: true })
      .order('visit_time', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;
    if (!locations || locations.length === 0) return;

    // Duyệt và tính toán lại
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      let newDist: number | null = null;
      let newTime: number | null = loc.travel_time_minutes;

      if (i === 0) {
        newDist = null;
        newTime = null;
      } else {
        const prevLoc = locations[i - 1];
        if (loc.latitude && loc.longitude && prevLoc.latitude && prevLoc.longitude) {
          newDist = getDistanceFromLatLonInKm(prevLoc.latitude, prevLoc.longitude, loc.latitude, loc.longitude);
        }
      }

      // Chỉ cập nhật nếu có sự thay đổi để tránh gọi API thừa
      if (loc.order_index !== i || loc.distance_from_previous !== newDist) {
        await supabase
          .from('trip_locations')
          .update({
            order_index: i,
            distance_from_previous: newDist,
            travel_time_minutes: newTime
          })
          .eq('id', loc.id);
      }
    }
  } catch (error) {
    console.error('Lỗi khi tính toán lại locations:', error);
  }
};
