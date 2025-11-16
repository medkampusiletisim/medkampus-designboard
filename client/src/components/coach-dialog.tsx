import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CoachWithStudents } from "@shared/schema";
import { Archive } from "lucide-react";

const coachFormSchema = z.object({
  firstName: z.string().min(1, "Ad gereklidir"),
  lastName: z.string().min(1, "Soyad gereklidir"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().optional(),
  university: z.string().optional(),
  field: z.string().optional(),
});

type CoachFormValues = z.infer<typeof coachFormSchema>;

interface CoachDialogProps {
  open: boolean;
  onClose: () => void;
  coach?: CoachWithStudents;
}

export function CoachDialog({ open, onClose, coach }: CoachDialogProps) {
  const { toast } = useToast();
  const isEdit = !!coach;

  const form = useForm<CoachFormValues>({
    resolver: zodResolver(coachFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      university: "",
      field: "",
    },
  });

  useEffect(() => {
    if (coach) {
      form.reset({
        firstName: coach.firstName,
        lastName: coach.lastName,
        email: coach.email,
        phone: coach.phone || "",
        university: coach.university || "",
        field: coach.field || "",
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        university: "",
        field: "",
      });
    }
  }, [coach, form]);

  const mutation = useMutation({
    mutationFn: async (data: CoachFormValues) => {
      if (isEdit) {
        return await apiRequest("PUT", `/api/coaches/${coach.id}`, data);
      } else {
        return await apiRequest("POST", "/api/coaches", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Başarılı",
        description: isEdit ? "Koç güncellendi" : "Koç eklendi",
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
      return await apiRequest("DELETE", `/api/coaches/${coach?.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Başarılı",
        description: "Koç arşivlendi",
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

  const onSubmit = (data: CoachFormValues) => {
    mutation.mutate(data);
  };

  const handleArchive = () => {
    const activeStudents = coach?.students?.filter((s) => s.isActive === 1).length || 0;
    if (activeStudents > 0) {
      toast({
        title: "Uyarı",
        description: `Bu koçun ${activeStudents} aktif öğrencisi var. Önce öğrencileri başka bir koça atayın.`,
        variant: "destructive",
      });
      return;
    }
    if (confirm("Bu koçu arşivlemek istediğinizden emin misiniz?")) {
      archiveMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Koç Düzenle" : "Yeni Koç Ekle"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Koç bilgilerini güncelleyin"
              : "Yeni bir koç ekleyin"}
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
                        placeholder="Mehmet"
                        data-testid="input-coach-firstname"
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
                        placeholder="Demir"
                        data-testid="input-coach-lastname"
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
                        placeholder="mehmet@example.com"
                        data-testid="input-coach-email"
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
                        data-testid="input-coach-phone"
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
                name="university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Üniversite (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Hacettepe Üniversitesi"
                        data-testid="input-coach-university"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="field"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alan (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Tıp"
                        data-testid="input-coach-field"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <div>
                {isEdit && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleArchive}
                    disabled={archiveMutation.isPending}
                    data-testid="button-archive-coach"
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
                  data-testid="button-save-coach"
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
