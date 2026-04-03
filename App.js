import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Platform, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { HouseholdProvider, useHousehold } from './src/context/HouseholdContext';
import AuthScreen from './src/screens/AuthScreen';
import HouseholdScreen from './src/screens/HouseholdScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListScreen from './src/screens/ListScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import GroceryScreen from './src/screens/GroceryScreen';
import MealsScreen from './src/screens/MealsScreen';
import DashboardScreen from './src/screens/DashboardScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function WebStackNav({ navigation, colors }) {
  const links = [
    { label: 'Accueil', target: 'Tabs', params: { screen: 'Accueil' } },
    { label: 'Listes', target: 'Tabs', params: { screen: 'Listes' } },
    { label: 'Courses', target: 'Tabs', params: { screen: 'Courses' } },
    { label: 'Repas', target: 'Tabs', params: { screen: 'Repas' } },
    { label: 'Calendrier', target: 'Tabs', params: { screen: 'Calendrier' } },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: colors.primaryLight,
            marginRight: 12,
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>← Retour</Text>
        </TouchableOpacity>
        {links.map((link) => (
          <TouchableOpacity
            key={link.label}
            onPress={() => navigation.navigate(link.target, link.params)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              marginRight: 8,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function HomeTabs() {
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';
  return (
    <Tab.Navigator
      initialRouteName="Accueil"
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWeb ? 'top' : 'bottom',
        tabBarScrollEnabled: isWeb,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: isWeb ? 'transparent' : colors.border,
          borderBottomColor: isWeb ? colors.border : 'transparent',
          borderBottomWidth: isWeb ? 1 : 0,
          borderTopWidth: 1,
          height: isWeb ? 72 : 64,
          paddingHorizontal: isWeb ? 24 : 0,
          paddingTop: isWeb ? 10 : 6,
          paddingBottom: isWeb ? 10 : 6,
          justifyContent: 'center',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: isWeb ? 14 : 11,
          fontWeight: '700',
          marginBottom: isWeb ? 0 : 4,
        },
        tabBarItemStyle: isWeb
          ? {
              width: 104,
              maxWidth: 120,
              borderRadius: 14,
              marginRight: 6,
            }
          : undefined,
        tabBarIconStyle: isWeb ? { marginBottom: 2 } : undefined,
        tabBarActiveBackgroundColor: isWeb ? colors.primaryLight : 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarShowIcon: true,
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🏠" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Listes"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="📋" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Courses"
        component={GroceryScreen}
        options={{
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🛒" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Repas"
        component={MealsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🍽️" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Calendrier"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="📅" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { session, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const { colors, isDark } = useTheme();

  if (authLoading || (session && householdLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session) return <AuthScreen />;

  if (!household) return <HouseholdScreen />;

  return (
    <AppProvider householdId={household.id}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={HomeTabs} />
          <Stack.Screen
            name="List"
            component={ListScreen}
            options={{
              headerShown: Platform.OS !== 'web',
              ...(Platform.OS === 'web'
                ? {
                    header: ({ navigation }) => (
                      <WebStackNav navigation={navigation} colors={colors} />
                    ),
                  }
                : {}),
              title: '',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}

function AppNavigator() {
  return (
    <HouseholdProvider>
      <AppContent />
    </HouseholdProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
