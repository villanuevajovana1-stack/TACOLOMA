import { useGetOrdersSummary } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#2D6B4E",
  delivered: "#9B7820",
  billing: "#7A5030",
  paid: "#4A7A5E",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  delivered: "Entregado",
  billing: "Por cobrar",
  paid: "Pagado",
};

export default function SalesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: summary, isLoading, refetch } = useGetOrdersSummary();

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#F5E6D0" />
        </TouchableOpacity>
        <Text style={styles.title}>VENTAS DEL DÍA</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Feather name="refresh-cw" size={20} color="#F5E6D0" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#E07050" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary?.totalOrders ?? 0}</Text>
              <Text style={styles.statLabel}>Total pedidos</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#4A7A5E" }]}>
              <Text style={styles.statValue}>${(summary?.totalRevenue ?? 0).toFixed(2)}</Text>
              <Text style={styles.statLabel}>Ingresos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary?.paidOrders ?? 0}</Text>
              <Text style={styles.statLabel}>Cobrados</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Órdenes</Text>
          {!summary?.orders?.length ? (
            <Text style={styles.empty}>No hay órdenes hoy.</Text>
          ) : (
            summary.orders.map((order) => (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardClient}>{order.clientName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] ?? "#6B4530" }]}>
                    <Text style={styles.statusText}>{STATUS_LABELS[order.status] ?? order.status}</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>Mesero: {order.waiterName} · {formatTime(order.createdAt)}</Text>
                {order.items.map((item) => (
                  <Text key={item.id} style={styles.itemLine}>
                    {item.quantity}x {item.productName} — ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                ))}
                <Text style={styles.cardTotal}>Total: ${order.total.toFixed(2)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  refreshBtn: { padding: 8 },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#F5E6D0",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 2,
  },
  scroll: { padding: 16, gap: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1,
    backgroundColor: "#5C3520",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statValue: { color: "#F5E6D0", fontFamily: "Inter_700Bold", fontSize: 20 },
  statLabel: { color: "#BCA080", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4 },
  sectionTitle: {
    color: "#F5E6D0",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 1,
    marginBottom: 4,
  },
  empty: { color: "#BCA080", textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 20 },
  card: {
    backgroundColor: "#5C3520",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardClient: { color: "#F5E6D0", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  cardSub: { color: "#BCA080", fontFamily: "Inter_400Regular", fontSize: 12 },
  itemLine: { color: "#D4C0A0", fontFamily: "Inter_400Regular", fontSize: 13 },
  cardTotal: { color: "#D4A030", fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 4 },
});
