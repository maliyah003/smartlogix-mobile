import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import ScreenWrapper from '../../../components/ScreenWrapper';
import { Colors, Fonts, Shadows } from '../../../theme/ui';

const renderItemChips = (items, accentColor) => (
    <View style={styles.chipWrap}>
        {items.map((item) => (
            <View key={item} style={[styles.chip, { borderColor: accentColor }]}>
                <Text style={styles.chipText}>{item}</Text>
            </View>
        ))}
    </View>
);

const SectionCard = ({ title, items, accentColor, description }) => (
    <View style={styles.card}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
        {renderItemChips(items, accentColor)}
    </View>
);

const AdminModuleScreen = ({
    title,
    subtitle,
    accentColor = Colors.brandOrange,
    frontendComponents = [],
    frontendStyles = [],
    adminResponsibilities = [],
    notes = [],
}) => {
    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.hero, { borderColor: accentColor }]}>
                    <Text style={[styles.kicker, { color: accentColor }]}>Frontend module mirror</Text>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>

                <SectionCard
                    title="Frontend components to mirror"
                    description="These are the exact web module components that should be represented as individual team contributions in the mobile admin app."
                    items={frontendComponents}
                    accentColor={accentColor}
                />

                {frontendStyles.length > 0 ? (
                    <SectionCard
                        title="Frontend style references"
                        description="These web styling files should be treated as design references when matching the mobile admin experience."
                        items={frontendStyles}
                        accentColor={accentColor}
                    />
                ) : null}

                <SectionCard
                    title="Admin responsibilities"
                    description="What this module should do inside the mobile admin app."
                    items={adminResponsibilities}
                    accentColor={accentColor}
                />

                {notes.length > 0 ? (
                    <SectionCard
                        title="Implementation notes"
                        items={notes}
                        accentColor={accentColor}
                    />
                ) : null}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        padding: 20,
        paddingBottom: 36,
        gap: 16,
    },
    hero: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        ...Shadows.card,
    },
    kicker: {
        fontFamily: Fonts.semibold,
        fontSize: 12,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 24,
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: 15,
        lineHeight: 22,
        color: Colors.textSecondary,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        padding: 18,
        ...Shadows.card,
    },
    sectionTitle: {
        fontFamily: Fonts.semibold,
        fontSize: 18,
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    sectionDescription: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        lineHeight: 20,
        color: Colors.textSecondary,
        marginBottom: 12,
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#FAFAFA',
    },
    chipText: {
        fontFamily: Fonts.medium,
        fontSize: 13,
        color: Colors.textPrimary,
    },
});

export default AdminModuleScreen;