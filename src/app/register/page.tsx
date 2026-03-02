"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import type { House, Member } from "@/types";

const DEFAULT_COLOR = "#d97706";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // ignore parse error
  }
  return "登録に失敗しました";
}

export default function RegisterPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Member[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  const [houseName, setHouseName] = useState("");
  const [houseDescription, setHouseDescription] = useState("");
  const [houseMessage, setHouseMessage] = useState<string | null>(null);
  const [houseError, setHouseError] = useState<string | null>(null);
  const [houseLoading, setHouseLoading] = useState(false);

  const [selectedUserUid, setSelectedUserUid] = useState("");
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [memberAddMessage, setMemberAddMessage] = useState<string | null>(null);
  const [memberAddError, setMemberAddError] = useState<string | null>(null);
  const [memberAddLoading, setMemberAddLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setOptionsLoading(true);
      try {
        const [usersRes, housesRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/houses"),
        ]);

        if (usersRes.ok) {
          const userBody = (await usersRes.json()) as { data?: Member[] };
          const list = Array.isArray(userBody.data) ? userBody.data : [];
          setUsers(list);
          if (list.length > 0) setSelectedUserUid((prev) => prev || list[0].id);
        }

        if (housesRes.ok) {
          const houseBody = (await housesRes.json()) as { data?: House[] };
          const list = Array.isArray(houseBody.data) ? houseBody.data : [];
          setHouses(list);
          if (list.length > 0) setSelectedHouseId((prev) => prev || list[0].id);
        }
      } finally {
        setOptionsLoading(false);
      }
    };

    void load();
  }, []);

  const reloadOptions = async () => {
    const [usersRes, housesRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/houses"),
    ]);
    if (usersRes.ok) {
      const userBody = (await usersRes.json()) as { data?: Member[] };
      const list = Array.isArray(userBody.data) ? userBody.data : [];
      setUsers(list);
      if (list.length > 0) setSelectedUserUid((prev) => prev || list[0].id);
    }
    if (housesRes.ok) {
      const houseBody = (await housesRes.json()) as { data?: House[] };
      const list = Array.isArray(houseBody.data) ? houseBody.data : [];
      setHouses(list);
      if (list.length > 0) setSelectedHouseId((prev) => prev || list[0].id);
    }
  };

  const handleUserRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserError(null);
    setUserMessage(null);
    setUserLoading(true);

    try {
      const authResult = await createUserWithEmailAndPassword(getClientAuth(), email, password);
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: authResult.user.uid,
          email: authResult.user.email ?? email,
          name,
          color,
        }),
      });

      if (!response.ok) {
        setUserError(await readErrorMessage(response));
        return;
      }

      setUserMessage("ユーザーを登録しました");
      setPassword("");
      await reloadOptions();
    } catch {
      setUserError("ユーザー登録に失敗しました");
    } finally {
      setUserLoading(false);
    }
  };

  const handleHouseRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHouseError(null);
    setHouseMessage(null);
    setHouseLoading(true);

    try {
      const response = await fetch("/api/houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: houseName,
          description: houseDescription,
          ownerUid: user?.uid ?? "",
        }),
      });

      if (!response.ok) {
        setHouseError(await readErrorMessage(response));
        return;
      }

      setHouseMessage("ハウスを登録しました");
      setHouseName("");
      setHouseDescription("");
      await reloadOptions();
    } catch {
      setHouseError("ハウス登録に失敗しました");
    } finally {
      setHouseLoading(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMemberAddError(null);
    setMemberAddMessage(null);
    setMemberAddLoading(true);

    try {
      if (!selectedHouseId || !selectedUserUid) {
        setMemberAddError("ハウスとユーザーを選択してください");
        return;
      }

      const response = await fetch(`/api/houses/${selectedHouseId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userUid: selectedUserUid }),
      });

      if (!response.ok) {
        setMemberAddError(await readErrorMessage(response));
        return;
      }

      setMemberAddMessage("メンバーを追加しました");
      await reloadOptions();
    } catch {
      setMemberAddError("メンバー追加に失敗しました");
    } finally {
      setMemberAddLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-6">
      <h2 className="text-xl font-bold text-stone-800">新規登録</h2>

      <form onSubmit={handleUserRegister} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-stone-700">ユーザー登録</h3>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          placeholder="表示名"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          placeholder="メールアドレス"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          placeholder="パスワード(6文字以上)"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="user-color" className="text-sm text-stone-600">色</label>
          <input
            id="user-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 border border-stone-200 rounded"
          />
        </div>
        {userError && <p className="text-sm text-red-600">{userError}</p>}
        {userMessage && <p className="text-sm text-emerald-700">{userMessage}</p>}
        <button
          type="submit"
          disabled={userLoading}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg py-2 text-sm font-semibold"
        >
          {userLoading ? "登録中..." : "ユーザーを登録"}
        </button>
      </form>

      <form onSubmit={handleHouseRegister} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-stone-700">ハウス登録</h3>
        <input
          type="text"
          required
          value={houseName}
          onChange={(e) => setHouseName(e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          placeholder="ハウス名"
        />
        <textarea
          value={houseDescription}
          onChange={(e) => setHouseDescription(e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm min-h-20"
          placeholder="説明(任意)"
        />
        {houseError && <p className="text-sm text-red-600">{houseError}</p>}
        {houseMessage && <p className="text-sm text-emerald-700">{houseMessage}</p>}
        <button
          type="submit"
          disabled={houseLoading}
          className="w-full bg-stone-700 hover:bg-stone-800 disabled:bg-stone-400 text-white rounded-lg py-2 text-sm font-semibold"
        >
          {houseLoading ? "登録中..." : "ハウスを登録"}
        </button>
      </form>

      <form onSubmit={handleAddMember} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-stone-700">既存ハウスへメンバー追加</h3>
        <select
          value={selectedHouseId}
          onChange={(e) => setSelectedHouseId(e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          disabled={optionsLoading || houses.length === 0}
        >
          {houses.length === 0 && <option value="">ハウスがありません</option>}
          {houses.map((house) => (
            <option key={house.id} value={house.id}>
              {house.name} ({house.id})
            </option>
          ))}
        </select>
        <select
          value={selectedUserUid}
          onChange={(e) => setSelectedUserUid(e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          disabled={optionsLoading || users.length === 0}
        >
          {users.length === 0 && <option value="">ユーザーがありません</option>}
          {users.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.email ?? member.id})
            </option>
          ))}
        </select>
        {memberAddError && <p className="text-sm text-red-600">{memberAddError}</p>}
        {memberAddMessage && <p className="text-sm text-emerald-700">{memberAddMessage}</p>}
        <button
          type="submit"
          disabled={memberAddLoading || optionsLoading || houses.length === 0 || users.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg py-2 text-sm font-semibold"
        >
          {memberAddLoading ? "追加中..." : "メンバーを追加"}
        </button>
      </form>

      <p className="text-sm text-stone-600">
        既存アカウントがある場合は <Link href="/login" className="text-amber-700 underline">ログイン</Link>
      </p>
    </div>
  );
}
