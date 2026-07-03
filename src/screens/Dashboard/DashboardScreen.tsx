import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Card, useTheme, Avatar } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { ChevronRight } from 'lucide-react-native';

export default function DashboardScreen() {
  const theme = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);
  const { items } = useSelector((state: RootState) => state.trips);

  const totalTrips = 12;
  const totalLocations = 58;
  const totalDistance = 5482;
  const totalPhotos = 356;
  const recentTrip = items.length > 0 ? items[0] : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            Xin chào, {user?.displayName || user?.email?.split('@')[0] || 'User'} 👋
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.secondary, marginTop: 4 }}>
            Hôm nay bạn muốn đi đâu?
          </Text>
        </View>
        <Avatar.Image size={48} source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?img=68' }} />
      </View>

      <View style={styles.statsGrid}>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} mode="elevated" elevation={1}>
          <Card.Content>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{totalTrips}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>Chuyến đi</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} mode="elevated" elevation={1}>
          <Card.Content>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{totalLocations}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>Địa điểm đã ghé</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} mode="elevated" elevation={1}>
          <Card.Content>
            <Text variant="headlineMedium" style={{ color: '#10B981', fontWeight: 'bold' }}>{totalDistance.toLocaleString('vi-VN')} <Text variant="titleMedium">km</Text></Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>Tổng quãng đường</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} mode="elevated" elevation={1}>
          <Card.Content>
            <Text variant="headlineMedium" style={{ color: '#F59E0B', fontWeight: 'bold' }}>{totalPhotos}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>Ảnh đã lưu</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
          Chuyến đi gần nhất
        </Text>
      </View>

      <Card style={styles.recentTripCard} mode="elevated" elevation={1}>
        <View style={styles.recentTripRow}>
          <Image 
            source={{ uri: recentTrip?.coverImage || recentTrip?.imageUrl || 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800' }} 
            style={styles.recentTripImage} 
          />
          <View style={styles.recentTripInfo}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }} numberOfLines={1}>{recentTrip?.title || 'Chưa có chuyến đi'}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginVertical: 4 }}>
              {recentTrip ? `${recentTrip.startDate} - ${recentTrip.endDate}` : 'Hãy thêm chuyến đi mới'}
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {recentTrip ? recentTrip.city : ''}
            </Text>
          </View>
          <ChevronRight color={theme.colors.secondary} size={24} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 16,
  },
  recentTripCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 40,
  },
  recentTripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  recentTripImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  recentTripInfo: {
    flex: 1,
    marginLeft: 16,
  }
});
