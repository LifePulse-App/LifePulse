import React from 'react';
import {
  Modal,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AppText from '../../components/Layout/AppText/AppText';
import styles from '../styling/styles';

const { height } = Dimensions.get('window');

type Item = { label: string; value: string };

interface Props {
  visible: boolean;
  items: Item[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const WheelPickerModal: React.FC<Props> = ({
  visible,
  items,
  selectedValue,
  onSelect,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <FlatList
            data={items}
            keyExtractor={item => item.value}
            style={styles.list}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: 50,
              offset: 50 * index,
              index,
            })}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onSelect(item.value)}
                style={[
                  styles.item,
                  selectedValue === item.value && styles.selectedItem,
                ]}
              >
                <AppText style={styles.itemText}>{item.label}</AppText>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={onClose} style={styles.doneButton}>
            <AppText style={styles.doneText}>Done</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default WheelPickerModal;
