import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { coursesAPI } from "../api/courses";

export default function CourseDetailScreen({ route, navigation }: any) {
  const { courseId } = route.params;
  const [isEnrolled, setIsEnrolled] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => coursesAPI.get(courseId),
  });

  const enrollMutation = useMutation({
    mutationFn: () => coursesAPI.enroll(courseId),
    onSuccess: () => {
      setIsEnrolled(true);
      alert("Successfully enrolled!");
    },
  });

  const course = data?.course;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Course not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <ScrollView>
        {/* Course Header */}
        <Image
          source={{
            uri: course.thumbnail || "https://via.placeholder.com/400x200",
          }}
          style={{ width: "100%", height: 224 }}
          resizeMode="cover"
        />

        <View style={{ padding: 16 }}>
          {/* Title */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "#111827",
              marginBottom: 8,
            }}
          >
            {course.title}
          </Text>
          <Text style={{ fontSize: 16, color: "#6b7280", marginBottom: 16 }}>
            {course.description}
          </Text>

          {/* Instructor */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#e5e7eb",
                marginRight: 12,
              }}
            />
            <View>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>Instructor</Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}
              >
                {course.instructorName}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 24,
              paddingBottom: 24,
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#0284c7" }}
              >
                {course.averageRating || "N/A"}
              </Text>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>Rating</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#0284c7" }}
              >
                {course.totalStudents || 0}
              </Text>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>Students</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#0284c7" }}
              >
                {course.totalLessons || 0}
              </Text>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>Lessons</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#0284c7" }}
              >
                {formatDuration(course.totalDuration || 0)}
              </Text>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>Duration</Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#111827",
              marginBottom: 12,
            }}
          >
            About this course
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              lineHeight: 20,
              marginBottom: 24,
            }}
          >
            {course.longDescription || course.description}
          </Text>
        </View>
      </ScrollView>

      {/* Enroll Button */}
      <View
        style={{
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "white",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <View>
            {course.discountPrice && (
              <Text
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  textDecorationLine: "line-through",
                }}
              >
                ${course.price}
              </Text>
            )}
            <Text
              style={{ fontSize: 32, fontWeight: "bold", color: "#0284c7" }}
            >
              ${course.discountPrice || course.price}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (isEnrolled) {
              // Navigate to curriculum if already enrolled
              navigation.navigate("CourseCurriculum", { courseId });
            } else {
              // Enroll in the course
              enrollMutation.mutate();
            }
          }}
          disabled={enrollMutation.isPending}
          style={{
            backgroundColor: isEnrolled ? "#10b981" : "#0284c7",
            paddingVertical: 16,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>
            {enrollMutation.isPending
              ? "Enrolling..."
              : isEnrolled
                ? "Go to Course →"
                : "Enroll Now"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
