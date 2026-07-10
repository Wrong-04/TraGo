import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Image, Clipboard, Share,
  Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Text, TextInput, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generatePhotoDescription } from '../../config/gemini';
import { ArrowLeft, Copy, Share2, MapPin, Calendar, Folder, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');

export default function PhotoDescriptionScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [contextText, setContextText] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const sampleImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';
  const imageUri = route?.params?.imageUri || sampleImage;
  const imageDate = route?.params?.date || new Date().toLocaleDateString('vi-VN');
  const imageTrip = route?.params?.trip || 'Chuyến đi tự do';
  const imageLocation = route?.params?.location || 'Chưa rõ địa điểm';

  const handleGenerate = async () => {
    setLoading(true);
    setSnackbar('');

    try {
      let localUri = imageUri;
      if (imageUri.startsWith('http')) {
        const fileUri = FileSystem.documentDirectory + 'temp_ai_image.jpg';
        const result = await FileSystem.downloadAsync(imageUri, fileUri);
        localUri = result.uri;
      }

      // Nén ảnh để tránh lỗi tràn RAM (Văng App)
      const manipResult = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const base64Image = await FileSystem.readAsStringAsync(manipResult.uri, { encoding: FileSystem.EncodingType.Base64 });
      const result = await generatePhotoDescription(base64Image, contextText.trim());

      setDescription(result.description || '');
      setHashtags(result.hashtags || '');
    } catch (error: any) {
      setSnackbar(error.message || 'Có lỗi xảy ra khi tạo mô tả. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const fullText = `${description}\n\n${hashtags}`;
    Clipboard.setString(fullText);
    setSnackbar('Đã sao chép vào bộ nhớ tạm');
  };

  const handleShare = async () => {
    const fullText = `${description}\n\n${hashtags}`;
    try {
      await Share.share({
        message: fullText,
        title: 'Share Photo Description',
      });
    } catch (error) {
      setSnackbar('Không thể chia sẻ ảnh lúc này');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{flexGrow: 1}} showsVerticalScrollIndicator={false} bounces={false}>

        {/* ─── IMMERSIVE IMAGE VIEW ─── */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.fullImage} />
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.topGradient} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient} />

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>

          {/* Floating Info Card */}
          <View style={styles.floatingInfo}>
            <View style={styles.infoRow}>
              <MapPin color="#FCD34D" size={16} />
              <Text style={styles.infoTxt} numberOfLines={1}>{imageLocation}</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar color="#93C5FD" size={16} />
              <Text style={styles.infoTxt}>{imageDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Folder color="#FCA5A5" size={16} />
              <Text style={styles.infoTxt} numberOfLines={1}>{imageTrip}</Text>
            </View>
          </View>
        </View>

        {/* ─── BOTTOM SHEET CONTENT ─── */}
        <View style={styles.bottomSheet}>
          <Text style={styles.sectionTitle}>Cảm nghĩ của bạn</Text>
          <TextInput
            autoCorrect={false} spellCheck={false}
            mode="outlined"
            placeholder="Bạn đang nghĩ gì về bức ảnh này? (Tuỳ chọn)"
            value={contextText}
            onChangeText={setContextText}
            multiline
            numberOfLines={3}
            style={styles.textInput}
            outlineColor="#E2E8F0"
            activeOutlineColor="#8B5CF6"
          />

          {/* AI GENERATE BUTTON */}
          <TouchableOpacity onPress={handleGenerate} disabled={loading} activeOpacity={0.8} style={styles.aiBtnWrap}>
            <LinearGradient colors={['#8B5CF6', '#EC4899']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.aiBtn}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
              ) : (
                <Zap color="#fff" size={20} style={{ marginRight: 8 }} />
              )}
              <Text style={styles.aiBtnTxt}>
                {loading ? 'AI Đang Viết Mô Tả...' : 'Tạo Mô Tả Bằng AI'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* RESULT BOX */}
          {(description || hashtags) ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultDesc}>{description}</Text>
              <Text style={styles.resultTags}>{hashtags}</Text>

              <View style={styles.resultActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
                  <Copy color="#64748B" size={18} />
                  <Text style={styles.actionTxt}>Sao chép</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                  <Share2 color="#64748B" size={18} />
                  <Text style={styles.actionTxt}>Chia sẻ</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000} style={styles.snackbar}>
        {snackbar}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imageContainer: { width: width, height: height * 0.55, position: 'relative' },
  fullImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
  backBtn: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },

  floatingInfo: { position: 'absolute', bottom: 32, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  infoTxt: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6, flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 },

  bottomSheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -24, padding: 24, paddingBottom: 60, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  textInput: { backgroundColor: '#F8FAFC', fontSize: 15 },

  aiBtnWrap: { marginTop: 24, borderRadius: 16, overflow: 'hidden', shadowColor: '#EC4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  aiBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resultBox: { marginTop: 24, backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  resultDesc: { fontSize: 15, color: '#334155', lineHeight: 24, marginBottom: 12 },
  resultTags: { fontSize: 14, color: '#8B5CF6', fontWeight: '500', marginBottom: 20 },
  resultActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24, paddingVertical: 4 },
  actionTxt: { fontSize: 14, fontWeight: '600', color: '#64748B', marginLeft: 8 },

  snackbar: { backgroundColor: '#334155', borderRadius: 12 },
});
