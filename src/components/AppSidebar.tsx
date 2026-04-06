import * as React from "react"
import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
  User2,
  Package,
  BarChart3,
  Microscope,
  Pill,
  Heart,
  Stethoscope,
  ClipboardList,
  Receipt,
  FileText,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { useStableClinicName, useStableDoctorName, useStableClinicLogo } from "@/hooks/useStableSettings"

// Navigation items data
const navigationItems = [
  {
    title: "لوحة التحكم",
    url: "dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "المرضى",
    url: "patients",
    icon: Users,
  },
  {
    title: "المواعيد",
    url: "appointments",
    icon: Calendar,
  },
  {
    title: "المدفوعات",
    url: "payments",
    icon: CreditCard,
  },
  {
    title: "المخزون",
    url: "inventory",
    icon: Package,
  },
  {
    title: "المخابر",
    url: "labs",
    icon: Microscope,
  },
  {
    title: "الأدوية والوصفات",
    url: "medications",
    icon: Pill,
  },
  {
    title: "العلاجات السنية",
    url: "dental-treatments",
    icon: Heart,
  },
  {
    title: "احتياجات العيادة",
    url: "clinic-needs",
    icon: ClipboardList,
  },
  {
    title: "مصروفات العيادة",
    url: "expenses",
    icon: Receipt,
  },
  {
    title: "التقارير",
    url: "reports",
    icon: BarChart3,
  },
  {
    title: "فاتورة تقديرية ",
    url: "external-estimate",
    icon: FileText,
  },
  {
    title: "الإعدادات",
    url: "settings",
    icon: Settings,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AppSidebar({ activeTab, onTabChange, ...props }: AppSidebarProps) {
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()
  const clinicLogo = useStableClinicLogo()

  return (
    <Sidebar collapsible="offcanvas" side="right" className="border-l border-border/20 rtl-layout glass-card" style={{
      boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.06)',
      borderRadius: '0 1.5rem 1.5rem 0',
      background: 'hsl(var(--sidebar-background))'
    }} {...props}>
      <SidebarHeader className="border-b border-border/30 bg-gradient-to-l from-background via-accent/10 to-accent/5 px-5 py-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-accent/20 transition-all duration-300 ease-out flex-rtl group cursor-pointer glass-card">
                <div 
                  className="flex aspect-square size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-secondary text-white overflow-hidden relative"
                  style={{
                    boxShadow: '0 6px 16px -4px hsl(var(--primary) / 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15) inset',
                  }}
                >
                  <Stethoscope className="size-7 drop-shadow-sm" strokeWidth={2.5} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                </div>
                <div className="grid flex-1 text-right leading-relaxed gap-0.5">
                  <span 
                    className="truncate font-extrabold text-lg tracking-tight text-foreground"
                    style={{ letterSpacing: '0.01em' }}
                  >
                    {clinicName}
                  </span>
                  <span className="truncate text-[11px] font-semibold uppercase tracking-wide opacity-70 text-muted-foreground">
                    نظام إدارة العيادة
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="space-y-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5 nav-rtl">
              {navigationItems.map((item, index) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeTab === item.url}
                    onClick={() => onTabChange(item.url)}
                    className={`flex items-center gap-3 w-full text-right justify-start rounded-xl transition-all duration-300 ease-out py-3 px-4 text-base nav-item group relative overflow-hidden ${
                      activeTab === item.url 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-accent/50 text-foreground/80 hover:text-foreground'
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    <div className={`relative z-10 flex items-center gap-3 w-full`}>
                      <div className={`p-2 rounded-lg transition-all duration-300 ${
                        activeTab === item.url 
                          ? 'bg-primary text-primary-foreground shadow-md' 
                          : 'bg-muted group-hover:bg-primary/10 group-hover:scale-110'
                      }`}>
                        <item.icon className={`size-5 ${activeTab === item.url ? '' : 'text-muted-foreground group-hover:text-primary'}`} />
                      </div>
                      <span className={`font-medium text-sm flex-1 ${activeTab === item.url ? 'font-semibold' : ''}`}>{item.title}</span>
                      {activeTab === item.url && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-l-full"></div>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/30 bg-gradient-to-r from-background via-accent/10 to-accent/5 px-5 py-4 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-accent/20 transition-all duration-300 ease-out cursor-pointer group">
              <div 
                className="flex aspect-square size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white overflow-hidden relative ring-2 ring-primary/20"
                style={{
                  boxShadow: '0 4px 12px -2px hsl(var(--primary) / 0.3)',
                }}
              >
                <User2 className="size-6" strokeWidth={2.5} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              </div>
              <div className="grid flex-1 text-right leading-tight gap-0.5">
                <span className="truncate font-bold text-sm text-foreground">د. {doctorName}</span>
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  {clinicName}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
