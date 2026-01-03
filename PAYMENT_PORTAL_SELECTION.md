# Payment Portal Selection Feature

## Overview

Users can now choose between paying through the National Revenue Center (NRC) portal or their state's Internal Revenue Service (IRS) portal during the tax payment process.

## Components

### PaymentPortalSelectorModal
- **Location**: `components/payment/payment-portal-selector-modal.tsx`
- **Purpose**: Displays a modal dialog allowing users to select their preferred payment portal
- **Features**:
  - Shows NRC (National Revenue Center) option
  - Shows state-specific IRS option (if available)
  - Displays portal URLs for verification
  - Responsive design with radio button selection

## State IRS Portals

The modal includes URLs for all 36 states and FCT:

| State | IRS Portal |
|-------|-----------|
| Abia | https://abia.tax/ |
| Adamawa | https://ad-irs.adamawastate.gov.ng/ |
| Anambra | https://tax.services.an.gov.ng |
| Akwa Ibom | https://akirs.ibomtax.ng/ |
| Bauchi | https://birs.bu.gov.ng/ |
| Bayelsa | https://etax.bir.by.gov.ng/ |
| Benue | https://birs.be.gov.ng/ |
| Borno | https://birs.bo.gov.ng/home/ |
| Cross River | https://pay.crossriverstate.gov.ng |
| Delta | https://selfservice.deltairs.com/ |
| Ebonyi | https://tax.ebsirb.eb.gov.ng |
| Edo | https://eras.eirs.gov.ng |
| Enugu | https://irs.en.gov.ng/home |
| Ekiti | https://ekitistaterevenue.com/index.php |
| FCT | https://fctirs.gov.ng/ |
| Gombe | https://irs.gm.gov.ng/ |
| Imo | https://iirs.im.gov.ng/ |
| Jigawa | https://www.jirs.org.ng/ |
| Kaduna | https://paykaduna.com/ |
| Kano | https://kirs.gov.ng/ |
| Kastina | https://revenue.katsinastate.gov.ng/ |
| Kebbi | https://irs.kb.gov.ng/etax/ |
| Kogi | https://irs.kg.gov.ng/ |
| Kwara | https://taxpayers.irs.kg.gov.ng/ |
| Lagos | https://etax.lirs.net/login/ |
| Nasarawa | https://www.irs.na.gov.ng/ |
| Niger | https://nigerigr.com/ |
| Ogun | https://portal.ogetax.ogunstate.gov.ng/login |
| Ondo | https://iondo.ondostate.gov.ng/login |
| Osun | https://osun.electroniccollectionsecg.com/taxes/apply |
| Oyo | https://selfservice.oyostatebir.com/ |
| Plateau | https://plateauigr.com/ |
| Rivers | https://rivtamis.riversbirs.gov.ng/home.html |
| Sokoto | https://itas.irs.sk.gov.ng/login |
| Yobe | https://itas.irs.yb.gov.ng/ |
| Zamfara | https://recruitment.zamfara.gov.ng/zirs/Login |

## Payment Flow

### When NRC is Selected:
1. Modal closes
2. NRC payment modal opens
3. User completes payment on NRC portal
4. User confirms payment and uploads receipt
5. Receipt is recorded in OTax system

### When State IRS is Selected:
1. Modal closes
2. State IRS portal opens in new tab
3. Receipt upload modal opens
4. User completes payment on state IRS portal
5. User uploads receipt to confirm payment
6. Receipt is recorded in OTax system

## Integration Points

### Payment Add Page
- **File**: `app/dashboard/payment/add/page.tsx`
- **Flow**: After system checks pass, user clicks "Proceed to Pay" → Portal Selector Modal appears → User selects portal → Payment flow initiates

### User State Detection
- Portal selector uses user's state from profile: `profile?.address?.state`
- If state is not found or state IRS is unavailable, only NRC option is shown
- State names must match keys in `STATE_IRS_PORTALS` object

## User Experience

### Benefits:
- Users have choice of payment methods
- Direct payment to state authorities if preferred
- Reduced dependency on single NRC portal
- Better state revenue collection
- Improved user control over payment process

### Limitations:
- Some state IRS portals may require separate registration
- User must handle their own payment on external portals
- Receipt upload required for all payment methods for OTax record-keeping

## Future Enhancements

1. **Webhook Integration**: Receive payment confirmations directly from state IRS portals
2. **Payment Status Tracking**: Check payment status on state portals
3. **Automatic Receipt Extraction**: OCR scanning of uploaded receipts
4. **Payment Reminder System**: Follow-up reminders based on portal selection
5. **Portal Availability Status**: Real-time status checks for portal availability
