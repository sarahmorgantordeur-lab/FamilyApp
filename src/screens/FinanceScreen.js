import { useState, useMemo } from 'react';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFinance, MAIN_ACCOUNTS, EXPENSE_CATEGORIES } from '../context/FinanceContext';

const SAVINGS_COLORS = ['#7B7BF8', '#30A46C', '#FB923C', '#E5534B', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899'];

function fmt(amount) {
  const abs = Math.abs(amount);
  const str = abs.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return (amount < 0 ? '-' : '') + str + '\u202f€';
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function getCategoryMeta(categoryKey) {
  return EXPENSE_CATEGORIES.find((category) => category.key === categoryKey) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

function normalizeAmountInput(value) {
  return value.replace(',', '.');
}

// ─── Modal générique (bottom sheet) ───────────────────────────────────────────
function FinanceModal({ visible, onClose, title, children, scrollable = false }) {
  const { colors } = useTheme();
  const Inner = (
    <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.modalHandle} />
      <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
      {scrollable
        ? <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        : children}
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        {Inner}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Carte de compte principal ─────────────────────────────────────────────────
function AccountCard({ name, emoji, color, balance, accountNumber, onPress }) {
  const { colors } = useTheme();
  const isNeg = balance < 0;
  return (
    <TouchableOpacity
      style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.accountIcon, { backgroundColor: color + '22' }]}>
        <Text style={styles.accountEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.accountName, { color: colors.textSecondary }]} numberOfLines={1}>{name}</Text>
      <Text style={[styles.accountBalance, { color: isNeg ? colors.danger : colors.text }]} numberOfLines={1}>
        {fmt(balance)}
      </Text>
      {!!accountNumber && (
        <Text style={[styles.accountNumber, { color: colors.textMuted }]} numberOfLines={1}>
          {accountNumber}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Ligne de transaction ──────────────────────────────────────────────────────
function TxRow({ tx, accountLabel, accountColor, onDelete }) {
  const { colors } = useTheme();
  const isIncome = tx.type === 'income';
  const isAdj   = tx.type === 'adjustment';
  const category = !isIncome && !isAdj ? getCategoryMeta(tx.category || 'autre') : null;

  function handleLongPress() {
    if (Platform.OS === 'web') {
      if (window.confirm('Supprimer cette transaction ?')) onDelete();
      return;
    }
    Alert.alert('Supprimer', 'Supprimer cette transaction ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <View style={[styles.txRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.txDot, { backgroundColor: isAdj ? colors.textMuted : isIncome ? colors.success : colors.danger }]} />
      <View style={styles.txInfo}>
        <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>
          {tx.description || (isAdj ? 'Mise à jour solde' : isIncome ? 'Revenu' : 'Dépense')}
        </Text>
        <View style={styles.txMeta}>
          <View style={[styles.txAccountBadge, { backgroundColor: accountColor + '22' }]}>
            <Text style={[styles.txAccountLabel, { color: accountColor }]}>{accountLabel}</Text>
          </View>
          {category && (
            <View style={[styles.txCategoryBadge, { backgroundColor: category.color + '22' }]}>
              <Text style={[styles.txCategoryText, { color: category.color }]}>
                {category.emoji} {category.label}
              </Text>
            </View>
          )}
          <Text style={[styles.txDate, { color: colors.textMuted }]}>{tx.date || ''}</Text>
        </View>
      </View>
      <Text style={[styles.txAmount, { color: isAdj ? colors.textSecondary : isIncome ? colors.success : colors.danger }]}>
        {isAdj ? fmt(tx.amount) : (isIncome ? '+' : '-') + fmt(tx.amount)}
      </Text>
      <TouchableOpacity
        style={[styles.txDeleteBtn, { backgroundColor: colors.surfaceAlt }]}
        onPress={handleLongPress}
        hitSlop={8}
      >
        <Text style={[styles.txDeleteText, { color: colors.textMuted }]}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

function PieChart({ data, size = 152, emptyColor }) {
  const gridSize = 13;
  const dotSize = 8;
  const gap = 3;
  const radius = gridSize / 2;
  const points = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const dx = x - (gridSize - 1) / 2;
      const dy = y - (gridSize - 1) / 2;
      if ((dx * dx) + (dy * dy) <= radius * radius) {
        points.push({ x, y });
      }
    }
  }

  const totalDots = points.length;
  let cursor = 0;
  const coloredDots = data.flatMap((slice, index) => {
    const isLast = index === data.length - 1;
    const count = isLast ? totalDots - cursor : Math.round(slice.ratio * totalDots);
    const dots = Array.from({ length: Math.max(count, 0) }, () => slice.color);
    cursor += dots.length;
    return dots;
  });

  while (coloredDots.length < totalDots) {
    coloredDots.push(emptyColor);
  }

  return (
    <View
      style={[
        styles.dotPie,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: emptyColor,
        },
      ]}
    >
      {points.map((point, index) => (
        <View
          key={`${point.x}-${point.y}`}
          style={[
            styles.dotPiePoint,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              left: point.x * (dotSize + gap) + 12,
              top: point.y * (dotSize + gap) + 12,
              backgroundColor: coloredDots[index] || emptyColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

function AccountExpenseChartCard({ title, color, amount, breakdown, colors }) {
  const hasData = breakdown.length > 0;

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.chartCardHeader}>
        <View style={[styles.chartAccountDot, { backgroundColor: color }]} />
        <View style={styles.chartCardTitleWrap}>
          <Text style={[styles.chartCardTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.chartCardSubtitle, { color: colors.textMuted }]}>
            Dépenses {hasData ? fmt(amount) : '0,00 €'}
          </Text>
        </View>
      </View>

      <View style={styles.chartBody}>
        <View style={styles.chartVisual}>
          <PieChart data={breakdown} emptyColor={colors.surfaceAlt} />
          <View style={styles.chartCenterLabel}>
            <Text style={[styles.chartCenterValue, { color: colors.text }]}>{hasData ? breakdown.length : 0}</Text>
            <Text style={[styles.chartCenterText, { color: colors.textMuted }]}>cat.</Text>
          </View>
        </View>

        <View style={styles.chartLegend}>
          {hasData ? (
            breakdown.map((item) => (
              <View key={item.key} style={styles.chartLegendRow}>
                <View style={[styles.chartLegendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.chartLegendLabel, { color: colors.text }]} numberOfLines={1}>
                  {item.emoji} {item.label}
                </Text>
                <Text style={[styles.chartLegendValue, { color: colors.textSecondary }]}>
                  {Math.round(item.ratio * 100)}%
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.chartEmptyText, { color: colors.textMuted }]}>
              Aucune dépense catégorisée pour ce compte.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Screen principal ──────────────────────────────────────────────────────────
export default function FinanceScreen() {
  const { colors } = useTheme();
  const {
    accounts, transactions,
    getMainMeta, updateMainMeta,
    getBalance, getSavingsBalance, getTotalBalance,
    addMainTransaction, setMainBalance,
    addSavingsTransaction, setSavingsBalance,
    deleteTransaction,
    addSavingsAccount, updateSavingsAccount, deleteSavingsAccount,
  } = useFinance();

  function getMainAccount(accountKey) {
    const base = MAIN_ACCOUNTS.find((account) => account.key === accountKey);
    const meta = getMainMeta(accountKey);
    return {
      ...base,
      name: meta?.name || base?.name,
      color: meta?.color || base?.color,
      accountNumber: meta?.accountNumber || '',
    };
  }

  // Filtre actif
  const [filter, setFilter] = useState('all');

  // Modals: 'account_detail' | 'tx' | 'adjust' | 'savings_add' | null
  const [modal, setModal] = useState(null);

  // Compte ouvert dans le modal de détail
  // { type: 'main'|'savings', key?, id?, name, color }
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailName, setDetailName] = useState('');
  const [detailColor, setDetailColor] = useState(SAVINGS_COLORS[0]);
  const [detailAccountNumber, setDetailAccountNumber] = useState('');
  const [savingNumber, setSavingNumber] = useState(false);
  const [modalError, setModalError] = useState('');

  // Formulaire transaction
  const [txTarget, setTxTarget]   = useState(null);
  const [txType, setTxType]       = useState('expense');
  const [txCategory, setTxCategory] = useState('autre');
  const [txAmount, setTxAmount]   = useState('');
  const [txDate, setTxDate]       = useState(today());
  const [txDesc, setTxDesc]       = useState('');
  const [saving, setSaving]       = useState(false);

  // Formulaire ajustement solde
  const [adjTarget, setAdjTarget] = useState(null);
  const [adjBalance, setAdjBalance] = useState('');

  // Formulaire nouveau compte épargne
  const [newSavingsName, setNewSavingsName]   = useState('');
  const [newSavingsColor, setNewSavingsColor] = useState(SAVINGS_COLORS[0]);
  const [newSavingsNumber, setNewSavingsNumber] = useState('');

  // ─ Ouvrir modal détail compte ─
  function openDetail(target) {
    setDetailTarget(target);
    if (target.type === 'main') {
      const account = getMainAccount(target.key);
      setDetailName(account.name);
      setDetailColor(account.color);
      setDetailAccountNumber(account.accountNumber || '');
    } else {
      const acc = accounts.find((a) => a.id === target.id);
      setDetailName(acc?.name || target.name);
      setDetailColor(acc?.color || target.color);
      setDetailAccountNumber(acc?.accountNumber || '');
    }
    setModal('account_detail');
  }

  function openTxModal(target) {
    setTxTarget(target);
    setTxType('expense');
    setTxCategory('autre');
    setTxAmount('');
    setTxDate(today());
    setTxDesc('');
    setModal('tx');
  }

  function openAdjFromDetail() {
    setAdjTarget(detailTarget);
    setAdjBalance('');
    setModal('adjust');
  }

  function openTxFromDetail() {
    openTxModal(detailTarget);
  }

  function openSavingsAdd() {
    setNewSavingsName('');
    setNewSavingsColor(SAVINGS_COLORS[0]);
    setNewSavingsNumber('');
    setModal('savings_add');
  }

  function closeModal() {
    setModal(null);
    setSaving(false);
    setSavingNumber(false);
    setModalError('');
  }

  // ─ Enregistrer les modifications du compte ─
  async function handleSaveAccountDetails() {
    if (!detailTarget) return;
    setSavingNumber(true);
    try {
      if (detailTarget.type === 'main') {
        await updateMainMeta(detailTarget.key, {
          name: detailName.trim() || detailTarget.name,
          color: detailColor,
          accountNumber: detailAccountNumber.trim(),
        });
      } else {
        await updateSavingsAccount(detailTarget.id, {
          name: detailName.trim() || detailTarget.name,
          color: detailColor,
          accountNumber: detailAccountNumber.trim(),
        });
      }
      closeModal();
    } catch (err) {
      setModalError(err?.message ?? `Erreur lors de l\u2019enregistrement.`);
    } finally {
      setSavingNumber(false);
    }
  }

  // ─ Ajouter transaction ─
  async function handleAddTx() {
    const parsedAmount = parseFloat(normalizeAmountInput(txAmount));
    if (!txAmount || Number.isNaN(parsedAmount)) return;
    setSaving(true);
    try {
      if (txTarget.type === 'main') {
        await addMainTransaction({
          accountKey: txTarget.key,
          type: txType,
          amount: parsedAmount,
          date: txDate,
          description: txDesc,
          category: txType === 'expense' ? txCategory : null,
        });
      } else {
        await addSavingsTransaction({
          accountId: txTarget.id,
          type: txType,
          amount: parsedAmount,
          date: txDate,
          description: txDesc,
          category: txType === 'expense' ? txCategory : null,
        });
      }
      closeModal();
    } finally { setSaving(false); }
  }

  // ─ Ajustement solde ─
  async function handleAdjust() {
    const parsedBalance = parseFloat(normalizeAmountInput(adjBalance));
    if (!adjBalance || Number.isNaN(parsedBalance)) return;
    setSaving(true);
    try {
      if (adjTarget.type === 'main') {
        await setMainBalance(adjTarget.key, parsedBalance);
      } else {
        await setSavingsBalance(adjTarget.id, parsedBalance);
      }
      closeModal();
    } catch (error) {
      console.error('handleAdjust error:', error);
      Alert.alert('Erreur', error?.message || 'Impossible de mettre à jour le solde.');
    } finally { setSaving(false); }
  }

  // ─ Créer compte épargne ─
  async function handleAddSavings() {
    if (!newSavingsName.trim()) return;
    setSaving(true);
    try {
      await addSavingsAccount(newSavingsName.trim(), newSavingsColor, newSavingsNumber.trim());
      closeModal();
    } finally { setSaving(false); }
  }

  // ─ Supprimer compte épargne ─
  function confirmDeleteSavings(accountId, name) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer le compte "${name}" et toutes ses transactions ?`)) {
        deleteSavingsAccount(accountId);
        if (filter === accountId) setFilter('all');
      }
      return;
    }
    Alert.alert('Supprimer le compte', `Supprimer "${name}" et toutes ses transactions ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        deleteSavingsAccount(accountId);
        if (filter === accountId) setFilter('all');
      }},
    ]);
  }

  // ─ Données filtrées ─
  const filteredTx = useMemo(() => {
    if (filter === 'all') return transactions;
    if (MAIN_ACCOUNTS.find((a) => a.key === filter)) return transactions.filter((t) => t.accountKey === filter);
    return transactions.filter((t) => t.accountId === filter);
  }, [transactions, filter]);

  function txAccountLabel(tx) {
    if (tx.accountKey) return getMainAccount(tx.accountKey)?.name || tx.accountKey;
    return accounts.find((a) => a.id === tx.accountId)?.name || '?';
  }
  function txAccountColor(tx) {
    if (tx.accountKey) return getMainAccount(tx.accountKey)?.color || colors.primary;
    return accounts.find((a) => a.id === tx.accountId)?.color || colors.primary;
  }

  const monthSummary = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    const monthTx = transactions.filter((t) => t.date?.startsWith(m) && t.type !== 'adjustment');
    return {
      income:  monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  }, [transactions]);

  const total = getTotalBalance();

  const filterOptions = [
    { key: 'all', label: 'Tout', color: colors.primary },
    ...MAIN_ACCOUNTS.map((a) => {
      const account = getMainAccount(a.key);
      return { key: a.key, label: account.name, color: account.color };
    }),
    ...accounts.map((a) => ({ key: a.id, label: a.name, color: a.color })),
  ];

  const accountCharts = useMemo(() => {
    const expenseTx = transactions.filter((tx) => tx.type === 'expense');
    const allAccounts = [
      ...MAIN_ACCOUNTS.map((account) => ({
        id: account.key,
        label: getMainAccount(account.key).name,
        color: getMainAccount(account.key).color,
        matches: (tx) => tx.accountKey === account.key,
      })),
      ...accounts.map((account) => ({
        id: account.id,
        label: account.name,
        color: account.color,
        matches: (tx) => tx.accountId === account.id,
      })),
    ];

    return allAccounts.map((account) => {
      const accountTx = expenseTx.filter(account.matches);
      const totalAmount = accountTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const perCategory = EXPENSE_CATEGORIES.map((category) => {
        const amount = accountTx
          .filter((tx) => (tx.category || 'autre') === category.key)
          .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        return {
          ...category,
          amount,
        };
      }).filter((category) => category.amount > 0);

      const breakdown = totalAmount > 0
        ? perCategory.map((category) => ({
            ...category,
            ratio: category.amount / totalAmount,
          }))
        : [];

      return {
        ...account,
        totalAmount,
        breakdown,
      };
    });
  }, [accounts, transactions]);

  // Solde du compte actuellement ouvert dans le modal de détail
  const detailBalance = detailTarget
    ? detailTarget.type === 'main'
      ? getBalance(detailTarget.key)
      : getSavingsBalance(detailTarget.id)
    : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-2xl">

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Finances</Text>
          </View>

          {/* Solde total */}
          <View style={[styles.totalCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.totalLabel}>Solde total</Text>
            <Text style={styles.totalAmount}>{fmt(total)}</Text>
            <View style={styles.totalRow}>
              <View style={styles.totalStat}>
                <Text style={styles.totalStatLabel}>Ce mois · Revenus</Text>
                <Text style={[styles.totalStatValue, { color: '#4ADE80' }]}>+{fmt(monthSummary.income)}</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalStat}>
                <Text style={styles.totalStatLabel}>Ce mois · Dépenses</Text>
                <Text style={[styles.totalStatValue, { color: '#FCA5A5' }]}>-{fmt(monthSummary.expense)}</Text>
              </View>
            </View>
          </View>

          {/* Comptes principaux */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Comptes principaux</Text>
          <View style={styles.accountsRow}>
            {MAIN_ACCOUNTS.map((a) => {
              const account = getMainAccount(a.key);
              return (
                <AccountCard
                  key={a.key}
                  name={account.name}
                  emoji={a.emoji}
                  color={account.color}
                  balance={getBalance(a.key)}
                  accountNumber={account.accountNumber}
                  onPress={() => openDetail({ type: 'main', key: a.key, name: account.name, color: account.color })}
                />
              );
            })}
          </View>

          {/* Comptes épargne */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>Épargne</Text>
            <TouchableOpacity
              style={[styles.addSavingsBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              onPress={openSavingsAdd}
            >
              <Text style={[styles.addSavingsBtnText, { color: colors.primary }]}>+ Nouveau</Text>
            </TouchableOpacity>
          </View>

          {accounts.length === 0 ? (
            <View style={[styles.emptyEpargne, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyEpargneText, { color: colors.textMuted }]}>
                Aucun compte épargne · Appuyez sur "+ Nouveau"
              </Text>
            </View>
          ) : (
            <View style={styles.savingsGrid}>
              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.savingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openDetail({ type: 'savings', id: a.id, name: a.name, color: a.color })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.savingsColorBar, { backgroundColor: a.color }]} />
                  <View style={styles.savingsContent}>
                    <View style={styles.savingsHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.savingsName, { color: colors.text }]} numberOfLines={1}>{a.name}</Text>
                        {!!a.accountNumber && (
                          <Text style={[styles.savingsAccountNumber, { color: colors.textMuted }]} numberOfLines={1}>
                            {a.accountNumber}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[styles.savingsDeleteBtn, { backgroundColor: colors.dangerLight }]}
                        onPress={() => confirmDeleteSavings(a.id, a.name)}
                      >
                        <Text style={[styles.savingsDeleteBtnText, { color: colors.danger }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.savingsBalance, { color: getSavingsBalance(a.id) < 0 ? colors.danger : colors.text }]}>
                      {fmt(getSavingsBalance(a.id))}
                    </Text>
                    <Text style={[styles.savingsTapHint, { color: colors.textMuted }]}>
                      Appuyer pour gérer
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>Répartition des dépenses</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartCardsRow}>
            {accountCharts.map((account) => (
              <AccountExpenseChartCard
                key={account.id}
                title={account.label}
                color={account.color}
                amount={account.totalAmount}
                breakdown={account.breakdown}
                colors={colors}
              />
            ))}
          </ScrollView>

          {/* Transactions */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>Transactions</Text>
          </View>

          {/* Filtres */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
            {filterOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterChip, {
                  backgroundColor: filter === opt.key ? opt.color : colors.surfaceAlt,
                  borderColor: filter === opt.key ? opt.color : colors.border,
                }]}
                onPress={() => setFilter(opt.key)}
              >
                <Text style={[styles.filterChipText, { color: filter === opt.key ? '#fff' : colors.textSecondary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bouton ajouter transaction */}
          <TouchableOpacity
            style={[styles.addTxBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (filter === 'all') {
                openTxModal({ type: 'main', key: 'commun', name: 'Commun', color: '#30A46C' });
              } else {
                const mainAcc = MAIN_ACCOUNTS.find((a) => a.key === filter);
                if (mainAcc) {
                  openTxModal({ type: 'main', key: mainAcc.key, name: mainAcc.name, color: mainAcc.color });
                } else {
                  const savAcc = accounts.find((a) => a.id === filter);
                  if (savAcc) openTxModal({ type: 'savings', id: savAcc.id, name: savAcc.name, color: savAcc.color });
                }
              }
            }}
          >
            <Text style={styles.addTxBtnText}>+ Ajouter une transaction</Text>
          </TouchableOpacity>

          {/* Liste de transactions */}
          {filteredTx.length === 0 ? (
            <View style={[styles.emptyTx, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyTxText, { color: colors.textMuted }]}>Aucune transaction</Text>
            </View>
          ) : (
            filteredTx.map((tx) => (
              <TxRow
                key={tx.id}
                tx={tx}
                accountLabel={txAccountLabel(tx)}
                accountColor={txAccountColor(tx)}
                onDelete={() => deleteTransaction(tx.id)}
              />
            ))
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* ═══ Modal : Détail du compte ════════════════════════════════════════════ */}
      <FinanceModal
        visible={modal === 'account_detail'}
        onClose={closeModal}
        title={detailName || detailTarget?.name || ''}
        scrollable
      >
        {/* Solde actuel */}
        <View style={[styles.detailBalanceRow, { backgroundColor: (detailColor || detailTarget?.color || colors.primary) + '18', borderColor: (detailColor || detailTarget?.color || colors.primary) + '33' }]}>
          <Text style={[styles.detailBalanceLabel, { color: colors.textSecondary }]}>Solde actuel</Text>
          <Text style={[styles.detailBalanceValue, { color: detailBalance < 0 ? colors.danger : detailColor || detailTarget?.color || colors.primary }]}>
            {fmt(detailBalance)}
          </Text>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nom du compte</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
          placeholder="Nom du compte"
          placeholderTextColor={colors.textMuted}
          value={detailName}
          onChangeText={setDetailName}
          maxLength={40}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Couleur</Text>
        <View style={styles.colorPicker}>
          {SAVINGS_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c, borderWidth: detailColor === c ? 3 : 0, borderColor: '#fff' }]}
              onPress={() => setDetailColor(c)}
            />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Numéro de compte</Text>
        <View style={styles.accountNumberRow}>
          <TextInput
            style={[styles.accountNumberInput, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
            placeholder="ex. FR76 1234 5678 9012 3456 789 12"
            placeholderTextColor={colors.textMuted}
            value={detailAccountNumber}
            onChangeText={setDetailAccountNumber}
            autoCapitalize="characters"
            maxLength={34}
          />
          <TouchableOpacity
            style={[styles.accountNumberSaveBtn, { backgroundColor: detailColor || detailTarget?.color || colors.primary, opacity: savingNumber ? 0.6 : 1 }]}
            onPress={handleSaveAccountDetails}
            disabled={savingNumber}
          >
            <Text style={styles.accountNumberSaveBtnText}>{savingNumber ? '…' : '✓'}</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.detailActions}>
          <TouchableOpacity
            style={[styles.detailActionBtn, { backgroundColor: colors.success + '18', borderColor: colors.success + '44' }]}
            onPress={() => { closeModal(); setTimeout(() => openTxFromDetail(), 50); }}
          >
            <Text style={[styles.detailActionBtnText, { color: colors.success }]}>+ Transaction</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detailActionBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
            onPress={() => { closeModal(); setTimeout(() => openAdjFromDetail(), 50); }}
          >
            <Text style={[styles.detailActionBtnText, { color: colors.primary }]}>Mettre à jour le solde</Text>
          </TouchableOpacity>
        </View>
      </FinanceModal>

      {/* ═══ Modal : Ajouter transaction ════════════════════════════════════════ */}
      <FinanceModal visible={modal === 'tx'} onClose={closeModal} title={`Transaction · ${txTarget?.name || ''}`} scrollable>
        {/* Sélection compte si filtre = all */}
        {filter === 'all' && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Compte</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {[
                ...MAIN_ACCOUNTS.map((a) => {
                  const account = getMainAccount(a.key);
                  return { type: 'main', key: a.key, id: null, name: account.name, color: account.color };
                }),
                ...accounts.map((a) => ({ type: 'savings', key: null, id: a.id, name: a.name, color: a.color })),
              ].map((opt) => {
                const isActive = txTarget?.type === opt.type && (opt.type === 'main' ? txTarget.key === opt.key : txTarget.id === opt.id);
                return (
                  <TouchableOpacity
                    key={opt.key || opt.id}
                    style={[styles.filterChip, { backgroundColor: isActive ? opt.color : colors.surfaceAlt, borderColor: isActive ? opt.color : colors.border, marginRight: 8 }]}
                    onPress={() => setTxTarget(opt)}
                  >
                    <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.textSecondary }]}>{opt.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
        <View style={styles.typeRow}>
          {[{ v: 'income', label: 'Revenu', color: colors.success }, { v: 'expense', label: 'Dépense', color: colors.danger }].map((t) => (
            <TouchableOpacity
              key={t.v}
              style={[styles.typeBtn, { backgroundColor: txType === t.v ? t.color : colors.surfaceAlt, borderColor: txType === t.v ? t.color : colors.border }]}
              onPress={() => setTxType(t.v)}
            >
              <Text style={[styles.typeBtnText, { color: txType === t.v ? '#fff' : colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {txType === 'expense' && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Catégorie</Text>
            <View style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((category) => {
                const isActive = txCategory === category.key;
                return (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isActive ? category.color : colors.surfaceAlt,
                        borderColor: isActive ? category.color : colors.border,
                      },
                    ]}
                    onPress={() => setTxCategory(category.key)}
                  >
                    <Text style={[styles.categoryChipText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                      {category.emoji} {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Montant (€)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={txAmount}
          onChangeText={setTxAmount}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={colors.textMuted}
          value={txDate}
          onChangeText={setTxDate}
          maxLength={10}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description (optionnel)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
          placeholder="ex. Loyer, Salaire…"
          placeholderTextColor={colors.textMuted}
          value={txDesc}
          onChangeText={setTxDesc}
          maxLength={80}
        />

        <TouchableOpacity
          style={[styles.modalSubmit, { backgroundColor: txType === 'income' ? colors.success : colors.danger, opacity: saving ? 0.6 : 1 }]}
          onPress={handleAddTx}
          disabled={saving}
        >
          <Text style={styles.modalSubmitText}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
        </TouchableOpacity>
      </FinanceModal>

      {/* ═══ Modal : Mise à jour du solde ═══════════════════════════════════════ */}
      <FinanceModal visible={modal === 'adjust'} onClose={closeModal} title={`Solde actuel · ${adjTarget?.name || ''}`}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nouveau solde (€)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={adjBalance}
          onChangeText={setAdjBalance}
          autoFocus
        />
        <Text style={[styles.adjHint, { color: colors.textMuted }]}>
          Le solde saisi remplace le solde calculé. Les futures transactions s'additionneront à ce montant.
        </Text>
        <TouchableOpacity
          style={[styles.modalSubmit, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleAdjust}
          disabled={saving}
        >
          <Text style={styles.modalSubmitText}>{saving ? 'Enregistrement…' : 'Mettre à jour'}</Text>
        </TouchableOpacity>
      </FinanceModal>

      {/* ═══ Modal : Nouveau compte épargne ════════════════════════════════════ */}
      <FinanceModal visible={modal === 'savings_add'} onClose={closeModal} title="Nouveau compte épargne" scrollable>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nom du compte</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
          placeholder="ex. Livret A, PEL, CEL…"
          placeholderTextColor={colors.textMuted}
          value={newSavingsName}
          onChangeText={setNewSavingsName}
          autoFocus
          maxLength={40}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Numéro de compte (optionnel)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
          placeholder="ex. FR76 1234 5678 9012 3456 789 12"
          placeholderTextColor={colors.textMuted}
          value={newSavingsNumber}
          onChangeText={setNewSavingsNumber}
          autoCapitalize="characters"
          maxLength={34}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Couleur</Text>
        <View style={styles.colorPicker}>
          {SAVINGS_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c, borderWidth: newSavingsColor === c ? 3 : 0, borderColor: '#fff' }]}
              onPress={() => setNewSavingsColor(c)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.modalSubmit, { backgroundColor: newSavingsColor, opacity: saving ? 0.6 : 1 }]}
          onPress={handleAddSavings}
          disabled={saving}
        >
          <Text style={styles.modalSubmitText}>{saving ? 'Création…' : 'Créer le compte'}</Text>
        </TouchableOpacity>
      </FinanceModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  header: { paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },

  // Total
  totalCard: { borderRadius: 20, padding: 20, marginBottom: 24 },
  totalLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  totalAmount: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 16 },
  totalRow: { flexDirection: 'row', alignItems: 'center' },
  totalStat: { flex: 1 },
  totalStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  totalStatValue: { fontSize: 16, fontWeight: '700' },
  totalDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 },

  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },

  // Account cards
  accountsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  accountCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'flex-start' },
  accountIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  accountEmoji: { fontSize: 18 },
  accountName: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  accountBalance: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  accountNumber: { fontSize: 10, marginTop: 3 },

  // Savings
  addSavingsBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  addSavingsBtnText: { fontSize: 13, fontWeight: '700' },
  emptyEpargne: { borderRadius: 14, padding: 20, borderWidth: 1, alignItems: 'center', marginBottom: 4 },
  emptyEpargneText: { fontSize: 13 },
  savingsGrid: { gap: 10, marginBottom: 4 },
  savingsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
  savingsColorBar: { width: 5 },
  savingsContent: { flex: 1, padding: 14 },
  savingsHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  savingsName: { fontSize: 15, fontWeight: '700' },
  savingsAccountNumber: { fontSize: 11, marginTop: 2 },
  savingsBalance: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  savingsTapHint: { fontSize: 11 },
  savingsDeleteBtn: { borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  savingsDeleteBtnText: { fontSize: 12, fontWeight: '700' },

  // Filters
  filtersScroll: { marginBottom: 12 },
  filtersContent: { paddingRight: 16, gap: 8 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  // Add tx
  addTxBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  addTxBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Transactions
  emptyTx: { borderRadius: 14, padding: 24, borderWidth: 1, alignItems: 'center' },
  emptyTxText: { fontSize: 13 },
  txRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8 },
  txDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  txInfo: { flex: 1, marginRight: 10 },
  txDesc: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txAccountBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  txAccountLabel: { fontSize: 11, fontWeight: '700' },
  txCategoryBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  txCategoryText: { fontSize: 11, fontWeight: '700' },
  txDate: { fontSize: 11 },
  txAmount: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, marginRight: 8 },
  txDeleteBtn: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txDeleteText: { fontSize: 18, lineHeight: 20, fontWeight: '400' },

  // Charts
  chartCardsRow: { gap: 12, paddingRight: 16 },
  chartCard: { width: 320, borderRadius: 18, borderWidth: 1, padding: 16 },
  chartCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  chartAccountDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  chartCardTitleWrap: { flex: 1 },
  chartCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  chartCardSubtitle: { fontSize: 12, fontWeight: '600' },
  chartBody: { flexDirection: 'row', alignItems: 'center' },
  chartVisual: { width: 152, height: 152, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dotPie: { position: 'relative', overflow: 'hidden' },
  dotPiePoint: { position: 'absolute' },
  chartCenterLabel: { position: 'absolute', alignItems: 'center' },
  chartCenterValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  chartCenterText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chartLegend: { flex: 1, gap: 8 },
  chartLegendRow: { flexDirection: 'row', alignItems: 'center' },
  chartLegendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  chartLegendLabel: { flex: 1, fontSize: 12, fontWeight: '600', marginRight: 8 },
  chartLegendValue: { fontSize: 12, fontWeight: '700' },
  chartEmptyText: { fontSize: 12, lineHeight: 18 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, borderWidth: 1, borderBottomWidth: 0, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },

  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, borderWidth: 1, marginBottom: 14 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  typeBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  typeBtnText: { fontSize: 15, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  categoryChip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  categoryChipText: { fontSize: 13, fontWeight: '700' },

  modalSubmit: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },

  // Détail compte
  detailBalanceRow: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 20, alignItems: 'center' },
  detailBalanceLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  detailBalanceValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },

  accountNumberRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  accountNumberInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, borderWidth: 1 },
  accountNumberSaveBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountNumberSaveBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  detailActions: { gap: 10 },
  detailActionBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  detailActionBtnText: { fontSize: 15, fontWeight: '700' },

  adjHint: { fontSize: 12, lineHeight: 18, marginBottom: 16, marginTop: -8 },
});
