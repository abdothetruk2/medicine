import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Upload, History, CheckCircle2, FileImage } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.prescription.upload.useMutation({
    onSuccess: (data) => {
      toast.success("Prescription uploaded! Analyzing...");
      navigate(`/analysis/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleFileUpload = async (file: File) => {
    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload file to server
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          // Call tRPC procedure to create prescription record and start analysis
          uploadMutation.mutate({
            imageUrl: response.imageUrl,
            imageKey: response.imageKey,
            fileName: response.fileName,
          });
        } else {
          toast.error("Upload failed");
          setIsUploading(false);
          setUploadProgress(0);
        }
      });

      xhr.addEventListener("error", () => {
        toast.error("Upload failed");
        setIsUploading(false);
        setUploadProgress(0);
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    } catch (error) {
      toast.error("Upload failed");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <FileImage className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Rx Analyzer</h1>
              <p className="text-sm text-slate-400">Medical Prescription Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/history")}
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => window.location.href = getLoginUrl()}
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Sign Out
                </Button>
              </>
            )}
            {!isAuthenticated && !loading && (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
              >
                Sign In
              </Button>
            )}
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
        {!isAuthenticated && !loading ? (
          // Unauthenticated state
          <div className="text-center py-20">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-white mb-4">
                Analyze Your Prescriptions
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Upload a prescription image to extract medication information in English and Arabic
              </p>
            </div>

            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              size="lg"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-lg px-8 py-6"
            >
              Sign In to Get Started
            </Button>

            {/* Feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <Card className="bg-slate-900/50 border-slate-800 p-6 hover:border-teal-500/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-slate-950" />
                </div>
                <h3 className="text-white font-semibold mb-2">Easy Upload</h3>
                <p className="text-slate-400 text-sm">
                  Drag and drop or select your prescription image
                </p>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 p-6 hover:border-teal-500/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-slate-950" />
                </div>
                <h3 className="text-white font-semibold mb-2">AI Analysis</h3>
                <p className="text-slate-400 text-sm">
                  Advanced vision AI extracts medication details
                </p>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 p-6 hover:border-teal-500/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <FileImage className="w-6 h-6 text-slate-950" />
                </div>
                <h3 className="text-white font-semibold mb-2">Bilingual</h3>
                <p className="text-slate-400 text-sm">
                  Results in English and Arabic with confidence scores
                </p>
              </Card>
            </div>
          </div>
        ) : isAuthenticated ? (
          // Authenticated state - Upload interface
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Upload Prescription</h2>
            <p className="text-slate-400 mb-8">
              Upload a clear image of your prescription to analyze
            </p>

            {/* Upload area */}
            <Card
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-teal-400 bg-teal-950/20"
                  : "border-slate-700 hover:border-slate-600 bg-slate-900/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {!isUploading ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-slate-950" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Drag and drop your prescription
                  </h3>
                  <p className="text-slate-400 mb-4">
                    or click to select an image (PNG, JPG, WebP, GIF - Max 10MB)
                  </p>
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto animate-pulse">
                    <Upload className="w-8 h-8 text-slate-950" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    Uploading and analyzing...
                  </h3>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-slate-400 text-sm">{Math.round(uploadProgress)}%</p>
                </div>
              )}
            </Card>
          </div>
        ) : (
          // Loading state
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Upload className="w-6 h-6 text-slate-950" />
              </div>
              <p className="text-slate-400">Loading...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
