import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLabOrderStore } from "@/store/labOrderStore";
import { useLabStore } from "@/store/labStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { notify } from "@/services/notificationService";
import {
  CreditCard,
  DollarSign,
  Calculator,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Clock,
  XCircle,
} from "lucide-react";
import type { LabOrder, LabMonthlyBalance } from "@/types";

interface LabPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHS = [
  { value: 1, label: "كانون الثاني" },
  { value: 2, label: "شباط" },
  { value: 3, label: "آذار" },
  { value: 4, label: "نيسان" },
  { value: 5, label: "أيار" },
  { value: 6, label: "حزيران" },
  { value: 7, label: "تموز" },
  { value: 8, label: "آب" },
  { value: 9, label: "أيلول" },
  { value: 10, label: "تشرين الأول" },
  { value: 11, label: "تشرين الثاني" },
  { value: 12, label: "كانون الأول" },
];

export default function LabPaymentDialog({
  open,
  onOpenChange,
}: LabPaymentDialogProps) {
  const { labOrders, applyGeneralPayment, isLoading } = useLabOrderStore();
  const { labs, loadLabs } = useLabStore();

  const [selectedLabId, setSelectedLabId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [monthlyBalances, setMonthlyBalances] = useState<LabMonthlyBalance[]>(
    [],
  );
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Get current date info
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Load labs when dialog opens
  useEffect(() => {
    if (open) {
      loadLabs();
      loadMonthlyBalances();
    }
  }, [open, loadLabs]);

  // Load monthly balances when lab or month changes
  useEffect(() => {
    if (selectedLabId && open) {
      loadMonthlyBalances();
    }
  }, [selectedLabId, selectedYear, selectedMonth, open]);

  const loadMonthlyBalances = async () => {
    if (!selectedLabId) return;

    setIsLoadingBalances(true);
    try {
      const balances =
        (await window.electronAPI?.labMonthlyBalances?.getByLab(
          selectedLabId,
        )) || [];
      setMonthlyBalances(balances);
    } catch (error) {
      console.error("Error loading monthly balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Get orders for selected lab and month
  const selectedLabOrders = useMemo(() => {
    if (!selectedLabId) return [];

    return labOrders.filter((order) => {
      if (order.lab_id !== selectedLabId) return false;

      const orderDate = new Date(order.order_date);
      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth() + 1;

      return orderYear === selectedYear && orderMonth === selectedMonth;
    });
  }, [labOrders, selectedLabId, selectedYear, selectedMonth]);

  // Get selected lab info
  const selectedLab = labs.find((lab) => lab.id === selectedLabId);

  // Calculate monthly totals
  const monthTotalCost = selectedLabOrders.reduce(
    (sum, order) => sum + order.cost,
    0,
  );
  const monthTotalPaid = selectedLabOrders.reduce(
    (sum, order) => sum + (order.paid_amount || 0),
    0,
  );
  const monthRemaining = monthTotalCost - monthTotalPaid;

  // Get monthly balance record for selected month
  const currentMonthBalance = monthlyBalances.find(
    (b) => b.year === selectedYear && b.month === selectedMonth,
  );

  // Get all orders for the lab (for historical data)
  const labAllOrders = selectedLabId
    ? labOrders.filter((order) => order.lab_id === selectedLabId)
    : [];

  // Calculate totals for selected lab (all time)
  const labTotalCost = labAllOrders.reduce((sum, order) => sum + order.cost, 0);
  const labTotalPaid = labAllOrders.reduce(
    (sum, order) => sum + (order.paid_amount || 0),
    0,
  );
  const labTotalRemaining = labTotalCost - labTotalPaid;

  // Get orders with remaining balance for selected month
  const ordersWithRemaining = selectedLabOrders
    .map((order) => {
      const remaining =
        order.remaining_balance || order.cost - (order.paid_amount || 0);
      return { ...order, calculatedRemaining: Math.max(0, remaining) };
    })
    .filter((order) => order.calculatedRemaining > 0)
    .sort((a, b) => a.calculatedRemaining - b.calculatedRemaining);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedLabId("");
      setSelectedYear(new Date().getFullYear());
      setSelectedMonth(new Date().getMonth() + 1);
      setPaymentAmount("");
      setErrors({});
      setMonthlyBalances([]);
    }
  }, [open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedLabId) {
      newErrors.labId = "يجب اختيار المخبر أولاً";
    }

    if (!paymentAmount.trim()) {
      newErrors.paymentAmount = "المبلغ المدفوع مطلوب";
    } else {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.paymentAmount = "المبلغ يجب أن يكون رقم موجب";
      } else if (amount > monthRemaining) {
        newErrors.paymentAmount = `المبلغ لا يمكن أن يتجاوز الرصيد الشهري المستحق (${formatCurrency(monthRemaining)})`;
      }
    }

    if (selectedLabId && ordersWithRemaining.length === 0) {
      newErrors.paymentAmount = "لا توجد طلبات لهذا الشهر لها رصيد متبقي";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const amount = parseFloat(paymentAmount);
      if (!selectedLabId) {
        notify.error("يجب اختيار المخبر أولاً");
        return;
      }

      // Apply the general payment to orders
      await applyGeneralPayment(
        selectedLabId,
        amount,
        selectedYear,
        selectedMonth,
      );

      // Update the monthly balance
      await window.electronAPI?.labMonthlyBalances?.updateOrCreate(
        selectedLabId,
        selectedYear,
        selectedMonth,
        {
          total_paid: amount,
          remaining_balance: Math.max(0, monthRemaining - amount),
          status: monthRemaining - amount <= 0 ? "paid" : "partial",
        },
      );

      const statusText =
        monthRemaining - amount <= 0 ? "مسددة بالكامل" : "مسددة جزئياً";
      notify.success(
        `تم تسجيل دفعة بقيمة ${formatCurrency(amount)} لشهر ${getMonthName(selectedMonth)} ${selectedYear} (${statusText})`,
      );

      setSelectedLabId("");
      setPaymentAmount("");
      setErrors({});
      loadMonthlyBalances();
      onOpenChange(false);
    } catch (error) {
      console.error("Error applying general payment:", error);
      notify.error("فشل في تطبيق الدفعة العامة");
    }
  };

  const getMonthName = (month: number) => {
    return MONTHS.find((m) => m.value === month)?.label || "";
  };

  // Calculate distribution preview
  const calculateDistributionPreview = (
    amount: number,
  ): Array<{
    order: LabOrder & { calculatedRemaining: number };
    applied: number;
  }> => {
    const preview: Array<{
      order: LabOrder & { calculatedRemaining: number };
      applied: number;
    }> = [];
    let remainingAmount = amount;

    for (const order of ordersWithRemaining) {
      if (remainingAmount <= 0) break;

      const applied = Math.min(order.calculatedRemaining, remainingAmount);
      preview.push({ order, applied });
      remainingAmount -= applied;
    }

    return preview;
  };

  const previewAmount = parseFloat(paymentAmount) || 0;
  const distributionPreview =
    previewAmount > 0 && previewAmount <= monthRemaining && selectedLabId
      ? calculateDistributionPreview(previewAmount)
      : [];

  // Get month status badge
  const getStatusBadge = (balance: LabMonthlyBalance | undefined) => {
    if (!balance || balance.remaining_balance <= 0) {
      return (
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
          {/* <CheckCircle className="h-4 w-4" />
          مسدد */}
        </span>
      );
    }

    if (balance.total_paid > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 text-sm">
          <Clock className="h-4 w-4" />
          مسدد جزئياً
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
        <XCircle className="h-4 w-4" />
        غير مسدد
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader className="text-right" dir="rtl">
          <DialogTitle className="flex items-center gap-2 justify-end text-right">
            <span>دفعة شهرية للمخبر</span>
            <CreditCard className="h-5 w-5 text-blue-600" />
          </DialogTitle>
          <DialogDescription className="text-right">
            تسجيل دفعة لشهر محدد مع تتبع الرصيد الشهري
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
          {/* Lab Selection */}
          <div className="space-y-2">
            <Label
              htmlFor="lab_id"
              className="flex items-center gap-2 justify-start text-right font-medium"
              dir="rtl"
            >
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>اختر المخبر *</span>
            </Label>
            <Select
              value={selectedLabId}
              onValueChange={(value) => {
                setSelectedLabId(value);
                setPaymentAmount("");
                setErrors((prev) => ({
                  ...prev,
                  labId: "",
                  paymentAmount: "",
                }));
              }}
              disabled={isLoading}
              dir="rtl"
            >
              <SelectTrigger
                className={`text-right ${errors.labId ? "border-destructive" : ""}`}
              >
                <SelectValue
                  placeholder="اختر المخبر"
                  className="text-muted-foreground"
                />
              </SelectTrigger>
              <SelectContent>
                {labs.map((lab) => {
                  const labRemaining = labOrders
                    .filter((order) => order.lab_id === lab.id)
                    .reduce((sum, order) => {
                      const remaining =
                        order.remaining_balance ||
                        order.cost - (order.paid_amount || 0);
                      return sum + Math.max(0, remaining);
                    }, 0);
                  return (
                    <SelectItem key={lab.id} value={lab.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{lab.name}</span>
                        {labRemaining > 0 && (
                          <span className="text-xs text-orange-600 mr-2">
                            (متبقي: {formatCurrency(labRemaining)})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.labId && (
              <p className="text-sm text-destructive text-right">
                {errors.labId}
              </p>
            )}
          </div>

          {/* Month Selection */}
          <div className="space-y-2">
            <Label
              className="flex items-center gap-2 justify-start text-right font-medium"
              dir="rtl"
            >
              <Calendar className="h-4 w-4 text-purple-600" />
              <span>اختر الشهر المستحق *</span>
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
                dir="rtl"
              >
                <SelectTrigger className="flex-1 text-right">
                  <SelectValue placeholder="الشهر" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value.toString()}
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
                dir="rtl"
              >
                <SelectTrigger className="w-[120px] text-right">
                  <SelectValue placeholder="السنة" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lab Summary */}
          {/* {selectedLabId && selectedLab && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">
                  إجمالي المبلغ المطلوب للمخبر "{selectedLab.name}"
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">
                    {formatCurrency(labTotalCost)}
                  </span>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">
                  إجمالي المبلغ المدفوع
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(labTotalPaid)}
                  </span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Label className="text-sm font-medium text-muted-foreground">
                  الرصيد المتبقي الإجمالي
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-orange-600">
                    {formatCurrency(labTotalRemaining)}
                  </span>
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>
          )} */}

          {/* Monthly Balance Card */}
          {selectedLabId && (
            <div className=" ">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-800 dark:text-purple-200">
                  الرصيد الشهري - {getMonthName(selectedMonth)} {selectedYear}
                </h3>
                {getStatusBadge(currentMonthBalance)}
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="dark:bg-gray-900 rounded-lg p-3 border border-gray-300 dark:border-gray-700 shadow-sm">
                  <div className="text-xs mb-1 dark:text-green-600">
                    التكلفة
                  </div>
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(monthTotalCost)}
                  </div>
                </div>

                <div className="dark:bg-gray-900 rounded-lg p-3 border border-gray-300 dark:border-gray-700 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">
                    المدفوع
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(monthTotalPaid)}
                  </div>
                </div>

                <div className="dark:bg-gray-900 rounded-lg p-3 border border-gray-300 dark:border-gray-700 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">
                    المتبقي
                  </div>
                  <div className="text-lg font-bold text-orange-600">
                    {formatCurrency(monthRemaining)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders List for Selected Month */}
          {selectedLabId && selectedLabOrders.length > 0 && (
            <div className="space-y-2">
              <Label
                className="flex items-center gap-2 justify-start text-right font-medium"
                dir="rtl"
              >
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>
                  طلبات شهر {getMonthName(selectedMonth)} (
                  {selectedLabOrders.length})
                </span>
              </Label>
              <div className="bg-muted/30 rounded-lg border p-3 space-y-2 max-h-[180px] overflow-y-auto">
                {selectedLabOrders.map((order) => {
                  const remaining =
                    order.remaining_balance ||
                    order.cost - (order.paid_amount || 0);
                  const calculatedRemaining = Math.max(0, remaining);
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                    >
                      <div className="flex-1 text-right">
                        <div className="font-medium">
                          {order.service_name || "بدون اسم خدمة"}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <span>التكلفة: {formatCurrency(order.cost)}</span>
                          <span>|</span>
                          <span>
                            المدفوع: {formatCurrency(order.paid_amount || 0)}
                          </span>
                          <span>|</span>
                          <span
                            className={
                              calculatedRemaining > 0
                                ? "text-orange-600"
                                : "text-green-600"
                            }
                          >
                            متبقي: {formatCurrency(calculatedRemaining)}
                          </span>
                        </div>
                      </div>
                      {calculatedRemaining <= 0 && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedLabId &&
            selectedLabOrders.length === 0 &&
            !isLoadingBalances && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200 text-right">
                  لا توجد طلبات للمخبر "{selectedLab?.name}" في شهر{" "}
                  {getMonthName(selectedMonth)} {selectedYear}
                </div>
              </div>
            )}

          {/* Payment Amount Input */}
          {selectedLabId && (
            <div className="space-y-2">
              <Label
                htmlFor="paymentAmount"
                className="flex items-center gap-2 justify-start text-right font-medium"
                dir="rtl"
              >
                <Wallet className="h-4 w-4 text-green-600" />
                <span>مبلغ الدفعة للشهر المحدد *</span>
              </Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                max={monthRemaining}
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  if (errors.paymentAmount) {
                    setErrors((prev) => ({ ...prev, paymentAmount: "" }));
                  }
                }}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  if (value > monthRemaining) {
                    setPaymentAmount(monthRemaining.toString());
                  }
                }}
                placeholder="0.00"
                className={`text-right ${errors.paymentAmount ? "border-destructive" : ""}`}
                disabled={
                  isLoading ||
                  ordersWithRemaining.length === 0 ||
                  !selectedLabId
                }
                dir="rtl"
              />
              {errors.paymentAmount && (
                <p className="text-sm text-destructive text-right">
                  {errors.paymentAmount}
                </p>
              )}
              <div className="text-xs text-muted-foreground text-right">
                الحد الأقصى المسموح: {formatCurrency(monthRemaining)}
              </div>
            </div>
          )}

          {/* Distribution Preview */}
          {distributionPreview.length > 0 && (
            <div className="space-y-3">
              <Label
                className="flex items-center gap-2 justify-start text-right font-medium"
                dir="rtl"
              >
                <Calculator className="h-4 w-4 text-green-600" />
                <span>معاينة التوزيع:</span>
              </Label>
              <div className="bg-muted/30 rounded-lg border p-4 space-y-2 max-h-[150px] overflow-y-auto">
                {distributionPreview.map((item, index) => (
                  <div
                    key={item.order.id}
                    className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                  >
                    <div className="flex-1 text-right">
                      <div className="font-medium">
                        {item.order.service_name || "بدون اسم خدمة"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        متبقي: {formatCurrency(item.order.calculatedRemaining)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mr-4">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(item.applied)}
                      </span>
                      {item.applied >= item.order.calculatedRemaining && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Alert */}
          {selectedLabId && ordersWithRemaining.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800 dark:text-blue-200 text-right">
                <div className="font-medium mb-1">ملاحظة مهمة:</div>
                <div>
                  سيتم تسجيل الدفعة لشهر {getMonthName(selectedMonth)}{" "}
                  {selectedYear} وتوزيعها تلقائياً على طلبات هذا الشهر.
                </div>
                <div className="mt-1">• سيتم تحديث الرصيد الشهري تلقائياً</div>
                <div>
                  • إذا كانت الدفعة كافية لتسديد كامل الرصيد، سيتم تعلیم الشهر
                  كـ"مسدد"
                </div>
              </div>
            </div>
          )}

          {selectedLabId &&
            ordersWithRemaining.length === 0 &&
            selectedLabOrders.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="text-sm text-green-800 dark:text-green-200 text-right">
                  جميع طلبات شهر {getMonthName(selectedMonth)} {selectedYear}{" "}
                  للمخبر "{selectedLab?.name}" مدفوعة بالكامل.
                </div>
              </div>
            )}

          {!selectedLabId && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200 text-right">
                يرجى اختيار المخبر والشهر أولاً لعرض التفاصيل وإدخال الدفعة
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row-reverse gap-2 pt-4" dir="rtl">
            <Button
              type="submit"
              variant="success"
              disabled={
                isLoading || ordersWithRemaining.length === 0 || !selectedLabId
              }
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري التطبيق...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 ml-2" />
                  تسجيل الدفعة
                </>
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
  );
}
