"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryData {
  name: string;
  count: number;
}

interface CategoryChartProps {
  data: CategoryData[];
}

// 配色方案 - 与主题协调的渐变色
const COLORS = [
  "hsl(var(--primary))",
  "hsl(210 100% 56%)",   // 蓝色
  "hsl(160 84% 39%)",    // 绿色
  "hsl(35 92% 53%)",     // 橙色
  "hsl(280 65% 60%)",    // 紫色
  "hsl(340 75% 55%)",    // 粉色
  "hsl(190 90% 50%)",    // 青色
  "hsl(45 93% 47%)",     // 黄色
];

export function CategoryChart({ data }: CategoryChartProps) {
  // 如果没有数据，显示空状态
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">分类分布</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  // 如果分类太多，只显示前 7 个，其余归为"其他"
  const chartData =
    data.length > 8
      ? [
          ...data.slice(0, 7),
          {
            name: "其他",
            count: data.slice(7).reduce((sum, item) => sum + item.count, 0),
          },
        ]
      : data;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">分类分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="count"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as CategoryData;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          技能数量: {data.count}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value: string) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
