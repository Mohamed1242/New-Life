import React from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "@/theme/tokens";

export interface TrendLineChartProps {
  values: number[]; // 0 - 100
  width?: number;
  height?: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  values,
  width = 290,
  height = 88,
}) => {
  const theme = useTheme();
  if (values.length < 2) return null;

  const padX = 8;
  const padY = 12;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * usableW;
    const norm = Math.min(Math.max(v, 0), 100) / 100;
    const y = padY + (1 - norm) * usableH;
    return { x, y };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.pillarSpirituality} stopOpacity="0.28" />
            <Stop offset="100%" stopColor={theme.pillarSpirituality} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#trendArea)" />
        <Path
          d={linePath}
          stroke={theme.pillarSpirituality}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4.5 : 3}
            fill={theme.surface}
            stroke={theme.pillarSpirituality}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
};
