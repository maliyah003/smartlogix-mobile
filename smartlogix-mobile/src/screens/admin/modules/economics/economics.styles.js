import { StyleSheet } from 'react-native';
import { Colors, Fonts, Shadows } from '../../../../theme/ui';

export const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.textPrimary },
    subtitle: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textSecondary, marginTop: 2, marginBottom: 14 },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        marginBottom: 12,
        ...Shadows.card,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    cardTitle: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.textPrimary, flex: 1 },
    line: { marginTop: 8, fontSize: 13, lineHeight: 19, fontFamily: Fonts.medium, color: Colors.textSecondary },
    strong: { color: Colors.textPrimary, fontFamily: Fonts.bold },
    badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { color: '#fff', fontSize: 11, fontFamily: Fonts.semibold },
    metricGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    metricCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        ...Shadows.card,
    },
    metricLabel: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textSecondary },
    metricValue: { marginTop: 8, fontSize: 22, fontFamily: Fonts.bold, color: Colors.textPrimary },
    empty: { alignItems: 'center', paddingVertical: 50 },
    emptyText: { marginTop: 8, color: Colors.textSecondary, fontFamily: Fonts.medium, fontSize: 14, textAlign: 'center' },
    actionBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
    actionBtnText: { color: Colors.danger, fontFamily: Fonts.bold, fontSize: 13 },
});

