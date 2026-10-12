import {prisma} from "../../../../lib/prisma.ts";
import {evaluationSessionWithRelations, serializeEvaluationSession} from "../../../../lib/evaluation-db.ts";

export async function GET() {
  try {
    const sessions = await prisma.evaluationSession.findMany({
      orderBy: {
        sessionStartTime: "desc",
      },
      ...evaluationSessionWithRelations,
    });

    const payload = sessions.map(serializeEvaluationSession);
    const filename = `evaluations-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export evaluations:", error);
    return new Response(JSON.stringify({error: "Failed to export evaluations"}), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
