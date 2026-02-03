import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  TAHome: undefined;
  Groups: undefined;
  Assignments: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'TAHome'> & {
  route: any;
};

const TAHome: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>TA Dashboard</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Groups')}
        >
          <ImageBackground
            source={{ uri: 'https://via.placeholder.com/800x600.png?text=Groups' }}
            style={styles.bg}
            imageStyle={{ borderRadius: 12 }}
          >
            <View style={styles.overlay}>
              <Text style={styles.cardTitle}>Groups</Text>
              <Text style={styles.cardSubtitle}>View groups you manage</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Assignments')}
        >
          <ImageBackground
            source={{ uri: 'https://via.placeholder.com/800x600.png?text=Assignments' }}
            style={styles.bg}
            imageStyle={{ borderRadius: 12 }}
          >
            <View style={styles.overlay}>
              <Text style={styles.cardTitle}>Assignments</Text>
              <Text style={styles.cardSubtitle}>Tasks assigned to you</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f7fa',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C8102E',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 12,
  },
  card: {
    flex: 1,
    height: Math.max(height * 0.45, 260),
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 6,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  bg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#f3f4f6',
    marginTop: 6,
  },
});

export default TAHome;