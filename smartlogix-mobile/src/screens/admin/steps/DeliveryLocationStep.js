import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Fonts, Shadows } from '../../../theme/ui';

export default function DeliveryLocationStep({ data, onChange }) {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(data.datetime ? new Date(data.datetime) : new Date());
    const [mapRef, setMapRef] = useState(null);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);

    const handleMapPress = (e) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        onChange({
            ...data,
            coordinates: [longitude, latitude]
        });
        if (mapRef) {
            mapRef.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05
            });
        }
    };

    const handleDateChange = (event, date) => {
        if (date) {
            setSelectedDate(date);
            onChange({
                ...data,
                datetime: date.toISOString()
            });
        }
        setShowDatePicker(false);
    };

    const handleSearchLocation = async () => {
        if (!search.trim()) return;
        setSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(search.trim())}`,
                {
                    headers: {
                        Accept: 'application/json',
                        'Accept-Language': 'en',
                    },
                }
            );
            const payload = await response.json();
            setResults(Array.isArray(payload) ? payload : []);
        } catch (err) {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectResult = (item) => {
        const latitude = Number(item.lat);
        const longitude = Number(item.lon);
        onChange({
            ...data,
            address: item.display_name,
            coordinates: [longitude, latitude],
        });
        setSearch(item.display_name);
        setResults([]);
        if (mapRef) {
            mapRef.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.searchSection}>
                <Text style={styles.label}>Search Location</Text>
                <View style={styles.searchRow}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="search" size={18} color={Colors.textTertiary} />
                        <TextInput
                            style={styles.input}
                            placeholder="Search by place or address"
                            placeholderTextColor={Colors.textTertiary}
                            value={search}
                            onChangeText={setSearch}
                            onSubmitEditing={handleSearchLocation}
                            returnKeyType="search"
                        />
                    </View>
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearchLocation} disabled={searching}>
                        <Text style={styles.searchButtonText}>{searching ? '...' : 'Search'}</Text>
                    </TouchableOpacity>
                </View>
                {results.length > 0 ? (
                    <View style={styles.resultsCard}>
                        {results.map((item) => (
                            <TouchableOpacity
                                key={item.place_id}
                                style={styles.resultItem}
                                onPress={() => handleSelectResult(item)}
                            >
                                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                                <Text style={styles.resultText} numberOfLines={2}>
                                    {item.display_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : null}
            </View>

            <View style={styles.mapContainer}>
                <MapView
                    ref={setMapRef}
                    style={styles.map}
                    mapType="none"
                    initialRegion={{
                        latitude: data.coordinates[1],
                        longitude: data.coordinates[0],
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05
                    }}
                    onPress={handleMapPress}
                >
                    <UrlTile
                        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maximumZ={19}
                        flipY={false}
                        zIndex={1}
                    />
                    <Marker
                        coordinate={{
                            latitude: data.coordinates[1],
                            longitude: data.coordinates[0]
                        }}
                        title="Delivery Location"
                        pinColor="#EF4444"
                    />
                </MapView>
                <Text style={styles.mapHint}>Tap on the map to set delivery location</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Address *</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="location" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 456 Oak Avenue, Kandy"
                        placeholderTextColor={Colors.textTertiary}
                        value={data.address}
                        onChangeText={(value) => onChange({ ...data, address: value })}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Date & Time *</Text>
                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar" size={18} color={Colors.brandOrange} />
                    <Text style={styles.dateButtonText}>
                        {selectedDate.toLocaleString()}
                    </Text>
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="datetime"
                    display="spinner"
                    onChange={handleDateChange}
                />
            )}

            <View style={styles.coordSection}>
                <Text style={styles.label}>Coordinates</Text>
                <View style={styles.coordRow}>
                    <View style={styles.coordInput}>
                        <Text style={styles.coordLabel}>Lat</Text>
                        <Text style={styles.coordValue}>{data.coordinates[1].toFixed(4)}</Text>
                    </View>
                    <View style={styles.coordInput}>
                        <Text style={styles.coordLabel}>Lng</Text>
                        <Text style={styles.coordValue}>{data.coordinates[0].toFixed(4)}</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchSection: { marginBottom: 14 },
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    searchButton: {
        backgroundColor: Colors.brandOrange,
        borderRadius: 10,
        paddingHorizontal: 12,
        minHeight: 50,
        justifyContent: 'center',
    },
    searchButtonText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 13 },
    resultsCard: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        overflow: 'hidden',
    },
    resultItem: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    resultText: { flex: 1, fontSize: 12, color: Colors.textSecondary, fontFamily: Fonts.medium },
    mapContainer: { marginBottom: 18, borderRadius: 14, overflow: 'hidden', ...Shadows.card },
    map: { width: '100%', height: 250 },
    mapHint: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8 },
    section: { marginBottom: 18 },
    label: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, minHeight: 50 },
    input: { flex: 1, fontSize: 15, fontFamily: Fonts.regular, color: Colors.textPrimary, marginLeft: 10, minHeight: 50 },
    dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0', borderRadius: 12, borderWidth: 1, borderColor: '#F7C98F', paddingHorizontal: 14, minHeight: 50, gap: 12 },
    dateButtonText: { fontSize: 15, fontFamily: Fonts.medium, color: Colors.textPrimary },
    coordSection: { marginBottom: 18 },
    coordRow: { flexDirection: 'row', gap: 12 },
    coordInput: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    coordLabel: { fontSize: 11, fontFamily: Fonts.semibold, color: Colors.textSecondary, marginBottom: 4 },
    coordValue: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.textPrimary }
});
