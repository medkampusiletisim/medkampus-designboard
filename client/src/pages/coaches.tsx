import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CoachDialog } from "@/components/coach-dialog";
import type { CoachWithStudents } from "@shared/schema";

export default function Coaches() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<
    CoachWithStudents | undefined
  >();

  const { data: coaches, isLoading } = useQuery<CoachWithStudents[]>({
    queryKey: ["/api/coaches"],
  });

  const filteredCoaches = coaches?.filter((coach) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      coach.firstName.toLowerCase().includes(searchLower) ||
      coach.lastName.toLowerCase().includes(searchLower) ||
      coach.email.toLowerCase().includes(searchLower) ||
      coach.university?.toLowerCase().includes(searchLower) ||
      coach.field?.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (coach: CoachWithStudents) => {
    setSelectedCoach(coach);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCoach(undefined);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedCoach(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Koçlar</h1>
          <p className="text-sm text-muted-foreground">
            Tüm koçları yönet ve aktif öğrenci sayılarını görüntüle
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-coach">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Koç
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Koç ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-coaches"
          />
        </div>
      </div>

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-medium">Koç Adı</TableHead>
              <TableHead className="font-medium">E-posta</TableHead>
              <TableHead className="font-medium">Telefon</TableHead>
              <TableHead className="font-medium">Üniversite</TableHead>
              <TableHead className="font-medium">Alan</TableHead>
              <TableHead className="font-medium">Aktif Öğrenci</TableHead>
              <TableHead className="text-right font-medium">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredCoaches?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">Koç bulunamadı</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCoaches?.map((coach, index) => {
                const activeStudents = coach.students?.filter(
                  (s) => s.isActive === 1
                ).length || 0;
                return (
                  <TableRow
                    key={coach.id}
                    className={index % 2 === 1 ? "bg-muted/20" : ""}
                    data-testid={`coach-row-${coach.id}`}
                  >
                    <TableCell className="font-medium">
                      {coach.firstName} {coach.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {coach.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {coach.phone || "-"}
                    </TableCell>
                    <TableCell>{coach.university || "-"}</TableCell>
                    <TableCell>{coach.field || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{activeStudents}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(coach)}
                        data-testid={`button-edit-coach-${coach.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CoachDialog open={dialogOpen} onClose={handleClose} coach={selectedCoach} />
    </div>
  );
}
