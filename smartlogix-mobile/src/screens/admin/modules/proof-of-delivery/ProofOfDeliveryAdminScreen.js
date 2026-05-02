import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import { proofOfDeliveryAPI } from '../../../../services/api';
import { styles } from './proofOfDelivery.styles';

const asDataUri = (raw) => {
    if (!raw) return '';
    if (String(raw).startsWith('data:image/')) return raw;
    return `data:image/jpeg;base64,${raw}`;
};

export default function ProofOfDeliveryAdminScreen() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await proofOfDeliveryAPI.getAll({ limit: 50 });
                setRecords(res.data?.proofs || []);
            } catch {
                setRecords([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredRecords = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return records;
        return records.filter((r) => {
            const jobId = (r.trip?.primaryJob?.jobId || r.trip?.jobId || '').toLowerCase();
            const driverName = (r.trip?.driver?.name || '').toLowerCase();
            const vehicleReg = (r.trip?.vehicle?.registrationNumber || '').toLowerCase();
            return jobId.includes(query) || driverName.includes(query) || vehicleReg.includes(query);
        });
    }, [records, search]);

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>Proof of Delivery</Text>
                <Text style={styles.subtitle}>Review delivery evidence captured by drivers</Text>

                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search proof records..."
                />

                <FlatList
                    data={filteredRecords}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="file-tray-outline" size={34} color="#9CA3AF" />
                            <Text style={styles.emptyText}>
                                {search.trim() ? 'No matching proof records.' : 'No proof of delivery records yet.'}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{item.trip?.primaryJob?.jobId || item.trip?.jobId || 'Unknown job'}</Text>
                            <Text style={styles.dateText}>{new Date(item.recordedAt).toLocaleString()}</Text>

                            <Text style={styles.metaLine}>Job: {item.trip?.primaryJob?.jobId || item.trip?.jobId || 'N/A'}</Text>
                            <Text style={styles.metaLine}>Driver: {item.trip?.driver?.name || 'N/A'}</Text>
                            <Text style={styles.metaLine}>Vehicle: {item.trip?.vehicle?.registrationNumber || 'N/A'}</Text>

                            <View style={styles.imagesRow}>
                                <View style={styles.imageBlock}>
                                    <Text style={styles.imageLabel}>Delivery Photo</Text>
                                    <Image source={{ uri: asDataUri(item.deliveryPhotoBase64) }} style={styles.image} />
                                </View>
                                <View style={styles.imageBlock}>
                                    <Text style={styles.imageLabel}>Customer Signature</Text>
                                    <Image source={{ uri: asDataUri(item.customerSignatureBase64) }} style={[styles.image, styles.signatureImage]} />
                                </View>
                            </View>
                        </View>
                    )}
                />
            </View>
        </ScreenWrapper>
    );
}

