# Employee Upload Excel Template

## Required Columns (Minimum)

These columns are **required** for each employee:

| Column Name | Example Value | Description | Required |
|------------|---------------|-------------|----------|
| **First Name** | John | Employee's first name | ✅ Yes |
| **Last Name** | Doe | Employee's last name | ✅ Yes |
| **Email** | john.doe@company.com | Employee's email address | ✅ Yes |
| **Employee Number** | EMP001 | Unique employee ID | ✅ Yes |
| **Employment Type** | full-time | Options: `full-time`, `part-time`, `contract`, `intern` | ✅ Yes |
| **Employment Date** | 2024-01-15 | Start date (format: YYYY-MM-DD or any date format) | ✅ Yes |
| **Basic Salary** | 500000 | Monthly salary in NGN (numbers only) | ✅ Yes |

## Optional Columns

These columns are optional but recommended:

| Column Name | Example Value | Description | Notes |
|------------|---------------|-------------|-------|
| **Middle Name** | James | Employee's middle name | Optional |
| **Phone** | +2348012345678 | Phone number | Optional |
| **Date of Birth** | 1990-05-20 | Date of birth (format: YYYY-MM-DD) | Optional |
| **Gender** | male | Options: `male`, `female`, `other` | Optional |
| **Department** | Finance | Department name | Optional |
| **Job Title** | Accountant | Job title/position | Optional |
| **Position** | Senior Accountant | Specific position | Optional |
| **Status** | active | Options: `active`, `inactive`, `terminated`, `on-leave` | Default: `active` |
| **TIN** | 12345678-1234 | Tax Identification Number | Optional |
| **Tax State** | Lagos | State for tax purposes | Optional |
| **Bank Name** | Access Bank | Bank name | Optional |
| **Account Number** | 1234567890 | Bank account number | Optional |
| **Account Name** | John Doe | Account holder name | Optional |
| **Address** | 123 Main Street | Street address | Optional |
| **City** | Lagos | City | Optional |
| **State** | Lagos | State | Optional |
| **Country** | Nigeria | Country (defaults to Nigeria) | Optional |
| **Postal Code** | 100001 | Postal/ZIP code | Optional |
| **Emergency Contact** | Jane Doe | Emergency contact name | Optional |
| **Emergency Phone** | +2348012345679 | Emergency contact phone | Optional |
| **Emergency Relationship** | Spouse | Relationship to employee | Optional |
| **Emergency Email** | jane.doe@email.com | Emergency contact email | Optional |
| **Notes** | Excellent performer | Additional notes | Optional |

## Example Excel Data

Here's a sample row with example data:

```
First Name | Last Name | Middle Name | Email | Phone | Date of Birth | Gender | Employee Number | Employment Type | Department | Job Title | Position | Employment Date | Status | Basic Salary | TIN | Tax State | Bank Name | Account Number | Account Name | Address | City | State | Country | Postal Code | Emergency Contact | Emergency Phone | Emergency Relationship | Notes
-----------|-----------|-------------|-------|-------|---------------|--------|-----------------|-----------------|------------|-----------|----------|-----------------|--------|--------------|-----|-----------|-----------|----------------|--------------|---------|------|-------|---------|-------------|------------------|-----------------|----------------------|-------
John | Doe | James | john.doe@company.com | +2348012345678 | 1990-05-20 | male | EMP001 | full-time | Finance | Accountant | Senior Accountant | 2024-01-15 | active | 500000 | 12345678-1234 | Lagos | Access Bank | 1234567890 | John Doe | 123 Main Street | Lagos | Lagos | Nigeria | 100001 | Jane Doe | +2348012345679 | Spouse | Excellent performer
Mary | Smith | | mary.smith@company.com | +2348023456789 | 1992-08-10 | female | EMP002 | full-time | HR | HR Manager | HR Manager | 2023-06-01 | active | 750000 | 87654321-4321 | Abuja | GTBank | 9876543210 | Mary Smith | 456 Business Avenue | Abuja | FCT | Nigeria | 900001 | John Smith | +2348023456790 | Husband | 
Peter | Johnson | | peter.j@company.com | +2348034567890 | 1988-12-25 | male | EMP003 | contract | IT | Developer | Senior Developer | 2024-03-01 | active | 600000 | | Lagos | Zenith Bank | 5555555555 | Peter Johnson | 789 Tech Road | Lagos | Lagos | Nigeria | 100002 | | | | |
```

