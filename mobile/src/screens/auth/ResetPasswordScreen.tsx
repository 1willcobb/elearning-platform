import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { authApi } from '../../api/auth';

export default function ResetPasswordScreen({ route, navigation }: any) {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    // Get token from route params (from deep link or navigation)
    const resetToken = route.params?.token;
    if (resetToken) {
      setToken(resetToken);
      verifyToken(resetToken);
    } else {
      Alert.alert('Error', 'Invalid reset link', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    }
  }, [route.params]);

  const verifyToken = async (resetToken: string) => {
    setVerifying(true);
    try {
      // Decode the token in case it comes URL-encoded
      const decodedToken = decodeURIComponent(resetToken);

      const response = await authApi.verifyResetToken(decodedToken);
      if (response.valid) {
        setTokenValid(true);
        setEmail(response.email);
        // Store the decoded token for submission
        setToken(decodedToken);
      } else {
        Alert.alert('Error', 'This reset link is invalid or has expired', [
          { text: 'OK', onPress: () => navigation.replace('Login') },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'This reset link is invalid or has expired',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } finally {
      setVerifying(false);
    }
  };

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }

    if (!/\d/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one number');
      return false;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one special character');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword({
        token,
        newPassword: password,
      });

      Alert.alert('Success', 'Your password has been reset successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Login'),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Verifying reset link...</Text>
      </View>
    );
  }

  if (!tokenValid) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password for {email}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <Text style={styles.hint}>
              Must be 8+ characters with a number and special character
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.replace('Login')}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
