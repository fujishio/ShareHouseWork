import { readFileSync } from "node:fs";
import test from "node:test";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const PROJECT_ID = "demo-sharehouse-work";

export async function setupFirestoreRulesTestEnv(): Promise<RulesTestEnvironment> {
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });

  test.after(async () => {
    await testEnv.cleanup();
  });

  return testEnv;
}
