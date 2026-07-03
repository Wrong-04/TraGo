import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function MapScreen() {
  const theme = useTheme();

  const routeCoordinates: { latitude: number, longitude: number }[] = [];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 18.5,
          longitude: 106.5,
          latitudeDelta: 8,
          longitudeDelta: 8,
        }}
      >
        {routeCoordinates.map((coord, index) => (
          <Marker 
            key={index} 
            coordinate={coord}
            pinColor={index === 0 ? theme.colors.primary : index === routeCoordinates.length - 1 ? theme.colors.error : '#10B981'}
          />
        ))}
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={theme.colors.primary}
          strokeWidth={4}
        />
      </MapView>

      <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.infoCol}>
          <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Tổng quãng đường</Text>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>1.248 km</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoCol}>
          <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Thời gian di chuyển</Text>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>25h 30m</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  infoCard: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  }
});
