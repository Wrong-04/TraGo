import React from 'react';
import { View, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Text, useTheme, SegmentedButtons, FAB, ActivityIndicator, Snackbar, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabase';
import { decode } from 'base64-arraybuffer';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, AppDispatch } from '../../features/store';
import { fetchGallery } from '../../features/gallery/gallerySlice';
import { translations } from '../../constants/translations';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 40 - 16) / 2;

export default function GalleryScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const { images } = useSelector((state: RootState) => state.gallery);
  const texts = translations[settings.language].gallery;
  const [value, setValue] = React.useState('all');
  const [uploading, setUploading] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      handleUpload(result.assets[0]);
    }
  };

  const handleUpload = async (asset: any) => {
    if (!user) {
      setMsg(texts.loginRequired);
      return;
    }
    setUploading(true);
    try {
      let finalUrl = asset.uri;
      
      if (asset.base64) {
        const ext = asset.uri.substring(asset.uri.lastIndexOf('.') + 1);
        const fileName = `${user.uid}/${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('trago-images')
          .upload(fileName, decode(asset.base64), { contentType: `image/${ext}` });
          
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('trago-images').getPublicUrl(fileName);
        finalUrl = data.publicUrl;
      }

      // Lưu record vào Supabase Database
      const { error: dbError } = await supabase.from('gallery').insert([{
        user_id: user.uid,
        url: finalUrl,
      }]);
      
      if (dbError) throw dbError;

      setMsg(texts.uploadSuccess);
      dispatch(fetchGallery()); // Refresh list
    } catch (error: any) {
      setMsg(texts.uploadError + ': ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  React.useEffect(() => {
    dispatch(fetchGallery());
  }, [dispatch]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 16 }}>
          {texts.title}
        </Text>
        <SegmentedButtons
          value={value}
          onValueChange={setValue}
          buttons={[
            { value: 'all', label: texts.all },
            { value: 'location', label: texts.location },
            { value: 'date', label: texts.date },
          ]}
          style={styles.segmentedBtn}
        />
      </View>

      <FlatList
        data={images}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PhotoDescription', { imageUri: item.image })}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="camera-plus"
        style={styles.fab}
        color="#fff"
        loading={uploading}
        onPress={pickImage}
      />

      <Snackbar
        visible={!!msg}
        onDismiss={() => setMsg('')}
        duration={3000}
      >
        {msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  segmentedBtn: {
    width: '100%',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  uploadButton: {
    marginLeft: 8,
  },
  grid: {
    padding: 20,
    paddingBottom: 100,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE * 1.2,
    borderRadius: 16,
    marginRight: 16,
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2563EB',
    borderRadius: 28,
  }
});
