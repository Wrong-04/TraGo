require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Thiếu thông tin cấu hình Supabase trong file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sampleTrips = [
  {
    title: 'Khám phá Hà Nội Mùa Thu',
    city: 'Hà Nội',
    start_date: '2026-10-15',
    end_date: '2026-10-18',
    distance: 120,
    cover_image: 'https://images.unsplash.com/photo-1599708153386-62b22b156037?w=800',
    itinerary: [
      { day: 1, activities: [{ time: 'Sáng', description: 'Ăn phở, dạo Hồ Gươm', location: 'Hồ Hoàn Kiếm' }] },
      { day: 2, activities: [{ time: 'Chiều', description: 'Thăm Lăng Bác', location: 'Ba Đình' }] }
    ]
  },
  {
    title: 'Nghỉ dưỡng ở Đà Lạt',
    city: 'Đà Lạt',
    start_date: '2026-11-20',
    end_date: '2026-11-23',
    distance: 300,
    cover_image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800',
    itinerary: [
      { day: 1, activities: [{ time: 'Sáng', description: 'Săn mây đồi chè', location: 'Cầu Đất' }] },
      { day: 2, activities: [{ time: 'Tối', description: 'Ăn lẩu gà lá é, chợ đêm', location: 'Trung tâm' }] }
    ]
  }
];

const sampleGallery = [
  { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800' },
  { url: 'https://images.unsplash.com/photo-1620025983808-d30d170a7b44?w=800' }
];

async function seedDatabase() {
  console.log('🔄 Đang kết nối Supabase...');

  // 1. Lấy ID của user đầu tiên trong bảng users
  const { data: users, error: userError } = await supabase.from('users').select('id').limit(1);
  
  if (userError || !users || users.length === 0) {
    console.error('❌ Không tìm thấy user nào. Bạn cần mở App và đăng ký ít nhất 1 tài khoản trước khi chạy file này!');
    return;
  }
  
  const userId = users[0].id;
  console.log(`✅ Đã tìm thấy User ID: ${userId}`);

  // 2. Insert Trips
  console.log('🔄 Đang tạo dữ liệu Chuyến đi (Trips)...');
  const tripsWithUser = sampleTrips.map(trip => ({ ...trip, user_id: userId }));
  
  const { data: insertedTrips, error: tripsError } = await supabase
    .from('trips')
    .insert(tripsWithUser)
    .select('id');
    
  if (tripsError) {
    console.error('❌ Lỗi tạo Trips:', tripsError.message);
  } else {
    console.log(`✅ Đã tạo ${insertedTrips.length} chuyến đi mẫu!`);
  }

  // 3. Insert Gallery
  console.log('🔄 Đang tạo dữ liệu Thư viện (Gallery)...');
  const tripId = insertedTrips && insertedTrips.length > 0 ? insertedTrips[0].id : null;
  const galleryWithUser = sampleGallery.map(img => ({ ...img, user_id: userId, trip_id: tripId }));

  const { error: galleryError } = await supabase
    .from('gallery')
    .insert(galleryWithUser);

  if (galleryError) {
    console.error('❌ Lỗi tạo Gallery:', galleryError.message);
  } else {
    console.log(`✅ Đã thêm ${sampleGallery.length} bức ảnh mẫu!`);
  }

  console.log('🎉 Hoàn tất nạp dữ liệu mẫu!');
}

seedDatabase();
