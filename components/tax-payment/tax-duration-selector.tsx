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
    { label: "Q1 (Jan-Mar)", value: "Jan-Mar", quarterNum: 1, endMonth: 3 }, // March (0-indexed: 2)
    { label: "Q2 (Apr-Jun)", value: "Apr-Jun", quarterNum: 2, endMonth: 6 }, // June (0-indexed: 5)
    { label: "Q3 (Jul-Sep)", value: "Jul-Sep", quarterNum: 3, endMonth: 9 }, // September (0-indexed: 8)
    { label: "Q4 (Oct-Dec)", value: "Oct-Dec", quarterNum: 4, endMonth: 12 } // December (0-indexed: 11)
  ]
  
  const years = [2024, 2025, 2026, 2027, 2028]
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedQuarter, setSelectedQuarter] = useState("")

  // Check if a quarter is complete (can only pay for completed quarters)
  const isQuarterComplete = (quarterNum: number, year: number): boolean => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12 (January = 1)
    
    // If the year is in the future, it's not complete
    if (year > currentYear) {
      return false
    }
    
    // If the year is in the past, it's complete
    if (year < currentYear) {
      return true
    }
    
    // Same year - check if we're past the quarter's end month
    // Q1 ends in March (month 3), so we can pay in April (month 4) or later
    // Q2 ends in June (month 6), so we can pay in July (month 7) or later
    // Q3 ends in September (month 9), so we can pay in October (month 10) or later
    // Q4 ends in December (month 12), so we can pay in January (month 1) of next year or later
    const quarter = quarters.find(q => q.quarterNum === quarterNum)
    if (!quarter) return false
    
    // For Q4, we need to be in the next year to pay
    if (quarterNum === 4) {
      return currentMonth >= 1 && currentYear > year
    }
    
    // For Q1-Q3, we need to be past the end month
    return currentMonth > quarter.endMonth
  }
  
  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    if (period === "monthly" && selectedMonth) {
      onDurationChange(`${selectedMonth} ${year}`)
    } else if (period === "quarterly" && selectedQuarter) {
      const quarter = quarters.find(q => q.value === selectedQuarter)
      if (quarter) {
        const yearNum = parseInt(year)
        // Only allow if quarter is complete
        if (isQuarterComplete(quarter.quarterNum, yearNum)) {
          // Match the format from calculatePeriodTaxes: "Q1 2026 (Jan-Mar)"
          onDurationChange(`Q${quarter.quarterNum} ${year} (${quarter.value})`)
        } else {
          // Reset to a valid quarter if current selection is invalid
          const now = new Date()
          const currentYear = now.getFullYear()
          let validQuarter = quarters.find(q => isQuarterComplete(q.quarterNum, yearNum))
          
          // If no quarter is complete for selected year, find last completed quarter
          if (!validQuarter && yearNum === currentYear) {
            for (let i = quarters.length - 1; i >= 0; i--) {
              const q = quarters[i]
              if (isQuarterComplete(q.quarterNum, currentYear)) {
                validQuarter = q
                break
              }
            }
          }
          
          if (validQuarter) {
            setSelectedQuarter(validQuarter.value)
            onDurationChange(`Q${validQuarter.quarterNum} ${year} (${validQuarter.value})`)
          }
        }
      }
    } else if (period === "yearly") {
      onDurationChange(year)
    }
  }
  
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    onDurationChange(`${month} ${selectedYear}`)
  }
  
  const handleQuarterChange = (quarterValue: string) => {
    const quarter = quarters.find(q => q.value === quarterValue)
    if (!quarter) return
    
    const year = parseInt(selectedYear)
    if (!isQuarterComplete(quarter.quarterNum, year)) {
      // Don't allow selection of incomplete quarters
      return
    }
    
    setSelectedQuarter(quarterValue)
    // Match the format from calculatePeriodTaxes: "Q1 2026 (Jan-Mar)"
    onDurationChange(`Q${quarter.quarterNum} ${selectedYear} (${quarter.value})`)
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
      const now = new Date()
      const year = now.getFullYear()
      
      // Find the most recent completed quarter
      // Start from Q4 and work backwards, or use the previous quarter if current quarter is not complete
      let defaultQuarter = quarters[Math.floor((now.getMonth()) / 3)]
      
      // If current quarter is not complete, use the previous quarter
      if (!isQuarterComplete(defaultQuarter.quarterNum, year)) {
        // Find the last completed quarter
        for (let i = quarters.length - 1; i >= 0; i--) {
          const q = quarters[i]
          if (isQuarterComplete(q.quarterNum, year)) {
            defaultQuarter = q
            break
          }
        }
      }
      
      setSelectedQuarter(defaultQuarter.value)
      // Match the format from calculatePeriodTaxes: "Q1 2026 (Jan-Mar)"
      onDurationChange(`Q${defaultQuarter.quarterNum} ${currentYear} (${defaultQuarter.value})`)
    } else if (period === "yearly") {
      onDurationChange(currentYear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              {quarters.map((quarter) => {
                const year = parseInt(selectedYear)
                const isComplete = isQuarterComplete(quarter.quarterNum, year)
                return (
                  <SelectItem 
                    key={quarter.value} 
                    value={quarter.value}
                    disabled={!isComplete}
                    className={!isComplete ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {quarter.label} {!isComplete && "(Quarter not complete)"}
                  </SelectItem>
                )
              })}
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

