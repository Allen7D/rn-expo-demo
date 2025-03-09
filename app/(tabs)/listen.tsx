import React from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import VideoPlayer from '@/components/VideoPlayer';

export default function VideoScreen() {
  // 示例视频链接
  const videoSample = {
    uri: 'http://192.168.0.105:8080/videos/CE001 Muddy Puddles.mp4'
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.videoContainer}>
        <VideoPlayer 
          source={videoSample} 
          poster=""
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  videoContainer: {
    marginVertical: 16,
  },
});
