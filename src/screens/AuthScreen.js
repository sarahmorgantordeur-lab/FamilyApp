import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit() {
    setError('');
    setSuccess('');
    if (!email.trim() || !password.trim()) {
      setError('Email et mot de passe requis.');
      return;
    }
    setLoading(true);
    const err = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, firstName.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
    } else if (mode === 'register') {
      setSuccess('Compte cree ! Verifie ton email pour confirmer, puis connecte-toi.');
      setMode('login');
    }
  }

  return (
    <SafeAreaView className="flex-1" style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        className="flex-1 px-5 md:px-8"
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          className="absolute right-0 top-4 z-10 md:right-6"
          style={[styles.themeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={toggleTheme}
        >
          <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>

        <View className="mx-auto flex-1 w-full max-w-5xl md:flex-row md:items-center md:justify-between md:gap-10">
          <View className="flex-1 items-center justify-center md:max-w-md" style={styles.center}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.appIcon}>📋</Text>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Mes Listes</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Organise votre quotidien en famille
            </Text>
          </View>

          <View className="mb-8 w-full md:mb-0 md:max-w-xl" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => { setMode('login'); setError(''); setSuccess(''); }}
              >
                <Text style={[styles.tabText, { color: mode === 'login' ? colors.primary : colors.textMuted }]}>
                  Connexion
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => { setMode('register'); setError(''); setSuccess(''); }}
              >
                <Text style={[styles.tabText, { color: mode === 'register' ? colors.primary : colors.textMuted }]}>
                  Inscription
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {mode === 'register' && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Prénom</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border, marginBottom: 14 }]}
                    placeholder="Ton prénom"
                    placeholderTextColor={colors.textMuted}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </>
              )}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
                placeholder="ton@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>Mot de passe</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {error ? (
                <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
              ) : null}
              {success ? (
                <Text style={[styles.success, { color: colors.success }]}>{success}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>{mode === 'login' ? 'Se connecter' : 'Creer un compte'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: 20 },
  themeBtn: {
    position: 'absolute',
    top: 16,
    right: 0,
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
  },
  themeIcon: { fontSize: 18 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appIcon: { fontSize: 36 },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
    overflow: 'hidden',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    borderWidth: 1,
  },
  error: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  success: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
