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
import { VideoView, useVideoPlayer, StatusChangeEventPayload, PlayingChangeEventPayload, TimeUpdateEventPayload } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFullscreen } from '@/app/(tabs)/_layout';


// 显示时间格式化
const formatTime = (millis: number) => {
	const totalSeconds = Math.floor(millis / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

interface VideoPlayerProps {
  source: { uri: string } | number;
  poster?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void; // 添加全屏状态变化回调
}

// 定义视频状态接口
interface VideoStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ source, poster, onFullscreenChange }) => {
  // 转换source格式为expo-video要求的格式
  const videoSource = typeof source === 'number' ? { assetId: source } : { uri: source.uri };
  
  // 使用expo-video的useVideoPlayer钩子创建播放器实例
  const player = useVideoPlayer(videoSource, player => {
		player.loop = true;
		player.play();
	});
  const viewRef = useRef<VideoView>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  
  // 使用全屏上下文（如果可用）
  const fullscreenContext = useFullscreen?.();

  // 创建一个定时器，用于更新当前时间
  useEffect(() => {
    // 先尝试直接获取时长
    if (player.duration > 0) {
      setDuration(player.duration * 1000); // 转换为毫秒
    }

    // 配置播放器更频繁地触发时间更新事件
    player.timeUpdateEventInterval = 0.1; // 100ms更新一次
  }, [player]);
  
  useEffect(() => {
    console.log("设置事件监听器");
    
    // 监听播放状态变化
    const statusSubscription = player.addListener('statusChange', (event: StatusChangeEventPayload) => {
      console.log("状态变化:", event.status);
      
      // 检查视频是否准备好播放
      if (player.duration > 0) {
        setDuration(player.duration * 1000); // 转换为毫秒
      }
      
      if (event.status === 'error') {
        console.error('视频播放错误', event.error);
      }
    });
    
    // 监听播放/暂停状态变化
    const playingSubscription = player.addListener('playingChange', (event: PlayingChangeEventPayload) => {
      console.log("播放状态变化:", event.isPlaying);
      setIsPlaying(event.isPlaying);
    });
    
    // 监听进度更新
    const timeUpdateSubscription = player.addListener('timeUpdate', (event: TimeUpdateEventPayload) => {
      // console.log("时间更新:", event.currentTime, "缓冲位置:", event.bufferedPosition);
      
      // 更新当前播放时间
      setCurrentTime(event.currentTime * 1000); // 转换为毫秒
      
      // 如果还没有获取到持续时间，尝试从播放器再次获取
      if (duration === 0 && player.duration > 0) {
        setDuration(player.duration * 1000); // 转换为毫秒
      }
      
      // 判断缓冲状态
      setIsBuffering(event.bufferedPosition < event.currentTime);
    });
    
    // 组件卸载时清理
    return () => {
      console.log("清理事件监听器");
      statusSubscription.remove();
      playingSubscription.remove();
      timeUpdateSubscription.remove();
    };
  }, [player, duration]);
  
  // 添加额外的定时器来更新进度，以防事件不够频繁
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isPlaying) {
      // 如果正在播放，每100ms更新一次进度
      intervalId = setInterval(() => {
        if (player && player.currentTime) {
          setCurrentTime(player.currentTime * 1000);
        }
      }, 100);
    }
    
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, player]);
  
  // 播放/暂停切换
  const handlePlayPause = async () => {
    console.log("切换播放/暂停");
    if (isPlaying) {
      await player.pause();
    } else {
      await player.play();
    }
  };

  // 更新播放进度
  const handleSliderChange = async (value: number) => {
    console.log("进度条拖动:", value);
    const newPosition = value * duration / 1000; // 转换为秒
    player.currentTime = newPosition;
    
    // 立即更新UI
    setCurrentTime(newPosition * 1000);
  };

  // 快进/快退 5 秒
  const handleSkip = async (skipMillis: number) => {
    console.log("快进/快退:", skipMillis);
    const skipSeconds = skipMillis / 1000; // 转换为秒
    const newTime = Math.min(
      Math.max(0, player.currentTime + skipSeconds),
      player.duration || 0
    );
    
    player.currentTime = newTime;
    
    // 立即更新UI
    setCurrentTime(newTime * 1000);
  };

  // 全屏模式切换
  const toggleFullscreen = async () => {
    const newFullscreenState = !isFullscreen;
    
    if (isFullscreen) {
      // 退出全屏
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      // if (viewRef.current) {
      //   await viewRef.current.exitFullscreen();
      // }
      
      // 显示状态栏
      StatusBar.setHidden(false);
    } else {
      // 进入全屏
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      // if (viewRef.current) {
      //   await viewRef.current.enterFullscreen();
      // }
      
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

  // 调试用，开发时可以查看当前时间和总时长
  // console.log(`当前时间: ${currentTime}ms, 总时长: ${duration}ms`);

  return (
    <View style={isFullscreen ? styles.fullscreenContainer : styles.container}>
      <VideoView
        ref={viewRef}
        style={isFullscreen ? styles.fullscreenVideo : styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
				allowsPictureInPicture // 确定播放器是否允许画中画 （PiP） 模式。
				startsPictureInPictureAutomatically
        onFullscreenEnter={() => {
          setIsFullscreen(true);
          if (onFullscreenChange) onFullscreenChange(true);
          if (fullscreenContext) fullscreenContext.setFullscreen(true);
        }}
        onFullscreenExit={() => {
          setIsFullscreen(false);
          if (onFullscreenChange) onFullscreenChange(false);
          if (fullscreenContext) fullscreenContext.setFullscreen(false);
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
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
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
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` 
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
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
        
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