import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/button'

interface ThemeToggleProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

export function ThemeToggle({
  variant = 'ghost',
  size = 'icon',
  showLabel = false
}: ThemeToggleProps) {
  const { isDarkMode, toggleDarkMode } = useTheme()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleDarkMode}
      className="transition-all duration-200"
      title={isDarkMode ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع المظلم'}
    >
      {isDarkMode ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      {showLabel && (
        <span className="ml-2">
          {isDarkMode ? 'فاتح' : 'مظلم'}
        </span>
      )}
    </Button>
  )
}

export default ThemeToggle
