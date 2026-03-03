import test from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT_ID = "demo-sharehouse-work";

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    rules: readFileSync("firestore.rules", "utf8"),
  },
});

test.after(async () => {
  await testEnv.cleanup();
});

test("認証済みユーザーのクライアントSDK直接読み取りは拒否される", async () => {
  const authedDb = testEnv.authenticatedContext("user-1").firestore();
  await assertFails(getDoc(doc(authedDb, "rules", "r1")));
});

test("未認証ユーザーのクライアントSDK直接書き込みは拒否される", async () => {
  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(unauthedDb, "rules", "r1"), { title: "x" }));
});
