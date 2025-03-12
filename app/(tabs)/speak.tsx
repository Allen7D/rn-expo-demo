import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

// 录音项目接口定义
interface RecordingItem {
  id: string; // 使用时间戳作为ID
  uri: string;
  name: string;
  duration: number; // 录音时长（毫秒）
  date: Date; // 录制日期
}

// 口语练习主屏幕
export default function SpeakScreen() {
  // 状态管理
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newRecordingName, setNewRecordingName] = useState('');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  // 按住录音动画
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordButtonSize = useRef(new Animated.Value(80)).current;
  
  // 启动时初始化
  useEffect(() => {
    const setup = async () => {
      await setupRecordingDirectory();
      await requestPermissions();
      await loadRecordings();
      setIsLoading(false);
    };
    
    setup();
    
    // 清理音频资源
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);
  
  // 创建录音文件夹
  const setupRecordingDirectory = async () => {
    try {
      const dir = FileSystem.documentDirectory + 'recordings/';
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    } catch (error) {
      console.error('创建录音目录失败:', error);
    }
  };
  
  // 加载已有录音列表
  const loadRecordings = async () => {
    try {
      const dir = FileSystem.documentDirectory + 'recordings/';
      const files = await FileSystem.readDirectoryAsync(dir);
      
      // 读取每个录音的元数据文件
      const recordingsData: RecordingItem[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = dir + file;
          const content = await FileSystem.readAsStringAsync(filePath);
          const metadata = JSON.parse(content);
          
          // 确保音频文件存在
          const audioPath = dir + metadata.id + '.m4a';
          const audioExists = await FileSystem.getInfoAsync(audioPath);
          
          if (audioExists.exists) {
            recordingsData.push({
              id: metadata.id,
              uri: audioPath,
              name: metadata.name,
              duration: metadata.duration,
              date: new Date(metadata.date),
            });
          }
        }
      }
      
      // 按日期排序，最新的在前面
      recordingsData.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRecordings(recordingsData);
      
    } catch (error) {
      console.error('加载录音失败:', error);
      Alert.alert('错误', '加载录音列表失败');
    }
  };
  
  // 请求录音权限
  const requestPermissions = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert(
          '需要权限',
          '请授予麦克风使用权限，以便录制音频。',
          [{ text: '好的' }]
        );
      }
      
      // 配置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
    } catch (error) {
      console.error('请求权限失败:', error);
      Alert.alert('错误', '无法获取录音权限');
    }
  };
  
  // 开始录音（按下按钮时）
  const startRecording = async () => {
    try {
      // 震动反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // 配置录音
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // 创建新录音
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecordingInstance(recording);
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      
      // 开始动画
      startPulseAnimation();
      animateRecordButton(100);
      
    } catch (error) {
      console.error('录音失败:', error);
      Alert.alert('错误', '无法开始录音');
      setIsRecording(false);
    }
  };
  
  // 停止录音（松开按钮时）
  const stopRecording = async () => {
    try {
      if (!recordingInstance) return;
      
      // 震动反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // 停止动画
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }).stop();
      animateRecordButton(80);
      
      // 获取录音时长
      const endTime = Date.now();
      const duration = recordingStartTime ? endTime - recordingStartTime : 0;
      
      // 如果录音太短（小于1秒），则放弃这次录音
      if (duration < 1000) {
        await recordingInstance.stopAndUnloadAsync();
        setIsRecording(false);
        setRecordingInstance(null);
        Alert.alert('录音太短', '录音时间太短，请长按按钮录制更长的音频');
        return;
      }
      
      // 停止录音并保存
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      
      if (!uri) {
        throw new Error('录音URI为空');
      }
      
      // 生成唯一ID并创建元数据
      const id = Date.now().toString();
      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      const newRecording: RecordingItem = {
        id,
        uri: FileSystem.documentDirectory + 'recordings/' + id + '.m4a',
        name: `录音 ${formattedDate}`,
        duration,
        date,
      };
      
      // 复制录音文件到应用目录
      await FileSystem.copyAsync({
        from: uri,
        to: newRecording.uri,
      });
      
      // 保存元数据
      const metadataPath = FileSystem.documentDirectory + 'recordings/' + id + '.json';
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify({
          id,
          name: newRecording.name,
          duration,
          date: date.toISOString(),
        })
      );
      
      // 更新状态
      setRecordings(prev => [newRecording, ...prev]);
      setIsRecording(false);
      setRecordingInstance(null);
      
    } catch (error) {
      console.error('停止录音失败:', error);
      Alert.alert('错误', '无法保存录音');
      setIsRecording(false);
      setRecordingInstance(null);
    }
  };
  
  // 播放录音
  const playRecording = async (recordingItem: RecordingItem) => {
    try {
      // 如果正在录音，不能播放
      if (isRecording) return;
      
      // 如果有正在播放的录音，先停止
      if (isPlaying) {
        await stopPlaying();
      }
      
      // 配置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      // 加载并播放录音
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingItem.uri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setCurrentPlayingId(recordingItem.id);
      
      // 监听播放完成事件
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentPlayingId(null);
        }
      });
      
    } catch (error) {
      console.error('播放录音失败:', error);
      Alert.alert('错误', '无法播放录音');
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  };
  
  // 停止播放
  const stopPlaying = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setCurrentPlayingId(null);
  };
  
  // 删除录音
  const deleteRecording = async (id: string) => {
    try {
      // 如果正在播放这个录音，先停止
      if (currentPlayingId === id && isPlaying) {
        await stopPlaying();
      }
      
      // 删除文件
      const audioPath = FileSystem.documentDirectory + 'recordings/' + id + '.m4a';
      const metadataPath = FileSystem.documentDirectory + 'recordings/' + id + '.json';
      
      await FileSystem.deleteAsync(audioPath);
      await FileSystem.deleteAsync(metadataPath);
      
      // 更新状态
      setRecordings(prev => prev.filter(item => item.id !== id));
      
    } catch (error) {
      console.error('删除录音失败:', error);
      Alert.alert('错误', '无法删除录音');
    }
  };
  
  // 确认删除对话框
  const confirmDelete = (id: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这条录音吗？此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => deleteRecording(id) }
      ]
    );
  };
  
  // 重命名录音
  const renameRecording = async (id: string, newName: string) => {
    try {
      // 找到要重命名的录音
      const recordingToRename = recordings.find(item => item.id === id);
      if (!recordingToRename) return;
      
      // 更新元数据文件
      const metadataPath = FileSystem.documentDirectory + 'recordings/' + id + '.json';
      const metadataContent = await FileSystem.readAsStringAsync(metadataPath);
      const metadata = JSON.parse(metadataContent);
      
      metadata.name = newName;
      
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(metadata)
      );
      
      // 更新状态
      setRecordings(prev => 
        prev.map(item => 
          item.id === id ? { ...item, name: newName } : item
        )
      );
      
    } catch (error) {
      console.error('重命名录音失败:', error);
      Alert.alert('错误', '无法重命名录音');
    }
  };
  
  // 显示重命名对话框
  const showRenameDialog = (item: RecordingItem) => {
    setSelectedRecordingId(item.id);
    setNewRecordingName(item.name);
    setRenameModalVisible(true);
  };
  
  // 处理重命名
  const handleRename = () => {
    if (selectedRecordingId && newRecordingName.trim()) {
      renameRecording(selectedRecordingId, newRecordingName.trim());
      setRenameModalVisible(false);
    }
  };
  
  // 格式化时长
  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // 脉冲动画
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  // 录音按钮大小动画
  const animateRecordButton = (size: number) => {
    Animated.spring(recordButtonSize, {
      toValue: size,
      friction: 5,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };
  
  // 渲染录音项
  const renderRecordingItem = ({ item }: { item: RecordingItem }) => {
    const isItemPlaying = isPlaying && currentPlayingId === item.id;
    
    return (
      <View style={styles.recordingItem}>
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingName}>{item.name}</Text>
          <Text style={styles.recordingDate}>
            {`${item.date.getFullYear()}-${(item.date.getMonth()+1).toString().padStart(2, '0')}-${item.date.getDate().toString().padStart(2, '0')} ${item.date.getHours().toString().padStart(2, '0')}:${item.date.getMinutes().toString().padStart(2, '0')}`} · {formatDuration(item.duration)}
          </Text>
        </View>
        
        <View style={styles.recordingActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => isItemPlaying ? stopPlaying() : playRecording(item)}
          >
            <MaterialIcons 
              name={isItemPlaying ? "stop" : "play-arrow"} 
              size={28} 
              color={isItemPlaying ? '#f44336' : '#2196F3'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => showRenameDialog(item)}
          >
            <MaterialIcons name="edit" size={24} color="#757575" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => confirmDelete(item.id)}
          >
            <MaterialIcons name="delete" size={24} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // 如果正在加载，显示加载指示器
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* 标题 */}
      <View style={styles.header}>
        <Text style={styles.title}>口语练习</Text>
        <Text style={styles.subtitle}>长按录音按钮开始练习</Text>
      </View>
      
      {/* 录音列表 */}
      {recordings.length > 0 ? (
        <FlatList
          data={recordings}
          renderItem={renderRecordingItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="microphone-alt" size={50} color="#BDBDBD" />
          <Text style={styles.emptyText}>还没有录音</Text>
          <Text style={styles.emptySubtext}>长按下方按钮开始录制</Text>
        </View>
      )}
      
      {/* 录音按钮 */}
      <View style={styles.recordButtonContainer}>
        <Animated.View 
          style={[
            styles.pulseCircle,
            { 
              transform: [{ scale: pulseAnim }],
              opacity: isRecording ? 0.3 : 0 
            }
          ]} 
        />
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={({ pressed }) => [
            styles.recordButtonOuter,
            pressed && styles.recordButtonPressed
          ]}
        >
          <Animated.View 
            style={[
              styles.recordButton,
              { width: recordButtonSize, height: recordButtonSize }
            ]}
          >
            <MaterialIcons 
              name={isRecording ? "mic" : "mic-none"} 
              size={40} 
              color="white" 
            />
          </Animated.View>
        </Pressable>
      </View>
      
      {/* 重命名对话框 */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>重命名录音</Text>
            <TextInput
              style={styles.modalInput}
              value={newRecordingName}
              onChangeText={setNewRecordingName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRename}
              >
                <Text style={styles.confirmButtonText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  recordingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  recordingDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  recordButtonContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  recordButtonPressed: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2196F3',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#757575',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#333',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});