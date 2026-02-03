import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;

    if (!docId) {
      return NextResponse.json(
        { success: false, error: "Document ID is required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection("documents").doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    const data = docSnap.data();

    return NextResponse.json({
      success: true,
      data: {
        id: docSnap.id,
        ...data,
        // Ensure fileId is available for backward compatibility
        fileId: data?.imageKitFileId || data?.fileId || docSnap.id,
        fileName: data?.originalName || data?.name || 'Document'
      },
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
