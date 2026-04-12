import React, { useMemo } from "react";
import { ViroARScene, ViroARPlaneSelector, ViroNode, ViroText } from "@reactvision/react-viro";

export default function ARPortalScene(props: any) {
  const { sceneNavigator } = props;

  const {
    mode, // "browse" | "placeChat"
    visibleSpots,
    selectedSpot,
    messages,
    chatAnchorId,
    onPressSpot,
    onPlacedChat,
  } = sceneNavigator.viroAppProps;

  const lines = useMemo(() => {
    const list = (messages ?? []).slice(-8);
    return list.map((m: any) => {
      const user = m.senderId?.name || m.senderId?.username || "User";
      const text = m.text || "[media]";
      return `${user}: ${text}`;
    });
  }, [messages]);

  return (
    <ViroARScene>
      {mode === "browse" && (
        <ViroNode position={[0, 0, -1.6]}>
          {(visibleSpots ?? []).slice(0, 6).map((s: any, idx: number) => (
            <ViroText
              key={s._id}
              text={`📍 ${s.name}`}
              position={[0, 0.12 * idx, 0]}
              style={{ fontSize: 28, color: "#fff", fontWeight: "700" }}
              onClick={() => onPressSpot?.(s)}
            />
          ))}
        </ViroNode>
      )}

      {mode === "placeChat" && (
        <ViroARPlaneSelector
          onPlaneSelected={(anchor: any) => {
            onPlacedChat?.(anchor.anchorId);
          }}
        >
          <ViroText
            text={`Tap a wall/floor to place chat:\n${selectedSpot?.name ?? ""}`}
            position={[0, 0, -1]}
            style={{ fontSize: 26, color: "#fff", textAlign: "center" }}
          />
        </ViroARPlaneSelector>
      )}

      {!!chatAnchorId && (
        <ViroNode anchorId={chatAnchorId} position={[0, 0, 0]}>
          <ViroText
            text={selectedSpot?.name ? `🗨️ ${selectedSpot.name}` : "Chat"}
            position={[0, 0.12, 0]}
            style={{ fontSize: 30, color: "#A5B4FC", fontWeight: "800" }}
          />

          {lines.map((t: string, idx: number) => (
            <ViroText
              key={`${idx}-${t}`}
              text={t}
              position={[0, 0.05 - idx * 0.06, 0]}
              width={2.2}
              style={{ fontSize: 20, color: "#FFFFFF", fontWeight: "600" }}
            />
          ))}
        </ViroNode>
      )}
    </ViroARScene>
  );
}