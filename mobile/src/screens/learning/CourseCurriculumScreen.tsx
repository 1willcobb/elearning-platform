import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { sectionsAPI } from "../../api/sections";
import { coursesAPI } from "../../api/courses";

export default function CourseCurriculumScreen({ route, navigation }: any) {
  const { courseId } = route.params;
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Get course details
  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => coursesAPI.get(courseId),
  });

  // Get sections
  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", courseId],
    queryFn: () => sectionsAPI.list(courseId),
  });

  const course = courseData?.course;
  const sections = sectionsData?.sections || [];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  if (courseLoading || sectionsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Course Header */}
      <View style={styles.header}>
        <Text style={styles.courseTitle}>{course?.title}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "0%" }]} />
          </View>
          <Text style={styles.progressText}>0% Complete</Text>
        </View>
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: "#10b981",
          padding: 12,
          borderRadius: 8,
          margin: 16,
        }}
        onPress={() =>
          navigation.navigate("UploadVideo", {
            courseId,
            lessonId: "001-001",
          })
        }
      >
        <Text
          style={{ color: "white", fontWeight: "bold", textAlign: "center" }}
        >
          📹 Upload Video (Instructor)
        </Text>
      </TouchableOpacity>

      {/* Curriculum */}
      <ScrollView style={styles.scrollView}>
        {sections.map((section: any, sectionIndex: number) => (
          <View key={section.sectionId} style={styles.sectionContainer}>
            {/* Section Header */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.sectionId)}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionNumber}>
                  Section {sectionIndex + 1}
                </Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionMeta}>
                  {section.lessonCount} lessons •{" "}
                  {formatDuration(section.duration)}
                </Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSections.includes(section.sectionId) ? "−" : "+"}
              </Text>
            </TouchableOpacity>

            {/* Lessons (when expanded) */}
            {expandedSections.includes(section.sectionId) && (
              <View style={styles.lessonsContainer}>
                {/* Mock lessons - replace with actual API call */}
                {[1, 2, 3].map((lessonNum) => (
                  <TouchableOpacity
                    key={lessonNum}
                    style={styles.lessonItem}
                    onPress={() =>
                      navigation.navigate("LessonPlayer", {
                        courseId,
                        sectionId: section.sectionId,
                        lessonId: `${section.sectionId}-${String(lessonNum).padStart(3, "0")}`,
                      })
                    }
                  >
                    <View style={styles.lessonIcon}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                    <View style={styles.lessonContent}>
                      <Text style={styles.lessonTitle}>
                        Lesson {lessonNum}: Introduction to {section.title}
                      </Text>
                      <Text style={styles.lessonDuration}>10:30</Text>
                    </View>
                    <View style={styles.lessonCheckbox} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* If no sections yet */}
        {sections.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No curriculum available yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "white",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0284c7",
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 8,
    backgroundColor: "white",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionNumber: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  sectionMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  expandIcon: {
    fontSize: 24,
    color: "#6b7280",
    marginLeft: 12,
  },
  lessonsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingLeft: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  lessonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  playIcon: {
    fontSize: 12,
    color: "#0284c7",
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  lessonDuration: {
    fontSize: 12,
    color: "#6b7280",
  },
  lessonCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    marginLeft: 12,
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
