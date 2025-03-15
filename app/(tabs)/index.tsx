import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, type SharedValue } from 'react-native-reanimated';

// 获取屏幕宽度以适配不同设备
const { width } = Dimensions.get('window');
const cardSize = width * 0.38;  // 卡片大小为屏幕宽度的38%
const cardMargin = width * 0.03; // 边距为屏幕宽度的3%

export default function HomeScreen() {
  // 创建动画值
  const animateScale = useSharedValue(1);
  
  // 各个卡片的动画样式
  const animateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: animateScale.value }]
    };
  });

  // 点击动画函数
  const animatePress = (animValue: SharedValue<number>) => {
    'worklet';
    animValue.value = withSpring(0.9, { damping: 10 });
    setTimeout(() => {
      animValue.value = withSpring(1, { damping: 10 });
    }, 100);
  };
  
  // 跳转函数
  const navigateTo = (screen: string, animValue: SharedValue<number>) => {
    animatePress(animValue);
    setTimeout(() => {
      router.push(screen as any); // 临时修复类型问题
    }, 150); // 添加延迟以便看到动画效果
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>English Learning</Text>
        <Text style={styles.subtitle}>快乐学习，轻松成长</Text>
      </View>
      
      <View style={styles.grid}>
        {/* 听力模块 */}
        <Animated.View style={[styles.cardContainer, animateStyle]}>
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: '#FF9AA2' }]} 
            onPress={() => navigateTo('/listen', animateScale)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <FontAwesome5 name="headphones" size={48} color="#fff" />
            </View>
            <Text style={styles.cardText}>听</Text>
            <Text style={styles.cardDescription}>听力练习</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* 口语模块 */}
        <Animated.View style={[styles.cardContainer, animateStyle]}>
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: '#FFDAC1' }]} 
            onPress={() => navigateTo('/speak', animateScale)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <FontAwesome5 name="microphone" size={48} color="#fff" />
            </View>
            <Text style={styles.cardText}>说</Text>
            <Text style={styles.cardDescription}>口语练习</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* 阅读模块 */}
        <Animated.View style={[styles.cardContainer, animateStyle]}>
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: '#B5EAD7' }]} 
            onPress={() => navigateTo('/read', animateScale)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="menu-book" size={48} color="#fff" />
            </View>
            <Text style={styles.cardText}>读</Text>
            <Text style={styles.cardDescription}>阅读练习</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* 写作模块 */}
        <Animated.View style={[styles.cardContainer, animateStyle]}>
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: '#C7CEEA' }]} 
            onPress={() => navigateTo('/write', animateScale)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="pencil" size={48} color="#fff" />
            </View>
            <Text style={styles.cardText}>写</Text>
            <Text style={styles.cardDescription}>写作练习</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>让学习充满乐趣!</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    margin: cardMargin,
  },
  card: {
    width: cardSize,
    height: cardSize,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    marginBottom: 12,
  },
  cardText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  }
});
