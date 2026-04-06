import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLabStore } from '@/store/labStore'
import { notify } from '@/services/notificationService'
import { Building2, Phone, MapPin, Loader2 } from 'lucide-react'
import type { Lab } from '@/types'

interface AddLabDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingLab?: Lab | null
}

export default function AddLabDialog({ open, onOpenChange, editingLab }: AddLabDialogProps) {
  const { createLab, updateLab, isLoading } = useLabStore()

  const [formData, setFormData] = useState({
    name: '',
    contact_info: '',
    address: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or when editing lab changes
  useEffect(() => {
    if (open) {
      if (editingLab) {
        setFormData({
          name: editingLab.name || '',
          contact_info: editingLab.contact_info || '',
          address: editingLab.address || ''
        })
      } else {
        setFormData({
          name: '',
          contact_info: '',
          address: ''
        })
      }
      setErrors({})
    }
  }, [open, editingLab])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'اسم المختبر مطلوب'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'اسم المختبر يجب أن يكون على الأقل حرفين'
    }

    if (formData.contact_info && formData.contact_info.trim().length < 5) {
      newErrors.contact_info = 'معلومات الاتصال يجب أن تكون على الأقل 5 أحرف'
    }

    if (formData.address && formData.address.trim().length < 5) {
      newErrors.address = 'العنوان يجب أن يكون على الأقل 5 أحرف'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🔍 [DEBUG] AddLabDialog.handleSubmit() called')
    e.preventDefault()

    console.log('📝 [DEBUG] Form data before validation:', formData)

    if (!validateForm()) {
      console.log('❌ [DEBUG] Form validation failed')
      return
    }
    console.log('✅ [DEBUG] Form validation passed')

    try {
      const labData = {
        name: formData.name.trim(),
        contact_info: formData.contact_info.trim() || undefined,
        address: formData.address.trim() || undefined
      }
      console.log('📤 [DEBUG] Prepared lab data for submission:', labData)

      if (editingLab) {
        console.log('🔄 [DEBUG] Updating existing lab with ID:', editingLab.id)
        await updateLab(editingLab.id, labData)
        notify.success('تم تحديث المختبر بنجاح')
      } else {
        console.log('➕ [DEBUG] Creating new lab')
        await createLab(labData)
        console.log('✅ [DEBUG] Lab created successfully')
        notify.success('تم إضافة المختبر بنجاح')
      }

      console.log('🚪 [DEBUG] Closing dialog')
      onOpenChange(false)
    } catch (error) {
      console.error('❌ [DEBUG] Error in AddLabDialog.handleSubmit:', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      notify.error(editingLab ? 'فشل في تحديث المختبر' : 'فشل في إضافة المختبر')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader className="text-right" dir="rtl">
          <DialogTitle className="flex items-center gap-2 justify-end text-right">
            <span>{editingLab ? 'تعديل المخبر' : 'إضافة مخبر جديد'}</span>
            <Building2 className="h-5 w-5 text-blue-600" />
          </DialogTitle>
          <DialogDescription className="text-right">
            {editingLab
              ? 'قم بتعديل معلومات المخبر أدناه'
              : 'أدخل معلومات المخبر الجديد أدناه'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
          {/* Lab Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>اسم المخبر *</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="أدخل اسم المخبر"
              className={`text-right ${errors.name ? 'border-destructive' : ''}`}
              disabled={isLoading}
              dir="rtl"
            />
            {errors.name && (
              <p className="text-sm text-destructive text-right">{errors.name}</p>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <Label htmlFor="contact_info" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
              <Phone className="h-4 w-4 text-green-600" />
              <span>معلومات الاتصال</span>
            </Label>
            <Input
              id="contact_info"
              value={formData.contact_info}
              onChange={(e) => handleInputChange('contact_info', e.target.value)}
              placeholder="رقم الهاتف أو البريد الإلكتروني"
              className={`text-right ${errors.contact_info ? 'border-destructive' : ''}`}
              disabled={isLoading}
              dir="rtl"
            />
            {errors.contact_info && (
              <p className="text-sm text-destructive text-right">{errors.contact_info}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2 justify-start text-right font-medium" dir="rtl">
              <MapPin className="h-4 w-4 text-orange-600" />
              <span>العنوان</span>
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="عنوان المختبر"
              className={`text-right ${errors.address ? 'border-destructive' : ''}`}
              disabled={isLoading}
              rows={3}
              dir="rtl"
            />
            {errors.address && (
              <p className="text-sm text-destructive text-right">{errors.address}</p>
            )}
          </div>

          <DialogFooter className="flex flex-row-reverse gap-2 pt-4" dir="rtl">
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {editingLab ? 'جاري التحديث...' : 'جاري الإضافة...'}
                </>
              ) : (
                editingLab ? 'تحديث' : 'إضافة'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
