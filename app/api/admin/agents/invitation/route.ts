import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const invitationDoc = await adminDb?.collection("agentInvitations").doc(token).get();

    if (!invitationDoc || !invitationDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const invitation = invitationDoc.data();

    if (new Date(invitation!.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Invitation has expired" },
        { status: 400 }
      );
    }

    if (invitation!.status === "accepted") {
      return NextResponse.json(
        { success: false, error: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { invitationId, userId } = await req.json();

    if (!invitationId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const invitationDoc = await adminDb?.collection("agentInvitations").doc(invitationId).get();
    
    if (!invitationDoc || !invitationDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    const invitation = invitationDoc.data();

    // Update invitation status
    await adminDb?.collection("agentInvitations").doc(invitationId).update({
      status: "accepted",
      acceptedAt: new Date().toISOString(),
      userId,
    });

    // Update filing request if there is one
    if (invitation?.filingRequestId) {
      await adminDb?.collection("filingRequests").doc(invitation.filingRequestId).update({
        assignedAgentId: userId,
        assignedAgentEmail: invitation.email,
        assignedAgentName: invitation.name,
        status: "assigned",
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}