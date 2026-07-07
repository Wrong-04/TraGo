import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator, Snackbar, Chip, Card } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppDispatch, RootState } from '../../features/store';
import { generateTripPlan } from '../../config/gemini';
import { supabase } from '../../config/supabase';
import { fetchTrips } from '../../features/trips/tripsSlice';
import { translations } from '../../constants/translations';
import { ArrowLeft } from 'lucide-react-native';

type FormData = {
  destination: string;
  days: string;
  budget: string;
  interests: string;
};

type GeneratedPlan = {
  title: string;
  summary: string;
  days: Array<{
    day: number;
    activities: Array<{
      time: string;
      description: string;
      location: string;
    }>;
  }>;
};

export default function AIPlannerScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const texts = translations[settings.language].aiPlanner;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

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
      setErrorMsg(texts.loginRequired);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setGeneratedPlan(null);
    try {
      const interestsArray = data.interests.split(',').map(i => i.trim());
      const generatedData = await generateTripPlan(data.destination, parseInt(data.days), data.budget, interestsArray);
      setGeneratedPlan(generatedData);
      setFormData(data);
    } catch (error: any) {
      setErrorMsg(error.message || texts.createError);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!generatedPlan || !formData || !user) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const newTrip = {
        user_id: user.uid,
        title: generatedPlan.title || `Khám phá ${formData.destination}`,
        description: generatedPlan.summary || 'Lịch trình được tạo bởi AI',
        country: 'Việt Nam',
        city: formData.destination,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + parseInt(formData.days) * 86400000).toISOString().split('T')[0],
        budget: parseInt(formData.budget),
        total_distance: Math.floor(Math.random() * 500) + 50,
        total_cost: 0,
        status: 'Upcoming',
        cover_image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
        itinerary: generatedPlan.days || []
      };

      const { error: insertError } = await supabase.from('trips').insert([newTrip]);
      if (insertError) throw insertError;

      setSuccessMsg('Lịch trình đã được lưu!');
      dispatch(fetchTrips(user.uid));
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      setErrorMsg(error.message || texts.createError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.appbar, { paddingTop: insets.top, backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <ArrowLeft color={theme.colors.primary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            {texts.title}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.secondary, marginTop: 4 }}>
            {texts.subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {!generatedPlan ? (
          <>
            <Controller
              control={control}
              rules={{ required: texts.destinationRequired }}
              name="destination"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  label={texts.destinationLabel}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.destination}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
              )}
            />
            {errors.destination && <Text style={{ color: theme.colors.error, marginBottom: 12 }}>{errors.destination.message}</Text>}

            <Controller
              control={control}
              rules={{ required: texts.daysRequired, pattern: /^\d+$/ }}
              name="days"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  label={texts.daysLabel}
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
              rules={{ required: texts.budgetRequired }}
              name="budget"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  label={texts.budgetLabel}
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
                  label={texts.interestsLabel}
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
                <Text style={{ marginTop: 12, color: theme.colors.secondary }}>{texts.loadingText}</Text>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                style={styles.btn}
                contentStyle={{ paddingVertical: 8 }}
              >
                {texts.button}
              </Button>
            )}

            <View style={styles.suggestionsContainer}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 12 }}>
                {texts.suggestionsTitle}
              </Text>
              <View style={styles.chipsWrapper}>
                {texts.suggestions.map((tag, index) => (
                  <Chip key={index} style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]} textStyle={{ color: theme.colors.onSurfaceVariant }}>
                    {tag}
                  </Chip>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 12 }}>
              {texts.suggestionsTitle}
            </Text>
            <Card style={[styles.planCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 8 }}>
                  {generatedPlan.title}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.secondary, marginBottom: 16 }}>
                  {generatedPlan.summary}
                </Text>

                {generatedPlan.days && generatedPlan.days.slice(0, 3).map((day, idx) => (
                  <View key={idx} style={[styles.dayBox, { borderLeftColor: theme.colors.primary }]}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.primary, marginBottom: 8 }}>
                      Ngày {day.day}
                    </Text>
                    {day.activities && day.activities.slice(0, 2).map((activity, actIdx) => (
                      <View key={actIdx} style={{ marginBottom: 8 }}>
                        <Text style={{ color: theme.colors.onSurface, fontWeight: '600', fontSize: 13 }}>
                          • {activity.time}: {activity.description.substring(0, 50)}...
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </Card.Content>
            </Card>

            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => { setGeneratedPlan(null); setFormData(null); }}
                style={{ flex: 1, marginRight: 8 }}
                contentStyle={{ paddingVertical: 8 }}
              >
                Tạo lại
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveTrip}
                style={{ flex: 1, marginLeft: 8 }}
                contentStyle={{ paddingVertical: 8 }}
                loading={loading}
              >
                Lưu
              </Button>
            </View>
          </>
        )}
      </View>

      <Snackbar
        visible={!!errorMsg}
        onDismiss={() => setErrorMsg('')}
        action={{
          label: texts.close,
          onPress: () => setErrorMsg(''),
        }}
        style={{ backgroundColor: theme.colors.error }}
      >
        {errorMsg}
      </Snackbar>

      <Snackbar
        visible={!!successMsg}
        onDismiss={() => setSuccessMsg('')}
        duration={2000}
        style={{ backgroundColor: '#10B981' }}
      >
        {successMsg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backIconButton: {
    marginRight: 12,
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
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
  },
  planCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  dayBox: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
});
