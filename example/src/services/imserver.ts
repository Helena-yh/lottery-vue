import { IRCKitGroupMemberProfile } from "@rongcloud/global-im-uikit";
import { initData } from "./cache";

export const secret = location.search.match(/secret=([^&]+)/)?.[1];

const sign = async (nonce: number, timestamp: number) => {
  const content = `${secret}${nonce}${timestamp}`;
  const buffer = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(content).buffer
  );
  const hashArray = Array.from(new Uint8Array(buffer)); // 将缓冲区转换为字节数组
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // 将字节数组转换为十六进制字符串
  return hashHex;
};

const httpReq = async (
  url: string,
  body: URLSearchParams,
  method = "post",
): Promise<any> => {
  if (!secret) {
    return null;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(timestamp * Math.random());
  const appkey = initData.value.appkey;
  const signature = await sign(nonce, timestamp);

  try {
    const resp = await fetch(`/api${url}`, {
      method,
      headers: {
        "App-Key": appkey,
        Nonce: nonce.toString(),
        Timestamp: timestamp.toString(),
        Signature: signature,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    return resp.json();
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getGroupMembers = async (
  groupId: string
): Promise<{ users: IRCKitGroupMemberProfile[]; groupId: string }> => {
  const res = await httpReq(
    "/group/user/query.json",
    new URLSearchParams({ groupId }),
    "post",
  );
  if (!res || res.code !== 200) {
    return { users: [], groupId };
  }
  return {
    users: res.users.map((user: { id: string }) => ({
      userId: user.id,
      nickname: `Nickname<${user.id}>`,
    })),
    groupId,
  };
};

export const checkOnline = async (userId: string): Promise<{ code: number, status?: number }>  => {
  const res = await httpReq(
    "/user/checkOnline.json",
    new URLSearchParams({ userId }),
    "post",
  );
  if (!res || res.code !== 200) {
    return { code: res.code };
  }
  return {
    code: res.code,
    status: Number(res.status)
  }
}
