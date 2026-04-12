import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "@rneui/themed";

type Props = {
  title?: string;
  message: string;
  type?: "error" | "info" | "success";
  actionText?: string;
  onPressAction?: () => void;
  onClose?: () => void;
};

export default function GlassyCard({
  title,
  message,
  type = "info",
  actionText,
  onPressAction,
  onClose,
}: Props) {
  const isError = type === "error";
  const isSuccess = type === "success";

  const borderColor = isError
    ? "rgba(248, 113, 113, 0.55)"
    : isSuccess
      ? "rgba(34, 197, 94, 0.55)"
      : "rgba(148, 163, 184, 0.45)";

  const bgColor = isError
    ? "rgba(127, 29, 29, 0.28)"
    : isSuccess
      ? "rgba(20, 83, 45, 0.25)"
      : "rgba(17, 24, 39, 0.55)";

  const titleColor = isError ? "#fecdd3" : isSuccess ? "#bbf7d0" : "#E5E7EB";
  const textColor = isError ? "#fecdd3" : isSuccess ? "#bbf7d0" : "#cbd5e1";

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
      {!!title && <Text style={[styles.title, { color: titleColor }]}>{title}</Text>}
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>

      <View style={styles.actionsRow}>
        {!!actionText && !!onPressAction && (
          <TouchableOpacity style={styles.actionBtn} onPress={onPressAction} activeOpacity={0.85}>
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
        )}

        {!!onClose && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    width: "100%",
  },
  title: { fontWeight: "800", fontSize: 14, marginBottom: 4 },
  text: { fontSize: 12, marginBottom: 8 },

  actionsRow: { flexDirection: "row", justifyContent: "flex-start", gap: 10 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248, 250, 252, 0.6)",
  },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  closeText: { color: "#E5E7EB", fontWeight: "800", fontSize: 12 },
});