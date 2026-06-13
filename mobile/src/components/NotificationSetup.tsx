import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';

export function NotificationSetup() {
  const handleOpenSettings = async () => {
    // openSettingsAsync was removed in newer SDK - use Linking instead
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>NOTIFICATION SETTINGS</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS (APNs)' : 'Android (FCM)'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Channel</Text>
          <Text style={styles.infoValue}>anime-releases (High Priority)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sound</Text>
          <Text style={styles.infoValue}>Enabled</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vibration</Text>
          <Text style={styles.infoValue}>{Platform.OS === 'android' ? 'Custom Pattern' : 'System Default'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={handleOpenSettings}
        >
          <Text style={styles.settingsButtonText}>Open System Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>RECENT ACTIVITY LOG</Text>
        </View>
        <View style={styles.logList}>
          <LogEntry 
            time="2 min ago"
            type="success"
            message="FCM Token registered with backend"
            detail="Token: fGh7...kL92 (truncated)"
          />
          <LogEntry 
            time="15 min ago"
            type="info"
            message="Permission granted"
            detail="Notification access allowed"
          />
          <LogEntry 
            time="1 hr ago"
            type="info"
            message="App started"
            detail="Background listener registered"
          />
        </View>
      </View>
    </View>
  );
}

function LogEntry({ time, type, message, detail }: {
  time: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  detail: string;
}) {
  const typeColors = {
    success: '#00E5FF',
    info: '#BB86FC',
    warning: '#FFB300',
    error: '#F50057',
  };

  return (
    <View style={styles.logItem}>
      <View style={[
        styles.logDot,
        { backgroundColor: typeColors[type] }
      ]} />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logMessage}>{message}</Text>
          <Text style={styles.logTime}>{time}</Text>
        </View>
        <Text style={styles.logDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#11111a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    padding: 16,
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: '#11111a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    padding: 16,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666680',
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8888a0',
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  settingsButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BB86FC',
  },
  logList: {
    gap: 12,
  },
  logItem: {
    flexDirection: 'row',
    gap: 12,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
    flexShrink: 0,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  logTime: {
    fontSize: 11,
    color: '#666680',
    fontFamily: 'monospace',
  },
  logDetail: {
    fontSize: 11,
    color: '#666680',
    fontFamily: 'monospace',
  },
});