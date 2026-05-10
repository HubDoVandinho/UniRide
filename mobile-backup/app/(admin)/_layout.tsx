import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.Primary,
        tabBarInactiveTintColor: Colors.TextMuted,
        tabBarStyle: { backgroundColor: Colors.Surface },
      }}
    >
      <Tabs.Screen
        name="motoristas"
        options={{
          title: 'Motoristas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="denuncias"
        options={{
          title: 'Denúncias',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="participante/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="sair"
        options={{
          title: 'Sair',
          tabBarIcon: ({ size }) => (
            <Ionicons name="log-out-outline" size={size} color={Colors.Error} />
          ),
          tabBarLabel: () => (
            <Text style={{ color: Colors.Error, fontSize: 10, fontWeight: '600' }}>Sair</Text>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              style={props.style}
              onPress={() => useAuthStore.getState().logout()}
              activeOpacity={0.7}
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
