import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

const GlassyConfirmModal = ({ visible, message, onConfirm, onCancel }: any) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.glassyModal}>
        <Text style={styles.confirmText}>{message}</Text>
        <View style={styles.modalBtns}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={{ color: "#374151", fontWeight: "bold" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,41,59,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  glassyModal: {
    backgroundColor: "rgba(15,23,42,0.82)",
    borderRadius: 28,
    padding: 26,
    alignItems: "center",
    width: 280,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 18,
  },
  confirmText: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 22,
    textAlign: "center",
  },
  modalBtns: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: '100%',
  },
  cancelBtn: {
    backgroundColor: "rgba(228,227,236,0.13)",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 23,
    marginRight: 10,
  },
  confirmBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 23,
  },
});

export default GlassyConfirmModal;