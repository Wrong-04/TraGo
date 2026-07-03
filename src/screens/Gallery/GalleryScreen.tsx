import React from 'react';
import { View, StyleSheet, FlatList, Image, Dimensions } from 'react-native';
import { Text, useTheme, SegmentedButtons } from 'react-native-paper';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 40 - 16) / 3; // 3 columns, padding 20px on sides, gap 8px

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400',
  'https://images.unsplash.com/photo-1557335200-a65f7f032602?w=400',
  'https://images.unsplash.com/photo-1557456170-0cf4f4d0d362?w=400',
  'https://images.unsplash.com/photo-1518182170546-076616fdfaaf?w=400',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400',
  'https://images.unsplash.com/photo-1506461883276-594a12b11dc3?w=400',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
  'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=400',
];

export default function GalleryScreen() {
  const theme = useTheme();
  const [value, setValue] = React.useState('all');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 16 }}>
          Thư viện ảnh
        </Text>
        <SegmentedButtons
          value={value}
          onValueChange={setValue}
          buttons={[
            { value: 'all', label: 'Tất cả' },
            { value: 'trips', label: 'Theo chuyến đi' },
            { value: 'favorites', label: 'Yêu thích' },
          ]}
          style={styles.segmentedBtn}
        />
      </View>

      <FlatList
        data={MOCK_IMAGES}
        numColumns={3}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.image} />
        )}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  segmentedBtn: {
    width: '100%',
  },
  grid: {
    padding: 20,
    paddingBottom: 100,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  }
});
