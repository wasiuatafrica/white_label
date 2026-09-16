export function getMonthlyChartItemKey(chartKey: string, index: number): string {
  return chartKey || `placeholder-${index}`;
}
