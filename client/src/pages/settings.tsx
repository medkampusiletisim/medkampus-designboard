import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SystemSettings } from "@shared/schema";

const settingsSchema = z.object({
  coachMonthlyFee: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Geçerli bir tutar giriniz",
  }),
  globalPaymentDay: z.number().min(1).max(31),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      coachMonthlyFee: "1100.00",
      globalPaymentDay: 28,
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings && !form.formState.isDirty) {
      form.reset({
        coachMonthlyFee: settings.coachMonthlyFee,
        globalPaymentDay: settings.globalPaymentDay,
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      return await apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/current-month"] });
      toast({
        title: "Başarılı",
        description: "Ayarlar güncellendi",
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

  const onSubmit = (data: SettingsForm) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">
          Sistem ayarlarını düzenle
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Sistem Ayarları</CardTitle>
          <CardDescription>
            Bu ayarlar tüm koç ödemelerini ve hesaplamaları etkiler
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="coachMonthlyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Koç Aylık Sabit Hakediş Ücreti</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            className="max-w-xs"
                            data-testid="input-coach-monthly-fee"
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground font-medium">
                          ₺
                        </span>
                      </div>
                      <FormDescription>
                        Bir koçun her aktif öğrenci için aylık hak ettiği brüt ücret
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="globalPaymentDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Global Koç Ödeme Günü</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max="31"
                            className="max-w-xs"
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                            data-testid="input-payment-day"
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground font-medium">
                          (Her Ayın)
                        </span>
                      </div>
                      <FormDescription>
                        MedKampüs'ün tüm koçlara toplu ödeme yapacağı sabit gün
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => form.reset()}
                    disabled={!form.formState.isDirty || mutation.isPending}
                    data-testid="button-reset"
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    disabled={!form.formState.isDirty || mutation.isPending}
                    data-testid="button-save-settings"
                  >
                    {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
