"use client";

import { useMemo, useState } from "react";
import type { SectorExposure } from "../../lib/types";
import { formatPercent } from "../../lib/formatters";

interface SectorPieChartProps {
  sectors: SectorExposure[];
}

interface PieSlice {
  sector: string;
  percentage: number;
  color: string;
  startAngle: number;
  endAngle: number;
  path: string;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function createArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    "L",
    x,
    y,
    "Z",
  ].join(" ");
}

export default function SectorPieChart({ sectors }: SectorPieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const slices: PieSlice[] = useMemo(() => {
    const centerX = 150;
    const centerY = 150;
    const radius = 120;

    let currentAngle = 0;
    return sectors.map((sector) => {
      const percentage = sector.totalExposure;
      const sliceAngle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const path = createArc(centerX, centerY, radius, startAngle, endAngle);

      currentAngle = endAngle;

      return {
        sector: sector.sector,
        percentage,
        color: sector.color,
        startAngle,
        endAngle,
        path,
      };
    });
  }, [sectors]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG Pie Chart */}
      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        className="drop-shadow-lg"
      >
        {/* Background circle */}
        <circle
          cx="150"
          cy="150"
          r="120"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />

        {/* Pie slices */}
        {slices.map((slice, index) => (
          <g key={slice.sector}>
            <path
              d={slice.path}
              fill={slice.color}
              fillOpacity={hoveredIndex === index ? 0.9 : 0.7}
              stroke="rgba(0, 0, 0, 0.2)"
              strokeWidth="2"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}

        {/* Center circle for donut effect */}
        <circle cx="150" cy="150" r="50" fill="var(--color-bg-surface)" />

        {/* Center text */}
        <text
          x="150"
          y="145"
          textAnchor="middle"
          className="font-chakra text-xs uppercase tracking-wider fill-[#666666]"
        >
          Sector
        </text>
        <text
          x="150"
          y="160"
          textAnchor="middle"
          className="font-chakra text-xs uppercase tracking-wider fill-[#666666]"
        >
          Allocation
        </text>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {sectors.map((sector, index) => (
          <div
            key={sector.sector}
            className="flex items-center gap-2 p-2 rounded hover:bg-white/[0.03] transition-colors cursor-pointer"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: sector.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-manrope text-xs text-white truncate">
                {sector.sector}
              </div>
              <div className="font-ibm text-xs text-[#a0a0a0]">
                {formatPercent(sector.totalExposure)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
