/**
 * Medusa stores order totals as a jsonb blob on `order_summary`, and the
 * numbers inside are decimals in the major unit. Depending on how the value
 * was written they are either a plain number or a serialised BigNumber
 * (`{ value, precision }`).
 *
 * This fragment normalises both shapes to **minor units**, which is how money
 * moves through the rest of NordPrint. Defined once so every report agrees on
 * what "omsætning" means.
 */
export const ORDER_TOTAL_MINOR = /* sql */ `
  ROUND(
    COALESCE(
      (os.totals -> 'current_order_total' ->> 'value')::numeric,
      NULLIF(os.totals ->> 'current_order_total', '')::numeric,
      (os.totals -> 'original_order_total' ->> 'value')::numeric,
      NULLIF(os.totals ->> 'original_order_total', '')::numeric,
      0
    ) * 100
  )::bigint
`;
