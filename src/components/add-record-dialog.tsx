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
import { Label } from "@/components/ui/label"; // Updated import for Label component
import type { Column, Table } from "@/lib/mock-data";
import { useState } from "react";

interface AddRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table | undefined;
  onAddRecord: (record: Record<string, string>) => void;
}

export function AddRecordDialog({
  open,
  onOpenChange,
  table,
  onAddRecord,
}: AddRecordDialogProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleChange = (column: Column, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [column.name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRecord(formValues);
    setFormValues({});
    onOpenChange(false);
  };

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add new record</DialogTitle>
          <DialogDescription>
            Add a new record to the {table.name} table.
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
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="submit">Add record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
