import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ backgroundColor: '#0284c7', paddingTop: 48, paddingBottom: 24, paddingHorizontal: 16 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
          Profile
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#e5e7eb', marginBottom: 16, alignSelf: 'center' }} />
          <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
            John Student
          </Text>
          <Text style={{ color: '#6b7280', textAlign: 'center' }}>
            student@example.com
          </Text>
        </View>

        <TouchableOpacity
          style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '500' }}>Edit Profile</Text>
          <Text>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '500' }}>Settings</Text>
          <Text>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#ef4444' }}>Logout</Text>
          <Text>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
