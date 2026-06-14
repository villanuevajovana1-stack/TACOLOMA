import {
  useCreateUser,
  useDeleteUser,
  useGetUsers,
  useUpdateUser,
  getGetUsersQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Role = "admin" | "waiter" | "cashier";
const ROLE_LABELS: Record<Role, string> = { admin: "Admin", waiter: "Mesero", cashier: "Cajero" };
const ROLE_COLORS: Record<Role, string> = { admin: "#C03030", waiter: "#2D6B4E", cashier: "#9B7820" };

interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
}

export default function UsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const qc = useQueryClient();

  const { data: users, isLoading } = useGetUsers();
  const createMutation = useCreateUser({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUsersQueryKey() }); closeModal(); } },
  });
  const updateMutation = useUpdateUser({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUsersQueryKey() }); closeModal(); } },
  });
  const deleteMutation = useDeleteUser({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetUsersQueryKey() }) },
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("waiter");

  function openAdd() {
    setEditing(null);
    setName("");
    setUsername("");
    setPassword("");
    setRole("waiter");
    setModalVisible(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setName(u.name);
    setUsername(u.username);
    setPassword("");
    setRole(u.role);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditing(null);
  }

  function handleSave() {
    Keyboard.dismiss();
    if (!name.trim() || !username.trim()) {
      Alert.alert("Error", "Nombre y usuario requeridos");
      return;
    }
    if (!editing && !password.trim()) {
      Alert.alert("Error", "Contraseña requerida para nuevo usuario");
      return;
    }

    if (editing) {
      const data: any = { name: name.trim(), username: username.trim(), role };
      if (password.trim()) data.password = password.trim();
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate({
        data: { name: name.trim(), username: username.trim(), password: password.trim(), role },
      });
    }
  }

  function handleDelete(u: User) {
    Alert.alert("Eliminar", `¿Eliminar a "${u.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteMutation.mutate({ id: u.id }) },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#F5E6D0" />
        </TouchableOpacity>
        <Text style={styles.title}>USUARIOS</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Feather name="user-plus" size={22} color="#F5E6D0" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#E07050" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users as User[]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No hay usuarios.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.roleTag, { backgroundColor: ROLE_COLORS[item.role] }]}>
                <Text style={styles.roleText}>{ROLE_LABELS[item.role]}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardUsername}>@{item.username}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                  <Feather name="edit-2" size={18} color="#D4A030" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                  <Feather name="trash-2" size={18} color="#C03030" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? "Editar Usuario" : "Nuevo Usuario"}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre completo"
              placeholderTextColor="#BCA080"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Usuario (login)"
              placeholderTextColor="#BCA080"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={editing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              placeholderTextColor="#BCA080"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.roleLabel}>Rol:</Text>
            <View style={styles.rolePicker}>
              {(["admin", "waiter", "cashier"] as Role[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && { backgroundColor: ROLE_COLORS[r] }]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && { color: "#FFF" }]}>{ROLE_LABELS[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#6B4530" }]}
                onPress={closeModal}
              >
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#4A7A5E" }]}
                onPress={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3D2312" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 8 },
  addBtn: { padding: 8 },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#F5E6D0",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: 2,
  },
  list: { padding: 16, gap: 10 },
  empty: { color: "#BCA080", textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#5C3520",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roleTag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  cardInfo: { flex: 1 },
  cardName: { color: "#F5E6D0", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  cardUsername: { color: "#BCA080", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 12 },
  iconBtn: { padding: 6 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#5C3520",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    gap: 12,
  },
  modalTitle: {
    color: "#F5E6D0",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#3D2312",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    color: "#F5E6D0",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  roleLabel: { color: "#BCA080", fontFamily: "Inter_500Medium", fontSize: 13 },
  rolePicker: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7A5030",
    alignItems: "center",
    justifyContent: "center",
  },
  roleBtnText: { color: "#BCA080", fontFamily: "Inter_500Medium", fontSize: 12 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
