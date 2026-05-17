import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trash2, Eye, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function History() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: prescriptions, isLoading, refetch } = trpc.prescription.history.useQuery(
    { limit: 50 }
  );

  const deleteMutation = trpc.prescription.delete.useMutation({
    onSuccess: () => {
      toast.success("Prescription deleted");
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">Prescription History</h1>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Upload
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48 bg-slate-800" />
                    <Skeleton className="h-4 w-32 bg-slate-800" />
                  </div>
                  <Skeleton className="h-10 w-20 bg-slate-800" />
                </div>
              </Card>
            ))}
          </div>
        ) : !prescriptions || prescriptions.length === 0 ? (
          // Empty state
          <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-4 opacity-50">
              <Eye className="w-8 h-8 text-slate-950" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No prescriptions yet</h2>
            <p className="text-slate-400 mb-6">
              You haven't uploaded any prescriptions yet. Start by uploading your first prescription.
            </p>
            <Button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Prescription
            </Button>
          </Card>
        ) : (
          // Prescriptions list
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <Card
                key={prescription.id}
                className="bg-slate-900/50 border-slate-800 p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold">{prescription.fileName}</h3>
                      {prescription.analysisStatus === "pending" && (
                        <Badge className="bg-blue-900/50 text-blue-200 border-blue-700 animate-pulse">
                          Analyzing...
                        </Badge>
                      )}
                      {prescription.analysisStatus === "completed" && (
                        <Badge className="bg-green-900/50 text-green-200 border-green-700">
                          Completed
                        </Badge>
                      )}
                      {prescription.analysisStatus === "failed" && (
                        <Badge className="bg-red-900/50 text-red-200 border-red-700">
                          Failed
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">
                      {new Date(prescription.createdAt).toLocaleString()}
                    </p>
                    {prescription.medications && prescription.medications.length > 0 && (
                      <p className="text-slate-400 text-sm mt-1">
                        {prescription.medications.length} medication{prescription.medications.length !== 1 ? "s" : ""} found
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {prescription.analysisStatus === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/analysis/${prescription.id}`)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-800"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(prescription.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Prescription</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this prescription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate({ id: deleteId });
                }
              }}
              className="bg-red-900 hover:bg-red-800 text-white"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
