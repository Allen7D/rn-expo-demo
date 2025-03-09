import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFullscreen } from '../app/(tabs)/_layout';


// 显示时间格式化
const formatTime = (millis: number) => {
	const totalSeconds = Math.floor(millis / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds < 10 ? '0' : ''}${seconds} `;
};

interface VideoPlayerProps {
  source: { uri: string } | number;
  poster?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void; // 添加全屏状态变化回调
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ source, poster, onFullscreenChange }) => {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  
  // 使用全屏上下文（如果可用）
  const fullscreenContext = useFullscreen?.();
  
  // 获取播放状态
  const isPlaying = status?.isLoaded ? status.isPlaying : false;
  const playableDuration = status?.isLoaded ? status.playableDurationMillis : 0; // 可播放部分的时长（毫秒）
  const positionMillis = status?.isLoaded ? status.positionMillis : 0; // 当前播放位置（毫秒）
  const durationMillis = status?.isLoaded ? status.durationMillis || 0 : 0; // 视频总时长（毫秒）
  
  // 播放/暂停切换
  const handlePlayPause = async () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  // 更新播放进度
  const handleSliderChange = async (value: number) => {
    if (!videoRef.current || !status?.isLoaded) return;
    
    const newPosition = value * durationMillis;
    await videoRef.current.setPositionAsync(newPosition);
  };

  // 快进/快退 5 秒
  const handleSkip = async (skipMillis: number) => {
    if (!videoRef.current || !status?.isLoaded) return;
    
    const newPosition = Math.min(
      Math.max(0, positionMillis + skipMillis),
      durationMillis
    );
    
    await videoRef.current.setPositionAsync(newPosition);
  };

  // 全屏模式切换
  const toggleFullscreen = async () => {
    const newFullscreenState = !isFullscreen;
    
    if (isFullscreen) {
      // 退出全屏
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      
      // 显示状态栏
      StatusBar.setHidden(false);
    } else {
      // 进入全屏
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      
      // 隐藏状态栏
      StatusBar.setHidden(true, 'fade');
    }
    
    // 更新状态并执行回调
    setIsFullscreen(newFullscreenState);
    
    // 更新上下文（如果可用）
    if (fullscreenContext) {
      fullscreenContext.setFullscreen(newFullscreenState);
    }
    
    // 调用传入的回调
    if (onFullscreenChange) {
      onFullscreenChange(newFullscreenState);
    }
  };

  // 组件卸载时恢复屏幕方向和状态栏
  useEffect(() => {
    return () => {
      if (isFullscreen) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        StatusBar.setHidden(false);
        
        // 恢复上下文
        if (fullscreenContext) {
          fullscreenContext.setFullscreen(false);
        }
        
        if (onFullscreenChange) {
          onFullscreenChange(false);
        }
      }
    };
  }, [isFullscreen, onFullscreenChange, fullscreenContext]);

  return (
    <View style={isFullscreen ? styles.fullscreenContainer : styles.container}>
      <Video
        ref={videoRef}
        style={isFullscreen ? styles.fullscreenVideo : styles.video}
        source={source}
        posterSource={poster ? { uri: poster } : undefined}
        posterStyle={{ resizeMode: 'cover' }}
        usePoster={!!poster}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          setStatus(status);
          if (status.isLoaded) {
            setIsBuffering(status.isBuffering);
          }
        }}
      />

      {/* 加载指示器 */}
      {isBuffering && (
        <View style={styles.bufferingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* 控制面板 */}
      <View style={styles.controls}>
        {/* 快退按钮 */}
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => handleSkip(-5000)}
        >
          <Ionicons name="play-back" size={24} color="white" />
          <Text style={styles.buttonText}>-5s</Text>
        </TouchableOpacity>

        {/* 播放/暂停按钮 */}
        <TouchableOpacity 
          style={[styles.controlButton, styles.playButton]} 
          onPress={handlePlayPause}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={30} 
            color="white" 
          />
        </TouchableOpacity>

        {/* 快进按钮 */}
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => handleSkip(5000)}
        >
          <Ionicons name="play-forward" size={24} color="white" />
          <Text style={styles.buttonText}>+5s</Text>
        </TouchableOpacity>
      </View>

      {/* 进度条 */}
      <View style={styles.progressContainer}>
				{/* 已播放进度 */}
        <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
        <View 
          style={styles.progressBarContainer}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            setProgressBarWidth(width);
          }}
        >
          <View style={styles.progressBackground} />
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0}%` 
              }
            ]} 
          />
          <TouchableOpacity
            style={styles.progressBarTouchable}
            onPress={(event) => {
              const { locationX } = event.nativeEvent;
              if (progressBarWidth > 0) {
                handleSliderChange(locationX / progressBarWidth);
              }
            }}
          />
        </View>
				{/* 播放总时长 */}
        <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
        
        {/* 全屏切换按钮 */}
        <TouchableOpacity 
          style={styles.fullscreenButton} 
          onPress={toggleFullscreen}
        >
          <Ionicons 
            name={isFullscreen ? "contract" : "expand"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
    position: 'relative',
  },
  fullscreenContainer: {
    width: height,
    height: width,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    marginHorizontal: 10,
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: '#f00',
    borderRadius: 2,
  },
  progressBarTouchable: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: 'transparent',
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  fullscreenButton: {
    marginLeft: 10,
    padding: 5,
  },
});

export default VideoPlayer; 