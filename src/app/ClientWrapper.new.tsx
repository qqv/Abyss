"use client";

import { mockDatabase, type Column, Table, type ColumnValue } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import TableHeader from "@/components/table-header";
import DataTable, { type ColumnSorting } from "@/components/data-table";
import SQLConsole from "@/components/sql-console";
import ApiCollectionView from "@/components/api-collection-view";
import ScanResultsView from "@/components/scan-results-view";
import { ApiScanJob, mockApiJobs } from "@/lib/api-data";

// Define a view mode type
type ViewMode = "table" | "sql" | "api" | "scan-results";

interface ClientWrapperProps {
  children?: React.ReactNode;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export default function ClientWrapper({
  children,
  viewMode = "table",
  onViewModeChange
}: ClientWrapperProps) {
  // Table state
  const [tables, setTables] = useState(mockDatabase.tables);
  const [currentTableId, setCurrentTableId] = useState(mockDatabase.currentTable);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting state
  const [sorting, setSorting] = useState<ColumnSorting | null>(null);
  
  // API Scan state
  const [apiJobs, setApiJobs] = useState(mockApiJobs);
  const [currentJobId, setCurrentJobId] = useState<string | undefined>(
    apiJobs.length > 0 ? apiJobs[0].id : undefined
  );

  // Get the current table
  const currentTable = tables.find(table => table.id === currentTableId);

  // Filter rows based on search term
  const filteredRows = currentTable ? currentTable.rows.filter(row => {
    if (!searchTerm) return true;

    // Search across all columns
    return Object.values(row).some(value =>
      value !== null &&
      value !== undefined &&
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) : [];

  // Apply sorting to the filtered rows
  const sortedRows = sorting && currentTable
    ? [...filteredRows].sort((a, b) => {
        const aValue = a[sorting.column];
        const bValue = b[sorting.column];

        if (aValue === bValue) return 0;

        // Handle different data types
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sorting.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Default string comparison
        const aStr = String(aValue || '');
        const bStr = String(bValue || '');

        return sorting.direction === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      })
    : filteredRows;

  // Apply pagination
  const paginatedRows = sortedRows.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  // Reset pagination when table changes or search/sort criteria change
  useEffect(() => {
    setCurrentPage(0);
  }, [currentTableId, searchTerm, sorting]);

  // Handlers for table operations
  const handleAddRecord = (record: Record<string, string>) => {
    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.id === currentTableId) {
          // Convert string values to appropriate types based on column definitions
          const typedRecord: Record<string, ColumnValue> = {};

          for (const column of table.columns) {
            const value = record[column.name];

            if (column.type.includes('int') && value) {
              typedRecord[column.name] = Number.parseInt(value, 10);
            } else if ((column.type === 'real' || column.type === 'decimal') && value) {
              typedRecord[column.name] = Number.parseFloat(value);
            } else {
              typedRecord[column.name] = value;
            }
          }

          return {
            ...table,
            rows: [...table.rows, typedRecord],
            rowCount: table.rowCount + 1
          };
        }
        return table;
      });
    });
  };

  const handleEditRecord = (record: Record<string, string>, rowIndex: number) => {
    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.id === currentTableId) {
          const updatedRows = [...table.rows];

          // Convert string values to appropriate types
          const typedRecord: Record<string, ColumnValue> = {};

          for (const column of table.columns) {
            const value = record[column.name];

            if (column.type.includes('int') && value) {
              typedRecord[column.name] = Number.parseInt(value, 10);
            } else if ((column.type === 'real' || column.type === 'decimal') && value) {
              typedRecord[column.name] = Number.parseFloat(value);
            } else {
              typedRecord[column.name] = value;
            }
          }

          updatedRows[rowIndex] = typedRecord;

          return {
            ...table,
            rows: updatedRows
          };
        }
        return table;
      });
    });
  };

  const handleDeleteRecord = (rowIndex: number) => {
    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.id === currentTableId) {
          const updatedRows = [...table.rows];
          updatedRows.splice(rowIndex, 1);

          return {
            ...table,
            rows: updatedRows,
            rowCount: table.rowCount - 1
          };
        }
        return table;
      });
    });
  };

  const handleAddColumn = (name: string, type: string, isPrimary: boolean) => {
    setTables(prevTables => {
      return prevTables.map(table => {
        if (table.id === currentTableId) {
          // Create a new column
          const newColumn: Column = {
            name,
            type,
            primary: isPrimary
          };

          // Add the column to the schema
          const updatedColumns = [...table.columns, newColumn];

          // Initialize the column value for all existing rows
          const updatedRows = table.rows.map(row => ({
            ...row,
            [name]: null
          }));

          return {
            ...table,
            columns: updatedColumns,
            rows: updatedRows
          };
        }
        return table;
      });
    });
  };

  // Toggle view mode
  const handleViewModeChange = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };
  
  // Run API collection
  const handleRunCollection = (collectionId: string, parameterSetId?: string) => {
    // 生成一个唯一ID
    const jobId = `job-${Date.now()}`;
    
    // 创建新的扫描任务
    const newJob: ApiScanJob = {
      _id: jobId,             // 使用标准的_id字段
      id: jobId,              // 保留id字段作为兼容
      name: `API扫描-${new Date().toLocaleString()}`,
      collectionId,
      parameterSetId: parameterSetId || '',  // 确保不会是undefined
      concurrency: 5,
      status: 'running',
      progress: 0,
      startTime: new Date().toISOString(),
      results: []
    };
    
    // 添加新任务
    setApiJobs([newJob, ...apiJobs]);
    setCurrentJobId(jobId); // 使用生成的ID
    
    // 切换到结果视图
    if (onViewModeChange) {
      onViewModeChange('scan-results');
    }
    
    // 模拟异步任务进度 (实际项目中会替换为真实的API调用)
    // 使用前面生成的jobId变量，而不是newJob.id
    simulateJobProgress(jobId);
  };
  
  // 查看扫描结果
  const handleViewResults = (jobId: string) => {
    setCurrentJobId(jobId);
    if (onViewModeChange) {
      onViewModeChange('scan-results');
    }
  };
  
  // 模拟任务进度 (仅用于演示)
  const simulateJobProgress = (jobId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      
      setApiJobs(prev => prev.map(job => 
        job._id === jobId || job.id === jobId 
          ? { 
              ...job, 
              progress, 
              status: progress < 100 ? 'running' : 'completed',
              endTime: progress >= 100 ? new Date().toISOString() : null,
              results: progress >= 100 ? mockApiJobs[0].results : []
            }
          : job
      ));
      
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 300); // 每300毫秒更新一次进度
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {viewMode === "table" && (
        <>
          <TableHeader
            onSearch={setSearchTerm}
            totalRows={filteredRows.length}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
          />
          <DataTable
            table={currentTable}
            rows={paginatedRows}
            onDeleteRecord={handleDeleteRecord}
            onEditRecord={handleEditRecord}
            onAddRecord={handleAddRecord}
            onAddColumn={handleAddColumn}
            onSort={setSorting}
            sorting={sorting}
          />
        </>
      )}

      {viewMode === "sql" && <SQLConsole />}
      
      {viewMode === "api" && (
        <ApiCollectionView 
          onRunCollection={handleRunCollection}
          onViewResults={handleViewResults}
        />
      )}
      
      {viewMode === "scan-results" && (
        <ScanResultsView 
          jobId={currentJobId}
        />
      )}
    </div>
  );
}
