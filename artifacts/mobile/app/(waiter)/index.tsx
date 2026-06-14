import {
  useGetOrders,
  useGetProducts,
  useCreateOrder,
  useUpdateOrderStatus,
  getGetOrdersQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

const LOGO = require("../../assets/images/icon.png");

type TabType = "pending" | "delivered" | "billing" | "paid";
const TABS: { key: TabType; label: string; color: string }[] = [
  { key: "pending", label: "PENDIENTES", color: "#2D6B4E" },
  { key: "delivered", label: "ENTREGADOS", color: "#9B7820" },
  { key: "billing", label: "POR COBRAR", color: "#8B2020" },
  { key: "paid", label: "PAGADAS", color: "#4A7A5E" },
];

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}
interface CartItem {
  cartId: string;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  notes: string;
}
interface Product {
  id: number;
  name: string;
  price: number;
  active: boolean;
}
interface Order {
  id: number;
  clientName: string;
  status: string;
  waiterName: string;
  createdAt: string;
  items: OrderItem[];
  total: number;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export default function WaiterScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const { logout, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const addItemsMutation = useMutation({
    mutationFn: async ({ orderId, items }: { orderId: number; items: any[] }) => {
      return customFetch<any>(`/api/orders/${orderId}/items`, {
        method: "POST",
        body: JSON.stringify({ items }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetOrdersQueryKey({}) });
      closeAddModal();
    },
    onError: (e: any) => {
      Alert.alert("Error", e.message ?? "No se pudo agregar items");
    },
  });

  function openAddItemsModal(orderId: number) {
    setSelectedOrderId(orderId);
    setAddModalVisible(true);
    setCart([]);
    setProductSearch("");
    setBirriaAmount("");
    setBirriaNotes("");
  }

  function closeAddModal() {
    setAddModalVisible(false);
    setSelectedOrderId(null);
    setCart([]);
    setProductSearch("");
    setBirriaAmount("");
    setBirriaNotes("");
  }

  function submitAddItems() {
    if (!selectedOrderId) return;
    if (cart.length === 0) {
      Alert.alert("Error", "Agrega al menos un producto");
      return;
    }
    addItemsMutation.mutate({ orderId: selectedOrderId, items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, notes: c.notes })) });
  }
  const [clientName, setClientName] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [birriaAmount, setBirriaAmount] = useState("");
  const [birriaNotes, setBirriaNotes] = useState("");

  const { data: orders, isLoading: loadingOrders } = useGetOrders(
    { status: activeTab },
    { query: { queryKey: getGetOrdersQueryKey({ status: activeTab }), refetchInterval: 15000 } }
  );
  const { data: products } = useGetProducts();

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey({ status: "pending" }) });
        closeNewOrder();
      },
      onError: () => Alert.alert("Error", "No se pudo crear la orden"),
    },
  });

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey({ status: "pending" }) });
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey({ status: "delivered" }) });
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey({ status: "billing" }) });
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey({ status: "paid" }) });
      },
    },
  });

  function closeNewOrder() {
    setModalVisible(false);
    setClientName("");
    setProductSearch("");
    setCart([]);
    setBirriaAmount("");
    setBirriaNotes("");
  }

  function addToCart(product: Product) {
    setCart((prev) => [
      ...prev,
      {
        cartId: `${product.id}-${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        notes: ""
      }
    ]);
  }

  function removeFromCart(cartId: string) {
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
  }

  function updateNotes(cartId: string, notes: string) {
    setCart((prev) => prev.map((c) => c.cartId === cartId ? { ...c, notes } : c));
  }

  function incrementQuantity(cartId: string) {
    setCart((prev) => prev.map((c) => {
      if (c.cartId === cartId) {
        const birriaProduct = products?.find((p) => p.name === "Birria por Kilo");
        const step = c.productId === birriaProduct?.id ? 0.1 : 1; // 0.1 kg steps = exactly $50 pesos adjustments
        return { ...c, quantity: parseFloat((c.quantity + step).toFixed(2)) };
      }
      return c;
    }));
  }

  function decrementQuantity(cartId: string) {
    setCart((prev) => prev.map((c) => {
      if (c.cartId === cartId) {
        const birriaProduct = products?.find((p) => p.name === "Birria por Kilo");
        const step = c.productId === birriaProduct?.id ? 0.1 : 1;
        const newQty = parseFloat((c.quantity - step).toFixed(2));
        return newQty > 0 ? { ...c, quantity: newQty } : null;
      }
      return c;
    }).filter((c): c is CartItem => c !== null));
  }

  function addBirriaByAmount(amountVal?: number) {
    const birriaProduct = products?.find((p) => p.name === "Birria por Kilo");
    if (!birriaProduct) {
      Alert.alert("Error", "El producto 'Birria por Kilo' no está disponible. Asegúrate de reiniciar el servidor backend.");
      return;
    }
    
    const pesos = amountVal || parseFloat(birriaAmount);
    if (isNaN(pesos) || pesos <= 0) {
      Alert.alert("Error", "Ingresa un monto válido mayor a 0 (ej: 150)");
      return;
    }

    const qty = parseFloat((pesos / 500).toFixed(2)); // Calulamos kilos correspondientes (ej: 150 / 500 = 0.3 kg)
    setCart((prev) => [
      ...prev,
      {
        cartId: `birria-${Date.now()}-${Math.random()}`,
        productId: birriaProduct.id,
        productName: `Birria por Kilo`,
        quantity: qty,
        price: birriaProduct.price,
        notes: birriaNotes.trim() ? `[Monto: $${pesos.toFixed(2)} / Peso: ${qty} kg] ${birriaNotes.trim()}` : `[Monto: $${pesos.toFixed(2)} / Peso: ${qty} kg]`
      }
    ]);
    setBirriaAmount("");
    setBirriaNotes("");
  }

  function submitOrder() {
    if (!clientName.trim()) {
      Alert.alert("Error", "Ingresa el nombre del cliente");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Error", "Agrega al menos un producto");
      return;
    }
    createOrder.mutate({
      data: {
        clientName: clientName.trim(),
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, notes: c.notes })),
      },
    });
  }

  function markDelivered(order: Order) {
    updateStatus.mutate({ id: order.id, data: { status: "delivered" } });
  }

  function markBilling(order: Order) {
    updateStatus.mutate({ id: order.id, data: { status: "billing" } });
  }

  function markPaid(order: Order) {
    updateStatus.mutate({ id: order.id, data: { status: "paid" } });
  }

  const filteredOrders = ((orders ?? []) as Order[]).filter((o) =>
    o.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = ((products ?? []) as Product[]).filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const tabColor = TABS.find((t) => t.key === activeTab)?.color ?? "#2D6B4E";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.welcome}>BIENVENIDO MESERO</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={20} color="#BCA080" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#BCA080" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor="#BCA080"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addOrderBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Feather name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: tab.color }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && { color: "#FFF" }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loadingOrders ? (
        <ActivityIndicator color="#E07050" size="large" style={{ marginTop: 32 }} />
      ) : filteredOrders.length === 0 ? (
        <Text style={styles.empty}>No hay órdenes {TABS.find(t => t.key === activeTab)?.label.toLowerCase()}.</Text>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderLeftColor: tabColor }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardClient}>{item.clientName}</Text>
                <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.cardWaiter}>Mesero: {item.waiterName}</Text>
              {item.items.map((it) => (
                <Text key={it.id} style={styles.itemLine}>
                  {it.quantity}x {it.productName}
                </Text>
              ))}
              <Text style={styles.cardTotal}>Total: ${item.total.toFixed(2)}</Text>
              <View style={styles.cardBtns}>
          {activeTab === "pending" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#9B7820" }]}
              onPress={() => markDelivered(item)}
            >
              <Text style={styles.actionBtnText}>Marcar entregado</Text>
            </TouchableOpacity>
          )}
          {activeTab === "delivered" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#8B2020" }]}
              onPress={() => markBilling(item)}
            >
              <Text style={styles.actionBtnText}>Mandar a cobrar</Text>
            </TouchableOpacity>
          )}
          {activeTab === "billing" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#4A7A5E" }]}
              onPress={() => markPaid(item)}
            >
              <Text style={styles.actionBtnText}>Cobrar orden</Text>
            </TouchableOpacity>
          )}
          {/* Button to add more items when order is delivered or pending */}
          {(activeTab === "delivered" || activeTab === "pending") && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#2D6B4E" }]}
              onPress={() => openAddItemsModal(item.id)}
            >
              <Text style={styles.actionBtnText}>Agregar más</Text>
            </TouchableOpacity>
          )}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeNewOrder}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Pedido</Text>
              <TouchableOpacity onPress={closeNewOrder}>
                <Feather name="x" size={22} color="#F5E6D0" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del cliente"
              placeholderTextColor="#BCA080"
              value={clientName}
              onChangeText={setClientName}
            />

            <View style={styles.productSearchRow}>
              <Feather name="search" size={16} color="#BCA080" />
              <TextInput
                style={styles.productSearchInput}
                placeholder="Buscar producto..."
                placeholderTextColor="#BCA080"
                value={productSearch}
                onChangeText={setProductSearch}
              />
            </View>

            {productSearch.length > 0 && filteredProducts.length > 0 && (
              <ScrollView style={styles.productDropdown} keyboardShouldPersistTaps="handled">
                {filteredProducts.slice(0, 6).map((p) => (
                  <TouchableOpacity key={p.id} style={styles.productOption} onPress={() => addToCart(p)}>
                    <Text style={styles.productOptionName}>{p.name}</Text>
                    <Text style={styles.productOptionPrice}>${p.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Sección Especial: Birria por Kilo */}
            <View style={styles.specialCard}>
              <View style={styles.specialHeader}>
                <Feather name="shopping-bag" size={16} color="#D4A030" />
                <Text style={styles.specialTitle}>Venta de Birria por Monto ($500/kg)</Text>
              </View>

              {/* Botones de selección rápida */}
              <View style={styles.chipsRow}>
                {[100, 150, 200, 300].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.chip}
                    onPress={() => addBirriaByAmount(val)}
                  >
                    <Text style={styles.chipText}>+${val}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.specialRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginBottom: 0, height: 40 }]}
                  placeholder="Otro monto en pesos ($)"
                  placeholderTextColor="#BCA080"
                  keyboardType="numeric"
                  value={birriaAmount}
                  onChangeText={setBirriaAmount}
                />
                <TouchableOpacity style={styles.specialAddBtn} onPress={() => addBirriaByAmount()}>
                  <Text style={styles.specialAddText}>Agregar</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.notesInput, { marginTop: 8 }]}
                placeholder="Notas para la birria (ej: con consomé, sin cebolla...)"
                placeholderTextColor="#A07060"
                value={birriaNotes}
                onChangeText={setBirriaNotes}
              />
            </View>

            <ScrollView style={{ maxHeight: 220, marginVertical: 8 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.cartTitle}>Productos en orden:</Text>
              {cart.length === 0 ? (
                <Text style={styles.cartEmpty}>Ninguno todavía</Text>
              ) : (
                cart.map((item) => {
                  const isBirria = item.productName.includes("Birria");
                  return (
                    <View key={item.cartId} style={styles.cartItemWrap}>
                      <View style={styles.cartItem}>
                        <Text style={styles.cartItemName}>{item.productName}</Text>

                        {/* Stepper Container */}
                        <View style={styles.stepperContainer}>
                          <TouchableOpacity onPress={() => decrementQuantity(item.cartId)} style={styles.stepperBtn}>
                            <Feather name="minus" size={12} color="#FFF" />
                          </TouchableOpacity>
                          <Text style={styles.stepperVal}>
                            {isBirria ? `${item.quantity} kg` : `x${item.quantity}`}
                          </Text>
                          <TouchableOpacity onPress={() => incrementQuantity(item.cartId)} style={styles.stepperBtn}>
                            <Feather name="plus" size={12} color="#FFF" />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.cartItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                        <TouchableOpacity onPress={() => removeFromCart(item.cartId)}>
                          <Feather name="trash-2" size={18} color="#C03030" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Notas (ej: sin cebolla, con verdura...)"
                        placeholderTextColor="#A07060"
                        value={item.notes}
                        onChangeText={(t) => updateNotes(item.cartId, t)}
                      />
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, createOrder.isPending && { opacity: 0.6 }]}
              onPress={submitOrder}
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Enviar Pedido</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={closeAddModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Agregar Items</Text>
                <TouchableOpacity onPress={closeAddModal}>
                  <Feather name="x" size={22} color="#F5E6D0" />
                </TouchableOpacity>
              </View>

              {/* Reuse product search and cart UI */}
              <View style={styles.productSearchRow}>
                <Feather name="search" size={16} color="#BCA080" />
                <TextInput
                  style={styles.productSearchInput}
                  placeholder="Buscar producto..."
                  placeholderTextColor="#BCA080"
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
              </View>

              {productSearch.length > 0 && filteredProducts.length > 0 && (
                <ScrollView style={styles.productDropdown} keyboardShouldPersistTaps="handled">
                  {filteredProducts.slice(0, 6).map((p) => (
                    <TouchableOpacity key={p.id} style={styles.productOption} onPress={() => addToCart(p)}>
                      <Text style={styles.productOptionName}>{p.name}</Text>
                      <Text style={styles.productOptionPrice}>${p.price.toFixed(2)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Birria section */}
              <View style={styles.specialCard}>
                <View style={styles.specialHeader}>
                  <Feather name="shopping-bag" size={16} color="#D4A030" />
                  <Text style={styles.specialTitle}>Venta de Birria por Monto ($500/kg)</Text>
                </View>
                <View style={styles.chipsRow}>
                  {[100, 150, 200, 300].map((val) => (
                    <TouchableOpacity key={val} style={styles.chip} onPress={() => addBirriaByAmount(val)}>
                      <Text style={styles.chipText}>+${val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.specialRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0, height: 40 }]}
                    placeholder="Otro monto en pesos ($)"
                    placeholderTextColor="#BCA080"
                    keyboardType="numeric"
                    value={birriaAmount}
                    onChangeText={setBirriaAmount}
                  />
                  <TouchableOpacity style={styles.specialAddBtn} onPress={() => addBirriaByAmount()}>
                    <Text style={styles.specialAddText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.notesInput, { marginTop: 8 }]}
                  placeholder="Notas para la birria (ej: con consomé, sin cebolla...)"
                  placeholderTextColor="#A07060"
                  value={birriaNotes}
                  onChangeText={setBirriaNotes}
                />
              </View>

              <ScrollView style={{ maxHeight: 220, marginVertical: 8 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.cartTitle}>Productos en orden:</Text>
                {cart.length === 0 ? (
                  <Text style={styles.cartEmpty}>Ninguno todavía</Text>
                ) : (
                  cart.map((item) => (
                    <View key={item.cartId} style={styles.cartItemWrap}>
                      <View style={styles.cartItem}>
                        <Text style={styles.cartItemName}>{item.productName}</Text>
                        <View style={styles.stepperContainer}>
                          <TouchableOpacity onPress={() => decrementQuantity(item.cartId)} style={styles.stepperBtn}>
                            <Feather name="minus" size={12} color="#FFF" />
                          </TouchableOpacity>
                          <Text style={styles.stepperVal}>
                            {item.productName.includes("Birria") ? `${item.quantity} kg` : `x${item.quantity}`}
                          </Text>
                          <TouchableOpacity onPress={() => incrementQuantity(item.cartId)} style={styles.stepperBtn}>
                            <Feather name="plus" size={12} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.cartItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                        <TouchableOpacity onPress={() => removeFromCart(item.cartId)}>
                          <Feather name="trash-2" size={18} color="#C03030" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Notas (ej: sin cebolla, con verdura...)"
                        placeholderTextColor="#A07060"
                        value={item.notes}
                        onChangeText={(t) => updateNotes(item.cartId, t)}
                      />
                    </View>
                  ))
                )}
              </ScrollView>

              <TouchableOpacity style={[styles.submitBtn, addItemsMutation.isPending && { opacity: 0.6 }]} onPress={submitAddItems} disabled={addItemsMutation.isPending}>
                {addItemsMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Agregar Items</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3D2312" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2A1508",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 50, height: 50 },
  headerText: { flex: 1 },
  welcome: { color: "#F5E6D0", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 1 },
  name: { color: "#BCA080", fontFamily: "Inter_400Regular", fontSize: 12 },
  logoutBtn: { padding: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5C3520",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#F5E6D0", fontFamily: "Inter_400Regular", fontSize: 14 },
  addOrderBtn: {
    backgroundColor: "#E07050",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 6, marginBottom: 12 },
  tab: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#5C3520",
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { color: "#BCA080", fontFamily: "Inter_600SemiBold", fontSize: 10 },
  empty: { color: "#BCA080", textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular", fontSize: 14 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#5C3520",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    gap: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardClient: { color: "#F5E6D0", fontFamily: "Inter_700Bold", fontSize: 16 },
  cardTime: { color: "#BCA080", fontFamily: "Inter_400Regular", fontSize: 12 },
  cardWaiter: { color: "#BCA080", fontFamily: "Inter_400Regular", fontSize: 12 },
  itemLine: { color: "#D4C0A0", fontFamily: "Inter_400Regular", fontSize: 13 },
  cardTotal: { color: "#D4A030", fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 4 },
  cardBtns: { marginTop: 8 },
  actionBtn: {
    borderRadius: 8,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    backgroundColor: "#5C3520",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { color: "#F5E6D0", fontFamily: "Inter_700Bold", fontSize: 18 },
  modalInput: {
    backgroundColor: "#3D2312",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    color: "#F5E6D0",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 12,
  },
  productSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3D2312",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    marginBottom: 4,
  },
  productSearchInput: { flex: 1, color: "#F5E6D0", fontFamily: "Inter_400Regular", fontSize: 14 },
  productDropdown: {
    backgroundColor: "#3D2312",
    borderRadius: 10,
    maxHeight: 160,
    marginBottom: 8,
  },
  productOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#5C3520",
  },
  productOptionName: { color: "#F5E6D0", fontFamily: "Inter_500Medium", fontSize: 14 },
  productOptionPrice: { color: "#D4A030", fontFamily: "Inter_700Bold", fontSize: 14 },
  cartTitle: { color: "#BCA080", fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 8, marginBottom: 6 },
  cartEmpty: { color: "#7A5030", fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 8 },
  cartItemWrap: {
    marginBottom: 6,
    backgroundColor: "#3D2312",
    borderRadius: 8,
    padding: 8,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartItemName: { flex: 1, color: "#F5E6D0", fontFamily: "Inter_400Regular", fontSize: 14 },
  cartItemPrice: { color: "#D4A030", fontFamily: "Inter_700Bold", fontSize: 14 },
  notesInput: {
    marginTop: 6,
    backgroundColor: "#5C3520",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: "#F5E6D0",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: "#4A7A5E",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  submitBtnText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 16 },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3D2312",
    borderRadius: 6,
    paddingHorizontal: 4,
    height: 28,
    gap: 6,
    marginRight: 6,
  },
  stepperBtn: {
    backgroundColor: "#E07050",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperVal: {
    color: "#F5E6D0",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    minWidth: 36,
    textAlign: "center",
  },
  specialCard: {
    backgroundColor: "#3D2312",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D4A030",
  },
  specialHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  specialTitle: {
    color: "#D4A030",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  specialRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  specialAddBtn: {
    backgroundColor: "#D4A030",
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  specialAddText: {
    color: "#3D2312",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    justifyContent: "space-between",
  },
  chip: {
    backgroundColor: "#5C3520",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D4A030",
    flex: 1,
    alignItems: "center",
  },
  chipText: {
    color: "#D4A030",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    fontWeight: "bold",
  },
});
