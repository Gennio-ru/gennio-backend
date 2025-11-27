import { execSync } from "child_process";
import { join } from "path";

const swaggerPath = join(__dirname, "..", "swagger.json");
const frontendPath = join(
  __dirname,
  "..",
  "..",
  "gennio-frontend",
  "src",
  "api",
  "types.gen.ts"
);

try {
  execSync(`npx openapi-typescript ${swaggerPath} --output ${frontendPath}`, {
    stdio: "inherit",
  });
  console.log(`✅ Types generated in ${frontendPath}`);
} catch (e) {
  console.error("❌ Failed to generate types:", e);
  process.exit(1);
}
