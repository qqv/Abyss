"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Column, Table, ColumnValue } from "@/lib/mock-data";
import { useEffect, useState } from "react";

interface EditRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table | undefined;
  record: Record<string, ColumnValue> | null;
  rowIndex: number;
  onEditRecord: (record: Record<string, string>, rowIndex: number) => void;
}

export function EditRecordDialog({
  open,
  onOpenChange,
  table,
  record,
  rowIndex,
  onEditRecord,
}: EditRecordDialogProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (record) {
      const initialValues: Record<string, string> = {};

      for (const [key, value] of Object.entries(record)) {
        initialValues[key] = value !== null ? String(value) : "";
      }

      setFormValues(initialValues);
    }
  }, [record]);

  const handleChange = (column: Column, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [column.name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEditRecord(formValues, rowIndex);
    onOpenChange(false);
  };

  if (!table || !record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit record</DialogTitle>
          <DialogDescription>
            Edit the record from the {table.name} table.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {table.columns.map((column) => (
            <div key={column.name} className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">
                {column.name}
                <span className="ml-1 text-xs text-muted-foreground">
                  {column.type}
                </span>
              </Label>
              <Input
                className="col-span-3 font-mono"
                value={formValues[column.name] || ""}
                onChange={(e) => handleChange(column, e.target.value)}
                placeholder={`Enter ${column.type}`}
                disabled={column.primary}
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
