import test from "node:test";
import { assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { setupFirestoreRulesTestEnv } from "./src/server/test-helpers/firestore-rules-test-env.ts";

const testEnv = await setupFirestoreRulesTestEnv();

test("認証済みユーザーのクライアントSDK直接読み取りは拒否される", async () => {
  const authedDb = testEnv.authenticatedContext("user-1").firestore();
  await assertFails(getDoc(doc(authedDb, "rules", "r1")));
});

test("未認証ユーザーのクライアントSDK直接書き込みは拒否される", async () => {
  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(unauthedDb, "rules", "r1"), { title: "x" }));
});

test("認証済みユーザーのクライアントSDK直接書き込みも拒否される", async () => {
  const authedDb = testEnv.authenticatedContext("user-1").firestore();
  await assertFails(setDoc(doc(authedDb, "rules", "r1"), { title: "x" }));
});
