import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CalendarIcon, UploadIcon, CheckCircleIcon, AlertTriangleIcon } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
  message: string;
  userIdUsed?: string;
}

export function FixedCalendarImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      console.log('📅 [FIXED CALENDAR IMPORT] Starting import:', file.name);

      const formData = new FormData();
      formData.append('icsFile', file);

      const response = await apiRequest('/api/calendar/import-fixed', {
        method: 'POST',
        body: formData,
      });

      console.log('📅 [FIXED CALENDAR IMPORT] Success:', response);
      setResult(response);

    } catch (err: any) {
      console.error('❌ [FIXED CALENDAR IMPORT] Error:', err);
      setError(err.message || 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Fixed Calendar Import
        </CardTitle>
        <CardDescription>
          Test the fixed calendar import with detailed debugging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            accept=".ics,text/calendar"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        {file && (
          <div className="text-sm text-muted-foreground">
            Selected: {file.name} ({Math.round(file.size / 1024)}KB)
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <UploadIcon className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <UploadIcon className="mr-2 h-4 w-4" />
              Import Calendar (Fixed)
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            <CheckCircleIcon className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">{result.message}</div>
                <div className="text-sm">
                  Imported: {result.imported} | Skipped: {result.skipped} | Errors: {result.errors}
                </div>
                {result.userIdUsed && (
                  <div className="text-xs text-muted-foreground">
                    User ID used: {result.userIdUsed}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}