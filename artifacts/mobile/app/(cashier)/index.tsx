import {
  useGetOrders,
  useUpdateOrderStatus,
  getGetOrdersQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
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

type TabType = "billing" | "paid";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export default function CashierScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const { logout, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const [activeTab, setActiveTab] = useState<TabType>("billing");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders, isLoading } = useGetOrders(
    { status: activeTab },
    { query: { queryKey: getGetOrdersQueryKey({ status: activeTab }), refetchInterval: 15000 } }
  );

  const markPaid = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey({ status: "billing" }) });
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey({ status: "paid" }) });
        setSelectedOrder(null);
      },
    },
  });

  function handleCollect(order: Order) {
    markPaid.mutate({ id: order.id, data: { status: "paid" } });
  }

  const filteredOrders = ((orders ?? []) as Order[]).filter((o) =>
    o.clientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.welcome}>BIENVENIDO CAJERO</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={20} color="#BCA080" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Feather name="search" size={16} color="#BCA080" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente..."
          placeholderTextColor="#BCA080"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "billing" && { backgroundColor: "#8B2020" }]}
          onPress={() => setActiveTab("billing")}
        >
          <Text style={[styles.tabText, activeTab === "billing" && { color: "#FFF" }]}>POR COBRAR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "paid" && { backgroundColor: "#4A7A5E" }]}
          onPress={() => setActiveTab("paid")}
        >
          <Text style={[styles.tabText, activeTab === "paid" && { color: "#FFF" }]}>COBRADOS</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#E07050" size="large" style={{ marginTop: 32 }} />
      ) : filteredOrders.length === 0 ? (
        <Text style={styles.empty}>
          {activeTab === "billing" ? "No hay órdenes por cobrar." : "No hay órdenes cobradas."}
        </Text>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { borderLeftColor: activeTab === "billing" ? "#8B2020" : "#4A7A5E" }]}
              onPress={() => setSelectedOrder(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardClient}>{item.clientName}</Text>
                <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.cardWaiter}>Mesero: {item.waiterName}</Text>
              <Text style={styles.cardTotal}>Total: ${item.total.toFixed(2)}</Text>
              {activeTab === "billing" && (
                <Text style={styles.tapHint}>Toca para ver ticket y cobrar</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <View style={styles.modalOverlay}>
            <View style={styles.ticketSheet}>
              <View style={styles.ticketHeader}>
                <View style={styles.ticketLogoWrap}>
                  <Image source={LOGO} style={styles.ticketLogo} contentFit="contain" />
                </View>
                <Text style={styles.ticketTitle}>TACOS LOMA</Text>
                <Text style={styles.ticketSub}>Ticket de Cobro</Text>
              </View>

              <View style={styles.ticketDivider} />

              <Text style={styles.ticketClient}>Cliente: {selectedOrder.clientName}</Text>
              <Text style={styles.ticketMesero}>Mesero: {selectedOrder.waiterName}</Text>
              <Text style={styles.ticketTime}>Hora: {formatTime(selectedOrder.createdAt)}</Text>

              <View style={styles.ticketDivider} />

              <View style={styles.ticketItemHeader}>
                <Text style={[styles.ticketCol, { flex: 2 }]}>Producto</Text>
                <Text style={styles.ticketCol}>Cant.</Text>
                <Text style={[styles.ticketCol, { textAlign: "right" }]}>Precio</Text>
              </View>

              {selectedOrder.items.map((item) => (
                <View key={item.id} style={styles.ticketItem}>
                  <Text style={[styles.ticketItemText, { flex: 2 }]}>{item.productName}</Text>
                  <Text style={styles.ticketItemText}>{item.quantity}</Text>
                  <Text style={[styles.ticketItemText, { textAlign: "right" }]}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={styles.ticketDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmount}>${selectedOrder.total.toFixed(2)}</Text>
              </View>

              <View style={styles.ticketBtns}>
                <TouchableOpacity
                  style={[styles.ticketBtn, { backgroundColor: "#6B4530" }]}
                  onPress={() => setSelectedOrder(null)}
                >
                  <Text style={styles.ticketBtnText}>Cerrar</Text>
                </TouchableOpacity>
                {selectedOrder.status === "billing" && (
                  <TouchableOpacity
                    style={[styles.ticketBtn, { backgroundColor: "#4A7A5E" }, markPaid.isPending && { opacity: 0.6 }]}
                    onPress={() => handleCollect(selectedOrder)}
                    disabled={markPaid.isPending}
                  >
                    {markPaid.isPending ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.ticketBtnText}>COBRAR</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5C3520",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#F5E6D0", fontFamily: "Inter_400Regular", fontSize: 14 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#5C3520",
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { color: "#BCA080", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  empty: { color: "#BCA080", textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular", fontSize: 14 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#5C3520",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    gap: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardClient: { color: "#F5E6D0", fontFamily: "Inter_700Bold", fontSize: 16 },
  cardTime: { color: "#BCA080", fontFamily: "Inter_400Regular", fontSize: 12 },
  cardWaiter: { color: "#BCA080", fontFamily: "Inter_400Regular", fontSize: 12 },
  cardTotal: { color: "#D4A030", fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 4 },
  tapHint: { color: "#7A5030", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4, fontStyle: "italic" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  ticketSheet: {
    backgroundColor: "#F5E6D0",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "85%",
  },
  ticketHeader: { alignItems: "center", marginBottom: 12 },
  ticketLogoWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#3D2312",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  ticketLogo: { width: 58, height: 58 },
  ticketTitle: { color: "#3D2312", fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 3 },
  ticketSub: { color: "#7A5030", fontFamily: "Inter_400Regular", fontSize: 13, letterSpacing: 1 },
  ticketDivider: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#BCA080",
    marginVertical: 12,
  },
  ticketClient: { color: "#3D2312", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  ticketMesero: { color: "#7A5030", fontFamily: "Inter_400Regular", fontSize: 13 },
  ticketTime: { color: "#7A5030", fontFamily: "Inter_400Regular", fontSize: 13 },
  ticketItemHeader: { flexDirection: "row", marginBottom: 6 },
  ticketCol: { color: "#7A5030", fontFamily: "Inter_600SemiBold", fontSize: 12, flex: 1 },
  ticketItem: { flexDirection: "row", paddingVertical: 4 },
  ticketItemText: { color: "#3D2312", fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#3D2312", fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 2 },
  totalAmount: { color: "#3D2312", fontFamily: "Inter_700Bold", fontSize: 24 },
  ticketBtns: { flexDirection: "row", gap: 12, marginTop: 20 },
  ticketBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketBtnText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 16 },
});
