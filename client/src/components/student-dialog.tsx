import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StudentWithCoach, Coach } from "@shared/schema";
import { format, addMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Archive } from "lucide-react";
import { tr } from "date-fns/locale";

const studentFormSchema = z.object({
  firstName: z.string().min(1, "Ad gereklidir"),
  lastName: z.string().min(1, "Soyad gereklidir"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().optional(),
  coachId: z.string().min(1, "Koç seçiniz"),
  packageMonths: z.number().min(1).max(6),
  packageStartDate: z.string().min(1, "Başlangıç tarihi seçiniz"),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentDialogProps {
  open: boolean;
  onClose: () => void;
  student?: StudentWithCoach;
}

export function StudentDialog({ open, onClose, student }: StudentDialogProps) {
  const { toast } = useToast();
  const isEdit = !!student;

  const { data: coaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
    enabled: open,
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      coachId: "",
      packageMonths: 3,
      packageStartDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone || "",
        coachId: student.coachId,
        packageMonths: student.packageMonths,
        packageStartDate: student.packageStartDate,
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        coachId: "",
        packageMonths: 3,
        packageStartDate: format(new Date(), "yyyy-MM-dd"),
      });
    }
  }, [student, form]);

  const mutation = useMutation({
    mutationFn: async (data: StudentFormValues) => {
      if (isEdit) {
        return await apiRequest("PUT", `/api/students/${student.id}`, data);
      } else {
        return await apiRequest("POST", "/api/students", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/renewal-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/current-month"] });
      toast({
        title: "Başarılı",
        description: isEdit ? "Öğrenci güncellendi" : "Öğrenci eklendi",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/students/${student?.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/renewal-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/current-month"] });
      toast({
        title: "Başarılı",
        description: "Öğrenci arşivlendi",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StudentFormValues) => {
    mutation.mutate(data);
  };

  const handleArchive = () => {
    if (confirm("Bu öğrenciyi arşivlemek istediğinizden emin misiniz?")) {
      archiveMutation.mutate();
    }
  };

  const selectedDate = form.watch("packageStartDate");
  const packageMonths = form.watch("packageMonths");
  const calculatedEndDate = selectedDate
    ? format(
        addMonths(new Date(selectedDate), packageMonths),
        "dd MMMM yyyy",
        { locale: tr }
      )
    : "-";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Öğrenci Düzenle" : "Yeni Öğrenci Ekle"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Öğrenci bilgilerini güncelleyin"
              : "Yeni bir öğrenci ekleyin ve koç ataması yapın"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ahmet"
                        data-testid="input-student-firstname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Soyad</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Yılmaz"
                        data-testid="input-student-lastname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="ahmet@example.com"
                        data-testid="input-student-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="0532 123 4567"
                        data-testid="input-student-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="coachId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atanan Koç</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-coach">
                        <SelectValue placeholder="Koç seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {coaches?.filter((c) => c.isActive === 1).map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.firstName} {coach.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="packageMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paket Süresi</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-package-months">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((months) => (
                          <SelectItem key={months} value={months.toString()}>
                            {months} Ay
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="packageStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç Tarihi</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="button-select-start-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(new Date(field.value), "dd.MM.yyyy", {
                                  locale: tr,
                                })
                              : "Tarih seçin"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) =>
                            field.onChange(
                              date ? format(date, "yyyy-MM-dd") : ""
                            )
                          }
                          locale={tr}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Paket Bitiş Tarihi (Otomatik):
                </span>
                <span className="text-sm font-semibold" data-testid="text-end-date">
                  {calculatedEndDate}
                </span>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <div>
                {isEdit && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleArchive}
                    disabled={archiveMutation.isPending}
                    data-testid="button-archive-student"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {archiveMutation.isPending ? "Arşivleniyor..." : "Arşivle"}
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={mutation.isPending}
                  data-testid="button-cancel"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  data-testid="button-save-student"
                >
                  {mutation.isPending
                    ? "Kaydediliyor..."
                    : isEdit
                    ? "Güncelle"
                    : "Ekle"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
