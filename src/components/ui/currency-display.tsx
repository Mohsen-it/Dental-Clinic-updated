import React from 'react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { formatCurrency, getCurrencyConfig } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  className?: string
  fallbackFormat?: boolean
  showSymbolOnly?: boolean
  useGlobalCurrency?: boolean
}

export function CurrencyDisplay({
  amount,
  currency,
  className = '',
  fallbackFormat = true,
  showSymbolOnly = false,
  useGlobalCurrency = true
}: CurrencyDisplayProps) {
  const { currentCurrency, formatAmount, formatAmountSymbol } = useCurrency()

  // Determine which currency to use
  const effectiveCurrency = useGlobalCurrency
    ? (currency || currentCurrency)
    : (currency || 'USD')

  try {
    // Use the appropriate formatting function
    const formattedValue = showSymbolOnly
      ? formatAmountSymbol(amount, effectiveCurrency)
      : formatAmount(amount, effectiveCurrency)

    return (
      <span className={className}>
        {formattedValue}
      </span>
    )
  } catch (error) {
    console.warn('Error formatting currency:', error)

    if (fallbackFormat) {
      // Fallback formatting using currency config
      const config = getCurrencyConfig(effectiveCurrency)

      try {
        const formattedNumber = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: showSymbolOnly ? 0 : config.decimals,
          maximumFractionDigits: showSymbolOnly ? 0 : config.decimals,
        }).format(amount)

        const displayValue = config.position === 'before'
          ? `${config.symbol}${formattedNumber}`
          : `${formattedNumber} ${config.symbol}`

        return (
          <span className={className}>
            {displayValue}
          </span>
        )
      } catch (fallbackError) {
        // Ultimate fallback
        const config = getCurrencyConfig(effectiveCurrency)
        const fixedAmount = showSymbolOnly
          ? Math.round(amount).toString()
          : amount.toFixed(config.decimals)

        const displayValue = config.position === 'before'
          ? `${config.symbol}${fixedAmount}`
          : `${fixedAmount} ${config.symbol}`

        return (
          <span className={className}>
            {displayValue}
          </span>
        )
      }
    }

    return (
      <span className={className}>
        {amount} {effectiveCurrency}
      </span>
    )
  }
}

export default CurrencyDisplay
