/**
 * 站名与短句之间的双层山水纹样：远山轮廓 + 云气 + 一点朱砂。
 * 取代旧的抽象笔触，用可读的意象收束标题块。
 */
export default function Motif() {
  return (
    <div className="motif" aria-hidden="true">
      <svg viewBox="0 0 390 54">
        <defs>
          <path id="home-hero-motif-ridge" d="M121 22 L139 11 L153 20 L170 5 L187 21 L201 12 L219 22" />
        </defs>
        <path
          className="motif-rear"
          d="M27 23C52 23 67 18 89 19C105 20 114 17 121 22M219 22C239 18 252 11 273 15C298 19 315 24 363 22"
        />
        <use className="motif-rear" href="#home-hero-motif-ridge" />
        <g transform="translate(0 15)">
          <path
            className="motif-cloud"
            d="M8 20 H45 C38 12 48 6 57 11 C64 15 62 23 55 23 C49 23 48 16 54 15 M55 20 H111 C105 13 113 8 121 11 C128 14 127 21 121 22"
          />
          <use className="motif-mountain" href="#home-hero-motif-ridge" />
          <rect className="motif-jade" x="191" y="15" width="9" height="9" transform="rotate(45 195.5 19.5)" />
          <path className="motif-water" d="M142 27 C158 24 175 30 192 27 C211 24 230 29 248 26" />
          <path
            className="motif-cloud"
            d="M382 20 H345 C352 12 342 6 333 11 C326 15 328 23 335 23 C341 23 342 16 336 15 M335 20 H279 C285 13 277 8 269 11 C262 14 263 21 269 22 H219"
          />
        </g>
      </svg>
    </div>
  )
}
