import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import Svg, { Polyline, Circle, Polygon } from 'react-native-svg';
import { Card } from './Card';
import { colors, spacing, typography, radius } from '@/constants/theme';
const isWeb = Platform.OS === 'web';
const screenWidth = Dimensions.get('window').width;

export const CHART_PALETTE = [
  '#2563EB',
  '#1A1A2E',
  '#10B981',
  '#F59E0B',
  '#6366F1',
  '#0EA5E9',
  '#14B8A6',
  '#8B5CF6',
];

function formatCompactAxis(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function ChartCard({ title, subtitle, children, scrollable = false }: ChartCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
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

function WebLineChart({ data, color, area = false }: { data: BarChartData[]; color: string; area?: boolean }) {
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
  const baseline = height - padding;
  const areaPoints = [
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1]?.x ?? padding},${baseline}`,
    `${points[0]?.x ?? padding},${baseline}`,
  ].join(' ');

  return (
    <View style={{ width, height: height + 28 }}>
      <Svg width={width} height={height}>
        {area ? (
          <Polygon points={areaPoints} fill={`${color}22`} stroke="none" />
        ) : null}
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

function NativeBarChart({
  data,
  color,
  multiColor = false,
  formatYLabel,
}: {
  data: BarChartData[];
  color: string;
  multiColor?: boolean;
  formatYLabel?: (value: number) => string;
}) {
  const { BarChart } = require('react-native-gifted-charts');
  const chartData = data.map((d, index) => ({
    value: d.value,
    label: d.label,
    frontColor: multiColor ? CHART_PALETTE[index % CHART_PALETTE.length] : color,
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
      formatYLabel={formatYLabel ?? formatCompactAxis}
      noOfSections={4}
      isAnimated={false}
    />
  );
}

function NativeLineChart({
  data,
  color,
  area = false,
  formatYLabel,
}: {
  data: BarChartData[];
  color: string;
  area?: boolean;
  formatYLabel?: (value: number) => string;
}) {
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
      areaChart={area}
      startFillColor={area ? `${color}44` : undefined}
      endFillColor={area ? `${color}08` : undefined}
      startOpacity={area ? 0.35 : undefined}
      endOpacity={area ? 0.05 : undefined}
      xAxisColor={colors.border}
      yAxisColor={colors.border}
      yAxisTextStyle={styles.axisText}
      xAxisLabelTextStyle={styles.axisText}
      formatYLabel={formatYLabel ?? formatCompactAxis}
      noOfSections={4}
      isAnimated={false}
      spacing={data.length > 15 ? 20 : 35}
      dataPointsColor={color}
      dataPointsRadius={4}
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

export function StatsBarChart({
  data,
  color = colors.accent,
  formatYLabel,
}: {
  data: BarChartData[];
  color?: string;
  formatYLabel?: (value: number) => string;
}) {
  const clean = sanitizeData(data);
  if (clean.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return <WebBarChart data={clean} color={color} />;
  }

  return <NativeBarChart data={clean} color={color} formatYLabel={formatYLabel} />;
}

export function StatsMultiBarChart({
  data,
  formatYLabel,
}: {
  data: BarChartData[];
  formatYLabel?: (value: number) => string;
}) {
  const clean = sanitizeData(data);
  if (clean.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return (
      <View style={styles.webChart}>
        {clean.map((d, index) => {
          const max = Math.max(...clean.map((item) => item.value), 1);
          const barColor = CHART_PALETTE[index % CHART_PALETTE.length];
          const height = d.value > 0 ? Math.max((d.value / max) * 140, 4) : 2;
          return (
            <View key={`${d.label}-${index}`} style={styles.webBarColumn}>
              <Text style={styles.webBarValue} numberOfLines={1}>
                {d.value > 0 ? formatCompactAxis(d.value) : ''}
              </Text>
              <View style={[styles.webBar, { height, backgroundColor: barColor }]} />
              <Text style={styles.webBarLabel} numberOfLines={1}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  return <NativeBarChart data={clean} color={colors.primary} multiColor formatYLabel={formatYLabel} />;
}

export function StatsLineChart({
  data,
  color = colors.primary,
  formatYLabel,
}: {
  data: BarChartData[];
  color?: string;
  formatYLabel?: (value: number) => string;
}) {
  const clean = sanitizeData(data);
  if (clean.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return <WebLineChart data={clean} color={color} />;
  }

  return <NativeLineChart data={clean} color={color} formatYLabel={formatYLabel} />;
}

export function StatsAreaChart({
  data,
  color = colors.primary,
  formatYLabel,
}: {
  data: BarChartData[];
  color?: string;
  formatYLabel?: (value: number) => string;
}) {
  const clean = sanitizeData(data);
  if (clean.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return <WebLineChart data={clean} color={color} area />;
  }

  return <NativeLineChart data={clean} color={color} area formatYLabel={formatYLabel} />;
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

function WebHorizontalBarChart({
  data,
  color,
  multiColor = false,
  formatValue,
}: {
  data: BarChartData[];
  color: string;
  multiColor?: boolean;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.horizontalChart}>
      {data.map((d, index) => {
        const barColor = multiColor ? CHART_PALETTE[index % CHART_PALETTE.length] : color;
        const display = formatValue ? formatValue(d.value) : String(d.value);
        return (
          <View key={`${d.label}-${index}`} style={styles.horizontalRow}>
            <Text style={styles.horizontalLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <View style={styles.horizontalTrack}>
              <View
                style={[
                  styles.horizontalFill,
                  { width: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={styles.horizontalValue}>{display}</Text>
          </View>
        );
      })}
    </View>
  );
}

function NativeHorizontalBarChart({
  data,
  color,
  multiColor = false,
}: {
  data: BarChartData[];
  color: string;
  multiColor?: boolean;
}) {
  const { BarChart } = require('react-native-gifted-charts');
  const chartData = data.map((d, index) => ({
    value: d.value,
    label: d.label,
    frontColor: multiColor ? CHART_PALETTE[index % CHART_PALETTE.length] : color,
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
      yAxisLabelTextStyle={styles.axisText}
      formatXLabel={formatCompactAxis}
      noOfSections={4}
      isAnimated={false}
    />
  );
}

export function StatsHorizontalBarChart({
  data,
  color = colors.accent,
  multiColor = false,
  formatValue,
}: {
  data: BarChartData[];
  color?: string;
  multiColor?: boolean;
  formatValue?: (value: number) => string;
}) {
  const clean = sanitizeData(data);
  if (clean.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  if (isWeb) {
    return (
      <WebHorizontalBarChart
        data={clean}
        color={color}
        multiColor={multiColor}
        formatValue={formatValue}
      />
    );
  }

  return <NativeHorizontalBarChart data={clean} color={color} multiColor={multiColor} />;
}

export interface RankListItem {
  label: string;
  value: number;
  color?: string;
  secondary?: string;
}

export function StatsRankRow({
  rank,
  label,
  primary,
  secondary,
  percent,
  color = colors.accent,
}: {
  rank: number;
  label: string;
  primary: string;
  secondary?: string;
  percent: number;
  color?: string;
}) {
  return (
    <View style={styles.rankRow}>
      <Text style={styles.rankIndex}>{rank}</Text>
      <View style={styles.rankBody}>
        <View style={styles.rankTop}>
          <Text style={styles.rankRowLabel} numberOfLines={2}>
            {label}
          </Text>
          <Text style={styles.rankPrimary}>{primary}</Text>
        </View>
        {secondary ? <Text style={styles.rankSecondary}>{secondary}</Text> : null}
        <View style={styles.rankTrack}>
          <View
            style={[
              styles.rankFill,
              {
                width: `${Math.max(4, Math.min(100, percent))}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

export function StatsRankList({
  items,
  formatValue,
  maxValue,
}: {
  items: RankListItem[];
  formatValue?: (value: number) => string;
  maxValue?: number;
}) {
  const filtered = items.filter((item) => item.value > 0);
  if (filtered.length === 0) {
    return <Text style={styles.empty}>Sin datos</Text>;
  }

  const max = maxValue ?? Math.max(...filtered.map((item) => item.value), 1);

  return (
    <View style={styles.rankList}>
      {filtered.map((item, index) => (
        <StatsRankRow
          key={`${item.label}-${index}`}
          rank={index + 1}
          label={item.label}
          primary={formatValue ? formatValue(item.value) : String(item.value)}
          secondary={item.secondary}
          percent={(item.value / max) * 100}
          color={item.color ?? colors.primary}
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  content: {
    width: '100%',
  },
  title: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
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
    width: '100%',
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
    width: 96,
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
    width: '100%',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rankIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.textSecondary,
    overflow: 'hidden',
  },
  rankBody: {
    flex: 1,
    gap: 4,
  },
  rankTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rankRowLabel: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
  },
  rankPrimary: {
    ...typography.bodySmall,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  rankSecondary: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  rankTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
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
