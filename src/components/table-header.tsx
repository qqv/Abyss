"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Filter,
  Grid,
  Plus,
  Search
} from "@/components/ui/icons";
import { mockDatabase } from "@/lib/mock-data";
import { AddRecordDialog } from "@/components/add-record-dialog";
import { AddColumnDialog } from "@/components/add-column-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface TableHeaderProps {
  onSearch: (searchTerm: string) => void;
  totalRows: number;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export default function TableHeader({
  onSearch,
  totalRows,
  currentPage,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}: TableHeaderProps) {
  const [addRecordDialogOpen, setAddRecordDialogOpen] = useState(false);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const currentTable = mockDatabase.tables.find(
    (table) => table.id === mockDatabase.currentTable
  );

  const handleAddRecord = (record: Record<string, string>) => {
    // In a real app, this would update the database
    console.log("Adding record:", record);
  };

  const handleAddColumn = (columnName: string, columnType: string) => {
    // In a real app, this would add a column to the schema
    console.log("Adding column:", columnName, "of type", columnType);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const totalPages = Math.ceil(totalRows / rowsPerPage);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border p-2">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="ml-2 flex items-center h-8">
            <Filter className="h-4 w-4 mr-2" />
            <span className="text-xs">Filters</span>
          </Button>
          <Button
            variant="ghost"
            className="flex items-center h-8"
            onClick={() => setAddColumnDialogOpen(true)}
          >
            <Grid className="h-4 w-4 mr-2" />
            <span className="text-xs">Columns</span>
          </Button>
          <div className="relative ml-2">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder="Search..."
              className="h-8 pl-8 text-xs w-40"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            className="bg-gray-800 hover:bg-gray-700 text-white"
            onClick={() => setAddRecordDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add record
          </Button>
          <div className="text-xs text-muted-foreground">
            {totalRows} rows • 23ms
          </div>
          <div className="flex items-center ml-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="mx-2 text-xs">{currentPage + 1}</span>
            <span className="text-xs text-muted-foreground">of</span>
            <span className="mx-2 text-xs">{totalPages || 1}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center ml-4">
              <Label className="text-xs mr-2">Rows:</Label>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => onRowsPerPageChange(Number(value))}
              >
                <SelectTrigger className="h-8 w-16">
                  <SelectValue placeholder="50" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <AddRecordDialog
        open={addRecordDialogOpen}
        onOpenChange={setAddRecordDialogOpen}
        table={currentTable}
        onAddRecord={handleAddRecord}
      />

      <AddColumnDialog
        open={addColumnDialogOpen}
        onOpenChange={setAddColumnDialogOpen}
        onAddColumn={handleAddColumn}
      />
    </>
  );
}
