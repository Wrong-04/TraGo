import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { ArrowLeft, Bell, Map, Image as ImageIcon, CheckCircle2, Circle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { items: trips } = useSelector((state: RootState) => state.trips);
  const { images } = useSelector((state: RootState) => state.gallery);

  const [localReads, setLocalReads] = useState<Record<string, boolean>>({});

  const notifications = React.useMemo(() => {
    const notifs = [];
    
    // Check for upcoming trips
    const upcomingTrips = trips.filter(t => new Date(t.startDate) > new Date());
    if (upcomingTrips.length > 0) {
      notifs.push({
        id: 'trip_upcoming',
        type: 'trip',
        title: 'Chuyến đi sắp tới',
        description: `Bạn có chuyến đi "${upcomingTrips[0].title}" sắp diễn ra. Nhớ chuẩn bị hành trang nhé!`,
        isRead: !!localReads['trip_upcoming'],
        time: 'Vừa xong'
      });
    }

    // Check gallery
    if (images.length > 0) {
      notifs.push({
        id: 'photo_recent',
        type: 'photo',
        title: 'Thư viện ảnh',
        description: `Bạn đã lưu ${images.length} bức ảnh tuyệt đẹp trong thư viện.`,
        isRead: localReads['photo_recent'] !== false, // default true
        time: 'Gần đây'
      });
    }

    if (notifs.length === 0) {
      notifs.push({
        id: 'welcome',
        type: 'reminder',
        title: 'Chào mừng đến với TraGo',
        description: 'Hãy bắt đầu lên kế hoạch cho chuyến đi đầu tiên của bạn!',
        isRead: !!localReads['welcome'],
        time: 'Hôm nay'
      });
    }

    return notifs;
  }, [trips, images, localReads]);

  const markAllAsRead = () => {
    const newReads = { ...localReads };
    notifications.forEach(n => {
      newReads[n.id] = true;
    });
    setLocalReads(newReads);
  };

  const markAsRead = (id: string) => {
    setLocalReads(prev => ({ ...prev, [id]: true }));
  };



  const getIconForType = (type: string) => {
    switch(type) {
      case 'trip': return <Map color="#3B82F6" size={24} />;
      case 'photo': return <ImageIcon color="#F59E0B" size={24} />;
      case 'reminder': default: return <Bell color="#EC4899" size={24} />;
    }
  };

  const getBgForType = (type: string) => {
    switch(type) {
      case 'trip': return '#EFF6FF';
      case 'photo': return '#FEF3C7';
      case 'reminder': default: return '#FCE7F3';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      
      {/* ─── Premium Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft color="#0F172A" size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
              <CheckCircle2 color="#4F46E5" size={16} />
              <Text style={styles.markReadText}>Đánh dấu đã đọc</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount} mới</Text>
            </View>
          )}
        </View>
      </View>

      {/* ─── List ─── */}
      <FlatList
        contentContainerStyle={styles.list}
        data={notifications}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => markAsRead(item.id)}
            style={[
              styles.card, 
              !item.isRead && styles.cardUnread
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: getBgForType(item.type) }]}>
              {getIconForType(item.type)}
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, !item.isRead && styles.textUnread]}>
                  {item.title}
                </Text>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            {!item.isRead && (
              <View style={styles.unreadDot} />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Bell color="#CBD5E1" size={48} />
            <Text style={styles.emptyText}>Bạn không có thông báo nào</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  markReadText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 13,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F8FAFC',
    borderCurve: 'continuous',
  },
  cardUnread: {
    backgroundColor: '#FAFAFA',
    borderColor: '#EEF2FF',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  textUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    position: 'absolute',
    top: 24,
    right: 16,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
