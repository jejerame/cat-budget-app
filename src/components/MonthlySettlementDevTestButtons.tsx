// 개발 테스트용 버튼 — 최종 배포 시 이 파일 전체 삭제

import type { MonthlySettlementTone } from '../data/monthlySettlement'

type MonthlySettlementDevTestButtonsProps = {
  onPreviewMonthly: (tone: MonthlySettlementTone) => void
  onPreviewWeekly: () => void
}

export function MonthlySettlementDevTestButtons({
  onPreviewMonthly,
  onPreviewWeekly,
}: MonthlySettlementDevTestButtonsProps) {
  return (
    <div className="monthly-settlement-dev-test" aria-label="결산 UI 개발 테스트">
      <button
        type="button"
        className="monthly-settlement-dev-test__btn monthly-settlement-dev-test__btn--over"
        onClick={() => onPreviewMonthly('over')}
      >
        테스트: 탕진잼
      </button>
      <button
        type="button"
        className="monthly-settlement-dev-test__btn monthly-settlement-dev-test__btn--good"
        onClick={() => onPreviewMonthly('good')}
      >
        테스트: 지출요요
      </button>
      <button
        type="button"
        className="monthly-settlement-dev-test__btn monthly-settlement-dev-test__btn--weekly"
        onClick={onPreviewWeekly}
      >
        테스트: 주간결산
      </button>
    </div>
  )
}
