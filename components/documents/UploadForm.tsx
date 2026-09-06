"use client";

import { useRef, useState } from "react";
import { useUploadDocument } from "@/lib/query/documents";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/errors";

/**
 * File picker → optimistic upload. Real byte upload would be a presigned PUT to
 * object storage; here we register the document (title/filename/size) and let
 * the pipeline pick it up. The list shows a placeholder row immediately
 * (optimistic), which the mutation reconciles or rolls back.
 */
export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();
  const [error, setError] = useState<string | null>(null);

  function onPick(file: File): void {
    setError(null);
    upload.mutate(
      { title: file.name.replace(/\.[^.]+$/, ""), filename: file.name, byteSize: file.size },
      {
        onError: (e) => setError(isApiError(e) ? e.message : "Upload failed"),
      },
    );
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
        {upload.isPending ? "Uploading…" : "Upload document"}
      </Button>
      {error ? (
        <span role="alert" className="text-sm text-red-600 dark:text-red-300">
          {error}
        </span>
      ) : null}
    </div>
  );
}
