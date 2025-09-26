// components/Shared/CollapsibleCard.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '@rneui/base';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppText from '../../components/Layout/AppText/AppText'

interface Props {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleCard = ({ title, children, defaultExpanded = false }: Props) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card containerStyle={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <AppText style={styles.title}>{title}</AppText>
        <Icon
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={26}
          color="black"
        />
      </TouchableOpacity>
      {expanded && <View style={styles.content}>{children}</View>}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 0,
    marginBottom: 10,
    elevation: 4,
    backgroundColor: '#fff',
  },
  header: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F6F9',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111',
  },
  content: {
    padding: 10,
  },
});

export default CollapsibleCard;
