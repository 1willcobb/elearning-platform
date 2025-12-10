import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import apiClient from "../../api/client";

export default function UploadVideoScreen({ route, navigation }: any) {
  const { courseId, lessonId } = route.params;
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
      });

      console.log("DocumentPicker result:", result);

      if (result.canceled) {
        console.log("User canceled picker");
        return;
      }

      const file = result.assets[0];
      console.log("Selected file:", file);
      setSelectedFile(file);
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", "Failed to pick video");
    }
  };

  const uploadVideo = async () => {
    if (!selectedFile) {
      Alert.alert("Error", "Please select a video first");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      console.log("=== Starting Upload Process ===");
      console.log("File:", selectedFile);

      // Step 1: Get presigned URL
      console.log("Step 1: Getting presigned URL...");
      const { data } = await apiClient.post("/uploads/presigned-url", {
        fileName: selectedFile.name,
        fileType: selectedFile.mimeType || "video/mp4",
        uploadType: "video",
      });

      console.log("Presigned URL response:", data);

      // Step 2: Upload file using fetch (modern approach)
      console.log("Step 2: Uploading file to:", data.uploadUrl);

      // Read the file as a blob
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      console.log("Blob created:", {
        size: blob.size,
        type: blob.type,
      });

      // Upload to presigned URL
      const uploadResponse = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.mimeType || "video/mp4",
        },
        body: blob,
      });

      console.log("Upload response status:", uploadResponse.status);

      if (uploadResponse.status === 200 || uploadResponse.status === 204) {
        console.log("Upload successful! Public URL:", data.publicUrl);

        // Step 3: Update lesson
        console.log("Step 3: Updating lesson...");
        await apiClient.put(`/courses/${courseId}/lessons/${lessonId}`, {
          videoUrl: data.publicUrl,
          videoDuration: 0,
        });

        console.log("Lesson updated successfully");

        Alert.alert(
          "Success! 🎉",
          `Video uploaded successfully!\n\nURL: ${data.publicUrl}`,
          [
            {
              text: "View in MinIO",
              onPress: () => console.log("MinIO URL:", `http://localhost:9001`),
            },
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const errorText = await uploadResponse.text();
        console.error("Upload failed:", errorText);
        throw new Error(
          `Upload failed with status ${uploadResponse.status}: ${errorText}`
        );
      }
    } catch (error: any) {
      console.error("=== Upload Error ===");
      console.error("Error:", error);
      console.error("Error response:", error.response?.data);

      Alert.alert(
        "Upload Failed",
        error.response?.data?.message || error.message || "Unknown error"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upload Video 🎬</Text>
        <Text style={styles.subtitle}>Upload a video for this lesson</Text>

        {selectedFile ? (
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>📹 {selectedFile.name}</Text>
            <Text style={styles.fileSize}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Text>
            <Text style={styles.fileType}>Type: {selectedFile.mimeType}</Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🎥</Text>
            <Text style={styles.placeholderText}>No video selected</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.pickButton}
          onPress={pickVideo}
          disabled={isUploading}
        >
          <Text style={styles.pickButtonText}>
            {selectedFile ? "🔄 Change Video" : "📁 Select Video"}
          </Text>
        </TouchableOpacity>

        {isUploading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.progressText}>
              Uploading to MinIO... Please wait
            </Text>
            <Text style={styles.progressSubtext}>
              This may take a while for large files
            </Text>
          </View>
        )}

        {selectedFile && !isUploading && (
          <TouchableOpacity style={styles.uploadButton} onPress={uploadVideo}>
            <Text style={styles.uploadButtonText}>⬆️ Upload to MinIO</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isUploading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Tip: Videos will be stored in MinIO at http://localhost:9000
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
  },
  fileInfo: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#10b981",
  },
  fileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  fileSize: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  fileType: {
    fontSize: 12,
    color: "#9ca3af",
  },
  placeholder: {
    backgroundColor: "white",
    padding: 40,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  pickButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#0284c7",
    alignItems: "center",
    marginBottom: 16,
  },
  pickButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0284c7",
  },
  uploadButton: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  progressContainer: {
    alignItems: "center",
    marginVertical: 24,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 12,
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  progressSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#9ca3af",
  },
  infoBox: {
    marginTop: "auto",
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoText: {
    fontSize: 14,
    color: "#1e40af",
    textAlign: "center",
  },
});
