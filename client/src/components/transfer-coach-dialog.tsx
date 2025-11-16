import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StudentWithCoach, Coach } from "@shared/schema";
import { format } from "date-fns";

const transferSchema = z.object({
  newCoachId: z.string().min(1, "Yeni koç seçilmelidir"),
  transferDate: z.string().min(1, "Transfer tarihi girilmelidir"),
  notes: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferCoachDialogProps {
  open: boolean;
  onClose: () => void;
  student?: StudentWithCoach;
}

export function TransferCoachDialog({
  open,
  onClose,
  student,
}: TransferCoachDialogProps) {
  const { toast } = useToast();

  const { data: coaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
    enabled: open,
  });

  const availableCoaches = coaches?.filter(
    (c) => c.isActive === 1 && c.id !== student?.coachId
  );

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      newCoachId: "",
      transferDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        newCoachId: "",
        transferDate: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
    }
  }, [open, form]);

  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      if (!student) return;
      return await apiRequest(
        "POST",
        `/api/students/${student.id}/transfer-coach`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Öğrencinin koçu başarıyla değiştirildi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Koç değişikliği sırasında bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferFormData) => {
    transferMutation.mutate(data);
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Koç Değiştir</DialogTitle>
          <DialogDescription>
            {student.firstName} {student.lastName} isimli öğrencinin koçunu
            değiştirin
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-4 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground mb-1">Mevcut Koç</p>
          <p className="font-medium">
            {student.coach.firstName} {student.coach.lastName}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newCoachId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yeni Koç</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    data-testid="select-new-coach"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Koç seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCoaches?.map((coach) => (
                        <SelectItem
                          key={coach.id}
                          value={coach.id}
                          data-testid={`select-coach-option-${coach.id}`}
                        >
                          {coach.firstName} {coach.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Öğrencinin yeni koçunu seçin
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transferDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Tarihi</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-transfer-date"
                    />
                  </FormControl>
                  <FormDescription>
                    Koç değişikliğinin geçerli olacağı tarih
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Koç değişikliği ile ilgili notlar..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-transfer-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-transfer"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={transferMutation.isPending}
                data-testid="button-save-transfer"
              >
                {transferMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
