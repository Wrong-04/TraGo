import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, List, useTheme, Button, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../features/store';
import { supabase } from '../../config/supabase';
import { User, Map, Image as ImageIcon, Bell, Settings, Sparkles } from 'lucide-react-native';
import { translations } from '../../constants/translations';

export default function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const settings = useSelector((state: RootState) => state.settings);
  const { items } = useSelector((state: RootState) => state.trips);
  const { locations } = useSelector((state: RootState) => state.map);
  const texts = translations[settings.language].profile;
  
  const totalTrips = items.length;
  const totalLocations = locations.length;
  const totalDistance = items.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0);
  const distanceValue = settings.distanceUnit === 'Miles' ? totalDistance * 0.621371 : totalDistance;
  const distanceUnit = settings.distanceUnit === 'Miles' ? translations[settings.language].common.miles : translations[settings.language].common.kilometers;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Avatar.Image size={80} source={{ uri: user?.photoURL || 'https://i.pravatar.cc/150?img=68' }} />
        <Text variant="titleLarge" style={[styles.name, { color: theme.colors.onSurface }]}>
          {user?.displayName || texts.userPlaceholder}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
          {user?.email || ''}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{totalTrips}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>{texts.trips}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{totalLocations}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>{texts.locations}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{distanceValue.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>{texts.distance} ({distanceUnit})</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Item
          title={texts.personalInfo}
          left={props => <List.Icon {...props} icon={() => <User color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ProfileInfo')}
        />
        <Divider />
        <List.Item
          title={texts.savedTrips}
          left={props => <List.Icon {...props} icon={() => <Map color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('TripsTab')}
        />
        <Divider />
        <List.Item
          title={texts.savedPhotos}
          left={props => <List.Icon {...props} icon={() => <ImageIcon color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('GalleryTab')}
        />
        <Divider />
        <List.Item
          title={texts.aiPlanner}
          left={props => <List.Icon {...props} icon={() => <Sparkles color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('AIPlanner')}
        />
        <Divider />
        <List.Item
          title={texts.notifications}
          left={props => <List.Icon {...props} icon={() => <Bell color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Notifications')}
        />
        <Divider />
        <List.Item
          title={texts.settings}
          left={props => <List.Icon {...props} icon={() => <Settings color="#64748B" size={24} />} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Settings')}
        />
      </View>

      <Button 
        mode="outlined" 
        onPress={handleLogout} 
        textColor={theme.colors.error}
        style={[styles.logoutBtn, { borderColor: theme.colors.error, marginHorizontal: 20, marginBottom: 40 }]}
      >
        {translations[settings.language].common.logout}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  name: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    paddingHorizontal: 40,
    width: '100%',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  logoutBtn: {
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 16,
  }
});
