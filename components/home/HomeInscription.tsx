/**
 * 首屏两侧题签：竖排题句 + 一道界格线 + 一枚小印。
 * 只负责建立纵向张力，不承载数据，左右两枚共用同一形态。
 */
export type HomeInscriptionProps = {
  side: 'left' | 'right'
  text: string
  seal: string
  note: string
}

export default function HomeInscription({ side, text, seal, note }: HomeInscriptionProps) {
  return (
    <div className={`inscription ${side}`} aria-hidden="true">
      <i className="inscription-mist" />
      <svg viewBox="0 0 112 298" preserveAspectRatio="none">
        <path
          className="inscription-rule"
          d="M78 7 C51 17 42 26 43 55 L43 221 C43 253 31 269 12 286"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          className="inscription-rule-accent"
          d="M84 12 C63 24 59 34 59 58"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="inscription-note">{note}</span>
      <div className="inscription-copy">{text}</div>
      <span className="inscription-seal">{seal}</span>
    </div>
  )
}
