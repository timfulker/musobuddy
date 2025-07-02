import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MoreHorizontal, FileText, Calendar, DollarSign, User } from "lucide-react";
import type { Contract } from "@shared/schema";

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["/api/contracts"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "signed": return "bg-green-100 text-green-800";
      case "completed": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const filteredContracts = contracts.filter((contract: Contract) => {
    const matchesSearch = searchQuery === "" || 
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
            <p className="text-gray-600">Manage your performance contracts and agreements</p>
          </div>
          
          <Button className="bg-purple-600 hover:bg-purple-700">
            <FileText className="w-4 h-4 mr-2" />
            Generate Contract
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search contracts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contracts List */}
        <div className="space-y-4">
          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No contracts found</p>
                <p className="text-gray-400">Generate your first contract from an enquiry</p>
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Contract
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredContracts.map((contract: Contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Contract #{contract.contractNumber}
                        </h3>
                        <Badge className={getStatusColor(contract.status)}>
                          {contract.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <div>
                            <p className="font-medium">{contract.clientName}</p>
                            <p className="text-xs text-gray-500">Client</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <div>
                            <p className="font-medium">{formatDate(contract.eventDate)}</p>
                            <p className="text-xs text-gray-500">{contract.eventTime}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <div>
                            <p className="font-medium">£{contract.fee}</p>
                            {contract.deposit && (
                              <p className="text-xs text-gray-500">Deposit: £{contract.deposit}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-gray-600">
                          <p className="font-medium text-sm">{contract.venue}</p>
                          <p className="text-xs text-gray-500">Venue</p>
                        </div>
                      </div>
                      
                      {contract.terms && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 line-clamp-2">{contract.terms}</p>
                        </div>
                      )}
                      
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {formatDate(contract.createdAt!)}</span>
                        {contract.signedAt && (
                          <span>Signed: {formatDate(contract.signedAt)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      
                      {contract.status === "draft" && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Send Contract
                        </Button>
                      )}
                      
                      {contract.status === "sent" && (
                        <Button size="sm" variant="outline">
                          View Status
                        </Button>
                      )}
                      
                      {contract.status === "signed" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Download PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}