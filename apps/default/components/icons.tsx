// Minimal stroke icons (Solar-style) built on react-native-svg.
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function IconGear({ size = 22, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconPause({ size = 20, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 5.5v13M15.5 5.5v13"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconPlay({ size = 20, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5.8v12.4c0 .9 1 1.5 1.8 1l9.6-6.2c.7-.5.7-1.5 0-2L9.8 4.8c-.8-.5-1.8.1-1.8 1Z" fill={color} />
    </Svg>
  );
}

export function IconClose({ size = 22, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconSpeaker({ size = 22, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 9.5v5h3.5l5 4v-13l-5 4H4Z"
        fill={color}
      />
      <Path
        d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconSpeakerX({ size = 22, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9.5v5h3.5l5 4v-13l-5 4H4Z" fill={color} />
      <Path
        d="M15.5 9.5l5 5M20.5 9.5l-5 5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconCamera({ size = 24, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={6.5}
        y={8}
        width={11}
        height={8.5}
        rx={1.5}
        stroke={color}
        strokeWidth={1.8}
      />
      <Circle cx={12} cy={12.2} r={2.2} stroke={color} strokeWidth={1.6} />
      <Path
        d="M12 8V4.5M9 4.5h6M15 19.5h-6M12 16.5v3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M4 10.5v3M20 10.5v3"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconNav({ size = 24, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.8 19.4 20a.8.8 0 0 1-1.1 1L12 18.2 5.7 21a.8.8 0 0 1-1.1-1L12 2.8Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconBattery({ size = 22, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2.5}
        y={8}
        width={16}
        height={8.5}
        rx={2.5}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M21 10.8v2.9"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Rect x={5} y={10.5} width={6} height={3.5} rx={1.2} fill={color} />
    </Svg>
  );
}

export function IconClock({ size = 22, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 7.5V12l3 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconGauge({ size = 22, color = "#332B2B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 19a9 9 0 1 1 15 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 15l3.5-5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={15} r={1.6} fill={color} />
    </Svg>
  );
}
