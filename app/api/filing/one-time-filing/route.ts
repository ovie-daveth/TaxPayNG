import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const session = req.cookies.get("session");
    if (!session?.value) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { incomes, expenses, reliefs, taxCredits } = body;

    // Get user ID from session
    const db = getAdminDb();
    const sessionsRef = db.collection("sessions");
    const sessionDoc = await sessionsRef.doc(session.value).get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    const userId = sessionDoc.data()?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID not found in session" },
        { status: 401 }
      );
    }

    // Calculate totals
    const totalIncome = incomes.reduce((sum: number, inc: any) => sum + inc.amount, 0);
    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    const totalReliefs = reliefs.reduce((sum: number, rel: any) => sum + rel.amount, 0);
    const totalTaxCredits = taxCredits.reduce((sum: number, tc: any) => sum + tc.amount, 0);
    
    const taxableIncome = totalIncome - totalExpenses - totalReliefs;

    // Calculate tax using Nigerian tax brackets
    let taxDue = 0;
    if (taxableIncome <= 300000) {
      taxDue = taxableIncome * 0.07;
    } else if (taxableIncome <= 600000) {
      taxDue = 21000 + (taxableIncome - 300000) * 0.11;
    } else if (taxableIncome <= 1100000) {
      taxDue = 54000 + (taxableIncome - 600000) * 0.15;
    } else if (taxableIncome <= 1600000) {
      taxDue = 129000 + (taxableIncome - 1100000) * 0.19;
    } else if (taxableIncome <= 3200000) {
      taxDue = 224000 + (taxableIncome - 1600000) * 0.21;
    } else {
      taxDue = 560000 + (taxableIncome - 3200000) * 0.24;
    }

    // Apply tax credits
    taxDue = Math.max(0, taxDue - totalTaxCredits);

    // Create filing request
    const filingRequestData = {
      userId,
      type: "one-time-filing",
      status: "pending",
      incomes,
      expenses,
      reliefs,
      taxCredits,
      summary: {
        totalIncome,
        totalExpenses,
        totalReliefs,
        totalTaxCredits,
        taxableIncome,
        taxDue
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const filingRequestRef = await db.collection("filingRequests").add(filingRequestData);

    return NextResponse.json({
      success: true,
      filingRequestId: filingRequestRef.id,
      summary: {
        totalIncome,
        totalExpenses,
        totalReliefs,
        totalTaxCredits,
        taxableIncome,
        taxDue
      }
    });
  } catch (error) {
    console.error("One-time filing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process filing" },
      { status: 500 }
    );
  }
}
