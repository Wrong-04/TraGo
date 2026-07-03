import React from 'react';
import { View, StyleSheet, FlatList, Image, Dimensions } from 'react-native';
import { Text, useTheme, SegmentedButtons } from 'react-native-paper';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 40 - 16) / 3; // 3 columns, padding 20px on sides, gap 8px

const MOCK_IMAGES: string[] = [];

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
