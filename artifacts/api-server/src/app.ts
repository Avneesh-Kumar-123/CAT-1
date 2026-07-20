import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Replit (and most cloud platforms) sit behind a reverse proxy that sets
// X-Forwarded-For. Without this, express-rate-limit can't identify clients
// accurately and emits a ValidationError on every proxied request.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Trusted origins for CORS (credentials: true required for Better Auth cookies).
// Also automatically trust the Replit dev-proxy origin when running in a Repl,
// because the Vite proxy forwards the browser's Origin header unchanged.
const trustedOrigins = [
  ...(process.env.TRUSTED_ORIGINS ?? "http://localhost:5000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  ...(process.env.REPLIT_DEV_DOMAIN
    ? [`https://${process.env.REPLIT_DEV_DOMAIN}`]
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin || trustedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);

// Rate-limit auth endpoints (login, sign-up, password reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // requests per window per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests — please wait a few minutes and try again." },
  skip: (req) => req.method === "GET", // don't rate-limit session checks
});

// Better Auth handles all /api/auth/* routes directly
const authHandler = toNodeHandler(auth);
app.all("/api/auth/{*path}", authLimiter, (req, res) => authHandler(req, res));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
