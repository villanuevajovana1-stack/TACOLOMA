import { useAuth } from "@/context/AuthContext";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOGO = require("../../assets/images/icon.png");

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </View>
      </View>

      <Text style={styles.welcome}>BIENVENIDO ADMIN</Text>
      <Text style={styles.name}>{user?.name}</Text>

      <View style={styles.menu}>
        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: "#E07050" }]}
          onPress={() => router.push("/(admin)/products")}
          activeOpacity={0.8}
        >
          <Text style={styles.menuBtnText}>Productos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: "#4A7A5E" }]}
          onPress={() => router.push("/(admin)/users")}
          activeOpacity={0.8}
        >
          <Text style={styles.menuBtnText}>Usuarios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: "#C03030" }]}
          onPress={() => router.push("/(admin)/sales")}
          activeOpacity={0.8}
        >
          <Text style={styles.menuBtnText}>Ventas</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3D2312",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2A1508",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 100,
    height: 100,
  },
  welcome: {
    color: "#F5E6D0",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: 2,
  },
  name: {
    color: "#BCA080",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 32,
    marginTop: 4,
  },
  menu: {
    width: "100%",
    paddingHorizontal: 32,
    gap: 16,
  },
  menuBtn: {
    borderRadius: 24,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  logoutBtn: {
    marginTop: 40,
  },
  logoutText: {
    color: "#BCA080",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
