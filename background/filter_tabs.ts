import { cRepeat, get_cOptions } from "./store"

import C = kBgCmd

export const getTabRange = (current: number, total: number, countToAutoLimitBeforeScale?: number
    , /** must be positive */ extraCount?: 1 | 0): [number, number] => {
  let count = cRepeat
  if (extraCount) { count += count > 0 ? extraCount : -extraCount }
  const end = current + count, pos = count > 0
  return end <= total && end > -2 ? pos ? [current, end] : [end + 1, current + 1] // normal range
      : !get_cOptions<C.removeTab | C.reloadTab | C.copyWindowInfo>().limited
      && (Math.abs(count) < (countToAutoLimitBeforeScale || total) * GlobalConsts.ThresholdToAutoLimitTabOperation
          || count < 10)
      ? Math.abs(count) < total ? pos ? [total - count, total] : [0, -count] // go forward and backward
        : [0, total] // all
      : pos ? [current, total] : [0, current + 1] // limited
}
