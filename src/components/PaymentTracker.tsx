
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { dataService } from "@/services/dataService";
import { DollarSign, Plus, CreditCard, Calendar } from "lucide-react";

const PaymentTracker = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    amount: "",
    payment_method: "",
    payment_date: "",
    description: "",
    status: "completed"
  });

  useEffect(() => {
    fetchPayments();
    fetchPatients();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await dataService.getPayments();
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await dataService.getPatients();
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id || !formData.payment_method || !formData.payment_date || !formData.amount) {
      toast.error("Patient, amount, payment method, and payment date are required.");
      return;
    }

    try {
      await dataService.addPayment({
        patient_id: formData.patient_id,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        description: formData.description || null,
        status: formData.status
      });

      toast.success("Payment recorded successfully!");
      setFormData({
        patient_id: "",
        amount: "",
        payment_method: "",
        payment_date: "",
        description: "",
        status: "completed"
      });
      setShowAddForm(false);
      fetchPayments();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to record payment. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: "bg-emerald-600 text-white", text: "Completed" },
      pending: { color: "bg-amber-500 text-white", text: "Pending" },
      refunded: { color: "bg-destructive text-destructive-foreground", text: "Refunded" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;

    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getTotalRevenue = () => {
    return payments
      .filter(payment => payment.status === 'completed')
      .reduce((total, payment) => total + payment.amount, 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Payment Management
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${getTotalRevenue().toFixed(2)}
                </p>
              </div>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Payment
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <Card className="mb-6 border-primary/25">
              <CardHeader>
                <CardTitle className="text-lg">Record New Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patient_id">Patient *</Label>
                      <Select value={formData.patient_id} onValueChange={(value) => handleInputChange("patient_id", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.first_name} {patient.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="amount">Amount ($) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => handleInputChange("amount", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="payment_method">Payment Method *</Label>
                      <Select value={formData.payment_method} onValueChange={(value) => handleInputChange("payment_method", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="payment_date">Payment Date *</Label>
                      <Input
                        id="payment_date"
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => handleInputChange("payment_date", e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={2}
                      placeholder="Payment description..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      Record Payment
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
            ) : (
              payments.map((payment) => (
                <Card key={payment.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-lg font-semibold mb-2">
                          <CreditCard className="h-4 w-4" />
                          {payment.patient?.first_name} {payment.patient?.last_name}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${payment.amount.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {payment.payment_method.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>

                        {payment.description && (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            {payment.description}
                          </p>
                        )}
                      </div>

                      <div>
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTracker;
