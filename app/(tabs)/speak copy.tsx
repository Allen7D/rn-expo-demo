import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  SectionList,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons, FontAwesome5, Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

// 定义常量，避免魔法字符串
const RECORDINGS_DIR = FileSystem.documentDirectory + 'recordings/';
const HIGH_QUALITY_RECORDING = Audio.RecordingOptionsPresets.HIGH_QUALITY;
const TIMER_UPDATE_INTERVAL = 100; // 毫秒

// 录音项目接口定义
interface RecordingItem {
  id: string; // 使用时间戳作为ID
  uri: string;
  name: string;
  duration: number; // 录音时长（毫秒）
  date: Date; // 录制日期
  month?: string; // 月份分组，例如 "3月"
}

// 分组数据接口
interface Section {
  title: string;
  data: RecordingItem[];
}

// 口语练习主屏幕
export default function SpeakScreen() {
  // 状态管理
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newRecordingName, setNewRecordingName] = useState('');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupedRecordings, setGroupedRecordings] = useState<Section[]>([]);
  
  // 录音计时器
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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
      stopTimer();
    };
  }, []);
  
  // 当录音列表变化时，更新分组
  useEffect(() => {
    groupRecordingsByMonth();
  }, [recordings]);
  
  // 创建录音文件夹
  const setupRecordingDirectory = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
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
      
      // 过滤出JSON元数据文件
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      // 使用Promise.all并行处理文件读取
      const recordingsData = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const filePath = dir + file;
            const content = await FileSystem.readAsStringAsync(filePath);
            const metadata = JSON.parse(content);
            
            // 确保音频文件存在
            const audioPath = dir + metadata.id + '.m4a';
            const audioExists = await FileSystem.getInfoAsync(audioPath);
            
            if (audioExists.exists) {
              return {
                id: metadata.id,
                uri: audioPath,
                name: metadata.name,
                duration: metadata.duration,
                date: new Date(metadata.date),
              };
            }
            return null;
          } catch (err) {
            console.error(`处理文件 ${file} 失败:`, err);
            return null;
          }
        })
      );
      
      // 过滤掉null值并按日期排序
      const validRecordings = recordingsData
        .filter(item => item !== null) as RecordingItem[];
      
      validRecordings.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRecordings(validRecordings);
      
    } catch (error) {
      console.error('加载录音失败:', error);
      Alert.alert('错误', '加载录音列表失败');
    }
  };
  
  // 播放录音
  const playRecording = async (recordingItem: RecordingItem) => {
    try {
      // 如果已经有声音在播放，先停止它
      if (sound) {
        await sound.unloadAsync();
      }
      
      // 停止当前的录音（如果有）
      if (isRecording) {
        await stopRecording();
      }
      
      // 震动反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // 创建并加载声音
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingItem.uri },
        { shouldPlay: true },
        (status) => {
          // 当播放结束时更新状态
          if (status.isLoaded && !status.isPlaying && status.positionMillis > 0) {
            setIsPlaying(false);
            setCurrentPlayingId(null);
          }
        }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setCurrentPlayingId(recordingItem.id);
      
    } catch (error) {
      console.error('播放录音失败:', error);
      Alert.alert('错误', '无法播放录音');
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  };
  
  // 使用useMemo优化按月份分组，避免不必要的重新计算
  const groupRecordingsByMonth = React.useCallback(() => {
    if (recordings.length === 0) {
      setGroupedRecordings([]);
      return;
    }
    
    // 创建月份分组映射
    const groupsMap = new Map<string, RecordingItem[]>();
    
    // 处理搜索过滤
    const filteredRecordings = searchQuery 
      ? recordings.filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : recordings;
    
    // 分组录音
    filteredRecordings.forEach(recording => {
      const date = recording.date;
      const month = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      
      if (!groupsMap.has(month)) {
        groupsMap.set(month, []);
      }
      
      groupsMap.get(month)?.push({...recording, month});
    });
    
    // 转换为SectionList数据格式
    const groups: Section[] = Array.from(groupsMap.entries())
      .map(([title, data]) => ({
        title,
        data,
      }))
      .sort((a, b) => {
        // 按时间倒序排列，最新的月份在前面
        const monthA = a.title;
        const monthB = b.title;
        return monthB.localeCompare(monthA);
      });
    
    setGroupedRecordings(groups);
  }, [recordings, searchQuery]);
  
  // 当录音列表或搜索查询变化时更新分组
  useEffect(() => {
    groupRecordingsByMonth();
  }, [recordings, searchQuery, groupRecordingsByMonth]);
  
  // 请求录音权限
  const requestPermissions = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert(
          '需要权限',
          '请授予麦克风使用权限，以便录制音频。没有此权限将无法录音。',
          [
            { 
              text: '去设置', 
              onPress: () => {
                // 如果平台支持，引导用户前往设置页面
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              } 
            },
            { text: '取消', style: 'cancel' }
          ]
        );
        return false;
      }
      
      // 配置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      
      return true;
    } catch (error) {
      console.error('获取麦克风权限失败:', error);
      return false;
    }
  };
  
  // 开始计时器
  const startTimer = useCallback(() => {
    // 清理之前的计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // 仅在非暂停状态重置时间
    if (!isPaused) {
      setRecordingDuration(0);
      setRecordingStartTime(Date.now());
    }
    
    // 使用更高频率的更新以获得更平滑的计时显示
    timerRef.current = setInterval(() => {
      setRecordingDuration(prevDuration => {
        if (isPaused) {
          return prevDuration;
        } else {
          return Date.now() - (recordingStartTime || Date.now());
        }
      });
    }, TIMER_UPDATE_INTERVAL);
  }, [isPaused, recordingStartTime]);
  
  // 停止计时器
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  // 开始录音
  const startRecording = async () => {
    try {
      // 如果已经在录音但暂停了，就恢复录音而不是重新开始
      if (isRecording && isPaused && recordingInstance) {
        return resumeRecording();
      }
      
      // 如果已经在录音，不重复创建
      if (isRecording && recordingInstance) {
        return;
      }
      
      // 震动反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // 确保获取录音权限
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('没有获得麦克风权限，无法开始录音');
        return;
      }
      
      // 创建新录音 - 使用正确的预设常量
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      // 显式启动录音，确保录音开始
      await recording.startAsync();
      
      // 设置状态
      setRecordingInstance(recording);
      setIsRecording(true);
      setIsPaused(false);
      
      // 重置计时器状态
      setRecordingDuration(0);
      setRecordingStartTime(Date.now());
      startTimer();
      
    } catch (error) {
      console.error('录音失败:', error);
      Alert.alert('错误', '无法开始录音，请确保已授予麦克风权限，并尝试重启应用。');
      setIsRecording(false);
      setRecordingInstance(null); // 确保在错误时清理录音实例
    }
  };
  
  // 暂停录音
  const pauseRecording = async () => {
    try {
      if (!recordingInstance) return;
      
      // 震动反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      await recordingInstance.pauseAsync();
      setIsPaused(true);
      
    } catch (error) {
      console.error('暂停录音失败:', error);
      Alert.alert('错误', '无法暂停录音');
    }
  };
  
  // 继续录音
  const resumeRecording = async () => {
    try {
      if (!recordingInstance) return;
      
      // 震动反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // 尝试准备录音，如果已准备则捕获错误并继续
      try {
        await recordingInstance.prepareToRecordAsync();
      } catch (prepareError) {
        console.log('录音已准备好，继续录制');
      }
      
      // 启动录音
      await recordingInstance.startAsync();
      
      // 更新状态
      setIsPaused(false);
      
      // 确保计时器从正确的时间点继续
      const currentTime = Date.now();
      setRecordingStartTime(currentTime - recordingDuration);
      
    } catch (error) {
      console.error('继续录音失败:', error);
      Alert.alert('错误', '无法继续录音');
    }
  };
  
  // 废弃当前录音
  const discardRecording = async () => {
    try {
      if (!recordingInstance) return;
      
      // 震动反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await recordingInstance.stopAndUnloadAsync();
      setRecordingInstance(null);
      setIsRecording(false);
      setIsPaused(false);
      setRecordingDuration(0);
      stopTimer();
      
    } catch (error) {
      console.error('废弃录音失败:', error);
      Alert.alert('错误', '无法废弃录音');
    }
  };
  
  // 停止录音
  const stopRecording = async () => {
    try {
      if (!recordingInstance) return;
      
      // 震动反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // 停止计时器前保存最后的录音时长
      const finalDuration = recordingDuration;
      stopTimer();
      
      // 如果录音太短（小于1秒），则放弃这次录音
      if (finalDuration < 1000) {
        await recordingInstance.stopAndUnloadAsync();
        setIsRecording(false);
        setIsPaused(false);
        setRecordingInstance(null);
        Alert.alert('录音太短', '录音时间太短，请录制更长的音频');
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
      
      // 创建自动命名，格式为：周几 上午/下午HH点MM分
      const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekDay = weekDays[date.getDay()];
      const hour = date.getHours();
      const isAM = hour < 12;
      const hour12 = isAM ? (hour === 0 ? 12 : hour) : (hour === 12 ? 12 : hour - 12);
      const minute = date.getMinutes();
      
      const autoName = `周${weekDay} ${isAM ? '上午' : '下午'}${hour12.toString().padStart(2, '0')}点${minute.toString().padStart(2, '0')}分`;
      
      const newRecording: RecordingItem = {
        id,
        uri: FileSystem.documentDirectory + 'recordings/' + id + '.m4a',
        name: autoName,
        duration: finalDuration,
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
          duration: finalDuration,
          date: date.toISOString(),
        })
      );
      
      // 更新状态
      setRecordings(prev => [newRecording, ...prev]);
      setIsRecording(false);
      setIsPaused(false);
      setRecordingInstance(null);
      setRecordingDuration(0);
      
    } catch (error) {
      console.error('停止录音失败:', error);
      Alert.alert('错误', '无法保存录音');
      setIsRecording(false);
      setIsPaused(false);
      setRecordingInstance(null);
      setRecordingDuration(0);
    }
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
  const showRenameDialog = useCallback((item: RecordingItem) => {
    setSelectedRecordingId(item.id);
    setNewRecordingName(item.name);
    setRenameModalVisible(true);
  }, []);
  
  // 处理重命名
  const handleRename = useCallback(() => {
    if (selectedRecordingId && newRecordingName.trim()) {
      renameRecording(selectedRecordingId, newRecordingName.trim());
      setRenameModalVisible(false);
    }
  }, [selectedRecordingId, newRecordingName]);
  
  // 搜索录音
  const filterRecordings = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  
  // 确认删除对话框
  const confirmDelete = useCallback((id: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这条录音吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => deleteRecording(id) }
      ]
    );
  }, []);
  
  // 格式化录音时长
  const formatDuration = useCallback((milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  
  // 使用useCallback优化常用函数，避免不必要的重新渲染
  const renderRecordingItem = React.useCallback(({ item }: { item: RecordingItem }) => {
    const isCurrentlyPlaying = isPlaying && currentPlayingId === item.id;
    
    return (
      <View style={styles.recordingItem}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => isCurrentlyPlaying ? stopPlaying() : playRecording(item)}
        >
          <MaterialIcons
            name={isCurrentlyPlaying ? "stop" : "play-arrow"}
            size={28}
            color={isCurrentlyPlaying ? '#f44336' : '#757575'}
          />
        </TouchableOpacity>
        
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingName}>{item.name}</Text>
          <Text style={styles.recordingMeta}>
            {formatDuration(item.duration)}
          </Text>
        </View>
        
        <View style={styles.recordingActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => showRenameDialog(item)}
          >
            <MaterialIcons name="edit" size={22} color="#757575" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => confirmDelete(item.id)}
          >
            <MaterialIcons name="delete" size={22} color="#757575" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [isPlaying, currentPlayingId, sound]);
  
  // 渲染分组标题
  const renderSectionHeader = React.useCallback(({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  ), []);
  
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
  
  // 渲染录音时的控制界面
  const renderRecordingControls = useMemo(() => {
    if (isRecording) {
      return (
        <View style={styles.recordingControls}>
          <TouchableOpacity 
            style={styles.discardButton}
            onPress={discardRecording}
          >
            <MaterialIcons name="delete" size={28} color="#f44336" />
            <Text style={styles.discardButtonText}>废弃</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.pauseButton}
            onPress={isPaused ? resumeRecording : pauseRecording}
          >
            <MaterialIcons 
              name={isPaused ? "play-arrow" : "pause"} 
              size={32} 
              color="white" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.stopButton}
            onPress={stopRecording}
          >
            <MaterialIcons name="stop" size={28} color="#2196F3" />
            <Text style={styles.stopButtonText}>完成</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <TouchableOpacity 
          style={styles.recordButton}
          onPress={startRecording}
        >
          <MaterialIcons name="mic" size={32} color="white" />
        </TouchableOpacity>
      );
    }
  }, [isRecording, isPaused]);
  
  // 渲染重命名模态框
  const renderRenameModal = useMemo(() => (
    <Modal
      visible={renameModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setRenameModalVisible(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setRenameModalVisible(false)}
      >
        <Pressable 
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.modalTitle}>重命名录音</Text>
          <TextInput
            style={styles.modalInput}
            value={newRecordingName}
            onChangeText={setNewRecordingName}
            autoFocus={true}
            placeholder="输入新名称"
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
        </Pressable>
      </Pressable>
    </Modal>
  ), [renameModalVisible, newRecordingName]);
  
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
        <Text style={styles.title}>录音列表</Text>
      </View>
      
      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索录音..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#BDBDBD"
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => setSearchQuery('')}
            >
              <AntDesign name="close" size={16} color="#757575" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      {/* 录音列表 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <View style={styles.listContainer}>
          {groupedRecordings.length > 0 ? (
            <SectionList
              sections={groupedRecordings}
              keyExtractor={(item) => item.id}
              renderItem={renderRecordingItem}
              renderSectionHeader={renderSectionHeader}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={true}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="microphone-alt" size={60} color="#E0E0E0" />
              <Text style={styles.emptyText}>
                {searchQuery ? '没有找到匹配的录音' : '暂无录音'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? '尝试其他搜索词' : '点击下方录音按钮开始'}
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* 录音时长显示 */}
      {isRecording && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>
            {isPaused ? "已暂停 " : "录音中 "}
            {formatDuration(recordingDuration)}
          </Text>
        </View>
      )}
      
      {/* 录音控制按钮 */}
      <View style={styles.controlsContainer}>
        {renderRecordingControls}
      </View>
      
      {/* 重命名对话框 */}
      {renderRenameModal}
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
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: 40,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#757575',
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
    paddingHorizontal: 8,
  },
  recordingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  recordingMeta: {
    fontSize: 12,
    color: '#757575',
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
  },
  discardButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardButtonText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  pauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  stopButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  durationContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  durationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    padding: 8,
  },
});