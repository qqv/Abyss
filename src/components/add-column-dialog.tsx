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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddColumn: (name: string, type: string, isPrimary: boolean) => void;
}

export function AddColumnDialog({
  open,
  onOpenChange,
  onAddColumn,
}: AddColumnDialogProps) {
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState("varchar");
  const [columnLength, setColumnLength] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [validationError, setValidationError] = useState("");

  const dataTypes = [
    "integer",
    "bigint",
    "varchar",
    "text",
    "boolean",
    "date",
    "timestamp",
    "decimal",
    "real",
    "smallint"
  ];

  const getFullType = () => {
    if (["varchar", "decimal"].includes(columnType) && columnLength) {
      return `${columnType}(${columnLength})`;
    }
    return columnType;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!columnName.trim()) {
      setValidationError("Column name is required");
      return;
    }

    // Check if column name has spaces or special characters
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
      setValidationError("Column name can only contain letters, numbers, and underscores, and must start with a letter or underscore");
      return;
    }

    if (["varchar", "decimal"].includes(columnType) && !columnLength) {
      setValidationError(`Length/precision is required for ${columnType} type`);
      return;
    }

    onAddColumn(columnName, getFullType(), isPrimary);

    // Reset form
    setColumnName("");
    setColumnType("varchar");
    setColumnLength("");
    setIsPrimary(false);
    setValidationError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add new column</DialogTitle>
          <DialogDescription>
            Add a new column to the current table.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="column-name" className="text-right font-medium">
              Column name
            </Label>
            <Input
              id="column-name"
              className="col-span-3"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Enter column name"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="column-type" className="text-right font-medium">
              Data type
            </Label>
            <div className="col-span-3 flex gap-2">
              <Select value={columnType} onValueChange={setColumnType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(columnType === "varchar" || columnType === "decimal") && (
                <Input
                  className="w-20"
                  value={columnLength}
                  onChange={(e) => setColumnLength(e.target.value)}
                  placeholder={columnType === "varchar" ? "255" : "10,2"}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right font-medium">
              <Label htmlFor="is-primary">Primary key</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
              />
              <Label htmlFor="is-primary">
                Set as primary key
              </Label>
            </div>
          </div>

          {validationError && (
            <div className="text-red-500 text-sm">{validationError}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add column</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
