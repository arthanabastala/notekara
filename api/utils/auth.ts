import jwt from "jsonwebtoken";

export function getUserIdFromToken(req: any) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && (authHeader as string).split(" ")[1];
  
  if (!token) {
    throw new Error("Access token missing");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
  return decoded.userId;
}
