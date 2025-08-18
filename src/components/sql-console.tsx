"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mockDatabase } from "@/lib/mock-data";
import { Tooltip } from "@/components/ui/tooltip";
import { Play, Download, Copy, RotateCcw } from "@/components/ui/icons";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  error?: string;
  executionTime?: number;
}

export default function SQLConsole() {
  const [query, setQuery] = useState("SELECT * FROM categories LIMIT 10;");
  const [results, setResults] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeQuery = () => {
    setIsExecuting(true);

    // Record in history
    if (!history.includes(query)) {
      setHistory((prev) => [...prev, query]);
    }

    setTimeout(() => {
      try {
        // Simple parser for basic SQL queries (for demo purposes)
        const trimmedQuery = query.trim().toLowerCase();

        if (trimmedQuery.startsWith("select")) {
          // Parse the table name (very simplified parsing)
          const fromMatch = trimmedQuery.match(/from\s+(\w+)/i);

          if (fromMatch && fromMatch[1]) {
            const tableName = fromMatch[1];
            const table = mockDatabase.tables.find(t => t.name.toLowerCase() === tableName);

            if (table) {
              // Extract columns if specified
              const columns = table.columns;
              let resultRows = table.rows;

              // Process LIMIT if present
              const limitMatch = trimmedQuery.match(/limit\s+(\d+)/i);
              if (limitMatch && limitMatch[1]) {
                const limit = Number.parseInt(limitMatch[1], 10);
                resultRows = resultRows.slice(0, limit);
              }

              // Process WHERE clause (very basic implementation)
              const whereMatch = trimmedQuery.match(/where\s+(\w+)\s*(=|>|<|>=|<=|<>|!=|like)\s*['"]?([^'";\s]*)['"]?/i);
              if (whereMatch) {
                const [_, colName, operator, value] = whereMatch;

                resultRows = resultRows.filter(row => {
                  const cellValue = String(row[colName] || "").toLowerCase();
                  const compareValue = value.toLowerCase();

                  switch(operator) {
                    case '=': return cellValue === compareValue;
                    case '>': return Number.parseFloat(cellValue) > Number.parseFloat(compareValue);
                    case '<': return Number.parseFloat(cellValue) < Number.parseFloat(compareValue);
                    case '>=': return Number.parseFloat(cellValue) >= Number.parseFloat(compareValue);
                    case '<=': return Number.parseFloat(cellValue) <= Number.parseFloat(compareValue);
                    case '<>':
                    case '!=': return cellValue !== compareValue;
                    case 'like':
                      // Very simple LIKE implementation
                      const pattern = compareValue.replace(/%/g, '.*');
                      return new RegExp(pattern).test(cellValue);
                    default: return true;
                  }
                });
              }

              setResults({
                columns: columns.map(col => col.name),
                rows: resultRows,
                executionTime: Math.random() * 20 + 10 // Simulate random execution time
              });
            } else {
              setResults({
                columns: [],
                rows: [],
                error: `Table '${tableName}' not found`
              });
            }
          } else {
            setResults({
              columns: [],
              rows: [],
              error: "Invalid query: Could not parse table name"
            });
          }
        } else if (trimmedQuery.startsWith("insert") ||
                  trimmedQuery.startsWith("update") ||
                  trimmedQuery.startsWith("delete")) {
          // For insert/update/delete, just return a success message
          setResults({
            columns: ["result"],
            rows: [{ result: "Query executed successfully. Affected rows: " + Math.floor(Math.random() * 10 + 1) }],
            executionTime: Math.random() * 20 + 10
          });
        } else {
          setResults({
            columns: [],
            rows: [],
            error: "Only SELECT, INSERT, UPDATE, and DELETE queries are supported in this demo"
          });
        }
      } catch (error) {
        setResults({
          columns: [],
          rows: [],
          error: "Error executing query: " + (error instanceof Error ? error.message : String(error))
        });
      } finally {
        setIsExecuting(false);
      }
    }, 500); // Simulate network delay
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(query);
  };

  const downloadResults = () => {
    if (!results || !results.rows.length) return;

    // Convert results to CSV
    const headers = results.columns.join(",");
    const rows = results.rows.map(row =>
      results.columns.map(col => `"${row[col] || ""}"`).join(",")
    );

    const csv = [headers, ...rows].join("\n");

    // Create download link
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "query_results.csv");
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header and action buttons */}
      <div className="border-b border-border p-2 flex justify-between items-center">
        <h2 className="text-md font-medium">SQL Console</h2>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={clearResults}
          >
            <RotateCcw className="h-3 w-3 mr-2" />
            Clear
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={downloadResults}
            disabled={!results || !results.rows.length}
          >
            <Download className="h-3 w-3 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main console area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* SQL editor */}
        <div className="p-2 border-b border-border h-2/5 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium">Query Editor</div>
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={copyToClipboard}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant={isExecuting ? "outline" : "default"}
                className="h-7"
                disabled={isExecuting}
                onClick={executeQuery}
              >
                <Play className="h-3 w-3 mr-1" />
                Run
              </Button>
            </div>
          </div>

          <textarea
            className="flex-1 w-full p-2 font-mono text-sm bg-secondary/30 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter SQL query..."
            spellCheck={false}
          />

          <div className="text-xs text-muted-foreground mt-1">
            {history.length > 0 && "Recent queries:"}
            {history.slice(-3).map((q, i) => (
              <span
                key={i}
                className="cursor-pointer hover:text-foreground ml-2"
                onClick={() => setQuery(q)}
              >
                {q.length > 20 ? q.substring(0, 20) + "..." : q}
              </span>
            ))}
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-auto p-2">
          <div className="text-xs font-medium mb-2">Results</div>

          {results?.error ? (
            <div className="text-destructive text-sm p-2 bg-destructive/10 rounded">
              {results.error}
            </div>
          ) : results ? (
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                {results.rows.length} {results.rows.length === 1 ? 'row' : 'rows'} in set
                {results.executionTime && ` (${results.executionTime.toFixed(2)}ms)`}
              </div>

              <div className="border rounded overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {results.columns.map((column, i) => (
                        <TableHead key={i} className="font-medium whitespace-nowrap">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.rows.map((row, i) => (
                      <TableRow key={i}>
                        {results.columns.map((column, j) => (
                          <TableCell key={j} className="font-mono">
                            {String(row[column] !== undefined ? row[column] : '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-10">
              Execute a query to see results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
