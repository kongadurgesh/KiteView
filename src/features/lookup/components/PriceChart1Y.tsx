import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fmtNumber } from '../../../lib/format';

interface Point {
  date: string;
  close: number;
}

export function PriceChart1Y({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return <p className="text-sm text-ink-muted dark:text-ink-dark-muted py-6 text-center">Not enough history for chart</p>;
  }

  const tickFormatter = (d: string) => d.slice(5);

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border dark:stroke-border-dark" />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 10 }}
            className="text-ink-muted"
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10 }}
            width={48}
            tickFormatter={(v) => fmtNumber(v, { max: 0 })}
          />
          <Tooltip
            formatter={(value: unknown) => [fmtNumber(Number(value)), 'Close']}
            labelFormatter={(l) => String(l)}
            contentStyle={{ fontSize: 12 }}
          />
          <Line type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
