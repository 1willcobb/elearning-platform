import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function MyLearningScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ backgroundColor: '#0284c7', paddingTop: 48, paddingBottom: 24, paddingHorizontal: 16 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
          My Learning
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>📚</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
          No courses yet
        </Text>
        <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
          Start learning by enrolling in a course
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={{ backgroundColor: '#0284c7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Browse Courses</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
