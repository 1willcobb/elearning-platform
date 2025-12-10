import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useMutation } from '@tanstack/react-query';
import { progressAPI } from '../../api/progress';

const { width } = Dimensions.get('window');

export default function LessonPlayerScreen({ route, navigation }: any) {
  const { courseId, sectionId, lessonId } = route.params;
  const videoRef = useRef<Video>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);

  // Mock lesson data - replace with API call
  const lesson = {
    lessonId,
    title: 'Introduction to React Native',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 596, // 9:56
  };

  // Progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: progressAPI.update,
  });

  // Update progress every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && position > 0) {
        const completed = position >= duration * 0.9; // 90% watched = completed
        
        updateProgressMutation.mutate({
          courseId,
          lessonId,
          watchTime: Math.floor(position),
          completed,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, position, duration]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis / 1000);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const skipForward = async () => {
    if (videoRef.current) {
      const newPosition = Math.min(position + 10, duration);
      await videoRef.current.setPositionAsync(newPosition * 1000);
    }
  };

  const skipBackward = async () => {
    if (videoRef.current) {
      const newPosition = Math.max(position - 10, 0);
      await videoRef.current.setPositionAsync(newPosition * 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: lesson.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />

        {/* Buffering Indicator */}
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Controls Overlay */}
        <View style={styles.controlsOverlay}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={skipBackward}
          >
            <Text style={styles.controlText}>⏪ 10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.playButton]}
            onPress={togglePlayPause}
          >
            <Text style={styles.playButtonText}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={skipForward}
          >
            <Text style={styles.controlText}>10s ⏩</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercentage}%` }]}
            />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      {/* Lesson Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        
        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.navButtonText}>← Previous Lesson</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={() => {
              // Mark as complete and go to next
              updateProgressMutation.mutate({
                courseId,
                lessonId,
                watchTime: Math.floor(duration),
                completed: true,
              });
              // Navigate to next lesson
            }}
          >
            <Text style={styles.navButtonTextPrimary}>
              Complete & Next →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width,
    height: width * (9 / 16), // 16:9 aspect ratio
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  controlButton: {
    padding: 12,
  },
  controlText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 28,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0284c7',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
  },
  infoContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  lessonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  navButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
