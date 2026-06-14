import {
  useCreateProduct,
  useDeleteProduct,
  useGetProducts,
  useUpdateProduct,
  getGetProductsQueryKey,
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

interface Product {
  id: number;
  name: string;
  price: number;
  active: boolean;
}

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const qc = useQueryClient();

  const { data: products, isLoading } = useGetProducts();
  const createMutation = useCreateProduct({
    mutation: { 
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetProductsQueryKey() }); setModalVisible(false); },
      onError: (err: any) => Alert.alert("Error al crear", err?.message || String(err))
    },
  });
  const updateMutation = useUpdateProduct({
    mutation: { 
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetProductsQueryKey() }); setModalVisible(false); },
      onError: (err: any) => Alert.alert("Error al actualizar", err?.message || String(err))
    },
  });
  const deleteMutation = useDeleteProduct({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetProductsQueryKey() }) },
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function openAdd() {
    setEditing(null);
    setName("");
    setPrice("");
    setModalVisible(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setName(p.name);
    setPrice(String(p.price));
    setModalVisible(true);
  }

  function handleSave() {
    Keyboard.dismiss();
    const parsedPrice = parseFloat(price);
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Error", "Nombre y precio válido requeridos");
      return;
    }
    console.log("Attempting to save product...", { name: name.trim(), price: parsedPrice });
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { name: name.trim(), price: parsedPrice } });
    } else {
      createMutation.mutate({ data: { name: name.trim(), price: parsedPrice } });
    }
  }

  function handleDelete(p: Product) {
    Alert.alert("Eliminar", `¿Eliminar "${p.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteMutation.mutate({ id: p.id }) },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#F5E6D0" />
        </TouchableOpacity>
        <Text style={styles.title}>PRODUCTOS</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Feather name="plus" size={24} color="#F5E6D0" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#E07050" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products as Product[]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay productos. Agrega uno.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardPrice}>${item.price.toFixed(2)}</Text>
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

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? "Editar Producto" : "Nuevo Producto"}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del producto"
              placeholderTextColor="#BCA080"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Precio (ej. 25.00)"
              placeholderTextColor="#BCA080"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#6B4530" }]}
                onPress={() => setModalVisible(false)}
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
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  cardInfo: { flex: 1 },
  cardName: { color: "#F5E6D0", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  cardPrice: { color: "#D4A030", fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 4 },
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
    gap: 14,
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
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
