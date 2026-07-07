import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ImageBackground, Dimensions, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MapPin } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { translations } from '../../constants/translations';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const settings = useSelector((state: RootState) => state.settings);
  const texts = translations[settings.language].common;
  const [progress] = useState(new Animated.Value(0));
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    progress.addListener(({ value }) => {
      setPercent(Math.floor(value * 100));
    });

    Animated.timing(progress, {
      toValue: 1,
      duration: 2500, // 2.5 seconds loading simulation
      useNativeDriver: false,
    }).start(() => {
      if (onFinish) onFinish();
    });

    return () => progress.removeAllListeners();
  }, [progress, onFinish]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800' }} // Beautiful lake mountain scene
      style={styles.container}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MapPin color="#fff" size={48} />
            <View style={styles.starBadge}>
              <Text style={styles.starText}>★</Text>
            </View>
          </View>
          
          <Text style={styles.title}>Smart Travel</Text>
          <Text style={styles.subtitle}>{texts.loading}</Text>
        </View>

        <View style={styles.bottomContainer}>
          <Text style={styles.percentText}>{percent}%</Text>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    paddingBottom: 60,
    paddingTop: height * 0.3,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  starBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#e2e8f0',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomContainer: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  percentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  }
});
