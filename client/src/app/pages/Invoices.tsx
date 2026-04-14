import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, Eye } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import type { InvoiceStatus } from '../types';

export function InvoiceList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const invoices: any[] = [];

  const getStatusBadge = (status: InvoiceStatus) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-700', label: 'Processing' },
      validated: { color: 'bg-purple-100 text-purple-700', label: 'Validated' },
      approved: { color: 'bg-green-100 text-green-700', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
    };
    return config[status];
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.employeeName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || invoice.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="mt-1 text-muted-foreground">Manage and track all invoices</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/upload">Upload Invoice</Link>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by vendor, invoice number, or employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-3">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">No invoices found</p>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/dashboard/upload">Upload Invoice</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const badge = getStatusBadge(invoice.status);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>{invoice.vendor}</TableCell>
                    <TableCell>{invoice.employeeName}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{invoice.category}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${invoice.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.uploadDate}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.dueDate}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.color}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/invoices/${invoice.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}