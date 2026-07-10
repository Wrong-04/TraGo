import React, { useState, useEffect, useRef } from 'react';
import { 
  View, StyleSheet, ScrollView, TouchableOpacity, 
  Animated, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Image, TextInput, Text
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, Sparkles, MapPin, Calendar, 
  Users, Check, RefreshCw, Clock, Map as MapIcon,
  ChevronDown, ChevronUp, Search, Compass, Heart, Wallet
} from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../features/store';
import { generateTripPlan } from '../../config/gemini';
import { supabase } from '../../config/supabase';
import { fetchTrips } from '../../features/trips/tripsSlice';

const { width } = Dimensions.get('window');

const TRAVEL_STYLES = [
  { id: 'relax', label: 'Nghỉ dưỡng', emoji: '🌴' },
  { id: 'explore', label: 'Khám phá', emoji: '🗺️' },
  { id: 'food', label: 'Ẩm thực', emoji: '🍜' },
  { id: 'culture', label: 'Văn hóa', emoji: '🏛️' },
  { id: 'adventure', label: 'Mạo hiểm', emoji: '🧗‍♂️' },
  { id: 'shopping', label: 'Mua sắm', emoji: '🛍️' },
];

const LOADING_STEPS = [
  "Đang phân tích điểm đến...",
  "Lựa chọn các địa điểm phù hợp...",
  "Lên lịch trình từng ngày...",
  "Ước tính chi phí chuyến đi...",
  "Hoàn thiện kế hoạch hoàn hảo!"
];

