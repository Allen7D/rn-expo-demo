import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import VideoPlayer from '@/components/VideoPlayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign } from '@expo/vector-icons';

// 历史记录的存储键
const HISTORY_STORAGE_KEY = 'video_history';

export default function VideoScreen() {
  // 当前播放的视频链接
  const [currentVideo, setCurrentVideo] = useState({
    uri: ''
  });

  // 输入框中的文本
  const [videoUrl, setVideoUrl] = useState('');

  // 历史记录列表
  const [history, setHistory] = useState<string[]>([]);

  // 加载历史记录
  useEffect(() => {
    loadHistory();
  }, []);

  // 从AsyncStorage加载历史记录
  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory !== null) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  // 保存历史记录到AsyncStorage
  const saveHistory = async (newHistory: string[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  };

  // 处理播放新视频
  const handlePlayVideo = () => {
    if (!videoUrl.trim()) {
      Alert.alert('提示', '请输入有效的视频链接');
      return;
    }

    // 更新当前播放的视频
    setCurrentVideo({ uri: videoUrl });

    // 更新历史记录
    const newHistory = [videoUrl, ...history.filter(url => url !== videoUrl)].slice(0, 10);
    setHistory(newHistory);
    saveHistory(newHistory);

    // 清空输入框
    setVideoUrl('');
  };

  // 从历史记录中播放视频
  const playFromHistory = (url: string) => {
    setCurrentVideo({ uri: url });
    // 将选中的条目移到历史记录的最前面
    const newHistory = [url, ...history.filter(item => item !== url)];
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  // 删除单个历史记录
  const deleteHistoryItem = (url: string) => {
    const newHistory = history.filter(item => item !== url);
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  // 清空所有历史记录
  const clearAllHistory = () => {
    if (history.length === 0) return;

    Alert.alert(
      '确认清空',
      '确定要清空所有历史记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            setHistory([]);
            saveHistory([]);
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 输入框和播放按钮 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={videoUrl}
          onChangeText={setVideoUrl}
          placeholder="请输入视频链接..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.button} onPress={handlePlayVideo}>
          <Text style={styles.buttonText}>播放</Text>
        </TouchableOpacity>
      </View>

      {/* 视频播放器 */}
      <View style={styles.videoContainer}>
        <VideoPlayer
          source={currentVideo}
          poster=""
        />
      </View>

      {/* 历史记录 */}
      {history.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>历史记录</Text>
            <TouchableOpacity onPress={clearAllHistory} style={styles.clearAllButton}>
              <Text style={styles.clearAllText}>清空</Text>
            </TouchableOpacity>
          </View>
          {history.map((url, index) => (
            <View key={index} style={styles.historyItemContainer}>
              <TouchableOpacity
                style={styles.historyItem}
                onPress={() => playFromHistory(url)}
              >
                <Text style={styles.historyText} numberOfLines={1} ellipsizeMode="middle">
                  {url}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteHistoryItem(url)}
              >
                <AntDesign name="close" size={18} color="#999" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  videoContainer: {
    marginVertical: 16,
  },
  historyContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearAllButton: {
    padding: 5,
  },
  clearAllText: {
    color: '#F44336',
    fontWeight: '500',
  },
  historyItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItem: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  historyText: {
    color: '#333',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginLeft: 8,
  },
});
