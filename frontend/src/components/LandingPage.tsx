import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface LandingPageProps {
  userEmail: string;
  onLogout: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ userEmail, onLogout }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Instructor Dashboard</Text>
            <Text style={styles.subtitle}>ComS 309 Management System</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.userEmail}>User: {userEmail}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome, Instructor</Text>
          <Text style={styles.cardText}>
            Manage your course, track student progress, and access all course resources in one place.
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureCard 
            title="📊 Analytics" 
            description="View class performance metrics"
          />
          <FeatureCard 
            title="👥 Students" 
            description="Manage enrolled students"
          />
          <FeatureCard 
            title="📝 Assignments" 
            description="Create and track assignments"
          />
          <FeatureCard 
            title="⚙️ Settings" 
            description="Configure course preferences"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>v0.1.0 - Early Development</Text>
      </View>
    </View>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => (
  <View style={styles.featureCard}>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDescription}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#C8102E',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  userEmail: {
    color: '#cffafe',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#C8102E',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#C8102E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C8102E',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default LandingPage;
