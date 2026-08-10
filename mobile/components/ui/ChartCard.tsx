import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Card } from './Card';
import { colors, spacing, typography, radius } from '@/constants/theme';
const isWeb = Platform.OS === 'web';
const screenWidth = Dimensions.get('window').width;

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Card>
  );
}

interface BarChartData {
  label: string;
  value: number;
}

function sanitizeData(data: BarChartData[]): BarChartData[] {
  return data.map((d) => ({
    label: d.label,
    value: Math.max(0, Number.isFinite(d.value) ? d.value : 0),
  }));
}

function WebBarChart({ data, color }: { data: BarChartData[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const chartWidth = Math.max(screenWidth - 80, data.length * 48);

  return (
    <View style={[styles.webChart, { width: chartWidth }]}>
      {data.map((d) => {
        const height = d.value > 0 ? Math.max((d.value / max) * 140, 4) : 2;
        return (
          <View key={`${d.label}-${d.value}`} style={styles.webBarColumn}>
            <Text style={styles.webBarValue} numberOfLines={1}>
              {d.value > 0 ? d.value : ''}
            </Text>
            <View style={[styles.webBar, { height, backgroundColor: color }]} />
            <Text style={styles.webBarLabel} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function WebLineChart({ data, color }: { data: BarChartData[]; color: string }) {
  const width = Math.max(screenWidth - 80, data.length * 28);
  const height = 180;
  const padding = 16;
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (d.value / max) * (height - padding * 2);
    return { x, y, label: d.label, value: d.value };
  });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ width, height: height + 28 }}>
      <Svg width={width} height={height}>
        <Polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point) => (
          <Circle key={point.label} cx={point.x} cy={point.y} r={3.5} fill={color} />
        ))}
      </Svg>
      <View style={styles.webLineLabels}>
        {points.filter((_, i) => i % Math.ceil(data.length / 8) === 0 || i === data.length - 1).map((point) => (
          <Text key={point.label} style={styles.webBarLabel}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
function WebPieChart({ data }: { data: PieData[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <View style={styles.webPieContainer}>
      {data.map((d) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <View key={d.label} style={styles.webPieRow}>
            <View style={styles.webPieLabelRow}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendText}>{d.label}</Text>
            </View>
            <View style={styles.webPieBarTrack}>
              <View
                style={[
                  styles.webPieBarFill,
                  { width: `${pct}%`, backgroundColor: d.color },
                ]}
              />
            </View>
            <Text style={styles.webPiePct}>
              {d.value} ({pct}%)
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function NativeBarChart({ data, color }: { data: BarChartData[]; color: string }) {
  const { BarChart } = require('react-native-gifted-charts');
  const chartData = data.map((d) => ({
    value: d.value,
    label: d.label,
    frontColor: color,
  }));
  const chartWidth = Math.max(screenWidth - 80, data.length * 50);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <BarChart
      data={chartData}
      width={chartWidth}
      height={200}
      maxValue={maxValue}
      barWidth={28}
      spacing={16}
      roundedTop
      hideRules
      xAxisColor={colors.border}
      yAxisColor={colors.border}
      yAxisTextStyle={styles.axisText}
      xAxisLabelTextStyle={styles.axisText}
      noOfSections={4}
      isAnimated={false}
    />
  );
}

function NativeLineChart({ data, color }: { data: BarChartData[]; color: string }) {
  const { LineChart } = require('react-native-gifted-charts');
  const chartData = data.map((d) => ({ value: d.value, label: d.label }));
  const chartWidth = Math.max(screenWidth - 80, data.length * 40);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <LineChart
      data={chartData}
      width={chartWidth}
      height={200}
      maxValue={maxValue}
      color={color}
      thickness={2}
      hideRules
      curved
      xAxisColor={colors.border}
      yAxisColor={colors.border}
      yAxisTextStyle={styles.axisText}
      xAxisLabelTextStyle={styles.axisText}
      noOfSections={4}
      isAnimated={false}
      spacing={data.length > 15 ? 20 : 35}
    />
  );
}

function NativePieChart({ data }: { data: PieData[] }) {
  const { PieChart } = require('react-native-gifted-charts');
  const pieData = data.map((d) => ({
    value: d.value,
    text: d.label,
    color: d.color,
  }));

  return (
    <View style={styles.pieContainer}>
      <PieChart
        data={pieData}
        radius={90}
        innerRadius={50}
        showText
        textColor={colors.text}
        textSize={10}
        isAnimated={false}
      />
      <View style={styles.legend}>
        {data.map((d) => (
          <View key={d.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendText}>
              {d.label} ({d.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StatsBarChart({ data, color = colors.accent }: { data: BarChartData[]; color?: string }) {
  const clean = sanitizeData(data);
  if (clean.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return <WebBarChart data={clean} color={color} />;
  }

  return <NativeBarChart data={clean} color={color} />;
}

export function StatsLineChart({ data, color = colors.primary }: { data: BarChartData[]; color?: string }) {
  const clean = sanitizeData(data);
  if (clean.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return <WebLineChart data={clean} color={color} />;
  }

  return <NativeLineChart data={clean} color={color} />;
}

interface PieData {
  label: string;
  value: number;
  color: string;
}

export function StatsPieChart({ data }: { data: PieData[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return <WebPieChart data={filtered} />;
  }

  return <NativePieChart data={filtered} />;
}

export function StatsDonutChart({ data }: { data: PieData[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return <WebPieChart data={filtered} />;
  }

  const { PieChart } = require('react-native-gifted-charts');
  const pieData = filtered.map((d) => ({
    value: d.value,
    text: d.label,
    color: d.color,
  }));

  return (
    <View style={styles.pieContainer}>
      <PieChart
        data={pieData}
        radius={90}
        innerRadius={62}
        showText
        textColor={colors.text}
        textSize={10}
        isAnimated={false}
      />
      <View style={styles.legend}>
        {filtered.map((d) => (
          <View key={d.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendText}>
              {d.label} ({d.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WebHorizontalBarChart({ data, color }: { data: BarChartData[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.horizontalChart}>
      {data.map((d) => (
        <View key={d.label} style={styles.horizontalRow}>
          <Text style={styles.horizontalLabel} numberOfLines={1}>
            {d.label}
          </Text>
          <View style={styles.horizontalTrack}>
            <View
              style={[
                styles.horizontalFill,
                { width: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={styles.horizontalValue}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

function NativeHorizontalBarChart({ data, color }: { data: BarChartData[]; color: string }) {
  const { BarChart } = require('react-native-gifted-charts');
  const chartData = data.map((d) => ({
    value: d.value,
    label: d.label,
    frontColor: color,
  }));

  return (
    <BarChart
      data={chartData}
      horizontal
      height={Math.max(data.length * 42, 160)}
      width={screenWidth - 80}
      maxValue={Math.max(...data.map((d) => d.value), 1)}
      barWidth={18}
      spacing={18}
      roundedRight
      hideRules
      xAxisColor={colors.border}
      yAxisColor={colors.border}
      yAxisTextStyle={styles.axisText}
      xAxisLabelTextStyle={styles.axisText}
      noOfSections={4}
      isAnimated={false}
    />
  );
}

export function StatsHorizontalBarChart({
  data,
  color = colors.accent,
}: {
  data: BarChartData[];
  color?: string;
}) {
  const clean = sanitizeData(data);
  if (clean.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return <WebHorizontalBarChart data={clean} color={color} />;
  }

  return <NativeHorizontalBarChart data={clean} color={color} />;
}

export interface RankListItem {
  label: string;
  value: number;
  color?: string;
}

export function StatsRankList({
  items,
  formatValue,
}: {
  items: RankListItem[];
  formatValue?: (value: number) => string;
}) {
  const filtered = items.filter((item) => item.value > 0);
  if (filtered.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  const max = Math.max(...filtered.map((item) => item.value), 1);

  return (
    <View style={styles.rankList}>
      {filtered.map((item, index) => {
        const barColor = item.color ?? colors.primary;
        const displayValue = formatValue ? formatValue(item.value) : String(item.value);
        return (
          <View key={`${item.label}-${index}`} style={styles.rankItem}>
            <View style={styles.rankHeader}>
              <Text style={styles.rankPosition}>{index + 1}</Text>
              <Text style={styles.rankLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.rankValue}>{displayValue}</Text>
            </View>
            <View style={styles.rankTrack}>
              <View
                style={[
                  styles.rankFill,
                  {
                    width: `${Math.max((item.value / max) * 100, 6)}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  axisText: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  empty: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
  webChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  webBarColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 36,
  },
  webBarValue: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontSize: 10,
  },
  webBar: {
    width: '80%',
    maxWidth: 32,
    borderRadius: radius.sm,
    minHeight: 2,
  },
  webBarLabel: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 10,
    textAlign: 'center',
  },
  webLineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  horizontalChart: {
    width: Math.min(screenWidth - 80, 520),
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  horizontalLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    width: 88,
  },
  horizontalTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  horizontalFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  horizontalValue: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    width: 48,
    textAlign: 'right',
  },
  rankList: {
    width: Math.min(screenWidth - 80, 520),
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  rankItem: {
    gap: spacing.xs,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankPosition: {
    ...typography.caption,
    fontFamily: 'Inter_700Bold',
    color: colors.accent,
    width: 18,
  },
  rankLabel: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
  },
  rankValue: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  rankTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginLeft: 26,
  },
  rankFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  webPieContainer: {    width: Math.min(screenWidth - 80, 400),
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  webPieRow: {
    gap: spacing.xs,
  },
  webPieLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  webPieBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  webPieBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  webPiePct: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  pieContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
});
