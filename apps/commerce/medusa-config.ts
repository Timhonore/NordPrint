import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const isProduction = process.env.NODE_ENV === "production";

const redisUrl = process.env.REDIS_URL;
const hasRedis = Boolean(redisUrl);

/**
 * Redis is optional in local development (the in-memory modules are fine for a
 * single process) but mandatory in production, where server and worker are
 * separate containers that must share cache, events and locks.
 */
if (isProduction && !hasRedis) {
  throw new Error(
    "REDIS_URL mangler. I produktion kører medusa-server og medusa-worker som separate " +
      "processer og skal dele cache, event bus og locking via Redis."
  );
}

const requiredInProduction = [
  "DATABASE_URL",
  "JWT_SECRET",
  "COOKIE_SECRET",
  "STORE_CORS",
  "ADMIN_CORS",
];
const missing = requiredInProduction.filter((key) => !process.env[key]);
if (isProduction && missing.length > 0) {
  throw new Error(`Manglende obligatoriske miljøvariabler i produktion: ${missing.join(", ")}`);
}

/**
 * `medusa-server` serves HTTP and the admin; `medusa-worker` runs scheduled
 * jobs and subscribers and is never exposed publicly. See
 * docker-compose.production.yml.
 */
const workerMode = (process.env.MEDUSA_WORKER_MODE ?? "shared") as "shared" | "worker" | "server";

const fileModule = process.env.S3_BUCKET
  ? {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            // S3-compatible: AWS S3, MinIO locally, Cloudflare R2 in production.
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION ?? "auto",
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              // R2 and MinIO both require path-style addressing.
              additional_client_config: {
                forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
              },
            },
          },
        ],
      },
    }
  : {
      // Development fallback: the local filesystem adapter. Product images
      // must never depend on ephemeral container storage in production, which
      // is why the guard below refuses to start without S3 config.
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              backend_url: `${process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"}/static`,
            },
          },
        ],
      },
    };

if (isProduction && !process.env.S3_BUCKET) {
  throw new Error(
    "S3_BUCKET mangler. Produktbilleder må ikke ligge på containerens efemere disk — " +
      "konfigurer Cloudflare R2 eller anden S3-kompatibel storage."
  );
}

const redisModules = hasRedis
  ? [
      { resolve: "@medusajs/medusa/cache-redis", options: { redisUrl } },
      { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl } },
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: { redis: { url: redisUrl } },
      },
      {
        resolve: "@medusajs/medusa/locking",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/locking-redis",
              id: "locking-redis",
              is_default: true,
              options: { redisUrl },
            },
          ],
        },
      },
    ]
  : [];

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      // Managed Postgres (and most VPS setups behind TLS) need this.
      ...(process.env.DATABASE_SSL === "true"
        ? { connection: { ssl: { rejectUnauthorized: false } } }
        : {}),
    },
    redisUrl,
    workerMode,
    http: {
      storeCors: process.env.STORE_CORS ?? "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS ?? "http://localhost:9000,http://localhost:5173",
      authCors:
        process.env.AUTH_CORS ??
        "http://localhost:8000,http://localhost:9000,http://localhost:5173",
      // Session cookies are httpOnly and are marked Secure automatically when
      // NODE_ENV is production; Caddy terminates TLS in front of the app, so
      // the app must always be reached over HTTPS in production.
      jwtSecret: process.env.JWT_SECRET ?? "dev-only-jwt-secret",
      cookieSecret: process.env.COOKIE_SECRET ?? "dev-only-cookie-secret",
    },
  },

  admin: {
    // The worker container must not build or serve the admin bundle.
    disable: workerMode === "worker",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    path: "/app",
  },

  modules: [
    ...redisModules,
    fileModule,

    // NordPrint domain modules.
    { resolve: "./src/modules/brand" },
    { resolve: "./src/modules/filament" },
    { resolve: "./src/modules/printer" },
    { resolve: "./src/modules/compatibility" },
    { resolve: "./src/modules/procurement" },
    { resolve: "./src/modules/wishlist" },
    { resolve: "./src/modules/review" },
    { resolve: "./src/modules/guide" },

    // Payments: the development provider is registered only outside production
    // so a stub can never approve a real order.
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          ...(process.env.VIPPS_MOBILEPAY_CLIENT_ID
            ? [
                {
                  resolve: "./src/modules/payment-mobilepay",
                  id: "mobilepay",
                  options: {
                    clientId: process.env.VIPPS_MOBILEPAY_CLIENT_ID,
                    clientSecret: process.env.VIPPS_MOBILEPAY_CLIENT_SECRET,
                    subscriptionKey: process.env.VIPPS_MOBILEPAY_SUBSCRIPTION_KEY,
                    merchantSerialNumber: process.env.VIPPS_MOBILEPAY_MSN,
                    apiUrl: process.env.VIPPS_MOBILEPAY_API_URL,
                    returnUrl: process.env.VIPPS_MOBILEPAY_RETURN_URL,
                  },
                },
              ]
            : []),
          ...(!isProduction
            ? [{ resolve: "./src/modules/payment-development", id: "development" }]
            : []),
        ],
      },
    },

    // Fulfilment: Danish carriers, with a development provider that works
    // without credentials so checkout can be built end to end.
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          { resolve: "./src/modules/fulfillment-danish-carriers", id: "danish-carriers" },
        ],
      },
    },

    // Transactional e-mail. Resend in production, logged to stdout in dev.
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          process.env.RESEND_API_KEY
            ? {
                resolve: "./src/modules/notification-resend",
                id: "resend",
                options: {
                  channels: ["email"],
                  apiKey: process.env.RESEND_API_KEY,
                  fromEmail: process.env.EMAIL_FROM ?? "NordPrint <ordre@nordprint.dk>",
                  replyTo: process.env.EMAIL_REPLY_TO,
                },
              }
            : {
                resolve: "@medusajs/medusa/notification-local",
                id: "local",
                options: {
                  channels: ["email"],
                  from: process.env.EMAIL_FROM ?? "NordPrint <ordre@nordprint.dk>",
                },
              },
        ],
      },
    },
  ],

  featureFlags: {
    [Modules.INDEX]: true,
  },
});
