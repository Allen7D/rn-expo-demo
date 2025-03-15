import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import VideoPlayer from '@/components/VideoPlayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

// 历史记录的存储键
const HISTORY_STORAGE_KEY = 'video_history';

// 视频来源类型
interface VideoSource {
  uri: string;
  isLocal?: boolean;
  name?: string;
}

export default function VideoScreen() {
  // 当前播放的视频链接
  const [currentVideo, setCurrentVideo] = useState<VideoSource>({
    uri: ''
  });

  // 输入框中的文本
  const [videoUrl, setVideoUrl] = useState('');

  // 历史记录列表
  const [history, setHistory] = useState<VideoSource[]>([]);

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
  const saveHistory = async (newHistory: VideoSource[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  };

  // 处理播放网络视频
  const handlePlayVideo = () => {
    if (!videoUrl.trim()) {
      Alert.alert('提示', '请输入有效的视频链接');
      return;
    }

    const newVideo = { uri: videoUrl, isLocal: false };
    
    // 更新当前播放的视频
    setCurrentVideo(newVideo);

    // 更新历史记录
    const newHistory = [newVideo, ...history.filter(item => item.uri !== videoUrl)].slice(0, 10);
    setHistory(newHistory);
    saveHistory(newHistory);

    // 清空输入框
    setVideoUrl('');
  };

  // 选择本地视频
  const pickLocalVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        // 用户取消了选择
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name || '本地视频';
      
      const newVideo = {
        uri: fileUri,
        isLocal: true,
        name: fileName
      };

      // 更新当前播放视频
      setCurrentVideo(newVideo);

      // 更新历史记录
      const newHistory = [newVideo, ...history.filter(item => item.uri !== fileUri)].slice(0, 10);
      setHistory(newHistory);
      saveHistory(newHistory);
      
    } catch (error) {
      console.error('选择视频失败:', error);
      Alert.alert('错误', '无法选择视频文件');
    }
  };

  // 从历史记录中播放视频
  const playFromHistory = (video: VideoSource) => {
    setCurrentVideo(video);
    // 将选中的条目移到历史记录的最前面
    const newHistory = [video, ...history.filter(item => item.uri !== video.uri)];
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  // 删除单个历史记录
  const deleteHistoryItem = (video: VideoSource) => {
    const newHistory = history.filter(item => item.uri !== video.uri);
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

  // 获取显示名称
  const getDisplayName = (video: VideoSource) => {
    if (video.isLocal && video.name) {
      return video.name;
    }
    return video.uri;
  };

  return (
    <ScrollView style={styles.container}>
      {/* 输入框和按钮 */}
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
      
      {/* 选择本地视频按钮 */}
      <TouchableOpacity style={styles.localVideoButton} onPress={pickLocalVideo}>
        <AntDesign name="folderopen" size={16} color="#fff" />
        <Text style={styles.localVideoButtonText}>选择本地视频</Text>
      </TouchableOpacity>

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
          {history.map((video, index) => (
            <View key={index} style={styles.historyItemContainer}>
              <TouchableOpacity
                style={styles.historyItem}
                onPress={() => playFromHistory(video)}
              >
                <AntDesign 
                  name={video.isLocal ? "folder1" : "link"} 
                  size={16} 
                  color="#666"
                  style={styles.historyIcon} 
                />
                <Text style={styles.historyText} numberOfLines={1} ellipsizeMode="middle">
                  {getDisplayName(video)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteHistoryItem(video)}
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
  localVideoButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  localVideoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  historyIcon: {
    marginRight: 8,
  },
  historyText: {
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginLeft: 8,
  },
});
