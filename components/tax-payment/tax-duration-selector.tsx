"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface TaxDurationSelectorProps {
  period: string
  onDurationChange: (duration: string) => void
}

export function TaxDurationSelector({ period, onDurationChange }: TaxDurationSelectorProps) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const quarters = [
    { label: "Q1 (Jan-Mar)", value: "Jan-Mar" },
    { label: "Q2 (Apr-Jun)", value: "Apr-Jun" },
    { label: "Q3 (Jul-Sep)", value: "Jul-Sep" },
    { label: "Q4 (Oct-Dec)", value: "Oct-Dec" }
  ]
  
  const years = [2024, 2025, 2026, 2027, 2028]
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedQuarter, setSelectedQuarter] = useState("")
  
  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    if (period === "monthly" && selectedMonth) {
      onDurationChange(`${selectedMonth} ${year}`)
    } else if (period === "quarterly" && selectedQuarter) {
      onDurationChange(`${selectedQuarter} ${year}`)
    } else if (period === "yearly") {
      onDurationChange(year)
    }
  }
  
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    onDurationChange(`${month} ${selectedYear}`)
  }
  
  const handleQuarterChange = (quarter: string) => {
    setSelectedQuarter(quarter)
    onDurationChange(`${quarter} ${selectedYear}`)
  }
  
  // Auto-set current period on mount or when period changes
  useEffect(() => {
    const currentYear = new Date().getFullYear().toString()
    setSelectedYear(currentYear)
    
    if (period === "monthly") {
      const currentMonth = months[new Date().getMonth()]
      setSelectedMonth(currentMonth)
      onDurationChange(`${currentMonth} ${currentYear}`)
    } else if (period === "quarterly") {
      const currentQuarter = quarters[Math.floor(new Date().getMonth() / 3)]
      setSelectedQuarter(currentQuarter.value)
      onDurationChange(`${currentQuarter.value} ${currentYear}`)
    } else if (period === "yearly") {
      onDurationChange(currentYear)
    }
  }, [period, onDurationChange])
  
  if (period === "monthly") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="month">Select Month</Label>
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger id="month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="year-month">Year</Label>
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger id="year-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  } else if (period === "quarterly") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quarter">Select Quarter</Label>
          <Select value={selectedQuarter} onValueChange={handleQuarterChange}>
            <SelectTrigger id="quarter">
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent>
              {quarters.map((quarter) => (
                <SelectItem key={quarter.value} value={quarter.value}>{quarter.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="year-quarter">Year</Label>
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger id="year-quarter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  } else {
    // yearly
    return (
      <div className="space-y-2">
        <Label htmlFor="year">Select Year</Label>
        <Select value={selectedYear} onValueChange={(year) => {
          setSelectedYear(year)
          onDurationChange(year)
        }}>
          <SelectTrigger id="year">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }
}

