import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, RefreshCw, Upload } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) {
    return <Badge className="bg-green-900/50 text-green-200 border-green-700">High</Badge>;
  } else if (confidence >= 0.6) {
    return <Badge className="bg-yellow-900/50 text-yellow-200 border-yellow-700">Medium</Badge>;
  } else {
    return <Badge className="bg-red-900/50 text-red-200 border-red-700">Low</Badge>;
  }
}

export default function Analysis() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [, params] = useRoute("/analysis/:id");
  const prescriptionId = params?.id ? parseInt(params.id) : null;

  const { data: prescription, isLoading, error } = trpc.prescription.getById.useQuery(
    { id: prescriptionId! },
    { enabled: !!prescriptionId }
  );

  if (authLoading || isLoading) {
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
        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64 bg-slate-800" />
            <Skeleton className="h-64 w-full bg-slate-800" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !prescription) {
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
        <main className="max-w-6xl mx-auto px-4 py-12">
          <Alert className="bg-red-950/30 border-red-700/50 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || "Prescription not found or you do not have access to it."}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Medical Disclaimer */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <Alert className="bg-amber-950/30 border-amber-700/50 text-amber-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Medical Disclaimer:</strong> This tool is for informational purposes only and should not be used as a substitute for professional medical advice. Always consult with a qualified healthcare provider before taking any medication.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Status Badge */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-white">Prescription Analysis</h1>
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
            Uploaded on {new Date(prescription.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Pending State */}
        {prescription.analysisStatus === "pending" && (
          <Card className="bg-slate-900/50 border-slate-800 p-8 text-center">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Upload className="w-8 h-8 text-slate-950" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Analyzing your prescription...</h2>
            <p className="text-slate-400 mb-6">
              This may take a few moments. Please keep this page open.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </Card>
        )}

        {/* Failed State */}
        {prescription.analysisStatus === "failed" && (
          <Alert className="bg-red-950/30 border-red-700/50 text-red-100 mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Analysis Failed:</strong> {prescription.analysisError || "An error occurred during analysis. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* Completed State - Prescription Image */}
        {prescription.analysisStatus === "completed" && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Prescription Image</h2>
            <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
              <img
                src={prescription.imageUrl}
                alt="Prescription"
                className="w-full h-auto max-h-96 object-cover"
              />
            </Card>
          </div>
        )}

        {/* Medications List */}
        {prescription.analysisStatus === "completed" && prescription.medications && prescription.medications.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Medications ({prescription.medications.length})
            </h2>
            <div className="space-y-6">
              {prescription.medications.map((med, idx) => (
                <Card key={idx} className="bg-slate-900/50 border-slate-800 p-6">
                  {/* Medication Header */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{med.name}</h3>
                        <p className="text-slate-400 text-sm" dir="rtl">{med.nameArabic}</p>
                      </div>
                      {getConfidenceBadge(med.confidence.name)}
                    </div>
                  </div>

                  {/* Bilingual Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* English Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-400 text-sm font-medium">Dosage</label>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-white">{med.dosage}</p>
                          {getConfidenceBadge(med.confidence.dosage)}
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm font-medium">Frequency</label>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-white">{med.frequency}</p>
                          {getConfidenceBadge(med.confidence.frequency)}
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm font-medium">Duration</label>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-white">{med.duration}</p>
                          {getConfidenceBadge(med.confidence.duration)}
                        </div>
                      </div>
                      {med.notes && (
                        <div>
                          <label className="text-slate-400 text-sm font-medium">Notes</label>
                          <p className="text-white text-sm mt-1">{med.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Arabic Section */}
                    <div className="space-y-4" dir="rtl">
                      <div>
                        <label className="text-slate-400 text-sm font-medium">الجرعة</label>
                        <p className="text-white mt-1">{med.dosageArabic}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm font-medium">التكرار</label>
                        <p className="text-white mt-1">{med.frequencyArabic}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm font-medium">المدة</label>
                        <p className="text-white mt-1">{med.durationArabic}</p>
                      </div>
                      {med.notesArabic && (
                        <div>
                          <label className="text-slate-400 text-sm font-medium">ملاحظات</label>
                          <p className="text-white text-sm mt-1">{med.notesArabic}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty Medications State */}
        {prescription.analysisStatus === "completed" && (!prescription.medications || prescription.medications.length === 0) && (
          <Card className="bg-slate-900/50 border-slate-800 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No medications found</h2>
            <p className="text-slate-400">
              The prescription image could not be analyzed. Please try uploading a clearer image.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
