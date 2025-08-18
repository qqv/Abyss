"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { Table as TableType, ColumnValue } from "@/lib/mock-data";
import { useState } from "react";
import { Button } from "./ui/button";
import { Pencil, Trash, ArrowDown, ArrowUp } from "./ui/icons";
import { EditRecordDialog } from "./edit-record-dialog";
import { AddRecordDialog } from "./add-record-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "./ui/dialog";

export interface ColumnSorting {
  column: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps {
  table: TableType | undefined;
  rows: Record<string, ColumnValue>[];
  onEditRecord: (record: Record<string, string>, rowIndex: number) => void;
  onDeleteRecord: (rowIndex: number) => void;
  onAddRecord: (record: Record<string, string>) => void;
  onAddColumn: (name: string, type: string, isPrimary: boolean) => void;
  onSort: (sorting: ColumnSorting | null) => void;
  sorting: ColumnSorting | null;
}

export default function DataTable({
  table,
  rows,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
  onAddColumn,
  onSort,
  sorting
}: DataTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addRecordDialogOpen, setAddRecordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1);

  // Get the current record if editing
  const currentRecord = selectedRowIndex !== -1 && rows
    ? rows[selectedRowIndex]
    : null;

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(
        rows.map((_, index) => index.toString()) || []
      );
    }
  };

  const handleDeleteRecord = () => {
    onDeleteRecord(selectedRowIndex);
    setDeleteDialogOpen(false);
    setSelectedRowIndex(-1);
  };

  const openEditDialog = (rowIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIndex(rowIndex);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (rowIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIndex(rowIndex);
    setDeleteDialogOpen(true);
  };

  // Handle column sorting
  const handleSort = (columnName: string) => {
    if (sorting && sorting.column === columnName) {
      // Toggle direction if same column
      onSort({
        column: columnName,
        direction: sorting.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Set new sorting column with default ascending direction
      onSort({
        column: columnName,
        direction: 'asc'
      });
    }
  };

  if (!table) return <div>No table selected</div>;

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={
                  rows.length > 0 &&
                  selectedRows.length === rows.length
                }
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            {table.columns.map((column) => (
              <TableHead
                key={column.name}
                className="font-medium cursor-pointer"
                onClick={() => handleSort(column.name)}
              >
                <div className="flex items-center">
                  {column.name}
                  <span className="data-type ml-1">{column.type}</span>
                  {sorting && sorting.column === column.name && (
                    <span className="ml-1">
                      {sorting.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={`row-${index}-${row.id || index}`}
              className="table-row-hover cursor-pointer"
              onClick={() => handleSelectRow(index.toString())}
            >
              <TableCell className="w-10">
                <Checkbox
                  checked={selectedRows.includes(index.toString())}
                  aria-label={`Select row ${index}`}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => handleSelectRow(index.toString())}
                />
              </TableCell>
              {table.columns.map((column) => (
                <TableCell key={column.name} className="monospace drizzle-table-cell">
                  {row[column.name]?.toString() || ""}
                </TableCell>
              ))}
              <TableCell className="w-20 text-right">
                <div className="flex justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => openEditDialog(index, e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => openDeleteDialog(index, e)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add Record Dialog */}
      <AddRecordDialog
        open={addRecordDialogOpen}
        onOpenChange={setAddRecordDialogOpen}
        table={table}
        onAddRecord={onAddRecord}
      />

      {/* Edit Record Dialog */}
      <EditRecordDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        table={table}
        record={currentRecord}
        rowIndex={selectedRowIndex}
        onEditRecord={onEditRecord}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRecord}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
