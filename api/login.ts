export default async function handler(req: any, res: any) {
  console.log(`[API /api/login] Method: ${req.method} called`);

  try {
    if (req.method === "GET") {
      return res.status(200).json({ message: "API working" });
    }

    if (req.method === "POST") {
      console.log("[API /api/login] Request body:", req.body);
      return res.status(200).json({ message: "Login endpoint hit" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[API /api/login] Error:", error);
    return res.status(500).json({ error: "A server error occurred" });
  }
}
