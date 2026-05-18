/** 만화 비명/폭발형 말풍선 (가로 타원 + 삐죽 테두리 + 아래 꼬리) */
/* 가로 폭발 말풍선 + 하단 중앙 꼬리 (첨부 레퍼런스 형태) */
const SHOUT_BUBBLE_PATH = `
M 250 5
L 274 28 L 300 8 L 326 30 L 356 10 L 382 34 L 412 16 L 442 36 L 472 22 L 496 44 L 504 40
L 498 68 L 506 82 L 500 110 L 508 126 L 498 152 L 504 170 L 492 190 L 498 208 L 480 218
L 486 240 L 464 232 L 446 250 L 420 236 L 396 254 L 368 240 L 344 258 L 316 244 L 292 260
L 264 246 L 250 260 L 238 282 L 250 306 L 262 282 L 250 260
L 226 272 L 200 258 L 174 272 L 148 256 L 120 268 L 94 250 L 68 260 L 46 240
L 24 248 L 14 226 L 4 206 L 14 188 L 4 168 L 14 150 L 6 128 L 14 110 L 6 88 L 18 74
L 10 52 L 30 42 L 22 24 L 44 34 L 68 18 L 92 32 L 116 14 L 140 30 L 164 12 L 188 28
L 212 10 L 236 26 L 250 5
Z
`

type LimitBreakShoutBubbleProps = {
  message: string
  id?: string
}

export function LimitBreakShoutBubble({ message, id }: LimitBreakShoutBubbleProps) {
  return (
    <div className="limit-break-shout" id={id}>
      <svg
        className="limit-break-shout__svg"
        viewBox="0 0 500 308"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <path className="limit-break-shout__shape" d={SHOUT_BUBBLE_PATH} />
      </svg>
      <div className="limit-break-shout__text-wrap">
        <p className="limit-break-shout__text">{message}</p>
      </div>
    </div>
  )
}
