import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { coursesAPI } from '../api/courses';

export default function HomeScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.list(),
  });

  const courses = data?.courses || [];
  const categories = ['All', 'Mobile Development', 'Web Development', 'Cloud Computing'];

  const filteredCourses = courses.filter((course: any) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#0284c7', paddingTop: 48, paddingBottom: 24, paddingHorizontal: 16 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          Discover Courses
        </Text>
        
        {/* Search Bar */}
        <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ marginRight: 8 }}>🔍</Text>
          <TextInput
            placeholder="Search courses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => setSelectedCategory(category)}
            style={{
              marginRight: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: selectedCategory === category ? '#0284c7' : '#f3f4f6',
            }}
          >
            <Text
              style={{
                fontWeight: '500',
                color: selectedCategory === category ? 'white' : '#374151',
              }}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Course List */}
      <FlatList
        data={filteredCourses}
        keyExtractor={(item: any) => item.courseId}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('CourseDetail', { courseId: item.courseId })}
            style={{
              backgroundColor: 'white',
              borderRadius: 8,
              marginHorizontal: 16,
              marginVertical: 8,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Image
              source={{ uri: item.thumbnail || 'https://via.placeholder.com/400x200' }}
              style={{ width: '100%', height: 192 }}
              resizeMode="cover"
            />
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }} numberOfLines={2}>
                {item.description}
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>{item.instructorName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#fbbf24', marginRight: 4 }}>★</Text>
                  <Text style={{ fontSize: 14, fontWeight: '500' }}>
                    {item.averageRating?.toFixed(1) || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                  {item.totalStudents || 0} students
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item.discountPrice && (
                    <Text style={{ fontSize: 14, color: '#9ca3af', textDecorationLine: 'line-through', marginRight: 8 }}>
                      ${item.price}
                    </Text>
                  )}
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0284c7' }}>
                    ${item.discountPrice || item.price}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <Text style={{ color: '#6b7280', textAlign: 'center' }}>No courses found</Text>
          </View>
        }
      />
    </View>
  );
}
