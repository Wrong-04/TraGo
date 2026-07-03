import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme, FAB, IconButton } from 'react-native-paper';
import { MapPin, Calendar } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../features/store';
import { fetchTrips, Trip } from '../../features/trips/tripsSlice';

export default function TripsScreen() {
  const theme = useTheme() as any;
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, error } = useSelector((state: RootState) => state.trips);

  useEffect(() => {
    dispatch(fetchTrips());
  }, [dispatch]);

  const renderTripCard = ({ item }: { item: Trip }) => (
    <Card style={styles.card} mode="elevated" elevation={1}>
      <Card.Cover source={{ uri: item.coverImage || item.imageUrl }} style={styles.cardCover} />
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            {item.title}
          </Text>
          <IconButton icon="dots-vertical" size={20} onPress={() => {}} style={styles.moreIcon} />
        </View>

        <View style={styles.infoRow}>
          <Calendar color={theme.colors.secondary} size={16} />
          <Text variant="bodySmall" style={[styles.infoText, { color: theme.colors.secondary }]}>
            {`${item.startDate} - ${item.endDate}`}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {item.status === 'Completed' ? 'Đã hoàn thành' : 'Sắp tới'}
          </Text>
          <View style={styles.distanceRow}>
            <MapPin color={theme.colors.secondary} size={16} />
            <Text variant="labelMedium" style={{ color: theme.colors.secondary, marginLeft: 4 }}>
              {`${item.distance} km`}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
          Chuyến đi của tôi
        </Text>
        <IconButton icon="filter-variant" size={24} onPress={() => {}} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ textAlign: 'center', marginTop: 40, color: theme.colors.error }}>{`Lỗi: ${error}`}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderTripCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => console.log('Add Trip')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // padding cho FAB
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cardCover: {
    height: 140,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardContent: {
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moreIcon: {
    margin: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});
