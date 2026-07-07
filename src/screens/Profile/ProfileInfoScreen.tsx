import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Text, Avatar, Card, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../features/store';

export default function ProfileInfoScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}> 
      <Appbar.Header style={[styles.appbar, { paddingTop: insets.top }]}> 
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Thông tin cá nhân" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar.Image size={100} source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?img=68' }} />
          <Text variant="titleLarge" style={styles.name}>{user?.displayName || 'Người dùng'}</Text>
          <Text variant="bodyMedium" style={styles.email}>{user?.email || 'user@example.com'}</Text>
        </View>

        <Card mode="elevated" style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Chi tiết</Text>
            <Divider style={styles.divider} />
            <Text style={styles.rowLabel}>Tên:</Text>
            <Text style={styles.rowValue}>{user?.displayName || 'Người dùng'}</Text>
            <Text style={styles.rowLabel}>Email:</Text>
            <Text style={styles.rowValue}>{user?.email || 'user@example.com'}</Text>
            <Text style={styles.rowLabel}>ID người dùng:</Text>
            <Text style={styles.rowValue}>{user?.uid || '-'}</Text>
          </Card.Content>
        </Card>
      </ScrollView>
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
  content: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#3B82F6',
  },
  name: {
    marginTop: 16,
    color: '#fff',
    fontWeight: '700',
  },
  email: {
    marginTop: 6,
    color: '#E2E8F0',
  },
  card: {
    margin: 20,
    borderRadius: 20,
  },
  cardTitle: {
    marginBottom: 12,
    fontWeight: '700',
  },
  divider: {
    marginVertical: 12,
  },
  rowLabel: {
    fontWeight: '700',
    marginTop: 12,
    color: '#475569',
  },
  rowValue: {
    marginTop: 4,
    color: '#0F172A',
  },
});
