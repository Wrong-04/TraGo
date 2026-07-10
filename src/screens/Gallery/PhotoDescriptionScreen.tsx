import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Clipboard, Share } from 'react-native';
import { Appbar, Text, TextInput, Button, useTheme, ActivityIndicator, Snackbar, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generatePhotoDescription } from '../../config/gemini';
import { ArrowLeft, Copy, Share2 } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { translations } from '../../constants/translations';

export default function PhotoDescriptionScreen({ navigation, route }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSelector((state: RootState) => state.settings);
  const texts = translations[settings.language].photoDescription;
  const [contextText, setContextText] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const sampleImage = route?.params?.imageUri || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';

  const handleGenerate = async () => {
    if (!contextText.trim()) {
      setSnackbar(texts.emptyPrompt);
      return;
    }

    setLoading(true);
    setSnackbar('');

    try {
      const result = await generatePhotoDescription(contextText.trim());
      setDescription(result.description || '');
      setHashtags(result.hashtags || '');
    } catch (error: any) {
      setSnackbar(error.message || texts.generateError);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const fullText = `${description}\n\n${hashtags}`;
    Clipboard.setString(fullText);
    setSnackbar('Sao chép thành công!');
  };

  const handleShare = async () => {
    const fullText = `${description}\n\n${hashtags}`;
    try {
      await Share.share({
        message: fullText,
        title: 'Share Photo Description',
      });
    } catch (error) {
      setSnackbar('Lỗi khi chia sẻ');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={[styles.appbar, { paddingTop: insets.top, backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={20} />
        </TouchableOpacity>
        <Appbar.Content title={texts.title} titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: sampleImage }} style={styles.imagePreview} />

        <View style={styles.inputSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{texts.promptLabel}</Text>
          <TextInput
            mode="outlined"
            label={texts.promptLabel}
            placeholder={texts.placeholder}
            value={contextText}
            onChangeText={setContextText}
            multiline
            numberOfLines={4}
            style={styles.textInput}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.secondary }}>Đang tạo mô tả...</Text>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={handleGenerate}
            contentStyle={{ paddingVertical: 8 }}
            style={styles.generateButton}
          >
            {texts.button}
          </Button>
        )}

        {description ? (
          <Card style={[styles.resultBox, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.resultLabel, { color: theme.colors.onSurface }]}>{texts.resultLabel}</Text>
              <Text style={[styles.resultText, { color: theme.colors.secondary }]}>{description}</Text>

              <View style={{ marginTop: 16 }} />

              <Text style={[styles.resultLabel, { color: theme.colors.onSurface }]}>{texts.hashtagsLabel}</Text>
              <Text style={[styles.resultText, { color: theme.colors.secondary }]}>{hashtags}</Text>

              <View style={styles.actionButtons}>
                <Button
                  mode="outlined"
                  icon={() => <Copy size={18} color={theme.colors.primary} />}
                  onPress={handleCopy}
                  style={{ flex: 1, marginRight: 8 }}
                  contentStyle={{ paddingVertical: 8 }}
                >
                  Sao chép
                </Button>
                <Button
                  mode="contained"
                  icon={() => <Share2 size={18} color="#fff" />}
                  onPress={handleShare}
                  style={{ flex: 1, marginLeft: 8 }}
                  contentStyle={{ paddingVertical: 8 }}
                >
                  Chia sẻ
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appbar: { backgroundColor: '#2563EB', elevation: 0 },
  backButton: { marginLeft: 12, marginRight: 12 },
  appbarTitle: { color: '#fff', fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  imagePreview: { width: '100%', height: 220, borderRadius: 16, marginBottom: 20 },
  inputSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  textInput: { backgroundColor: '#fff', marginBottom: 16 },
  generateButton: { borderRadius: 12, marginBottom: 20 },
  loadingContainer: { alignItems: 'center', marginVertical: 32 },
  resultBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  resultLabel: { fontWeight: '700', marginBottom: 8, marginTop: 12 },
  resultText: { lineHeight: 22, marginBottom: 8 },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
});
