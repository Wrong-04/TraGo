import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';

export default function DashboardScreen() {
  const theme = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={{ marginBottom: 16, fontWeight: 'bold' }}>
        Xin chào, {user?.email || 'User'}!
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Tổng quan chuyến đi</Text>
          <Text variant="bodyMedium" style={{ marginTop: 8 }}>
            Bạn chưa có chuyến đi nào gần đây. Hãy tạo một hành trình mới nhé!
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={() => {}}>Thêm chuyến đi</Button>
        </Card.Actions>
      </Card>

      <Button mode="outlined" onPress={handleLogout} style={{ marginTop: 24 }}>
        Đăng xuất
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 64, // SafeArea padding top
  },
  card: {
    marginTop: 16,
  }
});
