import { execSync } from "child_process";
import { copy } from "fs-extra";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const buildDir = join("dist");

const ORIGIN_URL = "https://github.com/cbebe/path-visualizer";
const PROJECT_NAME = "cbebe.github.io/path-visualizer";
const DEPLOYMENT_BRANCH = "gh-pages";
const BUILD_CMD = "pnpm build";

function execCmd(cmd: string): void {
  if (!cmd) return;
  console.info(cmd);
  execSync(cmd, { stdio: "inherit" });
}

function getCmdOutput(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

async function mkTmpDir(): Promise<[string, () => Promise<void>]> {
  const dir = await mkdtemp(
    join(tmpdir(), `${PROJECT_NAME.replaceAll("/", "-")}-${DEPLOYMENT_BRANCH}`)
  );
  return [
    dir,
    async () => {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch (err) {
        console.error("Failed to remove dir:", err);
      }
    },
  ];
}

async function main(): Promise<void> {
  try {
    getCmdOutput("git config --get remote.origin.url");
    const latestHash = getCmdOutput("git rev-parse HEAD");

    if (BUILD_CMD) {
      await rm(buildDir, { recursive: true, force: true });
      execCmd(BUILD_CMD);
    }

    const src = join(process.cwd(), buildDir);
    const [gitPublish, cleanGitPublish] = await mkTmpDir();

    try {
      process.chdir(gitPublish);

      const cloneCmd = `git clone --depth 1 --branch "${DEPLOYMENT_BRANCH}" "${ORIGIN_URL}" "${gitPublish}"`;

      try {
        execCmd(cloneCmd);
      } catch (err) {
        // Branch doesn't exist, create new branch
        execCmd("git init");
        execCmd(`git checkout -b ${DEPLOYMENT_BRANCH}`);
        execCmd(`git remote add origin ${ORIGIN_URL}`);
      }

      try {
        execCmd("git rm -rf ."); // Simply remove all files
      } catch {}

      await copy(src, gitPublish);

      execCmd("git add --all");
      const commitMsg = `Deploy website - based on ${latestHash}`;

      try {
        execCmd(`git commit -m "${commitMsg}"`);
      } catch (err) {
        // Ignore commit errors (e.g., no changes)
      }

      execCmd(`git push --force origin ${DEPLOYMENT_BRANCH}`);
      console.log(`Website is live at: https://${PROJECT_NAME}`);
    } finally {
      await cleanGitPublish();
    }
  } catch (err) {
    console.error("Deployment failed:", err);
    process.exit(1);
  }
}

main();
