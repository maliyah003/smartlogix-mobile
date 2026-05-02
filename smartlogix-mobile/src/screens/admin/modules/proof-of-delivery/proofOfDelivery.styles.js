import { StyleSheet } from 'react-native';
import { Colors, Fonts, Shadows } from '../../../../theme/ui';

export const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.textPrimary },
    subtitle: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textSecondary, marginTop: 2, marginBottom: 14 },
    searchInput: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 12,
        fontFamily: Fonts.regular,
        color: Colors.textPrimary,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        marginBottom: 12,
        ...Shadows.card,
    },
    cardTitle: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.textPrimary },
    dateText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textTertiary, marginTop: 4 },
    metaLine: { marginTop: 8, fontSize: 13, lineHeight: 19, fontFamily: Fonts.medium, color: Colors.textSecondary },
    imagesRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    imageBlock: { flex: 1 },
    imageLabel: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.textSecondary, marginBottom: 6 },
    image: { width: '100%', height: 150, borderRadius: 12, backgroundColor: '#F3F4F6' },
    signatureImage: { resizeMode: 'contain', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border },
    empty: { alignItems: 'center', paddingVertical: 50 },
    emptyText: { marginTop: 8, color: Colors.textSecondary, fontFamily: Fonts.medium, fontSize: 14, textAlign: 'center' },
});

