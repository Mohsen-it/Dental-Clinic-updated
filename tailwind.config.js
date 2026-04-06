/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Card backgrounds for light mode
    'bg-green-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50',
    'bg-blue-50', 'bg-purple-50', 'bg-emerald-50', 'bg-cyan-50',
    'bg-indigo-50', 'bg-pink-50', 'bg-slate-50', 'bg-gray-50',

    // Card backgrounds for dark mode
    'dark:bg-green-950', 'dark:bg-yellow-950', 'dark:bg-orange-950', 'dark:bg-red-950',
    'dark:bg-blue-950', 'dark:bg-purple-950', 'dark:bg-emerald-950', 'dark:bg-cyan-950',
    'dark:bg-indigo-950', 'dark:bg-pink-950', 'dark:bg-slate-950', 'dark:bg-gray-950',

    // Card borders for light mode
    'border-green-200', 'border-yellow-200', 'border-orange-200', 'border-red-200',
    'border-blue-200', 'border-purple-200', 'border-emerald-200', 'border-cyan-200',
    'border-indigo-200', 'border-pink-200', 'border-slate-200', 'border-gray-200',

    // Card borders for dark mode
    'dark:border-green-800', 'dark:border-yellow-800', 'dark:border-orange-800', 'dark:border-red-800',
    'dark:border-blue-800', 'dark:border-purple-800', 'dark:border-emerald-800', 'dark:border-cyan-800',
    'dark:border-indigo-800', 'dark:border-pink-800', 'dark:border-slate-800', 'dark:border-gray-800',

    // Icon colors for light mode
    'text-green-700', 'text-yellow-700', 'text-orange-700', 'text-red-700',
    'text-blue-700', 'text-purple-700', 'text-emerald-700', 'text-cyan-700',
    'text-indigo-700', 'text-pink-700', 'text-slate-700', 'text-gray-700',

    // Icon colors for dark mode
    'dark:text-green-300', 'dark:text-yellow-300', 'dark:text-orange-300', 'dark:text-red-300',
    'dark:text-blue-300', 'dark:text-purple-300', 'dark:text-emerald-300', 'dark:text-cyan-300',
    'dark:text-indigo-300', 'dark:text-pink-300', 'dark:text-slate-300', 'dark:text-gray-300',

    // Custom card classes
    'card-green', 'card-blue', 'card-purple', 'card-emerald', 'card-yellow', 'card-orange', 'card-red', 'card-indigo', 'card-gray', 'card-cyan',

    // Common utility classes
    'transition-all', 'duration-200', 'hover:shadow-lg', 'border', 'rounded-lg'
  ],
  darkMode: ['class', "class"],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			dental: {
  				'50': '#f0f9ff',
  				'100': '#e0f2fe',
  				'200': '#bae6fd',
  				'300': '#7dd3fc',
  				'400': '#38bdf8',
  				'500': '#0ea5e9',
  				'600': '#0284c7',
  				'700': '#0369a1',
  				'800': '#075985',
  				'900': '#0c4a6e',
  				'950': '#082f49'
  			},
  			medical: {
  				'50': '#f0fdf4',
  				'100': '#dcfce7',
  				'200': '#bbf7d0',
  				'300': '#86efac',
  				'400': '#4ade80',
  				'500': '#22c55e',
  				'600': '#16a34a',
  				'700': '#15803d',
  				'800': '#166534',
  				'900': '#14532d',
  				'950': '#052e16'
  			},
  			status: {
  				scheduled: '#3b82f6',
  				completed: '#10b981',
  				cancelled: '#ef4444',
  				'no-show': '#6b7280'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))',
  				'6': 'hsl(var(--chart-6))',
  				'7': 'hsl(var(--chart-7))',
  				'8': 'hsl(var(--chart-8))',
  				'grid': 'hsl(var(--chart-grid))',
  				'axis': 'hsl(var(--chart-axis))',
  				'text': 'hsl(var(--chart-text))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
   		fontFamily: {
   			sans: [
   				'Tajawal',
   				'ITF Qomra Arabic',
   				'-apple-system',
   				'BlinkMacSystemFont',
   				'Segoe UI',
   				'Roboto',
   				'sans-serif'
   			],
   			arabic: [
   				'Tajawal',
   				'ITF Qomra Arabic',
   				'Noto Sans Arabic',
   				'sans-serif'
   			],
   			tajawal: [
   				'Tajawal',
   				'ITF Qomra Arabic',
   				'sans-serif'
   			]
   		},
  		fontSize: {
  			'xs': ['14px', { lineHeight: '20px' }],
  			'sm': ['16px', { lineHeight: '24px' }],
  			'base': ['18px', { lineHeight: '28px' }],
  			'lg': ['20px', { lineHeight: '30px' }],
  			'xl': ['24px', { lineHeight: '32px' }],
  			'2xl': ['28px', { lineHeight: '36px' }],
  			'3xl': ['32px', { lineHeight: '40px' }],
  			'4xl': ['36px', { lineHeight: '44px' }],
  			'5xl': ['48px', { lineHeight: '56px' }],
  			'6xl': ['60px', { lineHeight: '68px' }],
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem'
  		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)'
		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},
			'fade-in': {
				from: {
					opacity: '0'
				},
				to: {
					opacity: '1'
				}
			},
			'slide-in-from-top': {
				from: {
					transform: 'translateY(-100%)'
				},
				to: {
					transform: 'translateY(0)'
				}
			},
			'slide-in-from-bottom': {
				from: {
					transform: 'translateY(100%)'
				},
				to: {
					transform: 'translateY(0)'
				}
			},
			'fadeInUp': {
				from: {
					opacity: '0',
					transform: 'translateY(20px)'
				},
				to: {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'fadeInDown': {
				from: {
					opacity: '0',
					transform: 'translateY(-20px)'
				},
				to: {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'scaleIn': {
				from: {
					opacity: '0',
					transform: 'scale(0.95)'
				},
				to: {
					opacity: '1',
					transform: 'scale(1)'
				}
			},
			'slideInRight': {
				from: {
					opacity: '0',
					transform: 'translateX(30px)'
				},
				to: {
					opacity: '1',
					transform: 'translateX(0)'
				}
			},
			'slideInLeft': {
				from: {
					opacity: '0',
					transform: 'translateX(-30px)'
				},
				to: {
					opacity: '1',
					transform: 'translateX(0)'
				}
			},
			'shimmer': {
				'0%': {
					backgroundPosition: '-200% 0'
				},
				'100%': {
					backgroundPosition: '200% 0'
				}
			},
			'pulse-ring': {
				'0%': {
					transform: 'scale(0.95)',
					opacity: '0.8'
				},
				'50%': {
					transform: 'scale(1)',
					opacity: '0.5'
				},
				'100%': {
					transform: 'scale(0.95)',
					opacity: '0.8'
				}
			},
			'bounce-gentle': {
				'0%, 100%': {
					transform: 'translateY(0)'
				},
				'50%': {
					transform: 'translateY(-5px)'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'fade-in': 'fade-in 0.2s ease-out',
			'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
			'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
			'fadeInUp': 'fadeInUp 0.4s ease-out forwards',
			'fadeInDown': 'fadeInDown 0.4s ease-out forwards',
			'scaleIn': 'scaleIn 0.3s ease-out forwards',
			'slideInRight': 'slideInRight 0.4s ease-out forwards',
			'slideInLeft': 'slideInLeft 0.4s ease-out forwards',
			'shimmer': 'shimmer 2s ease-in-out infinite',
			'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
			'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite'
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
