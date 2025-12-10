import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from 'expo-linking';

import HomeScreen from "./src/screens/HomeScreen";
import CourseDetailScreen from "./src/screens/CourseDetailScreen";
import MyLearningScreen from "./src/screens/MyLearningScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CourseCurriculumScreen from "./src/screens/learning/CourseCurriculumScreen";
import LessonPlayerScreen from "./src/screens/learning/LessonPlayerScreen";
import UploadVideoScreen from "./src/screens/instructor/UploadVideoScreen";
import ForgotPasswordScreen from "./src/screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/auth/ResetPasswordScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

// Deep linking configuration for password reset
const linking = {
  prefixes: [
    Linking.createURL('/'),
    'elearning://',
    'http://localhost:3000',
    'exp://localhost:8081',
    'https://yourdomain.com'
  ],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          MyLearning: 'my-learning',
          Profile: 'profile',
        },
      },
      CourseDetail: 'course/:courseId',
      CourseCurriculum: 'course/:courseId/curriculum',
      LessonPlayer: 'lesson/:lessonId',
      UploadVideo: 'upload-video',
      ForgotPassword: 'forgot-password',
      ResetPassword: {
        path: 'reset-password',
        parse: {
          token: (token: string) => token,
        },
      },
    },
  },
};

function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyLearning" component={MyLearningScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer linking={linking}>
          <Stack.Navigator>
            <Stack.Screen
              name="MainTabs"
              component={HomeTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CourseDetail"
              component={CourseDetailScreen}
              options={{ title: "Course Details" }}
            />
            <Stack.Screen
              name="CourseCurriculum"
              component={CourseCurriculumScreen}
              options={{ title: "Course Content" }}
            />
            <Stack.Screen
              name="LessonPlayer"
              component={LessonPlayerScreen}
              options={{
                title: "Lesson",
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="UploadVideo"
              component={UploadVideoScreen}
              options={{ title: "Upload Video" }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ title: "Forgot Password" }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ title: "Reset Password" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
