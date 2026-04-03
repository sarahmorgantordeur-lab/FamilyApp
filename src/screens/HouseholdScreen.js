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
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useHousehold } from '../context/HouseholdContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function HouseholdScreen() {
  const { createHousehold, joinHousehold } = useHousehold();
  const { colors } = useTheme();
  const { signOut, session } = useAuth();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState(session?.user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function saveFirstName() {
    if (firstName.trim() && firstName.trim() !== session?.user?.displayName) {
      await updateProfile(auth.currentUser, { displayName: firstName.trim() });
    }
  }

  async function handleCreate() {
    if (!firstName.trim()) { setError('Entre ton prénom d\'abord.'); return; }
    setLoading(true);
    await saveFirstName();
    await createHousehold();
    setLoading(false);
  }

  async function handleJoin() {
    if (!firstName.trim()) { setError('Entre ton prénom d\'abord.'); return; }
    if (code.length < 6) { setError('Entrez le code à 6 caractères.'); return; }
    setLoading(true);
    await saveFirstName();
    const err = await joinHousehold(code);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <SafeAreaView className="flex-1" style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView className="flex-1 px-6 md:px-8" style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="mx-auto flex-1 w-full max-w-5xl md:flex-row md:items-center md:justify-between md:gap-10">
          <View className="flex-1 items-center justify-center md:max-w-md" style={styles.center}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.icon}>🏠</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Votre foyer</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Créez un foyer ou rejoignez celui de votre partenaire
            </Text>
          </View>

          <View className="w-full md:max-w-xl">
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Votre prénom</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: error && !firstName.trim() ? colors.danger : colors.border }]}
                placeholder="Sarah, Landelin…"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={(t) => { setFirstName(t); setError(''); }}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {!mode && (
              <View style={styles.btns}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={() => setMode('create')}
                >
                  <Text style={styles.btnText}>Créer mon foyer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setMode('join')}
                >
                  <Text style={[styles.btnText, { color: colors.text }]}>Rejoindre un foyer</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'create' && (
              <View style={styles.btns}>
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={handleCreate}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Créer le foyer</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMode(null); setError(''); }}>
                  <Text style={[styles.back, { color: colors.textSecondary }]}>← Retour</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'join' && (
              <View style={styles.joinForm}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Code du foyer</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, fontSize: 22, fontWeight: '700', textAlign: 'center', letterSpacing: 4 }]}
                  placeholder="ABC123"
                  placeholderTextColor={colors.textMuted}
                  value={code}
                  onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary, marginTop: 16 }]}
                  onPress={handleJoin}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Rejoindre</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMode(null); setError(''); }}>
                  <Text style={[styles.back, { color: colors.textSecondary }]}>← Retour</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={signOut} style={styles.signout}>
              <Text style={[styles.signoutText, { color: colors.textMuted }]}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  icon: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  section: { marginBottom: 20 },
  btns: { gap: 12, marginBottom: 40 },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  joinForm: { marginBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1 },
  error: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  back: { textAlign: 'center', marginTop: 16, fontSize: 14 },
  signout: { alignItems: 'center', paddingBottom: 30 },
  signoutText: { fontSize: 14 },
});
