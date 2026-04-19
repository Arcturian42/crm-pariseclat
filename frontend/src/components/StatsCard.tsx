import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const colorMap = {
  blue: { bg: '#EBF3FB', iconBg: '#2D6A9F', text: '#2D6A9F' },
  green: { bg: '#EAFAF1', iconBg: '#27AE60', text: '#27AE60' },
  orange: { bg: '#FEF9E7', iconBg: '#F39C12', text: '#F39C12' },
  purple: { bg: '#F4ECF7', iconBg: '#8E44AD', text: '#8E44AD' },
};

export default function StatsCard({ title, value, subtitle, trend, icon, color = 'blue' }: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div className="stats-card-info">
          <p className="stats-card-title">{title}</p>
          <p className="stats-card-value">{value}</p>
          {subtitle && <p className="stats-card-subtitle">{subtitle}</p>}
        </div>
        {icon && (
          <div
            className="stats-card-icon"
            style={{ backgroundColor: colors.bg }}
          >
            <span style={{ color: colors.iconBg }}>{icon}</span>
          </div>
        )}
      </div>
      {trend && (
        <div className="stats-card-trend">
          <span
            className={`trend-indicator ${trend.positive !== false ? 'trend-up' : 'trend-down'}`}
          >
            {trend.positive !== false ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="trend-label">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
