/**
 * 站名背后的远景山峦：两层水墨披麻皴 + 一道横向云气。
 * 纯装饰，以 multiply 混合压在标题之下，只提供纵深，不与站名争夺注意力。
 */
export default function TitleLandscape() {
  return (
    <div className="title-landscape" aria-hidden="true">
      <svg viewBox="0 0 790 365" preserveAspectRatio="none">
        <defs>
          <linearGradient id="home-hero-far-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#769a8c" stopOpacity=".04" />
            <stop offset=".55" stopColor="#5e8b7f" stopOpacity=".18" />
            <stop offset="1" stopColor="#315f58" stopOpacity=".05" />
          </linearGradient>
          <linearGradient id="home-hero-near-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#40756b" stopOpacity=".05" />
            <stop offset=".65" stopColor="#285f59" stopOpacity=".22" />
            <stop offset="1" stopColor="#1f504a" stopOpacity=".08" />
          </linearGradient>
        </defs>
        <path
          className="tl-far"
          fill="url(#home-hero-far-wash)"
          d="M0 315C65 275 103 281 155 205C207 130 260 194 314 119C361 54 401 142 438 101C487 48 534 157 582 133C641 104 690 218 790 187V365H0Z"
        />
        <path className="tl-mist" d="M64 255C170 222 248 260 349 232C459 202 565 249 711 213" />
        <path
          className="tl-near"
          fill="url(#home-hero-near-wash)"
          d="M0 353C69 310 116 329 170 270C222 214 260 281 318 237C372 196 421 287 477 227C532 171 580 280 639 240C697 201 738 282 790 257V365H0Z"
        />
      </svg>
    </div>
  )
}
