import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator, Snackbar, Chip } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppDispatch, RootState } from '../../features/store';
import { generateTripPlan } from '../../config/gemini';
import { supabase } from '../../config/supabase';
import { fetchTrips } from '../../features/trips/tripsSlice';

type FormData = {
  destination: string;
  days: string;
  budget: string;
  interests: string;
};

export default function AddTripScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      destination: '',
      days: '3',
      budget: '5000000',
      interests: 'Khám phá văn hoá, ẩm thực',
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      setErrorMsg('Vui lòng đăng nhập để tạo chuyến đi.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Gọi AI tạo lịch trình
      const interestsArray = data.interests.split(',').map(i => i.trim());
      const generatedData = await generateTripPlan(data.destination, parseInt(data.days), data.budget, interestsArray);
      
      // 2. Tạo record Trip mới
      const newTrip = {
        user_id: user.uid,
        title: generatedData.title || `Khám phá ${data.destination}`,
        city: data.destination,
        start_date: new Date().toISOString().split('T')[0], // Mock ngày hôm nay
        end_date: new Date(Date.now() + parseInt(data.days) * 86400000).toISOString().split('T')[0],
        distance: generatedData.distance || Math.floor(Math.random() * 500) + 50,
        cover_image: generatedData.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
        itinerary: generatedData.days || []
      };

      // 3. Đẩy lên Supabase
      const { error: insertError } = await supabase.from('trips').insert([newTrip]);
      if (insertError) throw insertError;

      // (Tuỳ chọn: có thể đẩy các ngày (days) vào journals, nhưng hiện tại ta tập trung đẩy Trip trước)

      // 4. Update Redux & Navigate back
      dispatch(fetchTrips());
      navigation.goBack();
      
    } catch (error: any) {
      setErrorMsg(error.message || 'Có lỗi xảy ra khi tạo lịch trình bằng AI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
          Tạo Lịch Trình AI
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.secondary, marginTop: 8 }}>
          Nhập thông tin chuyến đi để Gemini lên kế hoạch chi tiết cho bạn!
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          rules={{ required: 'Điểm đến không được để trống' }}
          name="destination"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              label="Điểm đến (VD: Đà Lạt, Kyoto)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.destination}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
          )}
        />
        {errors.destination && <Text style={{ color: theme.colors.error }}>{errors.destination.message}</Text>}

        <Controller
          control={control}
          rules={{ required: 'Số ngày không được để trống', pattern: /^\d+$/ }}
          name="days"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              label="Số ngày (VD: 3)"
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.days}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
          )}
        />

        <Controller
          control={control}
          rules={{ required: 'Ngân sách dự kiến' }}
          name="budget"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              label="Ngân sách (VNĐ, VD: 5000000)"
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.budget}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
          )}
        />

        <Controller
          control={control}
          name="interests"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              mode="outlined"
              label="Sở thích (VD: ẩm thực, thiên nhiên)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
          )}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.secondary }}>Gemini đang tư duy...</Text>
          </View>
        ) : (
          <Button 
            mode="contained" 
            onPress={handleSubmit(onSubmit)} 
            style={styles.btn}
            contentStyle={{ paddingVertical: 8 }}
          >
            Tạo Lịch Trình Tự Động
          </Button>
        )}

        <View style={styles.suggestionsContainer}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 12 }}>
            Gợi ý cho bạn
          </Text>
          <View style={styles.chipsWrapper}>
            {['Trăng mật', 'Phượt mạo hiểm', 'Gia đình', 'Nghỉ dưỡng', 'Chụp ảnh'].map((tag, index) => (
              <Chip key={index} style={styles.chip} textStyle={{ color: '#64748B' }}>
                {tag}
              </Chip>
            ))}
          </View>
        </View>
      </View>

      <Snackbar
        visible={!!errorMsg}
        onDismiss={() => setErrorMsg('')}
        action={{
          label: 'Đóng',
          onPress: () => setErrorMsg(''),
        }}
        style={{ backgroundColor: theme.colors.error }}
      >
        {errorMsg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  inputOutline: {
    borderRadius: 12,
  },
  btn: {
    marginTop: 24,
    borderRadius: 8,
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  suggestionsContainer: {
    marginTop: 32,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  }
});
