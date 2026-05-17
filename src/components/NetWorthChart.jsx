import { AreaChart, Area, ResponsiveContainer } from 'recharts'

export default function NetWorthChart({ data }) {
  if (!data || data.length < 2) return null

  const isUp = data[data.length - 1].netWorth >= data[0].netWorth
  const color = isUp ? '#1AB766' : '#EF4444'
  const gradId = isUp ? 'nwGradUp' : 'nwGradDown'

  return (
    <ResponsiveContainer width="100%" height={110}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="netWorth"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: color, stroke: 'white', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
