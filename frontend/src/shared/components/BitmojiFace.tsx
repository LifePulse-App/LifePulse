import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Path } from 'react-native-svg';

export type AvatarConfig = {
  skinTone?: string;        // e.g. 'skin_light', 'skin_dark'
  hairStyle?: string;       // e.g. 'hair_short_1'
  hairColor?: string;       // 'hair_black', etc.
  eyeShape?: string;
  eyeColor?: string;
  mouth?: string;
  eyebrowStyle?: string;
  accessories?: string[];
  outfit?: string;
  backgroundColor?: string; // hex
};

type Props = {
  config?: AvatarConfig;
  size?: number;
};

const SKIN_TONE_MAP: Record<string, string> = {
  skin_light: '#F9D3B4',
  skin_medium: '#E0AC69',
  skin_tan: '#C68642',
  skin_dark: '#8D5524',
};

const HAIR_COLOR_MAP: Record<string, string> = {
  hair_black: '#111827',
  hair_brown: '#4B3621',
  hair_blonde: '#FBBF24',
  hair_red: '#C2410C',
};

const EYE_COLOR_MAP: Record<string, string> = {
  eye_brown: '#4B3621',
  eye_blue: '#1D4ED8',
  eye_green: '#15803D',
};

const BitmojiFace: React.FC<Props> = ({ config, size = 90 }) => {
  const {
    skinTone = 'skin_light',
    hairColor = 'hair_black',
    eyeColor = 'eye_brown',
    backgroundColor = '#E5E7EB',
    hairStyle = 'hair_short_1',
    mouth = 'mouth_smile',
    eyebrowStyle = 'brow_soft',
    // eyeShape, accessories, outfit not fully switched here yet
  } = config || {};

  const skin = SKIN_TONE_MAP[skinTone] || SKIN_TONE_MAP.skin_light;
  const hair = HAIR_COLOR_MAP[hairColor] || HAIR_COLOR_MAP.hair_black;
  const eyeCol = EYE_COLOR_MAP[eyeColor] || EYE_COLOR_MAP.eye_brown;

  const radius = size / 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor,
        },
      ]}
    >
      <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
        {/* Face */}
        <Circle cx="50" cy="50" r="30" fill={skin} />

        {/* Hair (switchable styles) */}
        {hairStyle === 'hair_short_1' && (
          <Path
            d="M20,40 C30,15 70,15 80,40 L80,35 C70,20 30,20 20,35 Z"
            fill={hair}
          />
        )}
        {hairStyle === 'hair_medium_1' && (
          <Path
            d="M18,42 C25,10 75,10 82,42 L82,30 C70,18 30,18 18,30 Z"
            fill={hair}
          />
        )}

        {/* Brows */}
        {eyebrowStyle === 'brow_soft' && (
          <>
            <Path
              d="M32,42 Q38,39 44,42"
              stroke="#111827"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M56,42 Q62,39 68,42"
              stroke="#111827"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Eyes */}
        <Circle cx="38" cy="50" r="3" fill={eyeCol} />
        <Circle cx="62" cy="50" r="3" fill={eyeCol} />

        {/* Mouth variants */}
        {mouth === 'mouth_smile' && (
          <Path
            d="M38,63 Q50,70 62,63"
            stroke="#000000"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {mouth === 'mouth_flat' && (
          <Path
            d="M38,63 L62,63"
            stroke="#000000"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Outfit: simple base block; can swap per 'outfit' */}
        <Rect x="32" y="70" width="36" height="20" rx="6" fill="#3B82F6" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BitmojiFace;