import { Tabs } from 'expo-router';
import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// 创建一个上下文来共享全屏状态
export const FullscreenContext = createContext({
  isFullscreen: false,
  setFullscreen: (value: boolean) => {}
});

// 提供一个钩子函数来使用全屏上下文
export const useFullscreen = () => useContext(FullscreenContext);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isFullscreen, setFullscreen] = useState(false);

  return (
    <FullscreenContext.Provider value={{ isFullscreen, setFullscreen }}>
      <Tabs
        // 通用的 TabBar 样式配置（对子集生效）
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint, // 激活时的颜色
          headerShown: !isFullscreen, // 是否隐藏 Header
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: isFullscreen ? { display: 'none' } : Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {
            },
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
            // TabBar 的小徽章
            tabBarBadge: '9',
            tabBarBadgeStyle: {
              color: '#fff',
              backgroundColor: '#2196F3',
            }
          }}
        />
        <Tabs.Screen
          name="camera"
          options={{
            title: 'Camera',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="listen"
          options={{
            title: 'Listen',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
          }}
        />
      </Tabs>
    </FullscreenContext.Provider>
  );
}
