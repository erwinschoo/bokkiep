interface Props {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  track?: string;
}

/* Compacte verticale mini-staafjes (laatste balk geaccentueerd). Gebruikt o.a. in de
 * mobiele saldo-hero. Kleuren via CSS-vars → werkt mee met light/dark. */
export function MiniBars({ data, w = 92, h = 40, color = "var(--blue)", track = "var(--line)" }: Props) {
  const max = Math.max(1, ...data);
  const n = data.length || 1;
  const gap = w / n;
  const bw = gap * 0.56;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {data.map((v, i) => {
        const bh = Math.max(3, (v / max) * (h - 6));
        const last = i === data.length - 1;
        return (
          <rect key={i} x={i * gap + (gap - bw) / 2} y={h - bh} width={bw} height={bh}
            rx={bw / 2.4} fill={last ? color : track} />
        );
      })}
    </svg>
  );
}
