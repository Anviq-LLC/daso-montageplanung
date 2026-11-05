import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";

// Local only: stands in for the Cloudflare Access header that production adds.
const devUserEmail = process.env.DEV_USER_EMAIL ?? "dev@daso.test";
const devAccess = (): Plugin => ({
  name: "dev-access",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")) return next();
      req.headers["cf-access-authenticated-user-email"] = devUserEmail;
      req.rawHeaders.push("cf-access-authenticated-user-email", devUserEmail);
      next();
    });
  },
});

export default defineConfig(async () => {
  process.env.WRANGLER_SEND_METRICS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    plugins: [
      vinext(),
      devAccess(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          main: "vinext/server/fetch-handler",
          compatibility_flags: ["nodejs_compat"],
          d1_databases: [
            {
              binding: "DB",
              database_name: "daso-montageplanung",
              database_id: "42f5d224-bb84-4fd2-a1f8-d6abfda88956",
            },
          ],
          r2_buckets: [{ binding: "BUCKET", bucket_name: "daso-montageplanung-files" }],
        },
      }),
    ],
  };
});
