import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Appbar, Text, Card, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const notifications = [
  { id: '1', title: 'Cập nhật chuyến đi', description: 'Chuyến đi sắp tới của bạn sẽ bắt đầu vào ngày mai.' },
  { id: '2', title: 'Lời nhắc đặt vé', description: 'Đừng quên kiểm tra vé máy bay cho chuyến đi sắp tới.' },
  { id: '3', title: 'Ảnh mới', description: 'Ảnh mới đã được thêm vào thư viện.' },
];

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}> 
      <Appbar.Header style={[styles.appbar, { paddingTop: insets.top }]}> 
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Thông báo" />
      </Appbar.Header>
      <FlatList
        contentContainerStyle={styles.list}
        data={notifications}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationDescription}>{item.description}</Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appbar: {
    backgroundColor: '#2563EB',
    elevation: 0,
  },
  list: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 12,
  },
  notificationTitle: {
    fontWeight: '700',
  },
  notificationDescription: {
    marginTop: 8,
    color: '#475569',
  },
});
