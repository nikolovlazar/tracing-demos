import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  description?: string;
  marketCap?: number;
  volume?: number;
}

export default function StockDetail() {
  const { id } = useLocalSearchParams();
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockDetails();
  }, [id]);

  const fetchStockDetails = async () => {
    try {
      const response = await fetch(`http://localhost:3001/stocks/${id}`);
      const data = await response.json();
      setStock(data);
    } catch (error) {
      console.error('Error fetching stock details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading stock details...</Text>
      </View>
    );
  }

  if (!stock) {
    return (
      <View style={styles.container}>
        <Text>Stock not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.symbol}>{stock.symbol}</Text>
      <Text style={styles.name}>{stock.name}</Text>
      <Text style={styles.price}>${stock.price.toFixed(2)}</Text>

      {stock.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{stock.description}</Text>
        </View>
      )}

      {stock.marketCap && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Market Cap</Text>
          <Text style={styles.value}>${stock.marketCap.toLocaleString()}</Text>
        </View>
      )}

      {stock.volume && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume</Text>
          <Text style={styles.value}>{stock.volume.toLocaleString()}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  symbol: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 20,
    color: '#666',
    marginTop: 4,
  },
  price: {
    fontSize: 24,
    color: '#2ecc71',
    marginTop: 8,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  value: {
    fontSize: 16,
    color: '#444',
  },
});
