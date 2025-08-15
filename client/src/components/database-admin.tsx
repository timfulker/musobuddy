import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Database, Filter, Download, Eye, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DatabaseTable {
  name: string;
  rowCount: number;
  columns: string[];
}

interface DatabaseRow {
  [key: string]: any;
}

export default function DatabaseAdmin() {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColumn, setFilterColumn] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const { toast } = useToast();

  // Fetch available tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['/api/admin/database/tables'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/database/tables');
      return await response.json();
    }
  });

  // Fetch table data
  const { data: tableData, isLoading: dataLoading, error: dataError } = useQuery({
    queryKey: ['/api/admin/database/data', selectedTable, searchQuery, filterColumn, currentPage],
    queryFn: async () => {
      if (!selectedTable) return { rows: [], totalCount: 0 };
      
      console.log(`📊 Frontend: Fetching data for table: ${selectedTable}`);
      
      const params = new URLSearchParams({
        table: selectedTable,
        page: currentPage.toString(),
        limit: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(filterColumn !== 'all' && { filterColumn })
      });
      
      console.log(`📊 Frontend: API URL: /api/admin/database/data?${params}`);
      
      const response = await apiRequest(`/api/admin/database/data?${params}`);
      const data = await response.json();
      
      console.log(`📊 Frontend: Received data:`, data);
      
      return data;
    },
    enabled: !!selectedTable
  });

  const selectedTableInfo = tables.find((t: DatabaseTable) => t.name === selectedTable);
  const totalPages = tableData ? Math.ceil(tableData.totalCount / rowsPerPage) : 0;

  const exportTableData = async () => {
    if (!selectedTable) return;
    
    try {
      const response = await apiRequest(`/api/admin/database/export/${selectedTable}`);
      const data = await response.json();
      
      const csvContent = [
        selectedTableInfo?.columns.join(','),
        ...data.map((row: DatabaseRow) => 
          selectedTableInfo?.columns.map(col => 
            typeof row[col] === 'string' ? `"${row[col].replace(/"/g, '""')}"` : row[col]
          ).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `${selectedTable} data exported successfully`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export table data",
        variant: "destructive"
      });
    }
  };

  const formatCellValue = (value: any, columnName: string) => {
    if (value === null || value === undefined) return <span className="text-gray-400">NULL</span>;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    if (columnName.toLowerCase().includes('password') || columnName.toLowerCase().includes('token')) {
      return <span className="text-gray-400">***hidden***</span>;
    }
    if (typeof value === 'string' && value.length > 100) {
      return <span title={value}>{value.substring(0, 100)}...</span>;
    }
    return String(value);
  };

  const getRowCountColor = (count: number) => {
    if (count === 0) return "bg-gray-100 text-gray-800";
    if (count < 100) return "bg-green-100 text-green-800";
    if (count < 1000) return "bg-blue-100 text-blue-800";
    return "bg-orange-100 text-orange-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Administration
          </h2>
          <p className="text-muted-foreground mt-1">
            Read-only database access with filtering and search capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Read-Only
          </Badge>
        </div>
      </div>

      {/* Tables Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Database Tables</CardTitle>
        </CardHeader>
        <CardContent>
          {tablesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading tables...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table: DatabaseTable) => (
                <Card 
                  key={table.name} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTable === table.name ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    setSelectedTable(table.name);
                    setCurrentPage(1);
                    setSearchQuery("");
                    setFilterColumn("all");
                  }}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm mb-2">{table.name}</h3>
                    <div className="flex items-center justify-between">
                      <Badge className={getRowCountColor(table.rowCount)}>
                        {table.rowCount.toLocaleString()} rows
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {table.columns.length} cols
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Data View */}
      {selectedTable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {selectedTable}
                <Badge variant="outline">
                  {tableData?.totalCount.toLocaleString() || 0} total rows
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTableData}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col lg:flex-row gap-4 mt-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search across all columns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterColumn} onValueChange={setFilterColumn}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All columns</SelectItem>
                    {selectedTableInfo?.columns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading data...</p>
              </div>
            ) : dataError ? (
              <div className="text-center py-8 text-red-600">
                Error loading data: {dataError.message}
              </div>
            ) : tableData?.rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || filterColumn !== 'all' 
                  ? 'No data matches your search criteria' 
                  : 'No data in this table'
                }
              </div>
            ) : (
              <>
                {/* Data Table */}
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedTableInfo?.columns.map((column) => (
                          <TableHead key={column} className="min-w-32">
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData?.rows.map((row: DatabaseRow, index: number) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                          {selectedTableInfo?.columns.map((column) => (
                            <TableCell key={column} className="font-mono text-xs">
                              {formatCellValue(row[column], column)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, tableData?.totalCount || 0)} of {tableData?.totalCount.toLocaleString() || 0} results
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}