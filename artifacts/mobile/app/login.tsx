import { useAuth } from "@/context/AuthContext";
import { useLogin } from "@workspace/api-client-react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOGO = require("../assets/images/icon.png");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user as any);
        const role = data.user.role;
        if (role === "admin") router.replace("/(admin)");
        else if (role === "waiter") router.replace("/(waiter)");
        else if (role === "cashier") router.replace("/(cashier)");
      },
      onError: () => {
        setError("Usuario o contraseña incorrectos");
      },
    },
  });

  function handleLogin() {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Ingresa usuario y contraseña");
      return;
    }
    loginMutation.mutate({ data: { username: username.trim(), password } });
  }

  const content = (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.inner}
      >
        <View style={styles.logoContainer}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </View>

        <View style={styles.form}>
          <Text style={styles.subtitle}>BIENVENIDO</Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="USUARIO"
              placeholderTextColor="#BCA080"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="CONTRASEÑA"
              placeholderTextColor="#BCA080"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loginMutation.isPending && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
            activeOpacity={0.75}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>ENTRAR</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  if (Platform.OS === "web") {
    return content;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {content}
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3D2312",
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#2A1508",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    overflow: "hidden",
  },
  logo: {
    width: 150,
    height: 150,
  },
  form: {
    width: "100%",
    backgroundColor: "#5C3520",
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  subtitle: {
    color: "#F5E6D0",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3D2312",
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    height: 48,
    color: "#F5E6D0",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  error: {
    color: "#E07070",
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  button: {
    backgroundColor: "#4A7A5E",
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 2,
  },
});