export default function AIPlannerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [screen, setScreen] = useState<'form' | 'loading' | 'preview'>('form');
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState('5000000');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [stylesList, setStylesList] = useState<string[]>(['relax', 'food']);
  const [groupSize, setGroupSize] = useState(2);
  const [specialNote, setSpecialNote] = useState('');

  const [loadingStep, setLoadingStep] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const parseBudget = (value: string) => {
    const numeric = Number(String(value || '').replace(/[^\d]/g, ''));
    return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  };

  const toDateOnly = (value: Date) => value.toISOString().split('T')[0];

  const toDateFromDayOffset = (baseDate: string, offset: number) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offset);
    return toDateOnly(d);
  };

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  const toggleStyle = (id: string) => {
    if (stylesList.includes(id)) {
      setStylesList(stylesList.filter(s => s !== id));
    } else {
      setStylesList([...stylesList, id]);
    }
  };

  const startLoading = () => {
    setScreen('loading');
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 10000,
      useNativeDriver: false,
    }).start();

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < LOADING_STEPS.length) {
        setLoadingStep(step);
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const handleGenerate = async () => {
    if (!destination.trim()) return;
    const stopLoading = startLoading();
    try {
      const interests = stylesList.map(id => TRAVEL_STYLES.find(s => s.id === id)?.label || id);
      interests.push(`Số người: ${groupSize}`);
      interests.push(`Ngày bắt đầu: ${startDate}`);
      if (specialNote.trim()) interests.push(`Lưu ý: ${specialNote.trim()}`);
      
      const result = await generateTripPlan(destination, days, budget, interests);
      setGeneratedPlan(result);
      setSelectedDay(result?.days?.[0]?.day || 1);
      
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setScreen('preview');
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    } catch (error) {
      console.log('Error generating:', error);
      setScreen('form');
    } finally {
      stopLoading();
    }
  };

  const handleSaveTrip = async () => {
    if (!generatedPlan || !user) return;
    setSaving(true);
    try {
      const itinerary = Array.isArray(generatedPlan.days) ? generatedPlan.days : [];
      const allStops = itinerary.flatMap((day: any) =>
        (day.activities || []).map((act: any, index: number) => ({
          day: day.day,
          orderIndex: index,
          name: act.location || act.description,
          description: act.description || '',
          time: act.time || null,
          latitude: Number(act.latitude),
          longitude: Number(act.longitude),
          estimatedCost: Number(act.estimatedCost || 0),
          category: day.theme || 'AI Plan',
        }))
      ).filter((item: any) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

      let totalDistance = 0;
      for (let i = 1; i < allStops.length; i += 1) {
        totalDistance += haversineKm(
          allStops[i - 1].latitude,
          allStops[i - 1].longitude,
          allStops[i].latitude,
          allStops[i].longitude
        );
      }

      const totalEstimatedCost = itinerary.reduce((sum: number, day: any) => {
        const dayCost = Number(day?.estimatedCost || 0);
        if (dayCost > 0) return sum + dayCost;
        return sum + (day?.activities || []).reduce((actSum: number, act: any) => actSum + Number(act?.estimatedCost || 0), 0);
      }, 0);

      const startDateValue = startDate;
      const endDateValue = toDateFromDayOffset(startDateValue, Math.max(0, days - 1));

      const newTrip = {
        user_id: user.uid,
        title: generatedPlan.title || `Khám phá ${destination}`,
        description: generatedPlan.summary || 'Lịch trình được tạo bởi AI',
        country: 'Việt Nam',
        city: destination,
        start_date: startDateValue,
        end_date: endDateValue,
        budget: parseBudget(budget),
        total_distance: Number(totalDistance.toFixed(2)),
        total_cost: totalEstimatedCost,
        status: 'Upcoming',
        cover_image: `https://picsum.photos/seed/${destination}/800/600`,
        itinerary,
        latitude: allStops[0]?.latitude || null,
        longitude: allStops[0]?.longitude || null,
        address: destination,
        tags: stylesList.map(id => TRAVEL_STYLES.find(s => s.id === id)?.label || id),
      };

      const { data: insertedTrip, error } = await supabase.from('trips').insert([newTrip]).select().single();
      if (error) throw error;

      if (insertedTrip?.id && allStops.length > 0) {
        const locationPayload = allStops.map((stop: any, index: number) => {
          const prev = index > 0 ? allStops[index - 1] : null;
          const distance = prev
            ? haversineKm(prev.latitude, prev.longitude, stop.latitude, stop.longitude)
            : 0;
          return {
            trip_id: insertedTrip.id,
            name: stop.name,
            address: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
            category: stop.category,
            is_favorite: false,
            visit_date: toDateFromDayOffset(startDateValue, Math.max(0, Number(stop.day || 1) - 1)),
            visit_time: stop.time,
            estimated_cost: Math.max(0, Math.round(stop.estimatedCost || 0)),
            rating: 5,
            mood: null,
            weather: null,
            review: stop.description,
            image: null,
            distance_from_previous: Number(distance.toFixed(2)),
            travel_time_minutes: Math.round((distance / 30) * 60),
          };
        });

        const { error: locationError } = await supabase.from('trip_locations').insert(locationPayload);
        if (locationError) {
          console.log('Location save warning:', locationError);
        }
      }

      if (insertedTrip?.id) {
        const expenseRowsFromActivities = itinerary.flatMap((day: any) => {
          const visitDate = toDateFromDayOffset(startDateValue, Math.max(0, Number(day?.day || 1) - 1));
          return (day?.activities || [])
            .map((act: any) => {
              const amount = Math.max(0, Math.round(Number(act?.estimatedCost || 0)));
              if (amount <= 0) return null;
              const time = String(act?.time || '').trim();
              const locationName = String(act?.location || '').trim();
              const desc = String(act?.description || '').trim();
              const titleBase = locationName || desc || `Hoạt động ngày ${day?.day || 1}`;
              const title = time ? `${time} - ${titleBase}` : titleBase;
              return {
                trip_id: insertedTrip.id,
                amount,
                name: title.slice(0, 120),
                expense_date: visitDate,
              };
            })
            .filter(Boolean);
        });

        const expenseRows = expenseRowsFromActivities.length > 0
          ? expenseRowsFromActivities
          : itinerary
              .map((day: any) => {
                const amount = Math.max(0, Math.round(Number(day?.estimatedCost || 0)));
                if (amount <= 0) return null;
                return {
                  trip_id: insertedTrip.id,
                  amount,
                  name: `Chi phí ngày ${day?.day || 1}`,
                  expense_date: toDateFromDayOffset(startDateValue, Math.max(0, Number(day?.day || 1) - 1)),
                };
              })
              .filter(Boolean);

        if (expenseRows.length > 0) {
          const { error: expenseError } = await supabase.from('trip_expenses').insert(expenseRows as any[]);
          if (expenseError) {
            console.log('Expense save warning:', expenseError);
          }
        }
      }
      
      dispatch(fetchTrips(user.uid));
      navigation.goBack();
    } catch (error) {
      console.log('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // ─── RENDERERS ──────────────────────────────────────────────────────────────
  const renderForm = () => (
    <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
      <View style={styles.formSection}>
        <Text style={styles.fieldLabel}>📍 Điểm đến</Text>
        <View style={styles.inputWrap}>
          <Search color="#94A3B8" size={20} />
          <TextInput
            style={styles.textInput}
            placeholder="Bạn muốn đi đâu?"
            placeholderTextColor="#94A3B8"
            value={destination}
            onChangeText={setDestination}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.formSection, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.fieldLabel}>⏱ Số ngày</Text>
          <View style={styles.inputWrap}>
            <Calendar color="#94A3B8" size={20} />
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              value={days.toString()}
              onChangeText={(t) => setDays(Number(t))}
            />
          </View>
        </View>
        <View style={[styles.formSection, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.fieldLabel}>💰 Ngân sách</Text>
          <View style={styles.inputWrap}>
            <Wallet color="#94A3B8" size={20} />
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              value={budget}
              onChangeText={setBudget}
            />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.formSection, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.fieldLabel}>📅 Ngày bắt đầu</Text>
          <View style={styles.inputWrap}>
            <Calendar color="#94A3B8" size={20} />
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
        </View>
        <View style={[styles.formSection, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.fieldLabel}>👥 Số người</Text>
          <View style={styles.inputWrap}>
            <Users color="#94A3B8" size={20} />
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              value={String(groupSize)}
              onChangeText={(t) => {
                const n = Number(t);
                setGroupSize(Number.isFinite(n) && n > 0 ? n : 1);
              }}
            />
          </View>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.fieldLabel}>📝 Lưu ý thêm cho AI</Text>
        <View style={[styles.inputWrap, { height: 88, alignItems: 'flex-start', paddingTop: 12 }] }>
          <TextInput
            style={[styles.textInput, { marginLeft: 0, height: '100%', textAlignVertical: 'top' }]}
            multiline
            numberOfLines={3}
            placeholder="Ví dụ: ưu tiên đi bộ, không ăn cay, thích điểm sống ảo..."
            placeholderTextColor="#94A3B8"
            value={specialNote}
            onChangeText={setSpecialNote}
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.fieldLabel}>✨ Phong cách du lịch</Text>
        <View style={styles.chipsWrap}>
          {TRAVEL_STYLES.map(s => {
            const active = stylesList.includes(s.id);
            return (
              <TouchableOpacity 
                key={s.id} 
                style={[styles.styleChip, active && styles.styleChipActive]}
                onPress={() => toggleStyle(s.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.styleEmoji}>{s.emoji}</Text>
                <Text style={[styles.styleText, active && styles.styleTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <TouchableOpacity style={styles.ctaBtn} onPress={handleGenerate} activeOpacity={0.9}>
        <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.ctaGradient}>
          <Sparkles color="#fff" size={20} />
          <Text style={styles.ctaText}>✨ Tạo Lịch Trình Tự Động</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderLoading = () => {
    const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginBottom: 20 }} />
        <Text style={styles.loadingTitle}>Gemini đang tạo lịch trình</Text>
        <View style={styles.loadingSteps}>
          {LOADING_STEPS.map((step, idx) => (
            <View key={idx} style={[styles.loadingStep, idx > loadingStep && { opacity: 0.3 }]}>
              {idx < loadingStep ? (
                <View style={styles.stepDone}><Check color="#10B981" size={14} /></View>
              ) : idx === loadingStep ? (
                <ActivityIndicator size={14} color="#8B5CF6" />
              ) : (
                <View style={styles.stepWait} />
              )}
              <Text style={[styles.stepText, idx === loadingStep && styles.stepTextActive]}>{step}</Text>
            </View>
          ))}
        </View>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    );
  };

  const renderPreview = () => {
    const totalEst = generatedPlan?.totalEstimatedCost || parseBudget(budget) || 0;
    const totalActs = generatedPlan?.days?.reduce((sum: number, d: any) => sum + (d.activities?.length || 0), 0) || 0;

    return (
      <Animated.View style={{ opacity: fadeAnim, paddingBottom: 100 }}>
        {/* Hero Header */}
        <View style={styles.previewHero}>
          <Text style={styles.previewTitle}>{generatedPlan?.title}</Text>
          <Text style={styles.previewSummary}>{generatedPlan?.summary}</Text>
        </View>

        {/* Summary Chips */}
        <View style={styles.summaryChips}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipVal}>{totalEst.toLocaleString('vi-VN')}đ</Text>
            <Text style={styles.summaryChipLbl}>Chi phí (ước)</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipVal}>{totalActs}</Text>
            <Text style={styles.summaryChipLbl}>Địa điểm</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipVal}>{days}N{Math.max(1, days-1)}Đ</Text>
            <Text style={styles.summaryChipLbl}>Thời gian</Text>
          </View>
        </View>

        {/* Day Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsWrap} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {generatedPlan?.days?.map((day: any) => {
            const isSelected = selectedDay === day.day;
            return (
              <TouchableOpacity
                key={day.day}
                style={[styles.dayTabBtn, isSelected && styles.dayTabBtnActive]}
                onPress={() => setSelectedDay(day.day)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayTabTxt, isSelected && styles.dayTabTxtActive]}>Ngày {day.day}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Day Content */}
        {generatedPlan?.days?.filter((d: any) => d.day === selectedDay).map((day: any, idx: number) => (
          <View key={idx} style={styles.dayCard}>
            <View style={styles.dayCardHead}>
              <Image source={{ uri: `https://picsum.photos/seed/${destination}-${day.day}/200/200` }} style={styles.dayCover} />
              <View style={styles.dayHeadInfo}>
                <Text style={styles.dayTitle}>Ngày {day.day}</Text>
                {day.theme && <Text style={styles.dayTheme}>{day.theme}</Text>}
                <Text style={styles.dayBudget}>Dự trù ngày: {(Number(day?.estimatedCost || 0)).toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>

            <View style={styles.actsWrap}>
              {day.activities?.map((act: any, aIdx: number) => (
                <View key={aIdx} style={styles.actRow}>
                  <View style={styles.actLeft}>
                    <Text style={styles.actTime}>{act.time}</Text>
                    <View style={styles.actTimeline}>
                      <View style={[styles.actDot, aIdx === 0 && { backgroundColor: '#8B5CF6' }]} />
                      {aIdx < day.activities.length - 1 && <View style={styles.actLine} />}
                    </View>
                  </View>
                  <View style={styles.actBody}>
                    <Text style={styles.actDesc}>{act.description}</Text>
                    {act.location ? (
                      <View style={styles.actLocRow}>
                        <MapPin color="#8B5CF6" size={12} />
                        <Text style={styles.actLoc}>{act.location}</Text>
                      </View>
                    ) : null}
                    {act.estimatedCost ? (
                      <View style={styles.actCostBadge}>
                        <Text style={styles.actCostTxt}>~ {act.estimatedCost.toLocaleString('vi-VN')}đ</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerIconRing}><Sparkles color="#8B5CF6" size={28} /></View>
          <Text style={styles.headerTitle}>Tạo Lịch Trình AI</Text>
          <Text style={styles.headerSub}>Gemini sẽ lên kế hoạch hoàn hảo cho bạn ✨</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {screen === 'form' && renderForm()}
          {screen === 'loading' && renderLoading()}
          {screen === 'preview' && renderPreview()}
        </ScrollView>

        {screen === 'preview' && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
            <TouchableOpacity style={styles.botEditBtn} onPress={() => setScreen('form')} activeOpacity={0.8}>
              <Text style={styles.botEditTxt}>Chỉnh sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botSaveBtn} onPress={handleSaveTrip} disabled={saving} activeOpacity={0.9}>
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.botSaveGrad}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.botSaveTxt}>✅ Tạo chuyến đi</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 20, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerTitleWrap: { alignItems: 'center' },
  headerIconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.1, shadowRadius: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  
  formCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, marginTop: -20, shadowColor: '#000', shadowOffset: {width:0, height:8}, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  formSection: { marginBottom: 20 },
  row: { flexDirection: 'row' },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, height: 54 },
  textInput: { flex: 1, height: '100%', marginLeft: 12, fontSize: 15, color: '#0F172A', backgroundColor: 'transparent' },
  
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  styleChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  styleChipActive: { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' },
  styleEmoji: { fontSize: 16, marginRight: 6 },
  styleText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  styleTextActive: { color: '#6D28D9' },
  
  ctaBtn: { marginTop: 10, borderRadius: 16, overflow: 'hidden', shadowColor: '#8B5CF6', shadowOffset: {width:0, height:6}, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  loadingCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, marginTop: -20, alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0, height:8}, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  loadingTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 24 },
  loadingSteps: { width: '100%', marginBottom: 32 },
  loadingStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  stepDone: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  stepWait: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0' },
  stepText: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  stepTextActive: { color: '#8B5CF6', fontWeight: '700' },
  progressBar: { width: '100%', height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#8B5CF6' },

  previewHero: { paddingVertical: 12, marginBottom: 16 },
  previewTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  previewSummary: { fontSize: 15, color: '#475569', lineHeight: 22 },

  summaryChips: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryChip: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  summaryChipVal: { fontSize: 16, fontWeight: '800', color: '#8B5CF6', marginBottom: 4 },
  summaryChipLbl: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' },

  dayTabsWrap: { marginBottom: 16 },
  dayTabBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  dayTabBtnActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  dayTabTxt: { fontSize: 14, fontWeight: '700', color: '#475569' },
  dayTabTxtActive: { color: '#fff' },

  dayCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  dayCardHead: { flexDirection: 'row', alignItems: 'center' },
  dayCover: { width: 48, height: 48, borderRadius: 12, marginRight: 14 },
  dayHeadInfo: { flex: 1 },
  dayTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  dayTheme: { fontSize: 13, color: '#64748B', marginTop: 4 },
  dayBudget: { fontSize: 13, color: '#10B981', marginTop: 6, fontWeight: '700' },

  actsWrap: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actRow: { flexDirection: 'row', marginBottom: 20 },
  actLeft: { width: 56, alignItems: 'center' },
  actTime: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
  actTimeline: { flex: 1, alignItems: 'center' },
  actDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CBD5E1', zIndex: 2 },
  actLine: { width: 2, flex: 1, backgroundColor: '#F1F5F9', marginTop: -4, marginBottom: -6, zIndex: 1 },
  actBody: { flex: 1, paddingBottom: 16 },
  actDesc: { fontSize: 15, fontWeight: '600', color: '#1E293B', lineHeight: 22, marginBottom: 8 },
  actLocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  actLoc: { fontSize: 13, color: '#64748B', marginLeft: 6 },
  actCostBadge: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actCostTxt: { fontSize: 13, fontWeight: '700', color: '#10B981' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#000', shadowOffset: {width:0, height:-4}, shadowOpacity: 0.05, shadowRadius: 12, elevation: 10 },
  botEditBtn: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 16, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  botEditTxt: { fontSize: 16, fontWeight: '700', color: '#475569' },
  botSaveBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
  botSaveGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  botSaveTxt: { fontSize: 16, fontWeight: '800', color: '#fff' }
});
