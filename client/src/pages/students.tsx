import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Archive, Search, ArrowRightLeft } from "lucide-react";
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
import { StudentDialog } from "@/components/student-dialog";
import { TransferCoachDialog } from "@/components/transfer-coach-dialog";
import type { StudentWithCoach } from "@shared/schema";
import { format, differenceInDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

type PackageStatus = "active" | "expiring" | "expired";

function getPackageStatus(endDate: string): PackageStatus {
  const daysRemaining = differenceInDays(parseISO(endDate), new Date());
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 7) return "expiring";
  return "active";
}

function StatusBadge({ status }: { status: PackageStatus }) {
  if (status === "active") {
    return (
      <Badge className="bg-status-online/10 text-status-online border-status-online/20">
        Aktif
      </Badge>
    );
  }
  if (status === "expiring") {
    return (
      <Badge className="bg-status-away/10 text-status-away border-status-away/20">
        Bitiyor
      </Badge>
    );
  }
  return (
    <Badge className="bg-status-busy/10 text-status-busy border-status-busy/20">
      Süresi Doldu
    </Badge>
  );
}

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<
    StudentWithCoach | undefined
  >();

  const { data: students, isLoading } = useQuery<StudentWithCoach[]>({
    queryKey: ["/api/students"],
  });

  const filteredStudents = students?.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      student.coach.firstName.toLowerCase().includes(searchLower) ||
      student.coach.lastName.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (student: StudentWithCoach) => {
    setSelectedStudent(student);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedStudent(undefined);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedStudent(undefined);
  };

  const handleTransferCoach = (student: StudentWithCoach) => {
    setSelectedStudent(student);
    setTransferDialogOpen(true);
  };

  const handleTransferClose = () => {
    setTransferDialogOpen(false);
    setSelectedStudent(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Öğrenciler
          </h1>
          <p className="text-sm text-muted-foreground">
            Tüm öğrencileri yönet ve paket durumlarını takip et
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-student">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Öğrenci
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Öğrenci veya koç ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-students"
          />
        </div>
      </div>

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-medium">Öğrenci Adı</TableHead>
              <TableHead className="font-medium">E-posta</TableHead>
              <TableHead className="font-medium">Koç</TableHead>
              <TableHead className="font-medium">Paket Süresi</TableHead>
              <TableHead className="font-medium">Başlangıç</TableHead>
              <TableHead className="font-medium">Bitiş</TableHead>
              <TableHead className="font-medium">Durum</TableHead>
              <TableHead className="text-right font-medium">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredStudents?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground">Öğrenci bulunamadı</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents?.map((student, index) => {
                const status = getPackageStatus(student.packageEndDate);
                return (
                  <TableRow
                    key={student.id}
                    className={index % 2 === 1 ? "bg-muted/20" : ""}
                    data-testid={`student-row-${student.id}`}
                  >
                    <TableCell className="font-medium">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.email}
                    </TableCell>
                    <TableCell>
                      {student.coach.firstName} {student.coach.lastName}
                    </TableCell>
                    <TableCell>{student.packageMonths} ay</TableCell>
                    <TableCell>
                      {format(parseISO(student.packageStartDate), "dd.MM.yyyy", {
                        locale: tr,
                      })}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(student.packageEndDate), "dd.MM.yyyy", {
                        locale: tr,
                      })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTransferCoach(student)}
                          data-testid={`button-transfer-coach-${student.id}`}
                          title="Koç Değiştir"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(student)}
                          data-testid={`button-edit-student-${student.id}`}
                          title="Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <StudentDialog
        open={dialogOpen}
        onClose={handleClose}
        student={selectedStudent}
      />

      <TransferCoachDialog
        open={transferDialogOpen}
        onClose={handleTransferClose}
        student={selectedStudent}
      />
    </div>
  );
}
