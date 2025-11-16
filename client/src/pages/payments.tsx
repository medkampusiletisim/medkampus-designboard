import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, DollarSign, Calendar, Check, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CoachPaymentSummary, SystemSettings, PaymentRecord } from "@shared/schema";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function Payments() {
  const [expandedCoaches, setExpandedCoaches] = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: paymentSummaries, isLoading } = useQuery<CoachPaymentSummary[]>({
    queryKey: ["/api/payments/current-month"],
  });

  const { data: paymentHistory, isLoading: isLoadingHistory } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/payments/history"],
  });

  const savePaymentsMutation = useMutation({
    mutationFn: async () => {
      const currentDate = new Date();
      const paymentDay = settings?.globalPaymentDay || 28;
      let paymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), paymentDay);
      
      if (paymentDate < currentDate) {
        paymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, paymentDay);
      }

      return await apiRequest("POST", "/api/payments/save", {
        paymentDate: format(paymentDate, "yyyy-MM-dd"),
        summaries: paymentSummaries,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/history"] });
      toast({
        title: "Başarılı",
        description: "Ödeme kayıtları oluşturuldu",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return await apiRequest("PUT", `/api/payments/${id}/mark-paid`, {
        paidBy: "Admin",
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/history"] });
      toast({
        title: "Başarılı",
        description: "Ödeme tamamlandı olarak işaretlendi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleCoach = (coachId: string) => {
    const newExpanded = new Set(expandedCoaches);
    if (newExpanded.has(coachId)) {
      newExpanded.delete(coachId);
    } else {
      newExpanded.add(coachId);
    }
    setExpandedCoaches(newExpanded);
  };

  const toggleHistory = (recordId: string) => {
    const newExpanded = new Set(expandedHistory);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedHistory(newExpanded);
  };

  const totalPayment = paymentSummaries?.reduce(
    (sum, coach) => sum + parseFloat(coach.totalAmount),
    0
  ) || 0;

  const currentDate = new Date();
  const paymentDay = settings?.globalPaymentDay || 28;
  let nextPaymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), paymentDay);
  
  if (nextPaymentDate < currentDate) {
    nextPaymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, paymentDay);
  }

  // Group history by payment date
  const groupedHistory = paymentHistory?.reduce((acc, record) => {
    const date = record.paymentDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {} as Record<string, PaymentRecord[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Ödemeler</h1>
        <p className="text-sm text-muted-foreground">
          Koç hakedişlerini görüntüle ve ödeme döngülerini takip et
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-total-payment">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bu Ay Toplam Ödeme
            </CardTitle>
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-3xl font-semibold text-foreground">
                {totalPayment.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₺
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-coach-count">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ödeme Alacak Koç Sayısı
            </CardTitle>
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-semibold text-foreground">
                {paymentSummaries?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-next-payment">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sonraki Ödeme Günü
            </CardTitle>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {format(nextPaymentDate, "d MMM", { locale: tr })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Her ayın {paymentDay}. günü
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList>
          <TabsTrigger value="current" data-testid="tab-current-payments">
            Güncel Ay Ödemeleri
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-payment-history">
            Ödeme Geçmişi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Koç Ödemeleri</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Güncel ödeme döngüsü için kıstelyevm hesaplaması
                </p>
              </div>
              {paymentSummaries && paymentSummaries.length > 0 && (
                <Button
                  onClick={() => savePaymentsMutation.mutate()}
                  disabled={savePaymentsMutation.isPending}
                  data-testid="button-save-payments"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savePaymentsMutation.isPending ? "Kaydediliyor..." : "Ödeme Kayıtlarını Oluştur"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !paymentSummaries || paymentSummaries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Bu ay için ödeme bulunamadı
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Koç Adı</TableHead>
                      <TableHead className="text-center">Aktif Öğrenci</TableHead>
                      <TableHead className="text-right">Toplam Hakediş (₺)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentSummaries.map((coach) => (
                      <>
                        <TableRow
                          key={coach.coachId}
                          className="hover-elevate cursor-pointer"
                          onClick={() => toggleCoach(coach.coachId)}
                          data-testid={`row-coach-${coach.coachId}`}
                        >
                          <TableCell>
                            {expandedCoaches.has(coach.coachId) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{coach.coachName}</TableCell>
                          <TableCell className="text-center">
                            {coach.activeStudentCount}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {parseFloat(coach.totalAmount).toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            ₺
                          </TableCell>
                        </TableRow>
                        {expandedCoaches.has(coach.coachId) && (
                          <TableRow>
                            <TableCell colSpan={4} className="bg-muted/30 p-6">
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm text-muted-foreground mb-3">
                                  Öğrenci Bazında Döküm
                                </h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Öğrenci Adı</TableHead>
                                      <TableHead className="text-center">
                                        Çalışılan Gün
                                      </TableHead>
                                      <TableHead className="text-right">Tutar (₺)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {coach.breakdown.map((item, idx) => (
                                      <TableRow key={`${item.studentId}-${idx}`}>
                                        <TableCell>{item.studentName}</TableCell>
                                        <TableCell className="text-center">
                                          {item.daysWorked}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {parseFloat(item.amount).toLocaleString("tr-TR", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}{" "}
                                          ₺
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {isLoadingHistory ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : !paymentHistory || paymentHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  Henüz ödeme kaydı bulunmuyor
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedHistory || {}).map(([date, records]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {format(new Date(date), "dd.MM.yyyy", { locale: tr })} Ödemeleri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Koç</TableHead>
                        <TableHead className="text-center">Öğrenci</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead className="text-center">Durum</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => {
                        const breakdown = record.breakdown as any[];
                        return (
                          <>
                            <TableRow
                              key={record.id}
                              className="hover-elevate cursor-pointer"
                              onClick={() => toggleHistory(record.id)}
                              data-testid={`row-history-${record.id}`}
                            >
                              <TableCell>
                                {expandedHistory.has(record.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {breakdown[0]?.studentName.split(" ").slice(-2).join(" ") || "Koç"}
                              </TableCell>
                              <TableCell className="text-center">
                                {record.studentCount}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {parseFloat(record.totalAmount).toLocaleString("tr-TR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                ₺
                              </TableCell>
                              <TableCell className="text-center">
                                {record.status === "paid" ? (
                                  <Badge variant="default" className="gap-1">
                                    <Check className="w-3 h-3" />
                                    Ödendi
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <Clock className="w-3 h-3" />
                                    Beklemede
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {record.status === "pending" && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markPaidMutation.mutate({ id: record.id });
                                    }}
                                    disabled={markPaidMutation.isPending}
                                    data-testid={`button-mark-paid-${record.id}`}
                                  >
                                    Ödendi İşaretle
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                            {expandedHistory.has(record.id) && (
                              <TableRow>
                                <TableCell colSpan={6} className="bg-muted/30 p-6">
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm text-muted-foreground mb-3">
                                      Öğrenci Bazında Döküm
                                    </h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Öğrenci Adı</TableHead>
                                          <TableHead className="text-center">
                                            Çalışılan Gün
                                          </TableHead>
                                          <TableHead className="text-right">Tutar (₺)</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {breakdown.map((item: any, idx: number) => (
                                          <TableRow key={`${item.studentId}-${idx}`}>
                                            <TableCell>{item.studentName}</TableCell>
                                            <TableCell className="text-center">
                                              {item.daysWorked}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {parseFloat(item.amount).toLocaleString("tr-TR", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })}{" "}
                                              ₺
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                    {record.paidAt && (
                                      <div className="mt-4 text-xs text-muted-foreground">
                                        <span className="font-medium">Ödeme Tarihi:</span>{" "}
                                        {format(new Date(record.paidAt), "dd.MM.yyyy HH:mm", {
                                          locale: tr,
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
