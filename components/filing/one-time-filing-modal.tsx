"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ArrowRight, ArrowLeft, FileText, DollarSign, Receipt, Award, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface Income {
  id: string;
  source: string;
  amount: number;
  description: string;
  currency: string;
  exchangeRate: number;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  currency: string;
  exchangeRate: number;
}

interface Relief {
  id: string;
  type: string;
  amount: number;
  description: string;
  currency: string;
  exchangeRate: number;
}

interface TaxCredit {
  id: string;
  type: string;
  amount: number;
  description: string;
  currency: string;
  exchangeRate: number;
}

interface OneTimeFilingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OneTimeFilingModal({ open, onOpenChange }: OneTimeFilingModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Income state
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [currentIncome, setCurrentIncome] = useState({ 
    source: "", 
    amount: "", 
    description: "", 
    currency: "NGN", 
    exchangeRate: "1" 
  });

  // Expense state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentExpense, setCurrentExpense] = useState({ 
    category: "", 
    amount: "", 
    description: "", 
    currency: "NGN", 
    exchangeRate: "1" 
  });

  // Relief state
  const [reliefs, setReliefs] = useState<Relief[]>([]);
  const [currentRelief, setCurrentRelief] = useState({ 
    type: "", 
    amount: "", 
    description: "", 
    currency: "NGN", 
    exchangeRate: "1" 
  });

  // Tax credit state
  const [taxCredits, setTaxCredits] = useState<TaxCredit[]>([]);
  const [currentTaxCredit, setCurrentTaxCredit] = useState({ 
    type: "", 
    amount: "", 
    description: "", 
    currency: "NGN", 
    exchangeRate: "1" 
  });

  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    NGN: 1,
    USD: 1500,
    EUR: 1650,
    GBP: 1900,
  });

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch("/api/exchange-rates");
        if (response.ok) {
          const data = await response.json();
          setExchangeRates(data.rates || exchangeRates);
        }
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
      }
    };
    fetchRates();
  }, []);

  // Helper function to format currency input
  const formatCurrency = (value: string) => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, "");
    
    // Parse to number and format with commas
    if (numericValue === '') return '';
    
    const parts = numericValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return parts.join('.');
  };

  // Helper function to parse formatted currency back to number
  const parseCurrency = (value: string) => {
    return value.replace(/,/g, "");
  };

  // Helper function to calculate amount in NGN
  const calculateNGNAmount = (amount: string, currency: string, exchangeRate: string) => {
    const numAmount = parseFloat(parseCurrency(amount));
    const rate = parseFloat(parseCurrency(exchangeRate));
    if (currency === "NGN") return numAmount;
    return numAmount * rate;
  };

  // Income handlers
  const addIncome = () => {
    if (!currentIncome.source || !currentIncome.amount) {
      toast.error("Please fill in source and amount");
      return;
    }

    const ngnAmount = calculateNGNAmount(
      currentIncome.amount,
      currentIncome.currency,
      currentIncome.exchangeRate
    );

    const newIncome: Income = {
      id: Date.now().toString(),
      source: currentIncome.source,
      amount: ngnAmount,
      description: currentIncome.description,
      currency: currentIncome.currency,
      exchangeRate: parseFloat(parseCurrency(currentIncome.exchangeRate))
    };

    setIncomes([newIncome, ...incomes]);
    setCurrentIncome({ source: "", amount: "", description: "", currency: "NGN", exchangeRate: "1" });
  };

  const removeIncome = (id: string) => {
    setIncomes(incomes.filter(inc => inc.id !== id));
  };

  // Expense handlers
  const addExpense = () => {
    if (!currentExpense.category || !currentExpense.amount) {
      toast.warning("Please fill in category and amount for the expense");
      return;
    }

    const ngnAmount = calculateNGNAmount(
      currentExpense.amount,
      currentExpense.currency,
      currentExpense.exchangeRate
    );

    const newExpense: Expense = {
      id: Date.now().toString(),
      category: currentExpense.category,
      amount: ngnAmount,
      description: currentExpense.description,
      currency: currentExpense.currency,
      exchangeRate: parseFloat(parseCurrency(currentExpense.exchangeRate))
    };

    setExpenses([newExpense, ...expenses]);
    setCurrentExpense({ category: "", amount: "", description: "", currency: "NGN", exchangeRate: "1" });
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  // Relief handlers
  const addRelief = () => {
    if (!currentRelief.type || !currentRelief.amount) {
      toast.error("Please fill in type and amount for the relief");     
       
      return;
    }

    const ngnAmount = calculateNGNAmount(
      currentRelief.amount,
      currentRelief.currency,
      currentRelief.exchangeRate
    );

    const newRelief: Relief = {
      id: Date.now().toString(),
      type: currentRelief.type,
      amount: ngnAmount,
      description: currentRelief.description,
      currency: currentRelief.currency,
      exchangeRate: parseFloat(parseCurrency(currentRelief.exchangeRate))
    };

    setReliefs([newRelief, ...reliefs]);
    setCurrentRelief({ type: "", amount: "", description: "", currency: "NGN", exchangeRate: "1" });
  };

  const removeRelief = (id: string) => {
    setReliefs(reliefs.filter(rel => rel.id !== id));
  };

  // Tax credit handlers
  const addTaxCredit = () => {
    if (!currentTaxCredit.type || !currentTaxCredit.amount) {
      toast.error("Please fill in type and amount!");
      return;
    }

    const ngnAmount = calculateNGNAmount(
      currentTaxCredit.amount,
      currentTaxCredit.currency,
      currentTaxCredit.exchangeRate
    );

    const newTaxCredit: TaxCredit = {
      id: Date.now().toString(),
      type: currentTaxCredit.type,
      amount: ngnAmount,
      description: currentTaxCredit.description,
      currency: currentTaxCredit.currency,
      exchangeRate: parseFloat(parseCurrency(currentTaxCredit.exchangeRate))
    };

    setTaxCredits([newTaxCredit, ...taxCredits]);
    setCurrentTaxCredit({ type: "", amount: "", description: "", currency: "NGN", exchangeRate: "1" });
  };

  const removeTaxCredit = (id: string) => {
    setTaxCredits(taxCredits.filter(tc => tc.id !== id));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/filing/one-time-filing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          incomes,
          expenses,
          reliefs,
          taxCredits
        })
      });

      if (!response.ok) throw new Error("Failed to submit");

      const data = await response.json();

      toast("Your tax return has been filed successfully");

      // Reset and close
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to submit tax return");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setIncomes([]);
    setExpenses([]);
    setReliefs([]);
    setTaxCredits([]);
    setCurrentIncome({ source: "", amount: "", description: "", currency: "NGN", exchangeRate: "1" });
    setCurrentExpense({ category: "", amount: "", description: "", currency: "NGN", exchangeRate: "1" });
    setCurrentRelief({ type: "", amount: "", description: "", currency: "NGN", exchangeRate: "1" });
    setCurrentTaxCredit({ type: "", amount: "", description: "", currency: "NGN", exchangeRate: "1" });
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalReliefs = reliefs.reduce((sum, rel) => sum + rel.amount, 0);
  const totalTaxCredits = taxCredits.reduce((sum, tc) => tc.amount + sum, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>File Tax Return - One Time Filing</DialogTitle>
          <DialogDescription>
            Complete your tax return by adding your income, expenses, reliefs, and tax credits
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {[
            { num: 1, label: "Income", icon: DollarSign },
            { num: 2, label: "Expenses", icon: Receipt },
            { num: 3, label: "Reliefs", icon: Award },
            { num: 4, label: "Tax Credits", icon: CreditCard },
            { num: 5, label: "Review", icon: FileText }
          ].map(({ num, label, icon: Icon }) => (
            <div key={num} className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === num ? "bg-primary text-primary-foreground" : 
                step > num ? "bg-green-500 text-white" : 
                "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs mt-1">{label}</span>
            </div>
          ))}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {/* Step 1: Income */}
          {step === 1 && (
            <div className="space-y-4">
              {incomes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Added Income ({incomes.length})</CardTitle>
                    <CardDescription>Total: ₦{totalIncome.toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount (NGN)</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomes.map((income) => (
                          <TableRow key={income.id}>
                            <TableCell className="font-medium">{income.source}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {income.description || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              ₦{income.amount.toLocaleString()}
                              {income.currency !== "NGN" && (
                                <div className="text-xs text-muted-foreground">
                                  ({income.currency} @ {income.exchangeRate})
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeIncome(income.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Income Sources</CardTitle>
                  <CardDescription>Add all sources of income for this tax year</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid md:grid-cols-4 grid-cols-2 gap-4">
                    <div>
                        <Label>Source</Label>
                        <Select value={currentIncome.source} onValueChange={(value) => setCurrentIncome({ ...currentIncome, source: value })}>
                            <SelectTrigger>
                            <SelectValue placeholder="Select income source" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="salary">Salary / Wages</SelectItem>
                            <SelectItem value="freelance">Freelance / Contract Work</SelectItem>
                            <SelectItem value="business">Business Income</SelectItem>
                            <SelectItem value="sales">Product / Service Sales</SelectItem>
                            <SelectItem value="commission">Commissions</SelectItem>
                            <SelectItem value="rental">Rental Income</SelectItem>
                            <SelectItem value="investment">Investment Income</SelectItem>
                            <SelectItem value="royalties">Royalties / Licensing</SelectItem>
                            <SelectItem value="interest">Interest</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Currency</Label>
                        <Select 
                            value={currentIncome.currency} 
                            onValueChange={(value) => {
                            const rate = exchangeRates[value] || 1;
                            setCurrentIncome({ 
                                ...currentIncome, 
                                currency: value, 
                                exchangeRate: rate.toString() 
                            });
                            }}
                        >
                            <SelectTrigger>
                            <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="NGN">NGN (₦)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={currentIncome.amount}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          setCurrentIncome({ ...currentIncome, amount: formatted });
                        }}
                      />
                    </div>
                    {currentIncome.currency !== "NGN" && (
                      <div>
                        <Label>Exchange Rate (to NGN)</Label>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={currentIncome.exchangeRate}
                          onChange={(e) => {
                            const formatted = formatCurrency(e.target.value);
                            setCurrentIncome({ ...currentIncome, exchangeRate: formatted });
                          }}
                        />
                      </div>
                    )}
                    {currentIncome.currency !== "NGN" && currentIncome.amount && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded h-10">
                      ≈ ₦{calculateNGNAmount(currentIncome.amount, currentIncome.currency, currentIncome.exchangeRate).toLocaleString()}
                    </div>
                  )}
                </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Additional details..."
                      value={currentIncome.description}
                      onChange={(e) => setCurrentIncome({ ...currentIncome, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={addIncome} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Income
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Expenses */}
          {step === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Deductible Expenses</CardTitle>
                  <CardDescription>Add business expenses that can be deducted</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={currentExpense.category} onValueChange={(value) => setCurrentExpense({ ...currentExpense, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="office">Office Expenses</SelectItem>
                          <SelectItem value="travel">Travel & Transportation</SelectItem>
                          <SelectItem value="equipment">Equipment & Supplies</SelectItem>
                          <SelectItem value="professional">Professional Services</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select 
                        value={currentExpense.currency} 
                        onValueChange={(value) => {
                          const rate = exchangeRates[value] || 1;
                          setCurrentExpense({ 
                            ...currentExpense, 
                            currency: value, 
                            exchangeRate: rate.toString() 
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NGN">NGN (₦)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={currentExpense.amount}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          setCurrentExpense({ ...currentExpense, amount: formatted });
                        }}
                      />
                    </div>
                    {currentExpense.currency !== "NGN" && (
                      <div>
                        <Label>Exchange Rate (to NGN)</Label>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={currentExpense.exchangeRate}
                          onChange={(e) => {
                            const formatted = formatCurrency(e.target.value);
                            setCurrentExpense({ ...currentExpense, exchangeRate: formatted });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {currentExpense.currency !== "NGN" && currentExpense.amount && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      ≈ ₦{calculateNGNAmount(currentExpense.amount, currentExpense.currency, currentExpense.exchangeRate).toLocaleString()}
                    </div>
                  )}
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Additional details..."
                      value={currentExpense.description}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={addExpense} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </CardContent>
              </Card>

              {expenses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Added Expenses ({expenses.length})</CardTitle>
                    <CardDescription>Total: ₦{totalExpenses.toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount (NGN)</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="font-medium capitalize">{expense.category}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {expense.description || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              ₦{expense.amount.toLocaleString()}
                              {expense.currency !== "NGN" && (
                                <div className="text-xs text-muted-foreground">
                                  ({expense.currency} @ {expense.exchangeRate})
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeExpense(expense.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Reliefs */}
          {step === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Tax Reliefs</CardTitle>
                  <CardDescription>Add applicable tax reliefs to reduce taxable income</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Relief Type</Label>
                      <Select value={currentRelief.type} onValueChange={(value) => setCurrentRelief({ ...currentRelief, type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relief type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consolidated">Consolidated Relief Allowance (CRA)</SelectItem>
                          <SelectItem value="pension">Pension Contribution</SelectItem>
                          <SelectItem value="nhf">National Housing Fund (NHF)</SelectItem>
                          <SelectItem value="nhis">National Health Insurance Scheme</SelectItem>
                          <SelectItem value="life-insurance">Life Insurance Premium</SelectItem>
                          <SelectItem value="gratuity">Gratuity</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select 
                        value={currentRelief.currency} 
                        onValueChange={(value) => {
                          const rate = exchangeRates[value] || 1;
                          setCurrentRelief({ 
                            ...currentRelief, 
                            currency: value, 
                            exchangeRate: rate.toString() 
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NGN">NGN (₦)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={currentRelief.amount}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          setCurrentRelief({ ...currentRelief, amount: formatted });
                        }}
                      />
                    </div>
                    {currentRelief.currency !== "NGN" && (
                      <div>
                        <Label>Exchange Rate (to NGN)</Label>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={currentRelief.exchangeRate}
                          onChange={(e) => {
                            const formatted = formatCurrency(e.target.value);
                            setCurrentRelief({ ...currentRelief, exchangeRate: formatted });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {currentRelief.currency !== "NGN" && currentRelief.amount && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      ≈ ₦{calculateNGNAmount(currentRelief.amount, currentRelief.currency, currentRelief.exchangeRate).toLocaleString()}
                    </div>
                  )}
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Additional details..."
                      value={currentRelief.description}
                      onChange={(e) => setCurrentRelief({ ...currentRelief, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={addRelief} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Relief
                  </Button>
                </CardContent>
              </Card>

              {reliefs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Added Reliefs ({reliefs.length})</CardTitle>
                    <CardDescription>Total: ₦{totalReliefs.toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount (NGN)</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reliefs.map((relief) => (
                          <TableRow key={relief.id}>
                            <TableCell className="font-medium capitalize">{relief.type}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {relief.description || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              ₦{relief.amount.toLocaleString()}
                              {relief.currency !== "NGN" && (
                                <div className="text-xs text-muted-foreground">
                                  ({relief.currency} @ {relief.exchangeRate})
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeRelief(relief.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Tax Credits */}
          {step === 4 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Tax Credits</CardTitle>
                  <CardDescription>Add any tax credits that apply to your situation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Credit Type</Label>
                      <Select value={currentTaxCredit.type} onValueChange={(value) => setCurrentTaxCredit({ ...currentTaxCredit, type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select credit type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="foreign-tax">Foreign Tax Credit</SelectItem>
                          <SelectItem value="investment">Investment Tax Credit</SelectItem>
                          <SelectItem value="research">Research & Development Credit</SelectItem>
                          <SelectItem value="education">Education Credit</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select 
                        value={currentTaxCredit.currency} 
                        onValueChange={(value) => {
                          const rate = exchangeRates[value] || 1;
                          setCurrentTaxCredit({ 
                            ...currentTaxCredit, 
                            currency: value, 
                            exchangeRate: rate.toString() 
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NGN">NGN (₦)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={currentTaxCredit.amount}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          setCurrentTaxCredit({ ...currentTaxCredit, amount: formatted });
                        }}
                      />
                    </div>
                    {currentTaxCredit.currency !== "NGN" && (
                      <div>
                        <Label>Exchange Rate (to NGN)</Label>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={currentTaxCredit.exchangeRate}
                          onChange={(e) => {
                            const formatted = formatCurrency(e.target.value);
                            setCurrentTaxCredit({ ...currentTaxCredit, exchangeRate: formatted });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {currentTaxCredit.currency !== "NGN" && currentTaxCredit.amount && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      ≈ ₦{calculateNGNAmount(currentTaxCredit.amount, currentTaxCredit.currency, currentTaxCredit.exchangeRate).toLocaleString()}
                    </div>
                  )}
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Additional details..."
                      value={currentTaxCredit.description}
                      onChange={(e) => setCurrentTaxCredit({ ...currentTaxCredit, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={addTaxCredit} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tax Credit
                  </Button>
                </CardContent>
              </Card>

              {taxCredits.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Added Tax Credits ({taxCredits.length})</CardTitle>
                    <CardDescription>Total: ₦{totalTaxCredits.toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount (NGN)</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taxCredits.map((credit) => (
                          <TableRow key={credit.id}>
                            <TableCell className="font-medium capitalize">{credit.type}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {credit.description || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              ₦{credit.amount.toLocaleString()}
                              {credit.currency !== "NGN" && (
                                <div className="text-xs text-muted-foreground">
                                  ({credit.currency} @ {credit.exchangeRate})
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeTaxCredit(credit.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Review Your Tax Return</CardTitle>
                  <CardDescription>Review all information before submitting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Income Summary */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Income ({incomes.length})
                    </h3>
                    {incomes.length > 0 ? (
                      <div className="space-y-1 text-sm">
                        {incomes.map(inc => (
                          <div key={inc.id} className="flex justify-between">
                            <span>{inc.source}</span>
                            <span>₦{inc.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>Total Income</span>
                          <span>₦{totalIncome.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No income added</p>
                    )}
                  </div>

                  <Separator />

                  {/* Expenses Summary */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <Receipt className="w-4 h-4 mr-2" />
                      Deductible Expenses ({expenses.length})
                    </h3>
                    {expenses.length > 0 ? (
                      <div className="space-y-1 text-sm">
                        {expenses.map(exp => (
                          <div key={exp.id} className="flex justify-between">
                            <span className="capitalize">{exp.category}</span>
                            <span>₦{exp.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>Total Expenses</span>
                          <span>₦{totalExpenses.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No expenses added</p>
                    )}
                  </div>

                  <Separator />

                  {/* Reliefs Summary */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <Award className="w-4 h-4 mr-2" />
                      Tax Reliefs ({reliefs.length})
                    </h3>
                    {reliefs.length > 0 ? (
                      <div className="space-y-1 text-sm">
                        {reliefs.map(rel => (
                          <div key={rel.id} className="flex justify-between">
                            <span className="capitalize">{rel.type}</span>
                            <span>₦{rel.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>Total Reliefs</span>
                          <span>₦{totalReliefs.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No reliefs added</p>
                    )}
                  </div>

                  <Separator />

                  {/* Tax Credits Summary */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Tax Credits ({taxCredits.length})
                    </h3>
                    {taxCredits.length > 0 ? (
                      <div className="space-y-1 text-sm">
                        {taxCredits.map(tc => (
                          <div key={tc.id} className="flex justify-between">
                            <span className="capitalize">{tc.type}</span>
                            <span>₦{tc.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>Total Credits</span>
                          <span>₦{totalTaxCredits.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No tax credits added</p>
                    )}
                  </div>

                  <Separator />

                  {/* Calculation Summary */}
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Tax Calculation Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Gross Income</span>
                        <span>₦{totalIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Less: Expenses</span>
                        <span>-₦{totalExpenses.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Less: Reliefs</span>
                        <span>-₦{totalReliefs.toLocaleString()}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Taxable Income</span>
                        <span>₦{(totalIncome - totalExpenses - totalReliefs).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {step} of 5
          </div>

          {step < 5 ? (
            <Button onClick={() => setStep(Math.min(5, step + 1))}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Tax Return"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}