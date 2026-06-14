import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#3D2312", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#E07050" size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  if (user.role === "admin") return <Redirect href="/(admin)" />;
  if (user.role === "waiter") return <Redirect href="/(waiter)" />;
  if (user.role === "cashier") return <Redirect href="/(cashier)" />;

  return <Redirect href="/login" />;
}