## Column Name Variations Accepted

The system accepts these variations (case-insensitive):

- **First Name**: `First Name`, `FirstName`, `FName`, `Given Name`
- **Last Name**: `Last Name`, `LastName`, `LName`, `Surname`, `Family Name`
- **Employee Number**: `Employee Number`, `EmployeeNumber`, `Emp No`, `EmpNo`, `ID`
- **Employment Type**: `Employment Type`, `EmploymentType`, `Type`, `Emp Type`
- **Employment Date**: `Employment Date`, `EmploymentDate`, `Start Date`, `StartDate`, `Hire Date`, `HireDate`
- **Basic Salary**: `Basic Salary`, `BasicSalary`, `Salary`, `Monthly Salary`, `MonthlySalary`
- **TIN**: `TIN`, `Tax ID`, `TaxID`, `Tax Identification Number`
- **Phone**: `Phone`, `Phone Number`, `PhoneNumber`, `Mobile`, `Telephone`
- **Date of Birth**: `Date of Birth`, `DateOfBirth`, `DOB`, `Birth Date`, `BirthDate`
- **Job Title**: `Job Title`, `JobTitle`, `Title`, `Designation`
- **Bank Name**: `Bank Name`, `BankName`, `Bank`
- **Account Number**: `Account Number`, `AccountNumber`, `Account No`, `AccountNo`
- **Emergency Contact**: `Emergency Contact`, `EmergencyContact`, `Emergency Contact Name`
- **Emergency Phone**: `Emergency Phone`, `EmergencyPhone`, `Emergency Contact Phone`
- **Emergency Email**: `Emergency Email`, `EmergencyEmail`, `Emergency Contact Email`
- **Emergency Relationship**: `Emergency Relationship`, `EmergencyRelationship`, `Relationship`

## Important Notes

1. **Date Formats**: Dates can be in any format Excel recognizes (e.g., `2024-01-15`, `01/15/2024`, `15-Jan-2024`)
2. **Salary**: Enter numbers only (no currency symbols or commas). Example: `500000` not `₦500,000`
3. **Employment Type**: Must be exactly one of: `full-time`, `part-time`, `contract`, `intern` (case-insensitive)
4. **Status**: Must be exactly one of: `active`, `inactive`, `terminated`, `on-leave` (case-insensitive, defaults to `active`)
5. **Gender**: Must be exactly one of: `male`, `female`, `other` (case-insensitive)
6. **Minimum Required**: At minimum, you must provide: First Name, Last Name, Email, Employee Number, Employment Type, Employment Date, and Basic Salary
7. **File Formats**: Supports `.xlsx`, `.xls`, and `.csv` files

## Sample Excel File Structure

```
Row 1 (Headers):
First Name | Last Name | Email | Employee Number | Employment Type | Employment Date | Basic Salary | Phone | Department | Job Title | TIN | Bank Name | Account Number

Row 2 (Data):
John | Doe | john.doe@company.com | EMP001 | full-time | 2024-01-15 | 500000 | +2348012345678 | Finance | Accountant | 12345678-1234 | Access Bank | 1234567890

Row 3 (Data):
Mary | Smith | mary.smith@company.com | EMP002 | full-time | 2023-06-01 | 750000 | +2348023456789 | HR | HR Manager | 87654321-4321 | GTBank | 9876543210
```

