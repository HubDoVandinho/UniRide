export const Colors = {
  Primary: '#7B2FBE',
  PrimaryDark: '#5A1F8E',
  PrimaryLight: '#9B59D0',
  GradientStart: '#CC00FF',
  GradientEnd: '#5B0094',
  Background: '#6A00B8',
  Surface: '#FFFFFF',
  SurfaceLight: '#F5F0FF',
  Text: '#000000',
  TextLight: '#FFFFFF',
  TextMuted: '#666666',
  Error: '#FF4444',
  Success: '#00C851',
  InputBg: '#F8F0FF',
} as const;

export type ColorKey = keyof typeof Colors;
