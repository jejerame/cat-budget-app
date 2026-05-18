// 개발 테스트용 버튼 — 최종 배포 시 이 파일 전체 삭제

import type { MonthlySettlementTone } from '../data/monthlySettlement'

type MonthlySettlementDevTestButtonsProps = {
  onPreview: (tone: MonthlySettlementTone) => void
}

export function MonthlySettlementDevTestButtons({
  onPreview,
}: MonthlySettlementDevTestButtonsProps) {
  return (
    <div className="monthly-settlement-dev-test" aria-label="월말 결산 UI 개발 테스트">
      <button
        type="button"
        className="monthly-settlement-dev-test__btn monthly-settlement-dev-test__btn--over"
        onClick={() => onPreview('over')}
      >
        테스트: 탕진잼
      </button>
      <button
        type="button"
        className="monthly-settlement-dev-test__btn monthly-settlement-dev-test__btn--good"
        onClick={() => onPreview('good')}
      >
        테스트: 지출요요
      </button>
    </div>
  )
}
