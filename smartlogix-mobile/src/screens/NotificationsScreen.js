import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { notificationAPI } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [driverId, setDriverId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const loadNotifications = async (isRefresh = false) => {
        if (!isRefresh && !refreshing) setLoading(true);
        try {
            const isAdminStr = await AsyncStorage.getItem('isAdmin');
            const currentIsAdmin = Boolean(isAdminStr ? JSON.parse(isAdminStr) : false);
            setIsAdmin(currentIsAdmin);

            let currentDriverId = driverId;
            if (!currentDriverId) {
                const dataStr = await AsyncStorage.getItem('driverData');
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    currentDriverId = data._id;
                    setDriverId(data._id);
                }
            }

            const response = currentIsAdmin
                ? await notificationAPI.getNotifications()
                : currentDriverId
                    ? await notificationAPI.getDriverNotifications(currentDriverId)
                    : null;

            if (response?.data?.success) {
                setNotifications(response.data.notifications || []);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [driverId, isAdmin])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications(true);
    };

    const handleMarkAsRead = async (id, isRead) => {
        if (isRead) return;
        try {
            await notificationAPI.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const renderItem = ({ item }) => {
        const getIcon = () => {
            switch (item.type) {
                case 'trip_refused': return 'close-circle';
                case 'system': return 'information-circle';
                default: return 'notifications';
            }
        };

        const getIconColor = () => {
            switch (item.type) {
                case 'trip_refused': return '#EF4444';
                case 'system': return '#3B82F6';
                default: return '#6B7280';
            }
        };

        return (
            <TouchableOpacity
                style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
                onPress={() => handleMarkAsRead(item._id, item.isRead)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconBox, { backgroundColor: getIconColor() + '1A' }]}>
                    <Ionicons name={getIcon()} size={24} color={getIconColor()} />
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
                    <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return <PageLoading fullScreen />;
    }

    return (
        <ScreenWrapper>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A1D26']} />
                }
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Notifications</Text>
                        <Text style={styles.headerSubtitle}>Your recent alerts and system updates</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>You have no notifications yet.</Text>
                    </View>
                }
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.bg,
        padding: 24,
    },
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        marginTop: 4,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    unreadCard: {
        backgroundColor: '#EEF2FF', // subtle indigo background 
        borderColor: '#C7D2FE',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontFamily: Fonts.medium,
        color: '#4B5563',
        flex: 1,
        paddingRight: 8,
    },
    unreadTitle: {
        color: '#1A1D26',
        fontFamily: Fonts.bold,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
    },
    message: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        lineHeight: 20,
        marginBottom: 8,
    },
    time: {
        fontSize: 12,
        color: Colors.textTertiary,
        fontFamily: Fonts.medium,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        textAlign: 'center',
    }
});
